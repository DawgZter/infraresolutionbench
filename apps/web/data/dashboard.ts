import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadGoldCases } from "@infraresolutionbench/data";
import type {
  AdapterRequest,
  AdapterResponse,
  ArtifactBundle,
  EpisodeArtifactBundle,
} from "@infraresolutionbench/environment";
import type { GoldCase } from "@infraresolutionbench/shared";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);
const repoRoot = path.resolve(currentDirectory, "../../..");

const localRunsDirectory = path.join(repoRoot, "artifacts/local-runs");
const localRunSummariesDirectory = path.join(repoRoot, "artifacts/local-runs/summaries");
const primeEvaluationsDirectory = path.join(repoRoot, "artifacts/prime-evals");
const primeEvalSamplesDirectory = path.join(repoRoot, "artifacts/prime-eval-samples");
const primeRequestsDirectory = path.join(repoRoot, "artifacts/prime-requests");
const primeResponsesDirectory = path.join(repoRoot, "artifacts/prime-responses");
const generatedCasesDirectory = path.join(repoRoot, "packages/data/generated_cases");
const modelSweepDirectory = path.join(repoRoot, "artifacts/model-sweeps");
const finalRoundupPath = path.join(modelSweepDirectory, "final-roundup-2026-04-05.json");

export type LeaderboardRow = {
  modelName: string;
  runCount: number;
  exactAccuracy: number;
  consistencyPassRate: number;
  rubricPassRate: number;
  compositeScore: number;
  caseIds: string[];
};

export type StoredArtifact = ArtifactBundle | EpisodeArtifactBundle;
export type RunSummary = {
  generated_at: string;
  model_name: string;
  case_source: "gold" | "all";
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
export type StoredProtocolRequest = {
  fileName: string;
  payload: AdapterRequest;
};
export type StoredProtocolResponse = {
  fileName: string;
  caseId: string;
  payload: AdapterResponse;
};
export type PrimeEvalSummary = {
  evaluation_id: string;
  name: string;
  status: string;
  environment_names?: string[];
  is_hosted: boolean;
  inference_model: string;
  total_samples: number;
  avg_score: number | null;
  completed_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  viewer_url: string;
  eval_config: {
    num_examples: number;
    rollouts_per_example: number;
    env_args?: {
      case_source?: string;
      prompt_mode?: string;
      limit?: string;
      generator_family?: string;
    };
  };
  metrics?: {
    reward?: number;
    error?: number;
    metrics?: {
      _exact_metric?: number;
      _consistency_metric?: number;
      _rubric_metric?: number;
      _json_valid_metric?: number;
    };
  };
};

export type PrimeModeComparisonRow = {
  caseSource: string;
  modelName: string;
  packetEval: PrimeEvalSummary | null;
  toolsEval: PrimeEvalSummary | null;
  packetExamples: number | null;
  toolsExamples: number | null;
  packetRollouts: number | null;
  toolsRollouts: number | null;
  packetScore: number | null;
  toolsScore: number | null;
  delta: number | null;
};

export type PrimeEvalSampleImport = {
  evaluation_id: string;
  imported_at: string;
  total: number;
  total_pages: number;
  limit: number;
  samples: Array<{
    sample_id: string;
    example_id: number | null;
    rollout_number: number | null;
    reward: number | null;
    case_id: string | null;
    generator_family: string | null;
    prompt_mode: string | null;
    authoring_style: string | null;
  }>;
};

export type PrimeFamilyComparisonRow = {
  family: string;
  modelName: string;
  caseSource: string;
  packetEvalId: string | null;
  toolsEvalId: string | null;
  packetAverage: number | null;
  toolsAverage: number | null;
  delta: number | null;
  packetSamples: number;
  toolsSamples: number;
};

export type PrimeTargetedEvalRow = {
  evaluationId: string;
  modelName: string;
  caseSource: string;
  promptMode: string;
  generatorFamily: string;
  numExamples: number;
  rolloutsPerExample: number;
  avgScore: number | null;
};

export type PrimeTargetedComparisonRow = {
  generatorFamily: string;
  modelName: string;
  caseSource: string;
  packetEval: PrimeEvalSummary | null;
  toolsEval: PrimeEvalSummary | null;
  packetScore: number | null;
  toolsScore: number | null;
  delta: number | null;
  packetConfig: string | null;
  toolsConfig: string | null;
};

export type PrimeHostedLeaderboardRow = {
  modelName: string;
  providerLabel: string;
  benchmarkLabel: string;
  promptMode: string;
  statusLabel: string;
  notes: string | null;
  goldStatus: string;
  syntheticStatus: string;
  overallScore: number | null;
  goldScore: number | null;
  syntheticScore: number | null;
  goldExactScore: number | null;
  syntheticExactScore: number | null;
  overallExactScore: number | null;
  goldSamples: number;
  syntheticSamples: number;
  totalSamples: number;
  jsonValid: number | null;
  goldEvalId: string | null;
  syntheticEvalId: string | null;
  costEstimate: number | null;
};

export type ModelSweepSummaryRow = {
  provider: "prime" | "openrouter";
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

export type ModelSweepSummary = {
  source: string;
  captured_at: string;
  summarized_at: string;
  selection: "prime" | "openrouter" | "both";
  case_source: string;
  prompt_mode: string;
  completed_rankings: ModelSweepSummaryRow[];
  pending_or_missing: ModelSweepSummaryRow[];
  anomalies: ModelSweepSummaryRow[];
};

type FinalRoundupEvalRef = {
  id: string;
  score: number | null;
  viewer_url: string;
};

type FinalRoundupLatestEvalRef = {
  id: string;
  status: string;
  samples: number;
  score: number | null;
  viewer_url: string;
};

type FinalRoundupStableRow = {
  model: string;
  rank_hint: number;
  notes: string | null;
  source_list: string;
  gold_eval: FinalRoundupEvalRef | null;
  synthetic_eval: FinalRoundupEvalRef | null;
  latest_gold: FinalRoundupLatestEvalRef | null;
  latest_synthetic: FinalRoundupLatestEvalRef | null;
  composite: number | null;
  status: string;
};

type FinalRoundupIncompleteRow = {
  model: string;
  rank_hint: number;
  notes: string | null;
  source_list: string;
  gold_eval: FinalRoundupEvalRef | null;
  synthetic_eval: FinalRoundupEvalRef | null;
  latest_gold: FinalRoundupLatestEvalRef | null;
  latest_synthetic: FinalRoundupLatestEvalRef | null;
  status: string;
  reason: string;
};

type FinalRoundup = {
  source: string;
  captured_at: string;
  generated_at: string;
  weights: {
    gold: number;
    synthetic: number;
  };
  stable_ranked: FinalRoundupStableRow[];
  unstable_or_provisional: FinalRoundupIncompleteRow[];
  incomplete_or_blocked: FinalRoundupIncompleteRow[];
};

function average(values: number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function countSyntheticCases(): Promise<number> {
  const families = await readdir(generatedCasesDirectory, { withFileTypes: true }).catch(() => []);
  let total = 0;

  for (const family of families) {
    if (!family.isDirectory()) {
      continue;
    }

    const files = await readdir(`${generatedCasesDirectory}/${family.name}`, {
      withFileTypes: true,
    });
    total += files.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).length;
  }

  return total;
}

async function countSyntheticFamilies(): Promise<number> {
  const families = await readdir(generatedCasesDirectory, { withFileTypes: true }).catch(() => []);
  return families.filter((entry) => entry.isDirectory()).length;
}

async function countRunSummaries(): Promise<number> {
  const entries = await readdir(localRunSummariesDirectory, { withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).length;
}

async function countPrimeEvaluations(): Promise<number> {
  const entries = await readdir(primeEvaluationsDirectory, { withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).length;
}

async function countPrimeArtifacts(directory: string): Promise<number> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).length;
}

async function countModelSweepSummaries(): Promise<number> {
  const entries = await readdir(modelSweepDirectory, { withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isFile() && entry.name.endsWith("-summary.json")).length;
}

export async function loadArtifacts(): Promise<StoredArtifact[]> {
  const entries = await readdir(localRunsDirectory, { withFileTypes: true }).catch(() => []);
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(
    files.map(async (fileName) => {
      const raw = await readFile(`${localRunsDirectory}/${fileName}`, "utf8");
      return JSON.parse(raw) as StoredArtifact;
    }),
  );
}

async function loadPrimeRequests(): Promise<StoredProtocolRequest[]> {
  const entries = await readdir(primeRequestsDirectory, { withFileTypes: true }).catch(() => []);
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(
    files.map(async (fileName) => {
      const raw = await readFile(`${primeRequestsDirectory}/${fileName}`, "utf8");
      return {
        fileName,
        payload: JSON.parse(raw) as AdapterRequest,
      };
    }),
  );
}

async function loadPrimeResponses(): Promise<StoredProtocolResponse[]> {
  const entries = await readdir(primeResponsesDirectory, { withFileTypes: true }).catch(() => []);
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(
    files.map(async (fileName) => {
      const raw = await readFile(`${primeResponsesDirectory}/${fileName}`, "utf8");
      const caseId = fileName.split("_tools_")[0]?.split("_packet_")[0] ?? fileName.replace(/\.json$/, "");

      return {
        fileName,
        caseId,
        payload: JSON.parse(raw) as AdapterResponse,
      };
    }),
  );
}

export async function loadOverviewData() {
  const [
    goldCases,
    artifacts,
    syntheticCaseCount,
    syntheticFamilyCount,
    runSummaryCount,
    primeEvaluationCount,
    primeRequestCount,
    primeResponseCount,
    primeComparisons,
    primeFamilyComparisons,
    hostedLeaderboardRows,
    modelSweepSummaryCount,
    latestModelSweepSummary,
  ] = await Promise.all([
    loadGoldCases(),
    loadArtifacts(),
    countSyntheticCases(),
    countSyntheticFamilies(),
    countRunSummaries(),
    countPrimeEvaluations(),
    countPrimeArtifacts(primeRequestsDirectory),
    countPrimeArtifacts(primeResponsesDirectory),
    loadPrimeModeComparisons(),
    loadPrimeFamilyComparisons(),
    loadPrimeHostedLeaderboardRows(),
    countModelSweepSummaries(),
    loadLatestModelSweepSummary(),
  ]);

  return {
    goldCaseCount: goldCases.length,
    syntheticCaseCount,
    syntheticFamilyCount,
    runCount: artifacts.length,
    runSummaryCount,
    primeEvaluationCount,
    primeRequestCount,
    primeResponseCount,
    modelSweepSummaryCount,
    issueTypes: Array.from(new Set(goldCases.map((item) => item.ground_truth.issue_type))).length,
    primeComparisons,
    primeFamilyComparisons,
    hostedLeaderboardRows,
    latestModelSweepSummary,
  };
}

export async function loadCaseExplorerData(selectedCaseId?: string) {
  const [goldCases, artifacts, primeRequests, primeResponses] = await Promise.all([
    loadGoldCases(),
    loadArtifacts(),
    loadPrimeRequests(),
    loadPrimeResponses(),
  ]);
  const selectedCase =
    goldCases.find((goldCase) => goldCase.case_packet.case_id === selectedCaseId) ??
    goldCases[0] ??
    null;

  return {
    cases: goldCases,
    selectedCase,
    artifactsForCase: selectedCase
      ? artifacts.filter((artifact) => artifact.case_packet.case_id === selectedCase.case_packet.case_id)
      : [],
    protocolRequestsForCase: selectedCase
      ? primeRequests.filter(
          (request) => request.payload.case_id === selectedCase.case_packet.case_id,
        )
      : [],
    protocolResponsesForCase: selectedCase
      ? primeResponses.filter(
          (response) => response.caseId === selectedCase.case_packet.case_id,
        )
      : [],
  };
}

export async function loadLeaderboardData(): Promise<LeaderboardRow[]> {
  const artifacts = await loadArtifacts();
  const buckets = new Map<string, ArtifactBundle[]>();

  for (const artifact of artifacts) {
    const bucket = buckets.get(artifact.model_name) ?? [];
    bucket.push(artifact);
    buckets.set(artifact.model_name, bucket);
  }

  return Array.from(buckets.entries())
    .map(([modelName, runs]) => ({
      modelName,
      runCount: runs.length,
      exactAccuracy: average(runs.map((run) => run.evaluation.overall.exactAccuracy)),
      consistencyPassRate: average(runs.map((run) => run.evaluation.overall.consistencyPassRate)),
      rubricPassRate: average(runs.map((run) => run.evaluation.overall.rubricPassRate)),
      compositeScore: average(runs.map((run) => run.evaluation.overall.compositeScore)),
      caseIds: runs.map((run) => run.case_packet.case_id),
    }))
    .sort((left, right) => right.compositeScore - left.compositeScore);
}

export async function loadPrimeEvalSummaries(): Promise<PrimeEvalSummary[]> {
  const entries = await readdir(primeEvaluationsDirectory, { withFileTypes: true }).catch(() => []);
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left));

  return Promise.all(
    files.map(async (fileName) => {
      const raw = await readFile(`${primeEvaluationsDirectory}/${fileName}`, "utf8");
      return JSON.parse(raw) as PrimeEvalSummary;
    }),
  );
}

export async function loadModelSweepSummaries(): Promise<ModelSweepSummary[]> {
  const entries = await readdir(modelSweepDirectory, { withFileTypes: true }).catch(() => []);
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith("-summary.json"))
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left));

  return Promise.all(
    files.map(async (fileName) => {
      const raw = await readFile(`${modelSweepDirectory}/${fileName}`, "utf8");
      return JSON.parse(raw) as ModelSweepSummary;
    }),
  );
}

async function loadFinalRoundup(): Promise<FinalRoundup | null> {
  const raw = await readFile(finalRoundupPath, "utf8").catch(() => null);
  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as FinalRoundup;
}

export async function loadLatestModelSweepSummary(): Promise<ModelSweepSummary | null> {
  const finalRoundup = await loadFinalRoundup();
  if (finalRoundup) {
    return {
      source: finalRoundup.source,
      captured_at: finalRoundup.captured_at,
      summarized_at: finalRoundup.generated_at,
      selection: "both",
      case_source: "mixed",
      prompt_mode: "tools",
      completed_rankings: finalRoundup.stable_ranked.map((row, index) => ({
        provider: row.source_list === "openrouter" ? "openrouter" : "prime",
        rank: index + 1,
        model: row.model,
        notes: row.notes,
        status: row.status,
        avg_score: row.composite,
        evaluation_id:
          row.gold_eval && row.synthetic_eval
            ? `${row.gold_eval.id} / ${row.synthetic_eval.id}`
            : row.gold_eval?.id ?? row.synthetic_eval?.id ?? null,
        viewer_url: row.gold_eval?.viewer_url ?? row.synthetic_eval?.viewer_url ?? null,
        json_valid_metric: null,
        anomaly: null,
      })),
      pending_or_missing: [
        ...finalRoundup.unstable_or_provisional,
        ...finalRoundup.incomplete_or_blocked,
      ].map((row) => ({
        provider: row.source_list === "openrouter" ? "openrouter" : "prime",
        rank: row.rank_hint,
        model: row.model,
        notes: row.notes,
        status: row.status,
        avg_score: "composite" in row ? (row as FinalRoundupStableRow).composite : null,
        evaluation_id:
          row.gold_eval && row.synthetic_eval
            ? `${row.gold_eval.id} / ${row.synthetic_eval.id}`
            : row.gold_eval?.id ?? row.synthetic_eval?.id ?? null,
        viewer_url: row.gold_eval?.viewer_url ?? row.synthetic_eval?.viewer_url ?? null,
        json_valid_metric: null,
        anomaly: row.reason,
      })),
      anomalies: finalRoundup.unstable_or_provisional.map((row) => ({
        provider: row.source_list === "openrouter" ? "openrouter" : "prime",
        rank: row.rank_hint,
        model: row.model,
        notes: row.notes,
        status: row.status,
        avg_score: null,
        evaluation_id:
          row.gold_eval && row.synthetic_eval
            ? `${row.gold_eval.id} / ${row.synthetic_eval.id}`
            : row.gold_eval?.id ?? row.synthetic_eval?.id ?? null,
        viewer_url: row.gold_eval?.viewer_url ?? row.synthetic_eval?.viewer_url ?? null,
        json_valid_metric: null,
        anomaly: row.reason,
      })),
    };
  }

  const summaries = await loadModelSweepSummaries();
  return summaries[0] ?? null;
}

async function loadPrimeEvalSampleImports(): Promise<PrimeEvalSampleImport[]> {
  const entries = await readdir(primeEvalSamplesDirectory, { withFileTypes: true }).catch(() => []);
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left));

  return Promise.all(
    files.map(async (fileName) => {
      const raw = await readFile(`${primeEvalSamplesDirectory}/${fileName}`, "utf8");
      return JSON.parse(raw) as PrimeEvalSampleImport;
    }),
  );
}

function getPrimeScore(summary: PrimeEvalSummary | null): number | null {
  if (!summary) {
    return null;
  }

  return summary.avg_score ?? summary.metrics?.reward ?? null;
}

function getPrimeCompletedAt(summary: PrimeEvalSummary): number {
  return summary.completed_at ? new Date(summary.completed_at).getTime() : 0;
}

function getPrimeSummaryRecency(summary: PrimeEvalSummary | null): number {
  if (!summary) {
    return 0;
  }

  return summary.updated_at
    ? new Date(summary.updated_at).getTime()
    : summary.created_at
      ? new Date(summary.created_at).getTime()
      : getPrimeCompletedAt(summary);
}

function getPrimeSampleCount(summary: PrimeEvalSummary | null): number {
  if (!summary) {
    return 0;
  }

  return summary.eval_config.num_examples * summary.eval_config.rollouts_per_example;
}

function getPrimeJsonValid(summary: PrimeEvalSummary | null): number | null {
  return summary?.metrics?.metrics?._json_valid_metric ?? null;
}

function getPrimeExactScore(summary: PrimeEvalSummary | null): number | null {
  return summary?.metrics?.metrics?._exact_metric ?? null;
}

function getProviderLabel(modelName: string): string {
  const slashPrefix = modelName.split("/")[0];
  if (slashPrefix && slashPrefix !== modelName) {
    return slashPrefix;
  }

  return modelName.split("-")[0] ?? "unknown";
}

function normalizeSummaryStatus(summary: PrimeEvalSummary | null): string {
  if (!summary) {
    return "missing";
  }

  return summary.status.toLowerCase();
}

function isPrimeSummaryUnstable(summary: PrimeEvalSummary | null): boolean {
  if (!summary || summary.status !== "COMPLETED") {
    return false;
  }

  const jsonValid = getPrimeJsonValid(summary);
  const errorRate = summary.metrics?.error ?? null;
  const avgScore = summary.avg_score ?? null;
  const totalSamples = summary.total_samples ?? 0;

  return (jsonValid !== null && jsonValid < 0.7)
    || (typeof errorRate === "number" && errorRate > 0.3)
    // A fully completed run with a literal zero score across many samples
    // has so far indicated provider/output-loop failure rather than a
    // trustworthy benchmark result.
    || (typeof avgScore === "number" && avgScore === 0 && totalSamples > 0);
}

export function formatPrimeBenchmarkLabel(summary: PrimeEvalSummary): string {
  const caseSource = summary.eval_config.env_args?.case_source ?? "unknown";
  const promptMode = summary.eval_config.env_args?.prompt_mode ?? "unknown";
  const numExamples = summary.eval_config.num_examples;
  const rollouts = summary.eval_config.rollouts_per_example;

  return `${caseSource} | ${promptMode} | ${numExamples}x${rollouts} | ${summary.inference_model}`;
}

function computeWeightedAverage(
  goldValue: number | null,
  syntheticValue: number | null,
  goldWeight = 0.6,
  syntheticWeight = 0.4,
): number | null {
  if (goldValue !== null && syntheticValue !== null) {
    return (goldValue * goldWeight) + (syntheticValue * syntheticWeight);
  }

  if (goldValue !== null) {
    return goldValue;
  }

  if (syntheticValue !== null) {
    return syntheticValue;
  }

  return null;
}

type RequestedHostedModelPlan = {
  selected_prime_models?: Array<{ model: string }>;
  selected_openrouter_models?: Array<{ model: string }>;
};

async function loadRequestedHostedModels(): Promise<string[]> {
  const requested = new Set<string>();
  const planPath = path.join(modelSweepDirectory, "aa-2026-04-05-plan.json");
  const rawPlan = await readFile(planPath, "utf8").catch(() => null);

  if (rawPlan) {
    const parsed = JSON.parse(rawPlan) as RequestedHostedModelPlan;

    for (const item of parsed.selected_prime_models ?? []) {
      requested.add(item.model);
    }

    for (const item of parsed.selected_openrouter_models ?? []) {
      requested.add(item.model);
    }
  }

  requested.add("glm-5.1");

  return Array.from(requested).sort((left, right) => left.localeCompare(right));
}

export async function loadPrimeModeComparisons(): Promise<PrimeModeComparisonRow[]> {
  const summaries = await loadPrimeEvalSummaries();
  const completed = summaries.filter((summary) => summary.status === "COMPLETED");
  const grouped = new Map<string, PrimeModeComparisonRow>();

  for (const summary of completed) {
    const caseSource = summary.eval_config.env_args?.case_source;
    const promptMode = summary.eval_config.env_args?.prompt_mode;
    const generatorFamily = summary.eval_config.env_args?.generator_family;

    if (
      !caseSource
      || generatorFamily
      || (promptMode !== "packet" && promptMode !== "tools")
    ) {
      continue;
    }

    const key = `${summary.inference_model}::${caseSource}`;
    const row =
      grouped.get(key) ??
      {
        caseSource,
        modelName: summary.inference_model,
        packetEval: null,
        toolsEval: null,
        packetExamples: null,
        toolsExamples: null,
        packetRollouts: null,
        toolsRollouts: null,
        packetScore: null,
        toolsScore: null,
        delta: null,
      };

    if (promptMode === "packet") {
      if (!row.packetEval || getPrimeCompletedAt(summary) > getPrimeCompletedAt(row.packetEval)) {
        row.packetEval = summary;
      }
    }

    if (promptMode === "tools") {
      if (!row.toolsEval || getPrimeCompletedAt(summary) > getPrimeCompletedAt(row.toolsEval)) {
        row.toolsEval = summary;
      }
    }

    grouped.set(key, row);
  }

  return Array.from(grouped.values())
    .map((row) => {
      const packetScore = getPrimeScore(row.packetEval);
      const toolsScore = getPrimeScore(row.toolsEval);

      return {
        ...row,
        packetExamples: row.packetEval?.eval_config.num_examples ?? null,
        toolsExamples: row.toolsEval?.eval_config.num_examples ?? null,
        packetRollouts: row.packetEval?.eval_config.rollouts_per_example ?? null,
        toolsRollouts: row.toolsEval?.eval_config.rollouts_per_example ?? null,
        packetScore,
        toolsScore,
        delta:
          packetScore === null || toolsScore === null ? null : toolsScore - packetScore,
      };
    })
    .sort((left, right) => left.caseSource.localeCompare(right.caseSource));
}

// Estimated total cost (USD) to run the full benchmark (~120 samples) per model,
// computed from observed token usage × public API pricing.
const MODEL_COST_ESTIMATES: Record<string, number> = {
  "anthropic/claude-sonnet-4.6": 5.32,
  "anthropic/claude-opus-4.6": 26.71,
  "anthropic/claude-sonnet-4.5": 4.25,
  "anthropic/claude-opus-4.5": 25.93,
  "anthropic/claude-opus-4.1": 26.00,
  "google/gemini-3.1-pro-preview": 1.74,
  "google/gemini-3-pro-preview": 1.70,
  "google/gemini-3-flash-preview": 0.10,
  "google/gemma-4-26b-a4b-it": 0.16,
  "google/gemma-4-31b-it": 0.16,
  "openai/gpt-5": 13.45,
  "openai/gpt-5.1": 1.75,
  "openai/gpt-5.2": 1.30,
  "openai/gpt-5.2-codex": 1.29,
  "openai/gpt-5.3-codex": 1.73,
  "openai/gpt-5.1-codex": 1.70,
  "openai/gpt-5-codex": 11.40,
  "openai/gpt-5.4": 1.28,
  "openai/gpt-5.4-mini": 0.26,
  "openai/gpt-5.4-nano": 0.13,
  "openai/gpt-5-mini": 0.79,
  "qwen/qwen3.5-397b-a17b": 1.37,
  "qwen/qwen3.5-27b": 0.29,
  "qwen/qwen3.5-35b-a3b": 0.29,
  "qwen/qwen3.6-plus:free": 0.00,
  "qwen/qwen3-max-thinking": 3.30,
  "z-ai/glm-5": 0.79,
  "z-ai/glm-5-turbo": 0.32,
  "glm-5.1": 0.50,
  "x-ai/grok-4": 7.20,
  "x-ai/grok-4.20": 3.60,
  "moonshotai/kimi-k2.5": 0.64,
  "minimax/minimax-m2.7": 0.66,
  "minimax/minimax-m2.5": 0.66,
  "minimax/minimax-m2.1": 0.66,
  "minimax/minimax-m2": 0.66,
  "xiaomi/mimo-v2-pro": 0.79,
  "xiaomi/mimo-v2-omni": 0.79,
  "xiaomi/mimo-v2-flash": 0.13,
  "deepseek/deepseek-v3.2": 0.36,
  "nvidia/nemotron-3-super-120b-a12b": 0.23,
  "stepfun/step-3.5-flash": 0.13,
  "arcee-ai/trinity-large-thinking": 0.16,
  "prime-intellect/intellect-3": 7.25,
  "PrimeIntellect/INTELLECT-3.1": 0.57,
};

export async function loadPrimeHostedLeaderboardRows(): Promise<PrimeHostedLeaderboardRow[]> {
  const finalRoundup = await loadFinalRoundup();
  if (finalRoundup) {
    const evalSummaries = await loadPrimeEvalSummaries();
    const evalMap = new Map<string, PrimeEvalSummary>();
    for (const summary of evalSummaries) {
      evalMap.set(summary.evaluation_id, summary);
    }

    const rows = [
      ...finalRoundup.stable_ranked,
      ...finalRoundup.unstable_or_provisional,
      ...finalRoundup.incomplete_or_blocked,
    ];

    return rows
      .map((row) => {
        const goldStatus = row.latest_gold?.status.toLowerCase() ?? "missing";
        const syntheticStatus = row.latest_synthetic?.status.toLowerCase() ?? "missing";
        const notes = [
          row.notes,
          "reason" in row ? row.reason : null,
        ].filter((value): value is string => Boolean(value));

        const goldEvalId = row.gold_eval?.id ?? row.latest_gold?.id ?? null;
        const syntheticEvalId = row.synthetic_eval?.id ?? row.latest_synthetic?.id ?? null;
        const goldExactScore = goldEvalId ? getPrimeExactScore(evalMap.get(goldEvalId) ?? null) : null;
        const syntheticExactScore = syntheticEvalId ? getPrimeExactScore(evalMap.get(syntheticEvalId) ?? null) : null;

        return {
          modelName: row.model,
          providerLabel: row.source_list,
          benchmarkLabel: row.model,
          promptMode: "tools",
          statusLabel: row.status,
          notes: notes.length > 0 ? notes.join("; ") : null,
          goldStatus,
          syntheticStatus,
          overallScore: "composite" in row ? row.composite : null,
          goldScore: row.gold_eval?.score ?? null,
          syntheticScore: row.synthetic_eval?.score ?? null,
          goldExactScore,
          syntheticExactScore,
          overallExactScore: computeWeightedAverage(goldExactScore, syntheticExactScore),
          goldSamples: row.latest_gold?.samples ?? 0,
          syntheticSamples: row.latest_synthetic?.samples ?? 0,
          totalSamples: (row.latest_gold?.samples ?? 0) + (row.latest_synthetic?.samples ?? 0),
          jsonValid: null,
          goldEvalId,
          syntheticEvalId,
          costEstimate: MODEL_COST_ESTIMATES[row.model] ?? null,
        } satisfies PrimeHostedLeaderboardRow;
      })
      .sort((left, right) => {
        if ((left.overallScore ?? -1) !== (right.overallScore ?? -1)) {
          return (right.overallScore ?? -1) - (left.overallScore ?? -1);
        }

        return left.modelName.localeCompare(right.modelName);
      });
  }

  const [summaries, requestedModels] = await Promise.all([
    loadPrimeEvalSummaries(),
    loadRequestedHostedModels(),
  ]);
  const relevant = summaries.filter((summary) => {
    const caseSource = summary.eval_config.env_args?.case_source;
    const promptMode = summary.eval_config.env_args?.prompt_mode;
    const generatorFamily = summary.eval_config.env_args?.generator_family;

    return (
      !generatorFamily
      && promptMode === "tools"
      && (caseSource === "gold" || caseSource === "synthetic")
    );
  });

  const grouped = new Map<
    string,
    {
      latestGold: PrimeEvalSummary | null;
      latestSynthetic: PrimeEvalSummary | null;
      completedGold: PrimeEvalSummary | null;
      completedSynthetic: PrimeEvalSummary | null;
    }
  >();

  for (const summary of relevant) {
    const caseSource = summary.eval_config.env_args?.case_source;
    if (!caseSource || (caseSource !== "gold" && caseSource !== "synthetic")) {
      continue;
    }

    const row = grouped.get(summary.inference_model) ?? {
      latestGold: null,
      latestSynthetic: null,
      completedGold: null,
      completedSynthetic: null,
    };

    if (caseSource === "gold") {
      if (!row.latestGold || getPrimeSummaryRecency(summary) > getPrimeSummaryRecency(row.latestGold)) {
        row.latestGold = summary;
      }

      if (
        summary.status === "COMPLETED"
        && (!row.completedGold || getPrimeCompletedAt(summary) > getPrimeCompletedAt(row.completedGold))
      ) {
        row.completedGold = summary;
      }
    } else {
      if (
        !row.latestSynthetic
        || getPrimeSummaryRecency(summary) > getPrimeSummaryRecency(row.latestSynthetic)
      ) {
        row.latestSynthetic = summary;
      }

      if (
        summary.status === "COMPLETED"
        && (
          !row.completedSynthetic
          || getPrimeCompletedAt(summary) > getPrimeCompletedAt(row.completedSynthetic)
        )
      ) {
        row.completedSynthetic = summary;
      }
    }

    grouped.set(summary.inference_model, row);
  }

  for (const modelName of requestedModels) {
    if (!grouped.has(modelName)) {
      grouped.set(modelName, {
        latestGold: null,
        latestSynthetic: null,
        completedGold: null,
        completedSynthetic: null,
      });
    }
  }

  return Array.from(grouped.entries())
    .map(([modelName, row]) => {
      const goldStatus = normalizeSummaryStatus(row.latestGold);
      const syntheticStatus = normalizeSummaryStatus(row.latestSynthetic);
      const goldUnstable = isPrimeSummaryUnstable(row.completedGold);
      const syntheticUnstable = isPrimeSummaryUnstable(row.completedSynthetic);
      const goldScore = goldUnstable ? null : getPrimeScore(row.completedGold);
      const syntheticScore = syntheticUnstable ? null : getPrimeScore(row.completedSynthetic);
      const goldJsonValid = goldUnstable ? null : getPrimeJsonValid(row.completedGold);
      const syntheticJsonValid = syntheticUnstable ? null : getPrimeJsonValid(row.completedSynthetic);
      const benchmarkSummary =
        row.latestGold ?? row.completedGold ?? row.latestSynthetic ?? row.completedSynthetic;
      const notes = [
        goldUnstable || syntheticUnstable ? "provider or tool-loop unstable" : null,
        row.latestGold && row.latestGold.status !== "COMPLETED" && row.completedGold
          ? `gold latest ${goldStatus}, showing last completed`
          : null,
        row.latestSynthetic && row.latestSynthetic.status !== "COMPLETED" && row.completedSynthetic
          ? `synthetic latest ${syntheticStatus}, showing last completed`
          : null,
        !row.completedGold && goldStatus === "missing" ? "gold missing" : null,
        !row.completedSynthetic && syntheticStatus === "missing" ? "synthetic missing" : null,
      ].filter((value): value is string => Boolean(value));
      const statusLabel = notes[0]
        ?? (
          goldStatus === "completed" && syntheticStatus === "completed"
            ? "complete"
            : goldStatus === "completed" || syntheticStatus === "completed"
              ? "partial"
              : goldStatus !== "missing"
                ? goldStatus
                : syntheticStatus !== "missing"
                  ? syntheticStatus
                  : "missing"
        );

      const goldExactScore = goldUnstable ? null : getPrimeExactScore(row.completedGold);
      const syntheticExactScore = syntheticUnstable ? null : getPrimeExactScore(row.completedSynthetic);

      return {
        modelName,
        providerLabel: getProviderLabel(modelName),
        benchmarkLabel: benchmarkSummary ? formatPrimeBenchmarkLabel(benchmarkSummary) : modelName,
        promptMode: "tools",
        statusLabel,
        notes: notes.length > 0 ? notes.join("; ") : null,
        goldStatus,
        syntheticStatus,
        overallScore: computeWeightedAverage(goldScore, syntheticScore),
        goldScore,
        syntheticScore,
        goldExactScore,
        syntheticExactScore,
        overallExactScore: computeWeightedAverage(goldExactScore, syntheticExactScore),
        goldSamples: getPrimeSampleCount(row.completedGold),
        syntheticSamples: getPrimeSampleCount(row.completedSynthetic),
        totalSamples: getPrimeSampleCount(row.completedGold) + getPrimeSampleCount(row.completedSynthetic),
        jsonValid: computeWeightedAverage(goldJsonValid, syntheticJsonValid),
        goldEvalId: row.completedGold?.evaluation_id ?? row.latestGold?.evaluation_id ?? null,
        syntheticEvalId:
          row.completedSynthetic?.evaluation_id ?? row.latestSynthetic?.evaluation_id ?? null,
        costEstimate: MODEL_COST_ESTIMATES[modelName] ?? null,
      };
    })
    .sort((left, right) => {
      if ((left.overallScore ?? -1) !== (right.overallScore ?? -1)) {
        return (right.overallScore ?? -1) - (left.overallScore ?? -1);
      }

      return left.modelName.localeCompare(right.modelName);
    });
}

export async function loadPrimeTargetedEvalRows(): Promise<PrimeTargetedEvalRow[]> {
  const summaries = await loadPrimeEvalSummaries();

  return summaries
    .filter(
      (summary) =>
        summary.status === "COMPLETED"
        && Boolean(summary.eval_config.env_args?.generator_family),
    )
    .map((summary) => ({
      evaluationId: summary.evaluation_id,
      modelName: summary.inference_model,
      caseSource: summary.eval_config.env_args?.case_source ?? "unknown",
      promptMode: summary.eval_config.env_args?.prompt_mode ?? "unknown",
      generatorFamily: summary.eval_config.env_args?.generator_family ?? "unknown",
      numExamples: summary.eval_config.num_examples,
      rolloutsPerExample: summary.eval_config.rollouts_per_example,
      avgScore: getPrimeScore(summary),
    }))
    .sort((left, right) => left.generatorFamily.localeCompare(right.generatorFamily));
}

export async function loadPrimeTargetedComparisons(): Promise<PrimeTargetedComparisonRow[]> {
  const summaries = await loadPrimeEvalSummaries();
  const completed = summaries.filter(
    (summary) =>
      summary.status === "COMPLETED"
      && Boolean(summary.eval_config.env_args?.generator_family),
  );
  const grouped = new Map<string, PrimeTargetedComparisonRow>();

  for (const summary of completed) {
    const generatorFamily = summary.eval_config.env_args?.generator_family;
    const promptMode = summary.eval_config.env_args?.prompt_mode;
    const caseSource = summary.eval_config.env_args?.case_source ?? "unknown";

    if (!generatorFamily || (promptMode !== "packet" && promptMode !== "tools")) {
      continue;
    }

    const key = `${summary.inference_model}::${caseSource}::${generatorFamily}`;
    const row =
      grouped.get(key) ??
      {
        generatorFamily,
        modelName: summary.inference_model,
        caseSource,
        packetEval: null,
        toolsEval: null,
        packetScore: null,
        toolsScore: null,
        delta: null,
        packetConfig: null,
        toolsConfig: null,
      };

    if (promptMode === "packet") {
      if (!row.packetEval || getPrimeCompletedAt(summary) > getPrimeCompletedAt(row.packetEval)) {
        row.packetEval = summary;
      }
    }

    if (promptMode === "tools") {
      if (!row.toolsEval || getPrimeCompletedAt(summary) > getPrimeCompletedAt(row.toolsEval)) {
        row.toolsEval = summary;
      }
    }

    grouped.set(key, row);
  }

  return Array.from(grouped.values())
    .map((row) => {
      const packetScore = getPrimeScore(row.packetEval);
      const toolsScore = getPrimeScore(row.toolsEval);

      return {
        ...row,
        packetScore,
        toolsScore,
        delta:
          packetScore === null || toolsScore === null ? null : toolsScore - packetScore,
        packetConfig: row.packetEval
          ? `${row.packetEval.eval_config.num_examples}x${row.packetEval.eval_config.rollouts_per_example}`
          : null,
        toolsConfig: row.toolsEval
          ? `${row.toolsEval.eval_config.num_examples}x${row.toolsEval.eval_config.rollouts_per_example}`
          : null,
      };
    })
    .sort((left, right) => left.generatorFamily.localeCompare(right.generatorFamily));
}

export async function loadPrimeFamilyComparisons(): Promise<PrimeFamilyComparisonRow[]> {
  const sampleImports = await loadPrimeEvalSampleImports();
  const latestModeRows = await loadPrimeModeComparisons();
  const results: PrimeFamilyComparisonRow[] = [];

  for (const row of latestModeRows) {
    if (!row.packetEval || !row.toolsEval) {
      continue;
    }

    const packetSamples =
      sampleImports.find((sampleImport) => sampleImport.evaluation_id === row.packetEval?.evaluation_id)
        ?.samples ?? [];
    const toolsSamples =
      sampleImports.find((sampleImport) => sampleImport.evaluation_id === row.toolsEval?.evaluation_id)
        ?.samples ?? [];
    const families = new Set<string>();

    for (const sample of packetSamples) {
      if (sample.generator_family) {
        families.add(sample.generator_family);
      }
    }

    for (const sample of toolsSamples) {
      if (sample.generator_family) {
        families.add(sample.generator_family);
      }
    }

    for (const family of families) {
      const familyPacket = packetSamples.filter((sample) => sample.generator_family === family);
      const familyTools = toolsSamples.filter((sample) => sample.generator_family === family);
      const packetRewards = familyPacket
        .map((sample) => sample.reward)
        .filter((reward): reward is number => typeof reward === "number");
      const toolsRewards = familyTools
        .map((sample) => sample.reward)
        .filter((reward): reward is number => typeof reward === "number");
      const packetAverage = packetRewards.length ? average(packetRewards) : null;
      const toolsAverage = toolsRewards.length ? average(toolsRewards) : null;

      results.push({
        family,
        modelName: row.modelName,
        caseSource: row.caseSource,
        packetEvalId: row.packetEval.evaluation_id,
        toolsEvalId: row.toolsEval.evaluation_id,
        packetAverage,
        toolsAverage,
        delta:
          packetAverage === null || toolsAverage === null ? null : toolsAverage - packetAverage,
        packetSamples: familyPacket.length,
        toolsSamples: familyTools.length,
      });
    }
  }

  return results.sort((left, right) => {
    if (left.caseSource !== right.caseSource) {
      return left.caseSource.localeCompare(right.caseSource);
    }

    return (left.delta ?? 0) - (right.delta ?? 0);
  });
}

export async function loadRunSummaries(): Promise<RunSummary[]> {
  const entries = await readdir(localRunSummariesDirectory, { withFileTypes: true }).catch(() => []);
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left));

  return Promise.all(
    files.map(async (fileName) => {
      const raw = await readFile(`${localRunSummariesDirectory}/${fileName}`, "utf8");
      return JSON.parse(raw) as RunSummary;
    }),
  );
}

export type CaseExplorerData = Awaited<ReturnType<typeof loadCaseExplorerData>>;
export type OverviewData = Awaited<ReturnType<typeof loadOverviewData>>;
export type GoldCaseSummary = GoldCase;
