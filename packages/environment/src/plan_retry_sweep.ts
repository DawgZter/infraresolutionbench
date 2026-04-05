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

type RetryPlan = {
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

type ImportedEvalSummary = {
  evaluation_id: string;
  eval_config?: {
    num_examples?: number;
    rollouts_per_example?: number;
    env_args?: {
      limit?: string;
    };
  };
};

type Options = {
  summaryPath: string;
  outputPath: string | undefined;
  providers: ProviderSelection;
  statuses: Set<string>;
  includeAnomaliesOnly: boolean;
  maxModels: number | undefined;
};

function parseArgs(argv: string[]): Options {
  const options: Options = {
    summaryPath: "",
    outputPath: undefined,
    providers: "both",
    statuses: new Set(["FAILED", "RUNNING", "NOT_RUN"]),
    includeAnomaliesOnly: false,
    maxModels: undefined,
  };

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
      case "--statuses":
        options.statuses = new Set((next ?? "").split(",").map((item) => item.trim()).filter(Boolean));
        index += 1;
        break;
      case "--anomalies-only":
        options.includeAnomaliesOnly = true;
        break;
      case "--max-models":
        options.maxModels = Number(next);
        index += 1;
        break;
      default:
        break;
    }
  }

  if (!options.summaryPath) {
    throw new Error("Missing required --summary path.");
  }

  return options;
}

async function loadSummary(summaryPath: string): Promise<ModelSweepSummary> {
  const raw = await readFile(path.resolve(process.cwd(), summaryPath), "utf8");
  return JSON.parse(raw) as ModelSweepSummary;
}

async function loadImportedEvalById(evaluationId: string): Promise<ImportedEvalSummary | null> {
  const filePath = path.resolve(process.cwd(), "artifacts/prime-evals", `${evaluationId}.json`);
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as ImportedEvalSummary;
  } catch {
    return null;
  }
}

function matchesProvider(row: ModelSweepSummaryRow, providers: ProviderSelection): boolean {
  return providers === "both" || row.provider === providers;
}

function toCandidate(row: ModelSweepSummaryRow): SweepCandidate {
  const bits = [
    row.notes,
    row.status ? `retry_status=${row.status}` : null,
    row.anomaly ? `anomaly=${row.anomaly}` : null,
    row.evaluation_id ? `prior_eval_id=${row.evaluation_id}` : null,
  ].filter((value): value is string => value !== null);

  return {
    rank: row.rank,
    model: row.model,
    notes: bits.join(" | "),
  };
}

function selectRetryRows(summary: ModelSweepSummary, options: Options): ModelSweepSummaryRow[] {
  const selected = summary.pending_or_missing.filter((row) => {
    if (!matchesProvider(row, options.providers)) {
      return false;
    }

    if (!options.statuses.has(row.status)) {
      return false;
    }

    if (options.includeAnomaliesOnly && row.anomaly === null) {
      return false;
    }

    return true;
  });

  return options.maxModels ? selected.slice(0, options.maxModels) : selected;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const summary = await loadSummary(options.summaryPath);
  const selectedRows = selectRetryRows(summary, options);
  const referenceEvalId = selectedRows.find((row) => row.evaluation_id !== null)?.evaluation_id ?? null;
  const referenceEval = referenceEvalId ? await loadImportedEvalById(referenceEvalId) : null;
  const targetNumExamples = referenceEval?.eval_config?.num_examples ?? 21;
  const targetRolloutsPerExample = referenceEval?.eval_config?.rollouts_per_example ?? 3;
  const targetLimit = Number(referenceEval?.eval_config?.env_args?.limit ?? 21);

  const payload: RetryPlan = {
    source: `retry:${summary.source}`,
    captured_at: summary.captured_at,
    generated_at: new Date().toISOString(),
    based_on_summary: path.resolve(process.cwd(), options.summaryPath),
    target_case_source: summary.case_source,
    target_prompt_mode: summary.prompt_mode,
    target_num_examples: targetNumExamples,
    target_rollouts_per_example: targetRolloutsPerExample,
    target_limit: targetLimit,
    selected_prime_models: selectedRows.filter((row) => row.provider === "prime").map(toCandidate),
    selected_openrouter_models: selectedRows.filter((row) => row.provider === "openrouter").map(toCandidate),
  };

  const defaultOutputPath = path.resolve(process.cwd(), "artifacts/model-sweeps/latest-retry-plan.json");
  const outputPath = path.resolve(process.cwd(), options.outputPath ?? defaultOutputPath);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(outputPath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
