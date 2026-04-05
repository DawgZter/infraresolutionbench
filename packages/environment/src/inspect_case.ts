import { loadGoldCaseById } from "@infraresolutionbench/data";

import { createEnvironmentHarness } from "./harness";
import type { PromptMode } from "./prompt";

type CliArgs = {
  caseId: string;
  mode: PromptMode;
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

  if (!caseId) {
    throw new Error(
      "Usage: npm run inspect:case -- --case-id <case_id> [--mode packet|tools]",
    );
  }

  if (mode !== "packet" && mode !== "tools") {
    throw new Error(`Unsupported mode: ${mode}`);
  }

  return { caseId, mode };
}

function printSection(title: string, value: string): void {
  console.log(`\n=== ${title} ===`);
  console.log(value);
}

async function main(): Promise<void> {
  const { caseId, mode } = parseArgs(process.argv.slice(2));
  const goldCase = await loadGoldCaseById(caseId);
  const harness = createEnvironmentHarness(goldCase, mode);

  printSection("System Prompt", harness.systemPrompt);

  if (harness.toolInstructions) {
    printSection("Tool Instructions", harness.toolInstructions);
  }

  printSection("User Prompt", harness.userPrompt);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
