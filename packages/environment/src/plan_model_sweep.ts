import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

type SweepCandidate = {
  rank: number;
  model: string;
  canonical_model?: string;
  notes?: string;
};

type SweepManifest = {
  source: string;
  captured_at: string;
  prime_candidates: SweepCandidate[];
  openrouter_candidates: SweepCandidate[];
};

type StoredPrimeEval = {
  inference_model?: string;
};

function parseArgs(argv: string[]): {
  manifestPath: string;
  outputPath: string | undefined;
  primeCount: number;
  openrouterCount: number;
} {
  let manifestPath = "";
  let outputPath: string | undefined;
  let primeCount = 15;
  let openrouterCount = 20;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    switch (arg) {
      case "--manifest":
        manifestPath = next ?? manifestPath;
        index += 1;
        break;
      case "--output":
        outputPath = next;
        index += 1;
        break;
      case "--prime-count":
        primeCount = Number(next ?? primeCount);
        index += 1;
        break;
      case "--openrouter-count":
        openrouterCount = Number(next ?? openrouterCount);
        index += 1;
        break;
      default:
        break;
    }
  }

  if (!manifestPath) {
    throw new Error("Missing required --manifest path.");
  }

  return { manifestPath, outputPath, primeCount, openrouterCount };
}

function normalizeModel(value: string): string {
  return value.trim().toLowerCase();
}

function candidateKey(candidate: SweepCandidate): string {
  return normalizeModel(candidate.canonical_model ?? candidate.model);
}

async function loadExistingModels(): Promise<Set<string>> {
  const primeEvaluationsDirectory = path.resolve(process.cwd(), "artifacts/prime-evals");
  const entries = await readdir(primeEvaluationsDirectory, { withFileTypes: true }).catch(() => []);
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json"));
  const seen = new Set<string>();

  for (const file of files) {
    const raw = await readFile(path.join(primeEvaluationsDirectory, file.name), "utf8");
    const parsed = JSON.parse(raw) as StoredPrimeEval;
    if (parsed.inference_model) {
      seen.add(normalizeModel(parsed.inference_model));
    }
  }

  return seen;
}

function selectCandidates(
  candidates: SweepCandidate[],
  limit: number,
  excluded: Set<string>,
): SweepCandidate[] {
  const selected: SweepCandidate[] = [];

  for (const candidate of [...candidates].sort((left, right) => left.rank - right.rank)) {
    const key = candidateKey(candidate);
    if (excluded.has(key)) {
      continue;
    }

    selected.push(candidate);
    excluded.add(key);

    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}

async function main(): Promise<void> {
  const { manifestPath, outputPath, primeCount, openrouterCount } = parseArgs(process.argv.slice(2));
  const raw = await readFile(path.resolve(process.cwd(), manifestPath), "utf8");
  const manifest = JSON.parse(raw) as SweepManifest;
  const existingModels = await loadExistingModels();
  const dedupe = new Set(existingModels);

  const selectedPrime = selectCandidates(manifest.prime_candidates, primeCount, dedupe);
  const selectedOpenRouter = selectCandidates(
    manifest.openrouter_candidates,
    openrouterCount,
    dedupe,
  );

  const plan = {
    source: manifest.source,
    captured_at: manifest.captured_at,
    generated_at: new Date().toISOString(),
    already_run_models: [...existingModels].sort(),
    selected_prime_models: selectedPrime,
    selected_openrouter_models: selectedOpenRouter,
  };

  const defaultOutputPath = path.resolve(
    process.cwd(),
    "artifacts/model-sweeps/latest-plan.json",
  );
  const resolvedOutputPath = path.resolve(process.cwd(), outputPath ?? defaultOutputPath);

  await mkdir(path.dirname(resolvedOutputPath), { recursive: true });
  await writeFile(resolvedOutputPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  console.log(resolvedOutputPath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
