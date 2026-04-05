import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  loadAllCases,
  loadGeneratedCases,
  loadGoldCases,
} from "@infraresolutionbench/data";
import type { GoldCase } from "@infraresolutionbench/shared";

import { CommandAdapter, executeWithAdapter } from "./adapters";

type CaseSource = "gold" | "synthetic" | "all";
type PromptMode = "packet" | "tools";

type CliArgs = {
  command: string;
  caseSource: CaseSource;
  mode: PromptMode;
  limit: number | null;
  rolloutsPerExample: number;
  generatorFamily: string | null;
  outputName: string;
  modelName: string | null;
};

type DatasetSummary = {
  generated_at: string;
  runner: "command_adapter";
  model_name: string;
  command: string;
  case_source: CaseSource;
  prompt_mode: PromptMode;
  limit: number | null;
  rollouts_per_example: number;
  evaluated_samples: number;
  evaluated_cases: number;
  failed_samples: number;
  failed_cases: number;
  metrics: {
    exact_accuracy: number;
    consistency_pass_rate: number;
    rubric_pass_rate: number;
    composite_score: number;
  };
  case_ids: string[];
  failed_case_ids: string[];
  failures: Array<{
    case_id: string;
    rollout: number;
    error: string;
  }>;
};

function parseArgs(argv: string[]): CliArgs {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (typeof token !== "string" || !token.startsWith("--")) {
      continue;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${token}.`);
    }

    args.set(token, value);
    index += 1;
  }

  const command = args.get("--command");
  const caseSource = (args.get("--case-source") ?? "gold") as CaseSource;
  const mode = (args.get("--mode") ?? "tools") as PromptMode;
  const limitRaw = args.get("--limit");
  const rolloutsRaw = args.get("--rollouts-per-example") ?? "1";
  const generatorFamily = args.get("--generator-family") ?? null;
  const outputName = args.get("--output-name") ?? "adapter-dataset-run";
  const modelName = args.get("--model-name") ?? null;

  if (!command) {
    throw new Error(
      "Usage: npm run run:adapter-dataset -- --command <cmd> [--case-source gold|synthetic|all] [--mode packet|tools] [--limit <n>] [--rollouts-per-example <n>] [--generator-family <family>] [--output-name <name>] [--model-name <name>]",
    );
  }

  if (caseSource !== "gold" && caseSource !== "synthetic" && caseSource !== "all") {
    throw new Error(`Unsupported case source: ${caseSource}`);
  }

  if (mode !== "packet" && mode !== "tools") {
    throw new Error(`Unsupported prompt mode: ${mode}`);
  }

  return {
    command,
    caseSource,
    mode,
    limit: limitRaw ? Number(limitRaw) : null,
    rolloutsPerExample: Number(rolloutsRaw),
    generatorFamily,
    outputName,
    modelName,
  };
}

function average(values: number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sanitizeForFilename(value: string): string {
  return value.replaceAll("/", "_");
}

function interleaveGeneratedCases(cases: GoldCase[]): GoldCase[] {
  const families = new Map<string, GoldCase[]>();

  for (const goldCase of cases) {
    const family = goldCase.hidden_state.generator_family;
    const bucket = families.get(family) ?? [];
    bucket.push(goldCase);
    families.set(family, bucket);
  }

  const orderedFamilies = [...families.keys()].sort((left, right) =>
    left.localeCompare(right),
  );
  const positions = new Map<string, number>(orderedFamilies.map((family) => [family, 0]));
  const interleaved: GoldCase[] = [];

  while (true) {
    let addedAny = false;

    for (const family of orderedFamilies) {
      const bucket = families.get(family) ?? [];
      const position = positions.get(family) ?? 0;
      if (position >= bucket.length) {
        continue;
      }

      const nextCase = bucket[position];
      if (!nextCase) {
        continue;
      }

      interleaved.push(nextCase);
      positions.set(family, position + 1);
      addedAny = true;
    }

    if (!addedAny) {
      break;
    }
  }

  return interleaved;
}

async function loadCases(caseSource: CaseSource, generatorFamily: string | null): Promise<GoldCase[]> {
  if (caseSource === "gold") {
    return loadGoldCases();
  }

  if (caseSource === "synthetic") {
    const cases = await loadGeneratedCases();
    const filtered = generatorFamily
      ? cases.filter((goldCase) => goldCase.hidden_state.generator_family === generatorFamily)
      : cases;
    return interleaveGeneratedCases(filtered);
  }

  const [goldCases, generatedCases] = await Promise.all([loadGoldCases(), loadGeneratedCases()]);
  const filteredGenerated = generatorFamily
    ? generatedCases.filter((goldCase) => goldCase.hidden_state.generator_family === generatorFamily)
    : generatedCases;
  return [...goldCases, ...interleaveGeneratedCases(filteredGenerated)];
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const cases = await loadCases(args.caseSource, args.generatorFamily);
  const selectedCases = args.limit ? cases.slice(0, args.limit) : cases;
  const adapter = new CommandAdapter({
    command: args.command,
    ...(args.modelName ? { modelName: args.modelName } : {}),
    prefetchTools: args.mode === "tools" ? "all" : "none",
  });

  const outputDir = path.resolve(
    process.cwd(),
    "artifacts/local-runs/adapter-datasets",
    args.outputName,
  );
  await mkdir(outputDir, { recursive: true });

  const evaluations = [];
  const failures: DatasetSummary["failures"] = [];

  for (const goldCase of selectedCases) {
    for (let rollout = 1; rollout <= args.rolloutsPerExample; rollout += 1) {
      try {
        const { artifact } = await executeWithAdapter({
          goldCase,
          mode: args.mode,
          adapter,
        });

        const artifactPath = path.join(
          outputDir,
          `${sanitizeForFilename(artifact.model_name)}_${goldCase.case_packet.case_id}_r${rollout}.json`,
        );
        await writeFile(artifactPath, JSON.stringify(artifact, null, 2), "utf8");
        evaluations.push(artifact.evaluation);
      } catch (error) {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        failures.push({
          case_id: goldCase.case_packet.case_id,
          rollout,
          error: message,
        });

        const failurePath = path.join(
          outputDir,
          `${sanitizeForFilename(args.modelName ?? "command-adapter")}_${goldCase.case_packet.case_id}_r${rollout}.error.txt`,
        );
        await writeFile(failurePath, message, "utf8");
      }
    }
  }

  const failedCaseIds = [...new Set(failures.map((item) => item.case_id))];

  const summary: DatasetSummary = {
    generated_at: new Date().toISOString(),
    runner: "command_adapter",
    model_name: args.modelName ?? "command-adapter",
    command: args.command,
    case_source: args.caseSource,
    prompt_mode: args.mode,
    limit: args.limit,
    rollouts_per_example: args.rolloutsPerExample,
    evaluated_samples: evaluations.length,
    evaluated_cases: selectedCases.length,
    failed_samples: failures.length,
    failed_cases: failedCaseIds.length,
    metrics: {
      exact_accuracy: average(evaluations.map((item) => item.overall.exactAccuracy)),
      consistency_pass_rate: average(evaluations.map((item) => item.overall.consistencyPassRate)),
      rubric_pass_rate: average(evaluations.map((item) => item.overall.rubricPassRate)),
      composite_score: average(evaluations.map((item) => item.overall.compositeScore)),
    },
    case_ids: selectedCases.map((goldCase) => goldCase.case_packet.case_id),
    failed_case_ids: failedCaseIds,
    failures,
  };

  const summaryPath = path.join(outputDir, "summary.json");
  await writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf8");
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Summary written to ${summaryPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
