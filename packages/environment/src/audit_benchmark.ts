import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

type GroundTruth = {
  issue_type: string;
  root_cause: string;
  customer_impact: string;
  contractual_applicability: string;
  recommended_owner: string;
  recommended_action: string;
  needs_human_review: boolean;
  confidence: string;
};

type CaseFile = {
  hidden_state?: {
    generator_family?: string;
  };
  ground_truth: GroundTruth;
};

type PrimeEvalSummary = {
  evaluation_id: string;
  inference_model: string;
  total_samples: number;
  avg_score: number | null;
  eval_config?: {
    env_args?: {
      case_source?: string;
      prompt_mode?: string;
    };
  };
  metrics?: {
    metrics?: {
      _exact_metric?: number;
      _consistency_metric?: number;
      _rubric_metric?: number;
      _json_valid_metric?: number;
    };
  };
};

type CliOptions = {
  outputPath: string;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    outputPath: "artifacts/benchmark-audit/latest.json",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--output" && next) {
      options.outputPath = next;
      index += 1;
    }
  }

  return options;
}

async function walkJsonFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const resolved = path.join(root, entry.name);
      if (entry.isDirectory()) {
        return walkJsonFiles(resolved);
      }

      return entry.name.endsWith(".json") ? [resolved] : [];
    }),
  );

  return files.flat();
}

function comboKey(groundTruth: GroundTruth): string {
  return [
    groundTruth.issue_type,
    groundTruth.root_cause,
    groundTruth.customer_impact,
    groundTruth.contractual_applicability,
    groundTruth.recommended_owner,
    groundTruth.recommended_action,
    String(groundTruth.needs_human_review),
    groundTruth.confidence,
  ].join(" | ");
}

function summarizeCounts(values: string[]): Array<{ value: string; count: number }> {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
}

async function summarizeDataset(root: string) {
  const files = await walkJsonFiles(root);
  const cases = await Promise.all(
    files.map(async (filePath) => JSON.parse(await readFile(filePath, "utf8")) as CaseFile),
  );

  const combos = cases.map((entry) => comboKey(entry.ground_truth));
  const families = cases.map((entry) => entry.hidden_state?.generator_family ?? "unknown");

  const byFamily = new Map<string, string[]>();
  for (let index = 0; index < cases.length; index += 1) {
    const family = families[index] ?? "unknown";
    const combo = combos[index] ?? "unknown";
    const bucket = byFamily.get(family) ?? [];
    bucket.push(combo);
    byFamily.set(family, bucket);
  }

  return {
    case_count: cases.length,
    distinct_ground_truth_combos: new Set(combos).size,
    top_ground_truth_combos: summarizeCounts(combos).slice(0, 12),
    generator_families: summarizeCounts(families),
    by_family: Array.from(byFamily.entries())
      .map(([family, familyCombos]) => ({
        family,
        case_count: familyCombos.length,
        distinct_ground_truth_combos: new Set(familyCombos).size,
        top_ground_truth_combos: summarizeCounts(familyCombos).slice(0, 8),
      }))
      .sort((left, right) => left.family.localeCompare(right.family)),
  };
}

async function loadPrimeEvalSummaries(): Promise<PrimeEvalSummary[]> {
  const root = path.resolve(process.cwd(), "artifacts/prime-evals");
  const files = await walkJsonFiles(root).catch(() => []);
  return Promise.all(
    files.map(async (filePath) => JSON.parse(await readFile(filePath, "utf8")) as PrimeEvalSummary),
  );
}

function summarizeEvalSlice(
  summaries: PrimeEvalSummary[],
  caseSource: string,
  promptMode: string,
): Array<Record<string, unknown>> {
  return summaries
    .filter(
      (summary) =>
        summary.eval_config?.env_args?.case_source === caseSource
        && summary.eval_config?.env_args?.prompt_mode === promptMode
        && typeof summary.avg_score === "number",
    )
    .map((summary) => ({
      model: summary.inference_model,
      evaluation_id: summary.evaluation_id,
      samples: summary.total_samples,
      avg_score: summary.avg_score,
      exact: summary.metrics?.metrics?._exact_metric ?? null,
      consistency: summary.metrics?.metrics?._consistency_metric ?? null,
      rubric: summary.metrics?.metrics?._rubric_metric ?? null,
      json_valid: summary.metrics?.metrics?._json_valid_metric ?? null,
    }))
    .sort((left, right) => Number(right.avg_score ?? -1) - Number(left.avg_score ?? -1));
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const goldRoot = path.resolve(process.cwd(), "packages/data/gold_cases");
  const syntheticRoot = path.resolve(process.cwd(), "packages/data/generated_cases");
  const primeSummaries = await loadPrimeEvalSummaries();

  const payload = {
    generated_at: new Date().toISOString(),
    datasets: {
      gold: await summarizeDataset(goldRoot),
      synthetic: await summarizeDataset(syntheticRoot),
    },
    eval_slices: {
      gold_tools: summarizeEvalSlice(primeSummaries, "gold", "tools"),
      synthetic_tools: summarizeEvalSlice(primeSummaries, "synthetic", "tools"),
    },
  };

  const outputPath = path.resolve(process.cwd(), options.outputPath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(outputPath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
