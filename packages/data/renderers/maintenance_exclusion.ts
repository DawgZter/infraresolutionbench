import type { GoldCase } from "@infraresolutionbench/shared";
import { GoldCaseSchema } from "@infraresolutionbench/shared";

import {
  customerMaintenanceVariant,
  engineeringMaintenanceVariant,
} from "../generator/noise_injectors";
import type { MaintenanceExclusionSeed } from "../templates/base_templates/maintenance_exclusion";

export function renderMaintenanceExclusionCase(seed: MaintenanceExclusionSeed): GoldCase {
  const needsReview = seed.communicationReview;
  const customerImpact = seed.impactVariant;
  const recommendedOwner = needsReview ? "shared_revops_engineering" : "engineering_owner";
  const recommendedAction = needsReview ? "hold_for_engineering_review" : "send_explanation_only";
  const confidence = needsReview ? "medium" : "high";
  const customerImpactSummary =
    customerImpact === "delayed_job_start"
      ? `New submissions were delayed during the planned maintenance window for ${seed.durationMinutes} minutes.`
      : `Service unavailable during a planned maintenance window for ${seed.durationMinutes} minutes.`;
  const telemetrySummary =
    customerImpact === "delayed_job_start"
      ? "Usage accumulated after the window closed; customers mainly saw delayed job starts rather than a hard outage."
      : "Usage paused during the maintenance window and resumed after planned work completed.";
  const visibleSummary =
    customerImpact === "delayed_job_start"
      ? "Synthetic planned maintenance case with customer-visible delays but excluded contractual remedy."
      : "Synthetic planned maintenance case with real impact but excluded contractual remedy.";

  return GoldCaseSchema.parse({
    metadata: {
      benchmark_version: "v1",
      authoring_style: "synthetic",
      created_at: "2026-04-05",
      adversarial_tags: ["maintenance_exclusion", "status_note_brevity"],
    },
    hidden_state: {
      scenario_summary:
        "Synthetic planned maintenance case where the customer experienced real downtime, but credits are excluded by policy.",
      generator_family: "maintenance_exclusion",
      latent_facts: [
        "Maintenance was announced ahead of time.",
        "The interruption is real but contractually excluded from SLA credits.",
        "This should not be treated as a breach or discrepancy.",
        ...(needsReview
          ? ["The exclusion is still clear, but the customer communication path should be reviewed before sending the final answer."]
          : []),
      ],
      likely_failure_modes: [
        "Model sees outage language and grants a credit anyway.",
        "Model misses the maintenance exclusion and routes to the wrong owner.",
        "Model ignores when a strategic account still needs shared review even though the contractual outcome is unchanged.",
      ],
      commercial_context: {
        strategic_account: seed.accountTier === "strategic",
        renewal_days: seed.renewalDate === null ? null : 30 + (seed.index % 10),
        prior_incidents_30d: null,
      },
    },
    case_packet: {
      case_id: seed.caseId,
      title: seed.title,
      crm_record: {
        account_id: seed.accountId,
        account_name: seed.accountName,
        account_tier: seed.accountTier,
        plan_name: `Committed-${seed.commitmentHours}`,
        contracted_commitment_gpu_hours: seed.commitmentHours,
        billing_owner: "revops@prime.example",
        sla_tier: "standard-covered-service",
        renewal_date: seed.renewalDate,
        notes: [
          needsReview
            ? "Customer disputes whether the maintenance notice was clear enough for their run schedule."
            : "Maintenance notices are sent through email and the status page.",
        ],
      },
      billing_record: {
        billing_account_id: seed.billingAccountId,
        configured_plan_name: `Committed-${seed.commitmentHours}`,
        configured_commitment_gpu_hours: seed.commitmentHours,
        invoice_preview_usd: seed.commitmentHours * 80 + Math.round((seed.index + 3) * 21.2),
        credits_applied_usd: 0,
        burst_usage_gpu_hours: 0,
        pricing_notes: ["No commercial billing variance detected."],
      },
      usage_record: {
        window_start: "2026-03-01",
        window_end: "2026-03-31",
        total_gpu_hours: seed.commitmentHours - 6 + (seed.index % 9),
        covered_service_minutes_unavailable: seed.durationMinutes,
        telemetry_summary: telemetrySummary,
        meter_ingestion_status: "healthy",
        anomalies: [],
      },
      incident_record: {
        incident_id: `maint_syn_${String(seed.index + 1).padStart(3, "0")}`,
        status: "planned_maintenance",
        service: seed.service,
        duration_minutes: seed.durationMinutes,
        customer_visible: true,
        customer_impact_summary: customerImpactSummary,
        engineering_summary: engineeringMaintenanceVariant(seed.index),
        covered_by_sla: false,
        scheduled_maintenance: true,
      },
      customer_note: customerMaintenanceVariant(seed.index, seed.service),
      policy_snippet:
        "Scheduled maintenance windows announced in advance are excluded from SLA service credits.",
      calculator_output: seed.index % 4 === 0 ? null : "Maintenance exclusion applies. No automatic credit triggered.",
      visible_case_summary: visibleSummary,
    },
    ground_truth: {
      issue_type: "policy_applicability_review",
      root_cause: "scheduled_maintenance",
      customer_impact: customerImpact,
      contractual_applicability: "sla_excluded_scheduled_maintenance",
      discrepancy_detected: false,
      recommended_owner: recommendedOwner,
      recommended_action: recommendedAction,
      needs_human_review: needsReview,
      confidence,
      adjudication_notes: [
        "Exclusion is controlled by policy and not affected by note wording.",
        ...(needsReview
          ? ["The contractual result stays excluded, but the customer communication path should be reviewed before responding."]
          : []),
      ],
      reference_customer_note:
        needsReview
          ? "The interruption occurred during a planned maintenance window that is excluded from SLA credits under your contract, so no service credit applies. We are reviewing the maintenance communication details before sending the final response and can share the maintenance timing once that review is complete."
          : customerImpact === "delayed_job_start"
            ? "The delayed job starts occurred during a planned maintenance window that is excluded from SLA credits under your contract, so no service credit applies. We can still share the maintenance summary and timing."
            : "The interruption occurred during a planned maintenance window that is excluded from SLA credits under your contract, so no service credit applies. We can still share the maintenance summary and timing.",
      reference_internal_note:
        needsReview
          ? "Owner: shared_revops_engineering. Action: hold_for_engineering_review because the scheduled maintenance exclusion is clear, but the account is commercially sensitive and customer communication details still need review."
          : "Owner: engineering_owner. Action: send_explanation_only because this was scheduled maintenance with a contractual exclusion and no discrepancy.",
    },
  });
}
