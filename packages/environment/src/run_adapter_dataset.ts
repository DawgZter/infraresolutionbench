import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
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
  resume: boolean;
  retryFailed: boolean;
  retryPolicy: "all" | "api-only";
  delayMs: number;
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

type StoredEvaluation = {
  overall: {
    exactAccuracy: number;
    consistencyPassRate: number;
    rubricPassRate: number;
    compositeScore: number;
  };
};

function parseArgs(argv: string[]): CliArgs {
  const args = new Map<string, string>();
  const flags = new Set<string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (typeof token !== "string" || !token.startsWith("--")) {
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      flags.add(token);
      continue;
    }

    args.set(token, next);
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
  const retryPolicy = (args.get("--retry-policy") ?? "all") as "all" | "api-only";
  const delayMs = Number(args.get("--delay-ms") ?? "0");

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

  if (retryPolicy !== "all" && retryPolicy !== "api-only") {
    throw new Error(`Unsupported retry policy: ${retryPolicy}`);
  }

  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new Error(`Unsupported delay: ${args.get("--delay-ms") ?? String(delayMs)}`);
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
    resume: flags.has("--resume"),
    retryFailed: flags.has("--retry-failed"),
    retryPolicy,
    delayMs,
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isApiRetryableFailure(message: string): boolean {
  return /fetch failed|timeout|timed out|aborted|aborterror|econnreset|enotfound|socket hang up|429|408|409|50\d|prime inference request failed/i.test(
    message,
  );
}

type SampleKey = `${string}::${number}`;

type ExistingRunState = {
  successMap: Map<SampleKey, StoredEvaluation>;
  failureMap: Map<SampleKey, DatasetSummary["failures"][number]>;
};

function buildSampleKey(caseId: string, rollout: number): SampleKey {
  return `${caseId}::${rollout}`;
}

function parseSampleFile(fileName: string): { caseId: string; rollout: number; isFailure: boolean } | null {
  const match = fileName.match(/_(.+)_r(\d+)(\.error\.txt|\.json)$/);
  if (!match) {
    return null;
  }

  const [, caseId, rolloutRaw, suffix] = match;
  if (!caseId || !rolloutRaw || !suffix) {
    return null;
  }

  return {
    caseId,
    rollout: Number(rolloutRaw),
    isFailure: suffix === ".error.txt",
  };
}

async function loadExistingRunState(outputDir: string): Promise<ExistingRunState> {
  const successMap = new Map<SampleKey, StoredEvaluation>();
  const failureMap = new Map<SampleKey, DatasetSummary["failures"][number]>();
  const entries = await readdir(outputDir, { withFileTypes: true }).catch(() => []);

  for (const entry of entries) {
    if (!entry.isFile() || entry.name === "summary.json") {
      continue;
    }

    const parsed = parseSampleFile(entry.name);
    if (!parsed) {
      continue;
    }

    const key = buildSampleKey(parsed.caseId, parsed.rollout);
    const filePath = path.join(outputDir, entry.name);

    if (parsed.isFailure) {
      const error = await readFile(filePath, "utf8");
      failureMap.set(key, {
        case_id: parsed.caseId,
        rollout: parsed.rollout,
        error,
      });
      continue;
    }

    try {
      const raw = await readFile(filePath, "utf8");
      const artifact = JSON.parse(raw) as { evaluation?: StoredEvaluation };
      if (!artifact.evaluation) {
        throw new Error("Missing evaluation block");
      }
      successMap.set(key, artifact.evaluation);
      failureMap.delete(key);
    } catch {
      failureMap.set(key, {
        case_id: parsed.caseId,
        rollout: parsed.rollout,
        error: `Could not parse existing artifact: ${entry.name}`,
      });
    }
  }

  return { successMap, failureMap };
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

  const failures: DatasetSummary["failures"] = [];
  const existing = args.resume ? await loadExistingRunState(outputDir) : null;

  for (const goldCase of selectedCases) {
    for (let rollout = 1; rollout <= args.rolloutsPerExample; rollout += 1) {
      const sampleKey = buildSampleKey(goldCase.case_packet.case_id, rollout);
      const existingSuccess = existing?.successMap.get(sampleKey);
      const existingFailure = existing?.failureMap.get(sampleKey);

      if (args.resume && existingSuccess) {
        continue;
      }

      if (args.resume && existingFailure && !args.retryFailed) {
        continue;
      }

      if (
        args.resume &&
        existingFailure &&
        args.retryFailed &&
        args.retryPolicy === "api-only" &&
        !isApiRetryableFailure(existingFailure.error)
      ) {
        continue;
      }

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
        const failurePath = path.join(
          outputDir,
          `${sanitizeForFilename(args.modelName ?? "command-adapter")}_${goldCase.case_packet.case_id}_r${rollout}.error.txt`,
        );
        await rm(failurePath, { force: true }).catch(() => undefined);
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

      if (args.delayMs > 0) {
        await sleep(args.delayMs);
      }
    }
  }

  const finalState = await loadExistingRunState(outputDir);
  const failedCaseIds = [...new Set([...finalState.failureMap.values()].map((item) => item.case_id))];
  const evaluations = [...finalState.successMap.values()];
  const allFailures = [...finalState.failureMap.values()];

  const summary: DatasetSummary = {
    generated_at: new Date().toISOString(),
    runner: "command_adapter",
    model_name: args.modelName ?? "command-adapter",
    command: args.command,
    case_source: args.caseSource,
    prompt_mode: args.mode,
    limit: args.limit,
    rollouts_per_example: args.rolloutsPerExample,
    evaluated_samples: finalState.successMap.size,
    evaluated_cases: selectedCases.length,
    failed_samples: allFailures.length,
    failed_cases: failedCaseIds.length,
    metrics: {
      exact_accuracy: average(evaluations.map((item) => item.overall.exactAccuracy)),
      consistency_pass_rate: average(evaluations.map((item) => item.overall.consistencyPassRate)),
      rubric_pass_rate: average(evaluations.map((item) => item.overall.rubricPassRate)),
      composite_score: average(evaluations.map((item) => item.overall.compositeScore)),
    },
    case_ids: selectedCases.map((goldCase) => goldCase.case_packet.case_id),
    failed_case_ids: failedCaseIds,
    failures: allFailures,
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
