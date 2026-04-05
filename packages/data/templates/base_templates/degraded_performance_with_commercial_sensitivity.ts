export type CommercialSensitivitySeed = {
  index: number;
  caseId: string;
  title: string;
  accountId: string;
  billingAccountId: string;
  accountName: string;
  accountTier: "enterprise" | "strategic";
  commitmentHours: number;
  durationMinutes: number;
  repeated: boolean;
  renewalDate: string;
  renewalDays: number;
  priorIncidents30d: number;
  invoicePreviewUsd: number;
  commercialTrack: "goodwill_optional" | "repeat_review" | "no_credit_due";
};

const accountNames = [
  "Pioneer Robotics",
  "Nimbus Health AI",
  "Cobalt Discovery",
  "Torch Climate",
  "Redwood Genomics",
  "Harbor Defense AI",
] as const;

const accountTiers: CommercialSensitivitySeed["accountTier"][] = [
  "enterprise",
  "strategic",
];

const commitments = [320, 500, 760, 900] as const;
const durations = [14, 18, 21, 24, 27] as const;

export function createCommercialSensitivitySeed(index: number): CommercialSensitivitySeed {
  const accountTier = accountTiers[index % accountTiers.length]!;
  const commitmentHours = commitments[index % commitments.length]!;
  const repeated = index % 2 === 1;
  const renewalDays = 5 + (index % 8);
  const renewalDate = `2026-04-${String(renewalDays + 5).padStart(2, "0")}`;

  return {
    index,
    caseId: `synthetic_commercial_sensitivity_${String(index + 1).padStart(3, "0")}`,
    title: `Synthetic commercial sensitivity case ${index + 1}`,
    accountId: `acct_goodwill_${String(index + 1).padStart(3, "0")}`,
    billingAccountId: `bill_goodwill_${String(index + 1).padStart(3, "0")}`,
    accountName: accountNames[index % accountNames.length]!,
    accountTier,
    commitmentHours,
    durationMinutes: durations[index % durations.length]!,
    repeated,
    renewalDate,
    renewalDays,
    priorIncidents30d: repeated ? 3 + (index % 3) : 2 + (index % 2),
    invoicePreviewUsd: commitmentHours * 78 + Math.round((index + 4) * 33.1),
    commercialTrack:
      index % 5 === 0 ? "no_credit_due" : repeated ? "repeat_review" : "goodwill_optional",
  };
}
