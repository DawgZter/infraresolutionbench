import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type SweepCandidate = {
  rank: number;
  model: string;
  canonical_model?: string;
  notes?: string;
};

type SweepPlan = {
  source: string;
  captured_at: string;
  generated_at?: string;
  selected_prime_models?: SweepCandidate[];
  selected_openrouter_models?: SweepCandidate[];
  target_case_source?: string;
  target_prompt_mode?: string;
};

type PrimeEvalSummary = {
  evaluation_id: string;
  status: string;
  inference_model: string;
  avg_score: number | null;
  viewer_url: string;
  completed_at?: string | null;
  eval_config?: {
    env_args?: {
      case_source?: string;
      prompt_mode?: string;
      limit?: string;
      generator_family?: string;
    };
    num_examples?: number;
    rollouts_per_example?: number;
  };
  metrics?: {
    metrics?: {
      _json_valid_metric?: number;
    };
  };
};

type ProviderSelection = "prime" | "openrouter" | "both";

type Options = {
  planPath: string;
  outputPath: string | undefined;
  selection: ProviderSelection;
  caseSource: string | undefined;
  promptMode: string | undefined;
};

function parseArgs(argv: string[]): Options {
  const options: Options = {
    planPath: "",
    outputPath: undefined,
    selection: "both",
    caseSource: undefined,
    promptMode: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    switch (arg) {
      case "--plan":
        options.planPath = next ?? options.planPath;
        index += 1;
        break;
      case "--output":
        options.outputPath = next;
        index += 1;
        break;
      case "--selection":
        options.selection = (next as ProviderSelection | undefined) ?? options.selection;
        index += 1;
        break;
      case "--case-source":
        options.caseSource = next ?? options.caseSource;
        index += 1;
        break;
      case "--prompt-mode":
        options.promptMode = next ?? options.promptMode;
        index += 1;
        break;
      default:
        break;
    }
  }

  if (!options.planPath) {
    throw new Error("Missing required --plan path.");
  }

  return options;
}

function resolveOptionsFromPlan(options: Options, plan: SweepPlan): Options {
  return {
    ...options,
    caseSource: options.caseSource ?? plan.target_case_source ?? "synthetic",
    promptMode: options.promptMode ?? plan.target_prompt_mode ?? "tools",
  };
}

async function loadPlan(planPath: string): Promise<SweepPlan> {
  const raw = await readFile(path.resolve(process.cwd(), planPath), "utf8");
  return JSON.parse(raw) as SweepPlan;
}

async function loadImportedEvals(): Promise<PrimeEvalSummary[]> {
  const evalsDir = path.resolve(process.cwd(), "artifacts/prime-evals");
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(evalsDir, { withFileTypes: true }).catch(() => []);
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json"));

  return Promise.all(
    files.map(async (file) => {
      const raw = await readFile(path.join(evalsDir, file.name), "utf8");
      return JSON.parse(raw) as PrimeEvalSummary;
    }),
  );
}

function matchesRun(summary: PrimeEvalSummary, caseSource: string, promptMode: string): boolean {
  return (
    summary.eval_config?.env_args?.case_source === caseSource
    && summary.eval_config?.env_args?.prompt_mode === promptMode
    && !summary.eval_config?.env_args?.generator_family
  );
}

function latestByModel(summaries: PrimeEvalSummary[]): Map<string, PrimeEvalSummary> {
  const map = new Map<string, PrimeEvalSummary>();

  for (const summary of summaries) {
    const existing = map.get(summary.inference_model);
    const currentTime = summary.completed_at ? new Date(summary.completed_at).getTime() : 0;
    const existingTime = existing?.completed_at ? new Date(existing.completed_at).getTime() : 0;

    if (!existing || currentTime >= existingTime) {
      map.set(summary.inference_model, summary);
    }
  }

  return map;
}

function summarizeCandidates(
  provider: "prime" | "openrouter",
  candidates: SweepCandidate[],
  latest: Map<string, PrimeEvalSummary>,
) {
  return candidates.map((candidate) => {
    const summary = latest.get(candidate.model) ?? null;
    const jsonValid = summary?.metrics?.metrics?._json_valid_metric ?? null;
    let anomaly: string | null = null;

    if (summary?.status === "FAILED") {
      anomaly = "failed";
    } else if (summary?.status == "COMPLETED" && summary.avg_score === 0 && jsonValid === 0) {
      anomaly = "json_output_invalid";
    }

    return {
      provider,
      rank: candidate.rank,
      model: candidate.model,
      notes: candidate.notes ?? null,
      status: summary?.status ?? "NOT_RUN",
      avg_score: summary?.avg_score ?? null,
      evaluation_id: summary?.evaluation_id ?? null,
      viewer_url: summary?.viewer_url ?? null,
      json_valid_metric: jsonValid,
      anomaly,
    };
  });
}

async function main(): Promise<void> {
  const parsedOptions = parseArgs(process.argv.slice(2));
  const plan = await loadPlan(parsedOptions.planPath);
  const options = resolveOptionsFromPlan(parsedOptions, plan);
  const imported = await loadImportedEvals();
  if (!options.caseSource || !options.promptMode) {
    throw new Error("Resolved summary options are incomplete.");
  }
  const caseSource = options.caseSource;
  const promptMode = options.promptMode;
  const matching = imported.filter((summary) => matchesRun(summary, caseSource, promptMode));
  const latest = latestByModel(matching);

  const primeRows =
    options.selection === "openrouter"
      ? []
      : summarizeCandidates("prime", plan.selected_prime_models ?? [], latest);
  const openrouterRows =
    options.selection === "prime"
      ? []
      : summarizeCandidates("openrouter", plan.selected_openrouter_models ?? [], latest);

  const combined = [...primeRows, ...openrouterRows];
  const completed = combined
    .filter((row) => row.status === "COMPLETED" && typeof row.avg_score === "number")
    .sort((left, right) => (right.avg_score ?? -1) - (left.avg_score ?? -1));

  const payload = {
    source: plan.source,
    captured_at: plan.captured_at,
    summarized_at: new Date().toISOString(),
    selection: options.selection,
    case_source: caseSource,
    prompt_mode: promptMode,
    completed_rankings: completed,
    pending_or_missing: combined.filter((row) => row.status !== "COMPLETED"),
    anomalies: combined.filter((row) => row.anomaly !== null),
  };

  const defaultOutputPath = path.resolve(
    process.cwd(),
    "artifacts/model-sweeps/latest-summary.json",
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
