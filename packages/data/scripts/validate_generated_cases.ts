import { loadGeneratedCases } from "@infraresolutionbench/data";

async function main(): Promise<void> {
  const cases = await loadGeneratedCases();
  const ids = new Set<string>();
  const byFamily = new Map<string, number>();

  for (const goldCase of cases) {
    const caseId = goldCase.case_packet.case_id;

    if (ids.has(caseId)) {
      throw new Error(`Duplicate generated case_id detected: ${caseId}`);
    }

    ids.add(caseId);

    const family = goldCase.hidden_state.generator_family;
    byFamily.set(family, (byFamily.get(family) ?? 0) + 1);
  }

  console.log(`Validated ${cases.length} generated cases.`);
  for (const [family, count] of Array.from(byFamily.entries()).sort((left, right) =>
    left[0].localeCompare(right[0]),
  )) {
    console.log(`- ${family}: ${count}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
