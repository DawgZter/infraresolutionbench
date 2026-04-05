import { loadGoldCaseById } from "@infraresolutionbench/data";

import { ReplayAdapter, executeWithAdapter } from "./adapters";
import { formatPromptPacket, writeArtifactBundle } from "./index";
import type { PromptMode } from "./prompt";

type CliArgs = {
  caseId: string;
  modelOutputPath: string;
  modelName: string;
  mode: PromptMode;
  toolTranscriptPath: string | null;
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
  const modelOutputPath = args.get("--model-output");
  const modelName = args.get("--model-name") ?? "mock-model";
  const mode = (args.get("--mode") ?? "packet") as PromptMode;
  const toolTranscriptPath = args.get("--tool-transcript") ?? null;

  if (!caseId || !modelOutputPath) {
    throw new Error(
      'Usage: npm run score:case -- --case-id <gold_case_id> --model-output <path/to/model_output.json> [--model-name <name>] [--mode packet|tools] [--tool-transcript <path/to/transcript.json>]',
    );
  }

  if (mode !== "packet" && mode !== "tools") {
    throw new Error(`Unsupported mode: ${mode}`);
  }

  return {
    caseId,
    modelOutputPath,
    modelName,
    mode,
    toolTranscriptPath,
  };
}

function printSection(title: string, value: unknown): void {
  console.log(`\n=== ${title} ===`);
  console.log(JSON.stringify(value, null, 2));
}

async function main(): Promise<void> {
  const { caseId, modelOutputPath, modelName, mode, toolTranscriptPath } = parseArgs(
    process.argv.slice(2),
  );
  const goldCase = await loadGoldCaseById(caseId);
  const adapter = new ReplayAdapter({
    modelOutputPath,
    toolTranscriptPath,
    modelName,
  });
  const { result, artifact } = await executeWithAdapter({
    goldCase,
    mode,
    adapter,
  });
  const artifactPath = await writeArtifactBundle(artifact);

  printSection("Prompt Packet", formatPromptPacket(goldCase));
  printSection("Model Output", result.modelOutput);
  printSection("Score Breakdown", artifact.evaluation);

  console.log(`\nArtifact written to ${artifactPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
