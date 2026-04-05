export type MeteringDiscrepancySeed = {
  index: number;
  caseId: string;
  title: string;
  accountId: string;
  billingAccountId: string;
  accountName: string;
  accountTier: "enterprise" | "strategic";
  commitmentHours: number;
  visibleUsageHours: number;
  billableUsageHours: number;
  invoicePreviewUsd: number;
  renewalDate: string | null;
  strategicAccount: boolean;
  resolutionPath: "invoice_adjustment" | "visibility_only";
};

const accountNames = [
  "Delta Harbor",
  "Kite Memory",
  "Aster Compute",
  "Hinterland ML",
  "North Coast AI",
  "Harborline Systems",
  "Palisade Vision",
  "Juniper Inference",
] as const;

const commitments = [100, 150, 200, 240] as const;
const lags = [11, 17, 23, 29] as const;
const tiers = ["enterprise", "enterprise", "strategic"] as const;
const renewals = [null, "2026-04-29", "2026-07-03"] as const;

export function createMeteringDiscrepancySeed(index: number): MeteringDiscrepancySeed {
  const commitmentHours = commitments[index % commitments.length]!;
  const visibleUsageHours = commitmentHours - 14 + ((index * 5) % 18);
  const billableUsageHours = visibleUsageHours + lags[index % lags.length]!;
  const accountTier = tiers[index % tiers.length]!;

  return {
    index,
    caseId: `synthetic_metering_discrepancy_${String(index + 1).padStart(3, "0")}`,
    title: `Synthetic metering discrepancy ${index + 1}`,
    accountId: `acct_meter_${String(index + 1).padStart(3, "0")}`,
    billingAccountId: `bill_meter_${String(index + 1).padStart(3, "0")}`,
    accountName: accountNames[index % accountNames.length]!,
    accountTier,
    commitmentHours,
    visibleUsageHours,
    billableUsageHours,
    invoicePreviewUsd: billableUsageHours * 68 + Math.round((index + 3) * 37.2),
    renewalDate: renewals[index % renewals.length]!,
    strategicAccount: accountTier === "strategic",
    resolutionPath: index % 4 === 0 ? "visibility_only" : "invoice_adjustment",
  };
}
