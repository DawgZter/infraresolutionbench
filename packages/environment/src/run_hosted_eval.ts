import { spawn } from "node:child_process";

type Provider = "prime" | "openrouter" | "openai" | "anthropic" | "minimax" | "deepseek" | "glm" | "local" | "vllm";
type PromptMode = "packet" | "tools";
type CaseSource = "gold" | "synthetic" | "all";

type EvalOptions = {
  environment: string;
  provider: Provider;
  model: string;
  caseSource: CaseSource;
  promptMode: PromptMode;
  limit: string | undefined;
  generatorFamily: string | undefined;
  numExamples: string | undefined;
  rolloutsPerExample: string | undefined;
  hosted: boolean;
  follow: boolean;
  saveResults: boolean;
  abbreviatedSummary: boolean;
  envDirPath: string | undefined;
  apiBaseUrl: string | undefined;
  apiKeyVar: string | undefined;
  maxConcurrent: string | undefined;
  temperature: string | undefined;
  maxTokens: string | undefined;
  evalName: string | undefined;
  extraHeaders: string[];
};

function parseArgs(argv: string[]): EvalOptions {
  const defaults: EvalOptions = {
    environment: "kariminal/infraresolutionbench",
    provider: "prime",
    model: "openai/gpt-4.1-nano",
    caseSource: "gold",
    promptMode: "packet",
    limit: undefined,
    generatorFamily: undefined,
    numExamples: undefined,
    rolloutsPerExample: undefined,
    hosted: true,
    follow: true,
    saveResults: true,
    abbreviatedSummary: true,
    envDirPath: undefined,
    apiBaseUrl: undefined,
    apiKeyVar: undefined,
    maxConcurrent: undefined,
    temperature: undefined,
    maxTokens: undefined,
    evalName: undefined,
    extraHeaders: [],
  };

  const options = { ...defaults };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    switch (arg) {
      case "--environment":
        options.environment = next ?? options.environment;
        index += 1;
        break;
      case "--provider":
        options.provider = (next as Provider | undefined) ?? options.provider;
        index += 1;
        break;
      case "--model":
        options.model = next ?? options.model;
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
      case "--limit":
        options.limit = next;
        index += 1;
        break;
      case "--generator-family":
        options.generatorFamily = next;
        index += 1;
        break;
      case "--num-examples":
        options.numExamples = next;
        index += 1;
        break;
      case "--rollouts-per-example":
        options.rolloutsPerExample = next;
        index += 1;
        break;
      case "--env-dir-path":
        options.envDirPath = next;
        index += 1;
        break;
      case "--api-base-url":
        options.apiBaseUrl = next;
        index += 1;
        break;
      case "--api-key-var":
        options.apiKeyVar = next;
        index += 1;
        break;
      case "--max-concurrent":
        options.maxConcurrent = next;
        index += 1;
        break;
      case "--temperature":
        options.temperature = next;
        index += 1;
        break;
      case "--max-tokens":
        options.maxTokens = next;
        index += 1;
        break;
      case "--eval-name":
        options.evalName = next;
        index += 1;
        break;
      case "--header":
        if (next) {
          options.extraHeaders.push(next);
          index += 1;
        }
        break;
      case "--local":
        options.hosted = false;
        break;
      case "--no-follow":
        options.follow = false;
        break;
      case "--no-save-results":
        options.saveResults = false;
        break;
      case "--full-summary":
        options.abbreviatedSummary = false;
        break;
      default:
        break;
    }
  }

  return options;
}

function buildEnvArgs(options: EvalOptions): string {
  const envArgs: Record<string, string> = {
    case_source: options.caseSource,
    prompt_mode: options.promptMode,
  };

  if (options.limit) {
    envArgs.limit = options.limit;
  }

  if (options.generatorFamily) {
    envArgs.generator_family = options.generatorFamily;
  }

  return JSON.stringify(envArgs);
}

function buildPrimeCommand(options: EvalOptions): string[] {
  const resolvedApiBaseUrl =
    options.provider === "openrouter" ? options.apiBaseUrl ?? "https://openrouter.ai/api/v1" : options.apiBaseUrl;
  const resolvedApiKeyVar =
    options.provider === "openrouter" ? options.apiKeyVar ?? "OPENROUTER_API_KEY" : options.apiKeyVar;

  const args = [
    "--plain",
    "eval",
    "run",
    options.environment,
    "--provider",
    options.provider,
    "--model",
    options.model,
    "--env-args",
    buildEnvArgs(options),
  ];

  if (options.envDirPath) {
    args.push("--env-dir-path", options.envDirPath);
  }

  if (options.numExamples) {
    args.push("--num-examples", options.numExamples);
  }

  if (options.rolloutsPerExample) {
    args.push("--rollouts-per-example", options.rolloutsPerExample);
  }

  if (resolvedApiBaseUrl) {
    args.push("--api-base-url", resolvedApiBaseUrl);
  }

  if (resolvedApiKeyVar) {
    args.push("--api-key-var", resolvedApiKeyVar);
  }

  if (options.maxConcurrent) {
    args.push("--max-concurrent", options.maxConcurrent);
  }

  if (options.temperature) {
    args.push("--temperature", options.temperature);
  }

  if (options.maxTokens) {
    args.push("--max-tokens", options.maxTokens);
  }

  if (options.evalName) {
    args.push("--eval-name", options.evalName);
  }

  for (const header of options.extraHeaders) {
    args.push("--header", header);
  }

  if (options.saveResults) {
    args.push("--save-results");
  }

  if (options.abbreviatedSummary) {
    args.push("--abbreviated-summary");
  }

  if (options.hosted) {
    args.push("--hosted");
  }

  if (options.follow) {
    args.push("--follow");
  }

  return args;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const args = buildPrimeCommand(options);

  await new Promise<void>((resolve, reject) => {
    const child = spawn("prime", args, {
      stdio: "inherit",
      env: process.env,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`prime eval run exited with code ${code ?? "unknown"}`));
    });

    child.on("error", reject);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
