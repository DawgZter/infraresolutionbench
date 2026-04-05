import type { ModelOutput } from "@infraresolutionbench/shared";

export type ConsistencyCheckResult = {
  id: string;
  passed: boolean;
  message: string;
};

export type ConsistencyScoreResult = {
  passed: number;
  total: number;
  passRate: number;
  checks: ConsistencyCheckResult[];
};

const ownerKeywords: Record<ModelOutput["recommended_owner"], string[]> = {
  revops_owner: ["revops", "revenue operations", "commercial ops"],
  finance_owner: ["finance", "billing team", "finance review"],
  engineering_owner: ["engineering", "platform team", "incident team"],
  shared_revops_finance: ["revops", "finance"],
  shared_revops_engineering: ["revops", "engineering"],
  human_review_required: ["human review", "manual review"],
};

const actionKeywords: Record<ModelOutput["recommended_action"], string[]> = {
  send_explanation_only: ["explain", "explanation", "clarify", "share", "follow up"],
  hold_for_revops_review: ["hold", "revops review", "commercial review"],
  hold_for_finance_review: ["hold", "finance review", "billing review"],
  hold_for_engineering_review: ["hold", "engineering review", "incident review"],
  consider_goodwill_credit: ["goodwill", "commercial gesture", "gesture", "review"],
  no_action_required: ["no action required", "no further action"],
};

const creditKeywords = ["service credit", "credit due", "credit will", "credit applies"];
const slaBreachKeywords = ["sla breach", "breach of sla"];
const discrepancyKeywords = ["systems disagree", "mismatch between systems", "records disagree"];
const finalityKeywords = ["final resolution", "fully resolved", "confirmed final answer"];
const uncertaintyKeywords = [
  "mixed evidence",
  "review",
  "investigating",
  "follow up",
  "follow-up",
  "inconclusive",
  "unclear",
  "unknown",
  "not yet confirmed",
  "still reviewing",
];
const reviewNegationKeywords = [
  "no further review",
  "no review needed",
  "no additional review",
  "review is not needed",
];
const certaintyOverclaimKeywords = [
  "definitely",
  "fully confirmed",
  "definitive",
  "final resolution",
  "confirmed final answer",
];
const rootCauseCertaintyKeywords = [
  "confirmed root cause",
  "definitive cause",
  "determined root cause",
  "final root cause",
];
const unknownRootCauseKeywords = [
  "root cause remains unknown",
  "root cause is unknown",
  "root cause still unknown",
  "cause remains unknown",
  "cause is still unknown",
];

function normalize(value: string): string {
  return value.toLowerCase();
}

function includesAny(value: string, candidates: string[]): boolean {
  return candidates.some((candidate) => value.includes(candidate));
}

function runCheck(id: string, passed: boolean, message: string): ConsistencyCheckResult {
  return { id, passed, message };
}

export function scoreConsistency(modelOutput: ModelOutput): ConsistencyScoreResult {
  const customerNote = normalize(modelOutput.customer_note);
  const internalNote = normalize(modelOutput.internal_note);

  const creditAllowed =
    modelOutput.contractual_applicability === "credit_due" ||
    modelOutput.contractual_applicability === "goodwill_credit_optional";

  const creditMentionCheck = runCheck(
    "customer_note_credit_alignment",
    creditAllowed || !includesAny(customerNote, creditKeywords),
    creditAllowed
      ? "Customer note may discuss a credit when the structured output allows it."
      : "Customer note should not promise a service credit when credit_due is false.",
  );

  const internalCreditMentionCheck = runCheck(
    "internal_note_credit_alignment",
    creditAllowed || !includesAny(internalNote, creditKeywords),
    creditAllowed
      ? "Internal note may discuss a credit when the structured output allows it."
      : "Internal note should not promise a service credit when credit_due is false.",
  );

  const slaExclusionCheck = runCheck(
    "customer_note_sla_alignment",
    !(
      [
        "not_an_sla_case",
        "sla_excluded_scheduled_maintenance",
        "sla_excluded_customer_caused",
        "no_sla_breach",
        "no_credit_due",
      ].includes(modelOutput.contractual_applicability) &&
      includesAny(customerNote, slaBreachKeywords)
    ),
    "Customer note should not claim an SLA breach when the structured outcome says it is excluded or not applicable.",
  );

  const discrepancyCheck = runCheck(
    "customer_note_discrepancy_alignment",
    modelOutput.discrepancy_detected || !includesAny(customerNote, discrepancyKeywords),
    "Customer note should only describe a system disagreement when discrepancy_detected is true.",
  );

  const reviewFinalityCheck = runCheck(
    "customer_note_review_alignment",
    !(
      modelOutput.needs_human_review &&
      includesAny(customerNote, finalityKeywords)
    ),
    "Customer note should not present the case as finally resolved when needs_human_review is true.",
  );

  const internalOwnerCheck = runCheck(
    "internal_note_owner_alignment",
    includesAny(internalNote, ownerKeywords[modelOutput.recommended_owner]),
    "Internal note should mention the recommended owner or owning function.",
  );

  const internalActionCheck = runCheck(
    "internal_note_action_alignment",
    includesAny(internalNote, actionKeywords[modelOutput.recommended_action]),
    "Internal note should mention the recommended next action.",
  );

  const ambiguityRequiresUncertainty =
    modelOutput.issue_type === "ambiguous_case" ||
    modelOutput.root_cause === "unknown_root_cause" ||
    modelOutput.confidence === "low";

  const customerAcknowledgesUncertainty = includesAny(customerNote, uncertaintyKeywords);
  const internalAcknowledgesUncertainty = includesAny(internalNote, uncertaintyKeywords);
  const customerOverclaims =
    includesAny(customerNote, certaintyOverclaimKeywords) ||
    includesAny(customerNote, reviewNegationKeywords);
  const internalOverclaims =
    includesAny(internalNote, certaintyOverclaimKeywords) ||
    includesAny(internalNote, reviewNegationKeywords);

  const customerUncertaintyCheck = runCheck(
    "customer_note_uncertainty_alignment",
    !ambiguityRequiresUncertainty ||
      (customerAcknowledgesUncertainty && !customerOverclaims),
    "Customer note should acknowledge uncertainty or further review when the structured output is ambiguous or low-confidence.",
  );

  const internalUncertaintyCheck = runCheck(
    "internal_note_uncertainty_alignment",
    !ambiguityRequiresUncertainty ||
      (internalAcknowledgesUncertainty && !internalOverclaims),
    "Internal note should acknowledge uncertainty or low confidence when the structured output is ambiguous or unresolved.",
  );

  const unknownRootCauseCheck = runCheck(
    "unknown_root_cause_alignment",
    !(
      modelOutput.root_cause === "unknown_root_cause" &&
      !(
        includesAny(customerNote, unknownRootCauseKeywords) &&
        includesAny(internalNote, unknownRootCauseKeywords)
      ) &&
      (includesAny(customerNote, rootCauseCertaintyKeywords) ||
        includesAny(internalNote, rootCauseCertaintyKeywords))
    ),
    "Notes should not claim a confirmed root cause when the structured output says the root cause is unknown.",
  );

  const checks = [
    creditMentionCheck,
    internalCreditMentionCheck,
    slaExclusionCheck,
    discrepancyCheck,
    reviewFinalityCheck,
    internalOwnerCheck,
    internalActionCheck,
    customerUncertaintyCheck,
    internalUncertaintyCheck,
    unknownRootCauseCheck,
  ];

  const passed = checks.filter((check) => check.passed).length;
  const total = checks.length;

  return {
    passed,
    total,
    passRate: passed / total,
    checks,
  };
}
