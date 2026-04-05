export type PricingMismatchSeed = {
  index: number;
  caseId: string;
  title: string;
  accountId: string;
  billingAccountId: string;
  accountName: string;
  accountTier: "enterprise" | "strategic";
  crmCommitment: number;
  billingCommitment: number;
  usageHours: number;
  invoicePreviewUsd: number;
  renewalDate: string | null;
  strategicAccount: boolean;
  renewalDays: number | null;
  routingProfile: "shared_review" | "revops_primary";
};

const accountNames = [
  "Cinder Compute",
  "Blue Mesa AI",
  "Fathom Systems",
  "Granite Labs",
  "Orbit Vector",
  "Beacon Tensor",
  "Mooring Intelligence",
  "Cascade Reasoning",
  "Summit Protein AI",
  "Atlas Climate Models",
] as const;

const crmCommitments = [60, 80, 100, 120, 150] as const;
const commitmentOffsets = [20, 30, 40, 50] as const;
const accountTiers = ["enterprise", "enterprise", "enterprise", "strategic"] as const;
const renewalDates = [null, "2026-05-01", "2026-06-15", "2026-04-18"] as const;

export function createPricingMismatchSeed(index: number): PricingMismatchSeed {
  const crmCommitment = crmCommitments[index % crmCommitments.length]!;
  const billingCommitment = crmCommitment + commitmentOffsets[index % commitmentOffsets.length]!;
  const usageHours = crmCommitment + 9 + ((index * 7) % 14);
  const accountTier = accountTiers[index % accountTiers.length]!;
  const renewalDate = renewalDates[index % renewalDates.length]!;
  const strategicAccount = accountTier === "strategic";

  return {
    index,
    caseId: `synthetic_pricing_mismatch_${String(index + 1).padStart(3, "0")}`,
    title: `Synthetic pricing mismatch ${index + 1}`,
    accountId: `acct_syn_${String(index + 1).padStart(3, "0")}`,
    billingAccountId: `bill_syn_${String(index + 1).padStart(3, "0")}`,
    accountName: accountNames[index % accountNames.length]!,
    accountTier,
    crmCommitment,
    billingCommitment,
    usageHours,
    invoicePreviewUsd: billingCommitment * 72 + Math.round((index + 1) * 41.5),
    renewalDate,
    strategicAccount,
    renewalDays: renewalDate === null ? null : Math.max(3, 28 - index),
    routingProfile: index % 4 === 0 ? "revops_primary" : "shared_review",
  };
}
