import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import type { GoldCase } from "@infraresolutionbench/shared";

import { renderAmbiguousCase } from "../renderers/ambiguous_case";
import { renderCleanCoveredOutageCase } from "../renderers/clean_covered_outage";
import { renderCommercialSensitivityCase } from "../renderers/degraded_performance_with_commercial_sensitivity";
import { renderCustomerCausedFailureCase } from "../renderers/customer_caused_failure";
import { renderMaintenanceExclusionCase } from "../renderers/maintenance_exclusion";
import { renderMeteringDiscrepancyCase } from "../renderers/metering_discrepancy";
import { renderPricingMismatchCase } from "../renderers/pricing_config_mismatch";
import { createAmbiguousCaseSeed } from "../templates/base_templates/ambiguous_case";
import { createCleanCoveredOutageSeed } from "../templates/base_templates/clean_covered_outage";
import { createCommercialSensitivitySeed } from "../templates/base_templates/degraded_performance_with_commercial_sensitivity";
import { createCustomerCausedFailureSeed } from "../templates/base_templates/customer_caused_failure";
import { createMaintenanceExclusionSeed } from "../templates/base_templates/maintenance_exclusion";
import { createMeteringDiscrepancySeed } from "../templates/base_templates/metering_discrepancy";
import { createPricingMismatchSeed } from "../templates/base_templates/pricing_config_mismatch";

const baseOutputDirectory = fileURLToPath(new URL("../generated_cases", import.meta.url));

type FamilySpec = {
  family: string;
  count: number;
  render: (index: number) => GoldCase;
};

const familySpecs: FamilySpec[] = [
  {
    family: "pricing_config_mismatch",
    count: 20,
    render: (index) => renderPricingMismatchCase(createPricingMismatchSeed(index)),
  },
  {
    family: "metering_discrepancy",
    count: 20,
    render: (index) => renderMeteringDiscrepancyCase(createMeteringDiscrepancySeed(index)),
  },
  {
    family: "clean_covered_outage",
    count: 20,
    render: (index) => renderCleanCoveredOutageCase(createCleanCoveredOutageSeed(index)),
  },
  {
    family: "maintenance_exclusion",
    count: 20,
    render: (index) => renderMaintenanceExclusionCase(createMaintenanceExclusionSeed(index)),
  },
  {
    family: "customer_caused_failure",
    count: 20,
    render: (index) => renderCustomerCausedFailureCase(createCustomerCausedFailureSeed(index)),
  },
  {
    family: "degraded_performance_with_commercial_sensitivity",
    count: 20,
    render: (index) => renderCommercialSensitivityCase(createCommercialSensitivitySeed(index)),
  },
  {
    family: "ambiguous_case",
    count: 20,
    render: (index) => renderAmbiguousCase(createAmbiguousCaseSeed(index)),
  },
];

async function main(): Promise<void> {
  for (const spec of familySpecs) {
    const outputDirectory = `${baseOutputDirectory}/${spec.family}`;
    await mkdir(outputDirectory, { recursive: true });

    const cases = Array.from({ length: spec.count }, (_, index) => spec.render(index));

    await Promise.all(
      cases.map(async (goldCase) => {
        const filePath = `${outputDirectory}/${goldCase.case_packet.case_id}.json`;
        await writeFile(filePath, JSON.stringify(goldCase, null, 2), "utf8");
      }),
    );
  }

  const total = familySpecs.reduce((sum, spec) => sum + spec.count, 0);
  console.log(`Generated ${total} synthetic cases in ${baseOutputDirectory}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
