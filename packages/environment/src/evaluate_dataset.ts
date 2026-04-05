import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadAllCases, loadGoldCases, loadModelOutputFromFile } from "@infraresolutionbench/data";

import { createEpisodeArtifactBundle } from "./episode";
import { writeArtifactBundle } from "./index";

type CaseSource = "gold" | "all";

type CliArgs = {
  outputsDir: string;
  modelName: string;
  caseSource: CaseSource;
};

type RunSummary = {
  generated_at: string;
  model_name: string;
  case_source: CaseSource;
  outputs_dir: string;
  evaluated_count: number;
  missing_count: number;
  missing_case_ids: string[];
  metrics: {
    exact_accuracy: number;
    consistency_pass_rate: number;
    rubric_pass_rate: number;
    composite_score: number;
  };
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

  const outputsDir = args.get("--outputs-dir");
  const modelName = args.get("--model-name") ?? "mock-model";
  const caseSource = (args.get("--case-source") ?? "gold") as CaseSource;

  if (!outputsDir) {
    throw new Error(
      "Usage: npm run eval:dataset -- --outputs-dir <dir> [--model-name <name>] [--case-source gold|all]",
    );
  }

  if (caseSource !== "gold" && caseSource !== "all") {
    throw new Error(`Unsupported case source: ${caseSource}`);
  }

  return {
    outputsDir,
    modelName,
    caseSource,
  };
}

function average(values: number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const { outputsDir, modelName, caseSource } = parseArgs(process.argv.slice(2));
  const resolvedOutputsDir = path.resolve(process.cwd(), outputsDir);
  const cases = caseSource === "all" ? await loadAllCases() : await loadGoldCases();

  const evaluations = [];
  const missingCaseIds: string[] = [];

  for (const goldCase of cases) {
    const outputPath = path.join(resolvedOutputsDir, `${goldCase.case_packet.case_id}.json`);

    if (!(await fileExists(outputPath))) {
      missingCaseIds.push(goldCase.case_packet.case_id);
      continue;
    }

    const modelOutput = await loadModelOutputFromFile(outputPath);
    const artifact = createEpisodeArtifactBundle({
      goldCase,
      modelOutput,
      modelName,
      promptMode: "packet",
      outputSource: "mock_json",
    });
    await writeArtifactBundle(artifact);
    evaluations.push(artifact.evaluation);
  }

  const summary: RunSummary = {
    generated_at: new Date().toISOString(),
    model_name: modelName,
    case_source: caseSource,
    outputs_dir: resolvedOutputsDir,
    evaluated_count: evaluations.length,
    missing_count: missingCaseIds.length,
    missing_case_ids: missingCaseIds,
    metrics: {
      exact_accuracy: average(evaluations.map((item) => item.overall.exactAccuracy)),
      consistency_pass_rate: average(
        evaluations.map((item) => item.overall.consistencyPassRate),
      ),
      rubric_pass_rate: average(evaluations.map((item) => item.overall.rubricPassRate)),
      composite_score: average(evaluations.map((item) => item.overall.compositeScore)),
    },
  };

  const summaryDirectory = path.resolve(process.cwd(), "artifacts/local-runs/summaries");
  await mkdir(summaryDirectory, { recursive: true });
  const summaryPath = path.join(summaryDirectory, `${modelName}_${caseSource}_summary.json`);
  await writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf8");

  console.log(JSON.stringify(summary, null, 2));
  console.log(`Summary written to ${summaryPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
