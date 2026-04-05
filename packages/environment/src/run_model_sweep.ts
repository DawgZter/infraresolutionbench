import { readFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

type SweepCandidate = {
  rank: number;
  model: string;
  canonical_model?: string;
  notes?: string;
};

type SweepPlan = {
  selected_prime_models?: SweepCandidate[];
  selected_openrouter_models?: SweepCandidate[];
  target_case_source?: CaseSource;
  target_prompt_mode?: PromptMode;
  target_num_examples?: number;
  target_rollouts_per_example?: number;
  target_limit?: number;
};

type ProviderSelection = "prime" | "openrouter" | "both";
type PromptMode = "packet" | "tools";
type CaseSource = "gold" | "synthetic" | "all";

type Options = {
  planPath: string;
  selection: ProviderSelection;
  caseSource: CaseSource | undefined;
  promptMode: PromptMode | undefined;
  numExamples: string | undefined;
  rolloutsPerExample: string | undefined;
  limit: string | undefined;
  startAt: number;
  maxModels: number | undefined;
  dryRun: boolean;
  follow: boolean;
  environment: string;
};

function parseArgs(argv: string[]): Options {
  const defaults: Options = {
    planPath: "",
    selection: "both",
    caseSource: undefined,
    promptMode: undefined,
    numExamples: undefined,
    rolloutsPerExample: undefined,
    limit: undefined,
    startAt: 1,
    maxModels: undefined,
    dryRun: false,
    follow: false,
    environment: "kariminal/infraresolutionbench",
  };

  const options = { ...defaults };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    switch (arg) {
      case "--plan":
        options.planPath = next ?? options.planPath;
        index += 1;
        break;
      case "--selection":
        options.selection = (next as ProviderSelection | undefined) ?? options.selection;
        index += 1;
        break;
      case "--case-source":
        options.caseSource = (next as CaseSource | undefined) ?? options.caseSource;
        index += 1;
        break;
      case "--prompt-mode":
        options.promptMode = (next as PromptMode | undefined) ?? options.promptMode;
        index += 1;
        break;
      case "--num-examples":
        options.numExamples = next ?? options.numExamples;
        index += 1;
        break;
      case "--rollouts-per-example":
        options.rolloutsPerExample = next ?? options.rolloutsPerExample;
        index += 1;
        break;
      case "--limit":
        options.limit = next ?? options.limit;
        index += 1;
        break;
      case "--start-at":
        options.startAt = Number(next ?? options.startAt);
        index += 1;
        break;
      case "--max-models":
        options.maxModels = Number(next);
        index += 1;
        break;
      case "--environment":
        options.environment = next ?? options.environment;
        index += 1;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--follow":
        options.follow = true;
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
    numExamples: options.numExamples ?? String(plan.target_num_examples ?? 21),
    rolloutsPerExample: options.rolloutsPerExample ?? String(plan.target_rollouts_per_example ?? 3),
    limit: options.limit ?? String(plan.target_limit ?? 21),
  };
}

function sliceCandidates(candidates: SweepCandidate[], options: Options): SweepCandidate[] {
  const offset = Math.max(0, options.startAt - 1);
  const sliced = candidates.slice(offset);
  return options.maxModels ? sliced.slice(0, options.maxModels) : sliced;
}

function buildEvalArgs(
  provider: "prime" | "openrouter",
  candidate: SweepCandidate,
  options: Options,
): string[] {
  if (!options.caseSource || !options.promptMode || !options.numExamples || !options.rolloutsPerExample || !options.limit) {
    throw new Error("Resolved sweep options are incomplete.");
  }

  const args = [
    "run",
    "eval:hosted",
    "--",
    "--environment",
    options.environment,
    "--provider",
    provider,
    "--model",
    candidate.model,
    "--case-source",
    options.caseSource,
    "--prompt-mode",
    options.promptMode,
    "--limit",
    options.limit,
    "--num-examples",
    options.numExamples,
    "--rollouts-per-example",
    options.rolloutsPerExample,
    "--eval-name",
    `${options.caseSource}-${options.promptMode}-${candidate.model.replaceAll("/", "_")}`,
  ];

  if (provider === "openrouter") {
    args.push("--api-key-var", "OPENROUTER_API_KEY");
    args.push("--api-base-url", "https://openrouter.ai/api/v1");
  }

  if (options.follow) {
    args.push("--follow");
  } else {
    args.push("--no-follow");
  }

  return args;
}

async function runCommand(args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("npm", args, {
      stdio: "inherit",
      env: process.env,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`npm ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });
  });
}

async function main(): Promise<void> {
  const parsedOptions = parseArgs(process.argv.slice(2));
  const raw = await readFile(path.resolve(process.cwd(), parsedOptions.planPath), "utf8");
  const plan = JSON.parse(raw) as SweepPlan;
  const options = resolveOptionsFromPlan(parsedOptions, plan);

  const queue: Array<{ provider: "prime" | "openrouter"; candidate: SweepCandidate }> = [];

  if (options.selection === "prime" || options.selection === "both") {
    for (const candidate of sliceCandidates(plan.selected_prime_models ?? [], options)) {
      queue.push({ provider: "prime", candidate });
    }
  }

  if (options.selection === "openrouter" || options.selection === "both") {
    if (!options.dryRun && !process.env.OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not set in this shell session.");
    }

    for (const candidate of sliceCandidates(plan.selected_openrouter_models ?? [], options)) {
      queue.push({ provider: "openrouter", candidate });
    }
  }

  for (const { provider, candidate } of queue) {
    const args = buildEvalArgs(provider, candidate, options);
    console.log(`${provider}: rank ${candidate.rank} -> ${candidate.model}`);
    if (options.dryRun) {
      console.log(`npm ${args.join(" ")}`);
      continue;
    }

    await runCommand(args);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
