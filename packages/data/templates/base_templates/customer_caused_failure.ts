export type CustomerCausedFailureSeed = {
  index: number;
  caseId: string;
  title: string;
  accountId: string;
  billingAccountId: string;
  accountName: string;
  planName: "OnDemand" | `Committed-${number}`;
  commitmentHours: number | null;
  artifactLabel: "checkpoint format" | "config manifest" | "container image" | "dataset schema";
  impactVariant: "job_failure" | "retry_storm" | "delayed_job_start";
  attributionClarity: "clear" | "review_needed";
  usageHours: number;
  invoicePreviewUsd: number;
};

const accountNames = [
  "Juniper Models",
  "Loom AI",
  "Vector Ridge",
  "Pine Harbor ML",
  "Atlas Logic",
  "Murmur Research",
] as const;

const artifactLabels: CustomerCausedFailureSeed["artifactLabel"][] = [
  "checkpoint format",
  "config manifest",
  "container image",
  "dataset schema",
];

export function createCustomerCausedFailureSeed(index: number): CustomerCausedFailureSeed {
  const onDemand = index % 2 === 0;
  const commitmentHours = onDemand ? null : 120 + (index % 4) * 40;
  const usageHours = 10 + (index % 8) * 3;
  const planName = onDemand
    ? "OnDemand"
    : (`Committed-${commitmentHours}` as `Committed-${number}`);
  const impactVariant =
    index % 6 === 0 ? "retry_storm" : index % 5 === 0 ? "delayed_job_start" : "job_failure";
  const attributionClarity = index % 4 === 0 ? "review_needed" : "clear";

  return {
    index,
    caseId: `synthetic_customer_caused_${String(index + 1).padStart(3, "0")}`,
    title: `Synthetic customer-caused failure ${index + 1}`,
    accountId: `acct_cust_${String(index + 1).padStart(3, "0")}`,
    billingAccountId: `bill_cust_${String(index + 1).padStart(3, "0")}`,
    accountName: accountNames[index % accountNames.length]!,
    planName,
    commitmentHours,
    artifactLabel: artifactLabels[index % artifactLabels.length]!,
    impactVariant,
    attributionClarity,
    usageHours,
    invoicePreviewUsd: usageHours * 70 + Math.round((index + 2) * 17.5),
  };
}
