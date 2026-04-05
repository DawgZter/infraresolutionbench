export type MaintenanceExclusionSeed = {
  index: number;
  caseId: string;
  title: string;
  accountId: string;
  billingAccountId: string;
  accountName: string;
  accountTier: "enterprise" | "strategic";
  service: "managed-training-api" | "batch-inference-api";
  commitmentHours: number;
  durationMinutes: number;
  impactVariant: "outage" | "delayed_job_start";
  communicationReview: boolean;
  renewalDate: string | null;
};

const accountNames = [
  "Harbor Weave",
  "Mistral Compute",
  "Quarry Labs",
  "Argent Models",
  "Northline Systems",
  "Fjord Intelligence",
] as const;

const services: MaintenanceExclusionSeed["service"][] = [
  "managed-training-api",
  "batch-inference-api",
];

const commitments = [80, 120, 180, 240] as const;
const durations = [32, 41, 49, 57] as const;
const renewals = [null, "2026-06-01", "2026-09-18"] as const;

export function createMaintenanceExclusionSeed(index: number): MaintenanceExclusionSeed {
  return {
    index,
    caseId: `synthetic_maintenance_exclusion_${String(index + 1).padStart(3, "0")}`,
    title: `Synthetic maintenance exclusion ${index + 1}`,
    accountId: `acct_maint_${String(index + 1).padStart(3, "0")}`,
    billingAccountId: `bill_maint_${String(index + 1).padStart(3, "0")}`,
    accountName: accountNames[index % accountNames.length]!,
    accountTier: index % 5 === 0 ? "strategic" : "enterprise",
    service: services[index % services.length]!,
    commitmentHours: commitments[index % commitments.length]!,
    durationMinutes: durations[index % durations.length]!,
    impactVariant: index % 4 === 0 ? "delayed_job_start" : "outage",
    communicationReview: index % 6 === 0,
    renewalDate: renewals[index % renewals.length]!,
  };
}
