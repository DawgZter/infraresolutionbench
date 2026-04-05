import { loadGoldCases } from "@infraresolutionbench/data";

async function main(): Promise<void> {
  const cases = await loadGoldCases();
  const ids = new Set<string>();

  for (const goldCase of cases) {
    const caseId = goldCase.case_packet.case_id;

    if (ids.has(caseId)) {
      throw new Error(`Duplicate case_id detected: ${caseId}`);
    }

    ids.add(caseId);

    if (!goldCase.ground_truth.reference_customer_note) {
      throw new Error(`Missing reference_customer_note for ${caseId}`);
    }

    if (!goldCase.ground_truth.reference_internal_note) {
      throw new Error(`Missing reference_internal_note for ${caseId}`);
    }
  }

  if (cases.length < 15) {
    throw new Error(`Expected at least 15 gold cases, found ${cases.length}.`);
  }

  const byFamily = cases.reduce<Record<string, number>>((accumulator, goldCase) => {
    const family = goldCase.hidden_state.generator_family;
    accumulator[family] = (accumulator[family] ?? 0) + 1;
    return accumulator;
  }, {});

  console.log(`Validated ${cases.length} gold cases.`);
  console.log("Generator families:");
  for (const family of Object.keys(byFamily).sort()) {
    console.log(`- ${family}: ${byFamily[family]}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
