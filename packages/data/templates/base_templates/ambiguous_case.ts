export type AmbiguousCaseSeed = {
  index: number;
  caseId: string;
  title: string;
  accountId: string;
  billingAccountId: string;
  accountName: string;
  accountTier: "enterprise" | "strategic";
  commitmentHours: number;
  totalUsageHours: number;
  burstUsageHours: number;
  incidentMinutes: number;
  invoicePreviewUsd: number;
  renewalDate: string | null;
  ambiguityProfile: "ops_and_billing" | "billing_dominant" | "ops_dominant" | "policy_dominant";
};

const accountNames = [
  "Atlas Reasoning",
  "Morrow Dynamics",
  "Signal Harbor",
  "Quill Compute",
  "Aperture Labs",
  "Juniper Frontier",
  "Stonepath AI",
  "Drift Research",
] as const;

const accountTiers: AmbiguousCaseSeed["accountTier"][] = [
  "enterprise",
  "enterprise",
  "strategic",
];

const commitments = [100, 140, 180, 220] as const;
const burstUsages = [12, 18, 21, 27] as const;
const incidentMinutes = [9, 11, 13, 16] as const;
const renewalDates = [null, "2026-05-20", "2026-06-07"] as const;

export function createAmbiguousCaseSeed(index: number): AmbiguousCaseSeed {
  const commitmentHours = commitments[index % commitments.length]!;
  const burstUsageHours = burstUsages[index % burstUsages.length]!;

  return {
    index,
    caseId: `synthetic_ambiguous_case_${String(index + 1).padStart(3, "0")}`,
    title: `Synthetic ambiguous mixed-evidence case ${index + 1}`,
    accountId: `acct_amb_${String(index + 1).padStart(3, "0")}`,
    billingAccountId: `bill_amb_${String(index + 1).padStart(3, "0")}`,
    accountName: accountNames[index % accountNames.length]!,
    accountTier: accountTiers[index % accountTiers.length]!,
    commitmentHours,
    totalUsageHours: commitmentHours + burstUsageHours,
    burstUsageHours,
    incidentMinutes: incidentMinutes[index % incidentMinutes.length]!,
    invoicePreviewUsd: (commitmentHours + burstUsageHours) * 71 + Math.round((index + 5) * 28.4),
    renewalDate: renewalDates[index % renewalDates.length]!,
    ambiguityProfile: (
      ["ops_and_billing", "billing_dominant", "ops_dominant", "policy_dominant"] as const
    )[index % 4]!,
  };
}
