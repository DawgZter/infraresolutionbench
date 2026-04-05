export const ISSUE_TYPES = [
  "pricing_config_mismatch",
  "metering_discrepancy",
  "incident_impact_review",
  "customer_caused_issue",
  "policy_applicability_review",
  "ambiguous_case",
] as const;

export type IssueType = (typeof ISSUE_TYPES)[number];

export const ROOT_CAUSES = [
  "capacity_shortfall",
  "scheduler_failure",
  "gpu_node_failure",
  "usage_metering_error",
  "billing_config_out_of_sync_with_crm",
  "customer_misconfiguration",
  "scheduled_maintenance",
  "unknown_root_cause",
] as const;

export type RootCause = (typeof ROOT_CAUSES)[number];

export const CUSTOMER_IMPACTS = [
  "no_customer_impact",
  "outage",
  "degraded_performance",
  "delayed_job_start",
  "job_failure",
  "retry_storm",
  "usage_visibility_gap",
  "invoice_confusion",
] as const;

export type CustomerImpact = (typeof CUSTOMER_IMPACTS)[number];

export const CONTRACTUAL_APPLICABILITIES = [
  "not_an_sla_case",
  "sla_breach",
  "no_sla_breach",
  "sla_excluded_scheduled_maintenance",
  "sla_excluded_customer_caused",
  "credit_due",
  "no_credit_due",
  "invoice_adjustment_due",
  "goodwill_credit_optional",
] as const;

export type ContractualApplicability =
  (typeof CONTRACTUAL_APPLICABILITIES)[number];

export const RECOMMENDED_OWNERS = [
  "revops_owner",
  "finance_owner",
  "engineering_owner",
  "shared_revops_finance",
  "shared_revops_engineering",
  "human_review_required",
] as const;

export type RecommendedOwner = (typeof RECOMMENDED_OWNERS)[number];

export const RECOMMENDED_ACTIONS = [
  "send_explanation_only",
  "hold_for_revops_review",
  "hold_for_finance_review",
  "hold_for_engineering_review",
  "consider_goodwill_credit",
  "no_action_required",
] as const;

export type RecommendedAction = (typeof RECOMMENDED_ACTIONS)[number];

export const CONFIDENCES = ["high", "medium", "low"] as const;

export type Confidence = (typeof CONFIDENCES)[number];
