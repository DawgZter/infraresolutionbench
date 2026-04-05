import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadGoldCaseById } from "@infraresolutionbench/data";

import { buildEpisodeToolCalls } from "./episode";
import { createEnvironmentHarness } from "./harness";
import { buildValidatedAdapterRequest } from "./protocol";
import type { PromptMode } from "./prompt";

type CliArgs = {
  caseId: string;
  mode: PromptMode;
  outputPath: string | null;
  prefetchTools: "none" | "all";
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
  const mode = (args.get("--mode") ?? "tools") as PromptMode;
  const outputPath = args.get("--output") ?? null;
  const prefetchTools = (args.get("--prefetch-tools") ?? "all") as "none" | "all";

  if (!caseId) {
    throw new Error(
      "Usage: npm run prepare:prime-request -- --case-id <case_id> [--mode packet|tools] [--prefetch-tools none|all] [--output <path>]",
    );
  }

  if (mode !== "packet" && mode !== "tools") {
    throw new Error(`Unsupported mode: ${mode}`);
  }

  if (prefetchTools !== "none" && prefetchTools !== "all") {
    throw new Error(`Unsupported prefetch-tools value: ${prefetchTools}`);
  }

  return {
    caseId,
    mode,
    outputPath,
    prefetchTools,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const goldCase = await loadGoldCaseById(args.caseId);
  const harness = createEnvironmentHarness(goldCase, args.mode);
  const prefetchedToolCalls =
    args.mode === "tools" && args.prefetchTools === "all"
      ? buildEpisodeToolCalls(
          goldCase,
          args.mode,
          harness.toolDefinitions.map((tool) => tool.name),
        )
      : [];

  const request = buildValidatedAdapterRequest({
    caseId: goldCase.case_packet.case_id,
    mode: args.mode,
    promptBundle: {
      system_prompt: harness.systemPrompt,
      user_prompt: harness.userPrompt,
      tool_instructions: harness.toolInstructions,
    },
    toolDefinitions: harness.toolDefinitions,
    casePacket: goldCase.case_packet,
    prefetchedToolCalls,
  });

  const defaultOutputPath = path.resolve(
    process.cwd(),
    `artifacts/prime-requests/${goldCase.case_packet.case_id}_${args.mode}.json`,
  );
  const resolvedOutputPath = path.resolve(process.cwd(), args.outputPath ?? defaultOutputPath);

  await mkdir(path.dirname(resolvedOutputPath), { recursive: true });
  await writeFile(resolvedOutputPath, JSON.stringify(request, null, 2), "utf8");

  console.log(JSON.stringify(request, null, 2));
  console.log(`Prepared request written to ${resolvedOutputPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
