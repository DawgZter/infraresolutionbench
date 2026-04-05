import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Provider = "prime" | "openrouter";
type ProviderSelection = Provider | "both";

type ModelSweepSummaryRow = {
  provider: Provider;
  rank: number;
  model: string;
  notes: string | null;
  status: string;
  avg_score: number | null;
  evaluation_id: string | null;
  viewer_url: string | null;
  json_valid_metric: number | null;
  anomaly: string | null;
};

type ModelSweepSummary = {
  source: string;
  captured_at: string;
  summarized_at: string;
  selection: ProviderSelection;
  case_source: string;
  prompt_mode: string;
  completed_rankings: ModelSweepSummaryRow[];
  pending_or_missing: ModelSweepSummaryRow[];
  anomalies: ModelSweepSummaryRow[];
};

type SweepCandidate = {
  rank: number;
  model: string;
  canonical_model?: string;
  notes?: string;
};

type FollowupPlan = {
  source: string;
  captured_at: string;
  generated_at: string;
  based_on_summary: string;
  target_case_source: string;
  target_prompt_mode: string;
  target_num_examples: number;
  target_rollouts_per_example: number;
  target_limit: number;
  selected_prime_models: SweepCandidate[];
  selected_openrouter_models: SweepCandidate[];
};

type Options = {
  summaryPath: string;
  outputPath: string | undefined;
  providers: ProviderSelection;
  topN: number;
  targetCaseSource: string;
  targetPromptMode: string;
  numExamples: number;
  rolloutsPerExample: number;
  limit: number;
  minJsonValid: number;
  includeAnomalies: boolean;
};

function parseArgs(argv: string[]): Options {
  const defaults: Options = {
    summaryPath: "",
    outputPath: undefined,
    providers: "both",
    topN: 5,
    targetCaseSource: "gold",
    targetPromptMode: "tools",
    numExamples: 10,
    rolloutsPerExample: 3,
    limit: 10,
    minJsonValid: 0.99,
    includeAnomalies: false,
  };

  const options = { ...defaults };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    switch (arg) {
      case "--summary":
        options.summaryPath = next ?? options.summaryPath;
        index += 1;
        break;
      case "--output":
        options.outputPath = next;
        index += 1;
        break;
      case "--providers":
        options.providers = (next as ProviderSelection | undefined) ?? options.providers;
        index += 1;
        break;
      case "--top-n":
        options.topN = Number(next ?? options.topN);
        index += 1;
        break;
      case "--target-case-source":
        options.targetCaseSource = next ?? options.targetCaseSource;
        index += 1;
        break;
      case "--target-prompt-mode":
        options.targetPromptMode = next ?? options.targetPromptMode;
        index += 1;
        break;
      case "--num-examples":
        options.numExamples = Number(next ?? options.numExamples);
        index += 1;
        break;
      case "--rollouts-per-example":
        options.rolloutsPerExample = Number(next ?? options.rolloutsPerExample);
        index += 1;
        break;
      case "--limit":
        options.limit = Number(next ?? options.limit);
        index += 1;
        break;
      case "--min-json-valid":
        options.minJsonValid = Number(next ?? options.minJsonValid);
        index += 1;
        break;
      case "--include-anomalies":
        options.includeAnomalies = true;
        break;
      default:
        break;
    }
  }

  if (!options.summaryPath) {
    throw new Error("Missing required --summary path.");
  }

  if (!Number.isFinite(options.topN) || options.topN < 1) {
    throw new Error("--top-n must be a positive integer.");
  }

  return options;
}

async function loadSummary(summaryPath: string): Promise<ModelSweepSummary> {
  const raw = await readFile(path.resolve(process.cwd(), summaryPath), "utf8");
  return JSON.parse(raw) as ModelSweepSummary;
}

function matchesProvider(row: ModelSweepSummaryRow, providers: ProviderSelection): boolean {
  return providers === "both" || row.provider === providers;
}

function toCandidate(row: ModelSweepSummaryRow): SweepCandidate {
  const bits = [
    row.notes,
    row.avg_score === null ? null : `sweep_score=${row.avg_score.toFixed(3)}`,
    row.json_valid_metric === null ? null : `json_valid=${row.json_valid_metric.toFixed(3)}`,
    row.evaluation_id === null ? null : `eval_id=${row.evaluation_id}`,
  ].filter((value): value is string => value !== null);

  return {
    rank: row.rank,
    model: row.model,
    notes: bits.join(" | "),
  };
}

function selectTopRows(summary: ModelSweepSummary, options: Options): ModelSweepSummaryRow[] {
  return summary.completed_rankings.filter((row) => {
    if (!matchesProvider(row, options.providers)) {
      return false;
    }

    if (!options.includeAnomalies && row.anomaly !== null) {
      return false;
    }

    if ((row.json_valid_metric ?? 0) < options.minJsonValid) {
      return false;
    }

    return typeof row.avg_score === "number";
  }).slice(0, options.topN);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const summary = await loadSummary(options.summaryPath);
  const selectedRows = selectTopRows(summary, options);

  const selectedPrimeModels = selectedRows
    .filter((row) => row.provider === "prime")
    .map(toCandidate);
  const selectedOpenrouterModels = selectedRows
    .filter((row) => row.provider === "openrouter")
    .map(toCandidate);

  const payload: FollowupPlan = {
    source: `followup:${summary.source}`,
    captured_at: summary.captured_at,
    generated_at: new Date().toISOString(),
    based_on_summary: path.resolve(process.cwd(), options.summaryPath),
    target_case_source: options.targetCaseSource,
    target_prompt_mode: options.targetPromptMode,
    target_num_examples: options.numExamples,
    target_rollouts_per_example: options.rolloutsPerExample,
    target_limit: options.limit,
    selected_prime_models: selectedPrimeModels,
    selected_openrouter_models: selectedOpenrouterModels,
  };

  const defaultOutputPath = path.resolve(
    process.cwd(),
    "artifacts/model-sweeps/latest-followup-plan.json",
  );
  const outputPath = path.resolve(process.cwd(), options.outputPath ?? defaultOutputPath);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(outputPath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
