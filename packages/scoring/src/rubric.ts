import type { CasePacket, ModelOutput } from "@infraresolutionbench/shared";

export type RubricCheckResult = {
  id: string;
  passed: boolean;
  message: string;
};

export type RubricScoreResult = {
  passed: number;
  total: number;
  passRate: number;
  checks: RubricCheckResult[];
};

const issueKeywords: Record<ModelOutput["issue_type"], string[]> = {
  pricing_config_mismatch: ["pricing", "plan", "billing", "contract", "mismatch", "invoice"],
  metering_discrepancy: ["meter", "usage", "dashboard", "invoice", "reconcile"],
  incident_impact_review: ["incident", "outage", "degraded", "performance", "availability"],
  customer_caused_issue: ["configuration", "checkpoint", "artifact", "customer input", "job failed"],
  policy_applicability_review: ["policy", "contract", "burst", "credits", "invoice", "pricing"],
  ambiguous_case: ["review", "mixed", "unclear", "investigating", "follow up"],
};

const impactKeywords: Record<ModelOutput["customer_impact"], string[]> = {
  no_customer_impact: ["no customer impact"],
  outage: ["outage", "unavailable", "downtime"],
  degraded_performance: ["degraded", "slow", "latency", "performance"],
  delayed_job_start: ["delayed", "slow start", "queue"],
  job_failure: ["job failed", "failure", "run failed"],
  retry_storm: ["retries", "retry storm"],
  usage_visibility_gap: ["usage", "dashboard", "visibility", "meter"],
  invoice_confusion: ["invoice", "billing", "charges", "cost"],
};

function normalize(value: string): string {
  return value.toLowerCase();
}

function includesAny(value: string, candidates: string[]): boolean {
  return candidates.some((candidate) => value.includes(candidate));
}

function daysUntil(dateString: string): number {
  const today = new Date("2026-04-05T00:00:00Z");
  const target = new Date(`${dateString}T00:00:00Z`);
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function isAccountContextRelevant(casePacket: CasePacket): boolean {
  const renewalDays =
    casePacket.crm_record.renewal_date === null ? null : daysUntil(casePacket.crm_record.renewal_date);

  return (
    casePacket.crm_record.account_tier === "strategic" ||
    (renewalDays !== null && renewalDays <= 14) ||
    casePacket.crm_record.notes.some((note) => normalize(note).includes("renewal"))
  );
}

export function scoreRubric(casePacket: CasePacket, modelOutput: ModelOutput): RubricScoreResult {
  const customerNote = normalize(modelOutput.customer_note);
  const internalNote = normalize(modelOutput.internal_note);

  const checks: RubricCheckResult[] = [
    {
      id: "customer_note_mentions_issue_or_impact",
      passed:
        includesAny(customerNote, issueKeywords[modelOutput.issue_type]) ||
        includesAny(customerNote, impactKeywords[modelOutput.customer_impact]),
      message: "Customer note should mention the issue type or customer-facing impact in plain language.",
    },
    {
      id: "customer_note_mentions_next_step_when_review_needed",
      passed:
        !modelOutput.needs_human_review ||
        includesAny(customerNote, ["review", "follow up", "investigate", "routing", "route"]),
      message: "Customer note should mention the next step when human review is needed.",
    },
    {
      id: "internal_note_mentions_owner",
      passed: includesAny(internalNote, ["owner", "revops", "finance", "engineering", "review"]),
      message: "Internal note should mention the owner.",
    },
    {
      id: "internal_note_mentions_next_action",
      passed: includesAny(internalNote, ["action", "hold", "send", "consider", "review", "no action"]),
      message: "Internal note should mention the next action.",
    },
    {
      id: "internal_note_mentions_account_context_when_relevant",
      passed:
        !isAccountContextRelevant(casePacket) ||
        includesAny(internalNote, ["renewal", "strategic", "enterprise", "account"]),
      message: "Internal note should mention account context when the case is commercially sensitive.",
    },
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
