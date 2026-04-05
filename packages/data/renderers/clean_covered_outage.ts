import type { GoldCase } from "@infraresolutionbench/shared";
import { GoldCaseSchema } from "@infraresolutionbench/shared";

import {
  customerOutageVariant,
  engineeringOutageVariant,
} from "../generator/noise_injectors";
import type { CleanCoveredOutageSeed } from "../templates/base_templates/clean_covered_outage";

const rootCauseLabels: Record<CleanCoveredOutageSeed["rootCause"], string> = {
  capacity_shortfall: "regional capacity shortfall",
  scheduler_failure: "scheduler failure",
  gpu_node_failure: "GPU node failure",
};

export function renderCleanCoveredOutageCase(seed: CleanCoveredOutageSeed): GoldCase {
  const rootCauseLabel = rootCauseLabels[seed.rootCause];

  return GoldCaseSchema.parse({
    metadata: {
      benchmark_version: "v1",
      authoring_style: "synthetic",
      created_at: "2026-04-05",
      adversarial_tags: ["covered_outage", "flat_credit_policy", "status_note_brevity"],
    },
    hidden_state: {
      scenario_summary:
        "Synthetic clean covered outage where a covered service exceeds the credit threshold and clearly qualifies for a contract remedy.",
      generator_family: "clean_covered_outage",
      latent_facts: [
        "The incident is customer-visible and on a covered service.",
        "The outage duration clears the threshold for a flat credit.",
        "The case should not require extra review in v1.",
      ],
      likely_failure_modes: [
        "Model under-calls credit eligibility despite clear policy coverage.",
        "Model routes exclusively to engineering and misses the shared commercial response.",
      ],
      commercial_context: {
        strategic_account: false,
        renewal_days: seed.renewalDate === null ? null : 20 + (seed.index % 14),
        prior_incidents_30d: seed.index % 5 === 0 ? 2 : 1,
      },
    },
    case_packet: {
      case_id: seed.caseId,
      title: seed.title,
      crm_record: {
        account_id: seed.accountId,
        account_name: seed.accountName,
        account_tier: "enterprise",
        plan_name: `Committed-${seed.commitmentHours}`,
        contracted_commitment_gpu_hours: seed.commitmentHours,
        billing_owner: "finance@prime.example",
        sla_tier: "premium-covered-service",
        renewal_date: seed.renewalDate,
        notes: [
          "Premium SLA addendum includes flat credit for covered outages over 30 minutes.",
        ],
      },
      billing_record: {
        billing_account_id: seed.billingAccountId,
        configured_plan_name: `Committed-${seed.commitmentHours}`,
        configured_commitment_gpu_hours: seed.commitmentHours,
        invoice_preview_usd: seed.invoicePreviewUsd,
        credits_applied_usd: 0,
        burst_usage_gpu_hours: 0,
        pricing_notes: ["No pricing anomalies detected."],
      },
      usage_record: {
        window_start: "2026-03-01",
        window_end: "2026-03-31",
        total_gpu_hours: Math.max(seed.commitmentHours - 18 + (seed.index % 21), 0),
        covered_service_minutes_unavailable: seed.durationMinutes,
        telemetry_summary: "Usage outside the outage window was normal.",
        meter_ingestion_status: "healthy",
        anomalies: [],
      },
      incident_record: {
        incident_id: `inc_syn_${String(seed.index + 1).padStart(3, "0")}`,
        status: "resolved",
        service: seed.service,
        duration_minutes: seed.durationMinutes,
        customer_visible: true,
        customer_impact_summary: `Covered service unavailable for ${seed.durationMinutes} minutes.`,
        engineering_summary: engineeringOutageVariant(seed.index, rootCauseLabel),
        covered_by_sla: true,
        scheduled_maintenance: false,
      },
      customer_note: customerOutageVariant(seed.index, seed.service),
      policy_snippet:
        "Covered outages longer than 30 minutes on premium managed services receive a flat service credit.",
      calculator_output: `Covered outage duration: ${seed.durationMinutes} minutes. Credit threshold met.`,
      visible_case_summary:
        "Synthetic clean covered outage with explicit credit eligibility.",
    },
    ground_truth: {
      issue_type: "incident_impact_review",
      root_cause: seed.rootCause,
      customer_impact: "outage",
      contractual_applicability: "credit_due",
      discrepancy_detected: false,
      recommended_owner: "shared_revops_engineering",
      recommended_action: "send_explanation_only",
      needs_human_review: false,
      confidence: "high",
      adjudication_notes: [
        "This family is meant to be a clean positive-control outage case.",
      ],
      reference_customer_note:
        "We confirmed a covered outage longer than the contract threshold, so the flat service credit applies. We will share the incident summary and confirm the credit handling in the billing workflow.",
      reference_internal_note:
        "Owner: shared_revops_engineering. Action: send_explanation_only because the outage was covered, exceeded threshold, and qualifies for credit_due.",
    },
  });
}
