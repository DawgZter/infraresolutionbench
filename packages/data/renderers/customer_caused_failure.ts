import type { GoldCase } from "@infraresolutionbench/shared";
import { GoldCaseSchema } from "@infraresolutionbench/shared";

import {
  customerMisconfigVariant,
  engineeringMisconfigVariant,
} from "../generator/noise_injectors";
import type { CustomerCausedFailureSeed } from "../templates/base_templates/customer_caused_failure";

export function renderCustomerCausedFailureCase(seed: CustomerCausedFailureSeed): GoldCase {
  const needsReview = seed.attributionClarity === "review_needed";
  const customerImpact = seed.impactVariant;
  const confidence = needsReview || customerImpact === "delayed_job_start" ? "medium" : "high";
  const recommendedAction = needsReview ? "hold_for_engineering_review" : "send_explanation_only";
  const customerImpactSummary =
    customerImpact === "retry_storm"
      ? "Jobs repeatedly retried after failing validation."
      : customerImpact === "delayed_job_start"
        ? "Job launch was delayed while validation retried invalid customer inputs."
        : "Job failed during validation before runtime execution began.";
  const telemetrySummary =
    customerImpact === "retry_storm"
      ? "Cluster availability remained healthy while invalid inputs triggered repeated retries."
      : customerImpact === "delayed_job_start"
        ? "Cluster availability remained healthy while validation retries delayed job launch."
        : "Cluster availability remained healthy while the job failed during validation.";
  const anomaly =
    customerImpact === "retry_storm"
      ? ["Repeated customer-side retries triggered by invalid runtime inputs."]
      : customerImpact === "delayed_job_start"
        ? ["Validation retries delayed job start despite healthy platform telemetry."]
        : [];
  const engineeringSummary =
    needsReview
      ? `Primary logs point to a customer-side ${seed.artifactLabel} problem, but engineering wants one more validation pass before closing the case.`
      : engineeringMisconfigVariant(seed.index, seed.artifactLabel);
  const latentFacts = [
    "The failure happens during validation or model load rather than service availability.",
    "The contract excludes customer-caused failures from SLA remedies.",
  ];

  if (needsReview) {
    latentFacts.push("Engineering attribution points to customer inputs, but the team still wants a final validation pass before sending the explanation.");
  }

  return GoldCaseSchema.parse({
    metadata: {
      benchmark_version: "v1",
      authoring_style: "synthetic",
      created_at: "2026-04-05",
      adversarial_tags: ["customer_claims_platform_failure", "customer_caused_issue"],
    },
    hidden_state: {
      scenario_summary:
        "Synthetic customer-caused failure where the customer attributes a job failure to the platform but engineering logs point to invalid customer-supplied artifacts or configuration.",
      generator_family: "customer_caused_failure",
      latent_facts: latentFacts,
      likely_failure_modes: [
        "Model trusts the customer complaint over the engineering evidence.",
        "Model marks the case as a platform outage instead of customer-caused failure.",
        "Model ignores when the case still needs engineering confirmation before sending a final explanation.",
      ],
      commercial_context: {
        strategic_account: false,
        renewal_days: null,
        prior_incidents_30d: null,
      },
    },
    case_packet: {
      case_id: seed.caseId,
      title: seed.title,
      crm_record: {
        account_id: seed.accountId,
        account_name: seed.accountName,
        account_tier: seed.commitmentHours === null ? "standard" : "enterprise",
        plan_name: seed.planName,
        contracted_commitment_gpu_hours: seed.commitmentHours,
        billing_owner: "revops@prime.example",
        sla_tier: "standard-covered-service",
        renewal_date: null,
        notes: [
          seed.commitmentHours === null
            ? "Self-serve customer on standard terms."
            : "Managed account on standard SLA terms.",
        ],
      },
      billing_record: {
        billing_account_id: seed.billingAccountId,
        configured_plan_name: seed.planName,
        configured_commitment_gpu_hours: seed.commitmentHours,
        invoice_preview_usd: seed.invoicePreviewUsd,
        credits_applied_usd: 0,
        burst_usage_gpu_hours: seed.commitmentHours === null ? null : 0,
        pricing_notes: ["No billing anomalies detected."],
      },
      usage_record: {
        window_start: "2026-03-01",
        window_end: "2026-03-31",
        total_gpu_hours: seed.usageHours,
        covered_service_minutes_unavailable: 0,
        telemetry_summary: telemetrySummary,
        meter_ingestion_status: "healthy",
        anomalies: anomaly,
      },
      incident_record: {
        incident_id: null,
        status: "no_known_incident",
        service: "job-runtime",
        duration_minutes: null,
        customer_visible: false,
        customer_impact_summary: customerImpactSummary,
        engineering_summary: engineeringSummary,
        covered_by_sla: false,
        scheduled_maintenance: false,
      },
      customer_note: customerMisconfigVariant(seed.index),
      policy_snippet:
        "Failures caused by invalid customer inputs, artifacts, or configuration are excluded from SLA service credits.",
      calculator_output: null,
      visible_case_summary:
        "Synthetic customer-caused failure with healthy platform telemetry and clear engineering attribution.",
    },
    ground_truth: {
      issue_type: "customer_caused_issue",
      root_cause: "customer_misconfiguration",
      customer_impact: customerImpact,
      contractual_applicability: "sla_excluded_customer_caused",
      discrepancy_detected: false,
      recommended_owner: "engineering_owner",
      recommended_action: recommendedAction,
      needs_human_review: needsReview,
      confidence,
      adjudication_notes: [
        "The operational evidence cleanly attributes the failure to a customer-supplied artifact or configuration.",
        ...(needsReview
          ? ["This case should still stay with engineering review until the final validation pass confirms the customer attribution."]
          : []),
      ],
      reference_customer_note:
        needsReview
          ? "We found strong evidence that the issue is tied to a customer-supplied artifact or configuration rather than a platform outage, but engineering is doing one final validation pass before we send a final resolution. Based on the current evidence, this would not qualify for SLA credits because customer-caused failures are excluded."
          : customerImpact === "retry_storm"
            ? "We reviewed the runtime logs and found the repeated retries were caused by an invalid customer-supplied artifact or configuration rather than a platform outage. Because the issue was customer-caused, it does not qualify for SLA credits, but we can share the validation details to help you correct the retries."
            : customerImpact === "delayed_job_start"
              ? "We reviewed the runtime logs and found the delayed start was caused by validation retries on a customer-supplied artifact or configuration rather than a platform outage. Because the issue was customer-caused, it does not qualify for SLA credits, but we can share the validation details to help you rerun successfully."
              : "We reviewed the runtime logs and found the failure was caused by an invalid customer-supplied artifact or configuration rather than a platform outage. Because the issue was customer-caused, it does not qualify for SLA credits, but we can share the validation details to help you rerun successfully.",
      reference_internal_note:
        needsReview
          ? "Owner: engineering_owner. Action: hold_for_engineering_review because current evidence points to customer_misconfiguration, but engineering wants one final validation pass before closing the case."
          : "Owner: engineering_owner. Action: send_explanation_only because root cause is customer_misconfiguration and the contract excludes customer-caused failures.",
    },
  });
}
