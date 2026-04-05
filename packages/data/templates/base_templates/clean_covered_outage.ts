import type { RootCause } from "@infraresolutionbench/shared";

export type CleanCoveredOutageSeed = {
  index: number;
  caseId: string;
  title: string;
  accountId: string;
  billingAccountId: string;
  accountName: string;
  commitmentHours: number;
  durationMinutes: number;
  rootCause: Extract<RootCause, "capacity_shortfall" | "scheduler_failure" | "gpu_node_failure">;
  service: "managed-training-api" | "batch-inference-api";
  invoicePreviewUsd: number;
  renewalDate: string | null;
};

const accountNames = [
  "Copper Ridge AI",
  "Tidal Research",
  "Echo Harbor",
  "Prairie Modelworks",
  "Glacier Dynamics",
  "Silver Oak Labs",
] as const;

const rootCauses: CleanCoveredOutageSeed["rootCause"][] = [
  "capacity_shortfall",
  "scheduler_failure",
  "gpu_node_failure",
];

const services: CleanCoveredOutageSeed["service"][] = [
  "managed-training-api",
  "batch-inference-api",
];

const commitments = [240, 300, 420, 600] as const;
const durations = [36, 44, 52, 61, 74] as const;
const renewals = [null, "2026-05-12", "2026-08-01"] as const;

export function createCleanCoveredOutageSeed(index: number): CleanCoveredOutageSeed {
  const commitmentHours = commitments[index % commitments.length]!;

  return {
    index,
    caseId: `synthetic_clean_outage_${String(index + 1).padStart(3, "0")}`,
    title: `Synthetic clean covered outage ${index + 1}`,
    accountId: `acct_outage_${String(index + 1).padStart(3, "0")}`,
    billingAccountId: `bill_outage_${String(index + 1).padStart(3, "0")}`,
    accountName: accountNames[index % accountNames.length]!,
    commitmentHours,
    durationMinutes: durations[index % durations.length]!,
    rootCause: rootCauses[index % rootCauses.length]!,
    service: services[index % services.length]!,
    invoicePreviewUsd: commitmentHours * 75 + Math.round((index + 5) * 26.4),
    renewalDate: renewals[index % renewals.length]!,
  };
}
