import { loadGoldCaseById } from "@infraresolutionbench/data";

import {
  CommandAdapter,
  executeWithAdapter,
  OracleAdapter,
  ReplayAdapter,
  SubprocessAdapter,
  type ModelAdapter,
} from "./adapters";
import { writeArtifactBundle } from "./index";
import type { PromptMode } from "./prompt";

type AdapterKind = "replay" | "oracle" | "subprocess" | "command";

type CliArgs = {
  caseId: string;
  mode: PromptMode;
  adapterKind: AdapterKind;
  modelOutputPath: string | null;
  toolTranscriptPath: string | null;
  adapterScriptPath: string | null;
  adapterCommand: string | null;
  prefetchTools: "none" | "all";
  modelName: string | null;
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

  const caseId = args.get("--case-id");
  const mode = (args.get("--mode") ?? "packet") as PromptMode;
  const adapterKind = (args.get("--adapter") ?? "replay") as AdapterKind;
  const modelOutputPath = args.get("--model-output") ?? null;
  const toolTranscriptPath = args.get("--tool-transcript") ?? null;
  const adapterScriptPath = args.get("--adapter-script") ?? null;
  const adapterCommand = args.get("--adapter-command") ?? null;
  const prefetchTools = (args.get("--prefetch-tools") ?? "all") as "none" | "all";
  const modelName = args.get("--model-name") ?? null;

  if (!caseId) {
    throw new Error(
      "Usage: npm run run:episode -- --case-id <case_id> [--mode packet|tools] [--adapter replay|oracle|subprocess|command] [--model-output <path>] [--tool-transcript <path>] [--adapter-script <path>] [--adapter-command <cmd>] [--model-name <name>]",
    );
  }

  if (mode !== "packet" && mode !== "tools") {
    throw new Error(`Unsupported mode: ${mode}`);
  }

  if (
    adapterKind !== "replay" &&
    adapterKind !== "oracle" &&
    adapterKind !== "subprocess" &&
    adapterKind !== "command"
  ) {
    throw new Error(`Unsupported adapter: ${adapterKind}`);
  }

  if (adapterKind === "replay" && !modelOutputPath) {
    throw new Error("Replay adapter requires --model-output.");
  }

  if (adapterKind === "subprocess" && !adapterScriptPath) {
    throw new Error("Subprocess adapter requires --adapter-script.");
  }

  if (adapterKind === "command" && !adapterCommand) {
    throw new Error("Command adapter requires --adapter-command.");
  }

  if (prefetchTools !== "none" && prefetchTools !== "all") {
    throw new Error(`Unsupported prefetch-tools mode: ${prefetchTools}`);
  }

  return {
    caseId,
    mode,
    adapterKind,
    modelOutputPath,
    toolTranscriptPath,
    adapterScriptPath,
    adapterCommand,
    prefetchTools,
    modelName,
  };
}

function createAdapter(args: CliArgs): ModelAdapter {
  if (args.adapterKind === "oracle") {
    return args.modelName
      ? new OracleAdapter({ modelName: args.modelName })
      : new OracleAdapter();
  }

  if (args.adapterKind === "subprocess") {
    return args.modelName
      ? new SubprocessAdapter({
          scriptPath: args.adapterScriptPath!,
          modelName: args.modelName,
          prefetchTools: args.prefetchTools,
        })
      : new SubprocessAdapter({
          scriptPath: args.adapterScriptPath!,
          prefetchTools: args.prefetchTools,
        });
  }

  if (args.adapterKind === "command") {
    return args.modelName
      ? new CommandAdapter({
          command: args.adapterCommand!,
          modelName: args.modelName,
          prefetchTools: args.prefetchTools,
        })
      : new CommandAdapter({
          command: args.adapterCommand!,
          prefetchTools: args.prefetchTools,
        });
  }

  return new ReplayAdapter({
    modelOutputPath: args.modelOutputPath!,
    toolTranscriptPath: args.toolTranscriptPath,
    ...(args.modelName ? { modelName: args.modelName } : {}),
  });
}

function printSection(title: string, value: unknown): void {
  console.log(`\n=== ${title} ===`);
  console.log(
    typeof value === "string" ? value : JSON.stringify(value, null, 2),
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const goldCase = await loadGoldCaseById(args.caseId);
  const adapter = createAdapter(args);
  const { harness, result, artifact } = await executeWithAdapter({
    goldCase,
    mode: args.mode,
    adapter,
  });
  const artifactPath = await writeArtifactBundle(artifact);

  printSection("Harness", {
    caseId: harness.caseId,
    mode: harness.mode,
    toolDefinitions: harness.toolDefinitions,
  });
  printSection("Adapter Result", {
    modelName: result.modelName,
    outputSource: result.outputSource,
    toolCalls: result.toolCalls,
    adapterMetadata: result.adapterMetadata ?? null,
  });
  printSection("Model Output", result.modelOutput);
  printSection("Score Breakdown", artifact.evaluation);

  console.log(`\nArtifact written to ${artifactPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
