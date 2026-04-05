import type { GoldCase } from "@infraresolutionbench/shared";
import { GoldCaseSchema } from "@infraresolutionbench/shared";

import {
  customerGoodwillVariant,
  engineeringGoodwillVariant,
} from "../generator/noise_injectors";
import type { CommercialSensitivitySeed } from "../templates/base_templates/degraded_performance_with_commercial_sensitivity";

export function renderCommercialSensitivityCase(seed: CommercialSensitivitySeed): GoldCase {
  const track = (() => {
    switch (seed.commercialTrack) {
      case "no_credit_due":
        return {
          scenarioSummary:
            "Synthetic degraded performance case where customer-visible pain stayed below SLA thresholds and account context is not strong enough to justify goodwill review.",
          latentFacts: [
            "This is not a clean SLA breach.",
            "The account context does not justify goodwill review.",
            "The case should be explained clearly without escalating to a discretionary credit path.",
          ],
          likelyFailureModes: [
            "Model over-escalates into goodwill review because the customer is unhappy.",
            "Model promises an SLA credit even though thresholds were not met.",
          ],
          customerImpactSummary: `Jobs started slowly for ${seed.durationMinutes} minutes before performance normalized.`,
          telemetrySummary:
            "Training jobs started slowly during a short regional saturation window before performance normalized.",
          anomaly: "Queue latency spiked briefly but stayed below automatic commercial thresholds.",
          policySnippet:
            "Service credits apply only to covered outages longer than 30 minutes. Short degradations below threshold should be explained but do not automatically trigger credits or goodwill review.",
          contractualApplicability: "no_credit_due" as const,
          recommendedOwner: "engineering_owner" as const,
          recommendedAction: "send_explanation_only" as const,
          needsHumanReview: false,
          confidence: "high" as const,
          referenceCustomerNote:
            "We confirmed a short period of degraded performance, but it stayed below the contract’s service-credit threshold and does not qualify for a credit. We can share the incident summary and remediation details.",
          referenceInternalNote:
            "Owner: engineering_owner. Action: send_explanation_only because degraded_performance stayed below threshold, account sensitivity is limited, and contractual outcome is no_credit_due.",
        };
      case "repeat_review":
        return {
          scenarioSummary:
            "Synthetic degraded performance case where repeated short incidents and renewal timing make bounded internal review appropriate even without a formal breach.",
          latentFacts: [
            "This is not a clean SLA breach.",
            "Commercial sensitivity should influence routing and action.",
            "Human review is appropriate because renewal is close and incident context matters.",
          ],
          likelyFailureModes: [
            "Model ignores the account context and returns no action required.",
            "Model incorrectly promises an SLA credit because the customer is frustrated.",
          ],
          customerImpactSummary: "Jobs started slowly during multiple short windows.",
          telemetrySummary:
            "Several short degradations caused slower starts and retries across the month, but no single event exceeded the automatic credit threshold.",
          anomaly: "Job queue latency spiked during multiple short windows.",
          policySnippet:
            "Service credits apply only to covered outages longer than 30 minutes. Account teams may review repeated minor incidents for renewal-sensitive accounts even when no formal credit is due.",
          contractualApplicability: "goodwill_credit_optional" as const,
          recommendedOwner: "shared_revops_engineering" as const,
          recommendedAction: "hold_for_engineering_review" as const,
          needsHumanReview: true,
          confidence: "medium" as const,
          referenceCustomerNote:
            "We confirmed repeated short periods of degraded performance that do not meet the formal SLA credit threshold. Because your account is in a renewal-sensitive window, we are reviewing the pattern internally before we respond with next steps.",
          referenceInternalNote:
            "Owner: shared_revops_engineering. Action: hold_for_engineering_review due to repeated degraded_performance, renewal timing, and optional goodwill review context.",
        };
      case "goodwill_optional":
      default:
        return {
          scenarioSummary:
            "Synthetic degraded performance case where the formal SLA threshold is not met, but renewal timing and account sensitivity make goodwill review appropriate.",
          latentFacts: [
            "This is not a clean SLA breach.",
            "Commercial sensitivity should influence routing and action.",
            "Human review is appropriate because renewal is close and account sensitivity is high.",
          ],
          likelyFailureModes: [
            "Model ignores the account context and returns no action required.",
            "Model incorrectly promises an SLA credit because the customer is frustrated.",
          ],
          customerImpactSummary: `Jobs started slowly and required retries for ${seed.durationMinutes} minutes.`,
          telemetrySummary:
            "Training jobs started slowly for a short window during regional saturation before performance normalized.",
          anomaly: "Queue latency spiked above normal during the impacted window.",
          policySnippet:
            "Service credits apply only to covered outages longer than 30 minutes. Account teams may consider goodwill for renewal-sensitive accounts affected by repeated or commercially sensitive degradations.",
          contractualApplicability: "goodwill_credit_optional" as const,
          recommendedOwner: "shared_revops_engineering" as const,
          recommendedAction: "consider_goodwill_credit" as const,
          needsHumanReview: true,
          confidence: "medium" as const,
          referenceCustomerNote:
            "We confirmed degraded performance that does not meet the formal SLA credit threshold. Because your account is in a renewal-sensitive window, we are reviewing the case internally before we respond with next steps.",
          referenceInternalNote:
            "Owner: shared_revops_engineering. Action: consider_goodwill_credit due to degraded_performance, renewal timing, and account sensitivity.",
        };
    }
  })();

  return GoldCaseSchema.parse({
    metadata: {
      benchmark_version: "v1",
      authoring_style: "synthetic",
      created_at: "2026-04-05",
      adversarial_tags: [
        "commercial_sensitivity",
        ...(seed.repeated ? ["repeat_minor_incidents", "renewal_risk"] : ["subthreshold_incident"]),
      ],
    },
    hidden_state: {
      scenario_summary: track.scenarioSummary,
      generator_family: "degraded_performance_with_commercial_sensitivity",
      latent_facts: track.latentFacts,
      likely_failure_modes: track.likelyFailureModes,
      commercial_context: {
        strategic_account: seed.accountTier === "strategic",
        renewal_days: seed.renewalDays,
        prior_incidents_30d: seed.priorIncidents30d,
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
        sla_tier: "premium-covered-service",
        renewal_date: seed.renewalDate,
        notes: [
          `Renewal is scheduled within ${seed.renewalDays} days.`,
          `Prior reliability concerns surfaced ${seed.priorIncidents30d} times in the last 30 days.`,
        ],
      },
      billing_record: {
        billing_account_id: seed.billingAccountId,
        configured_plan_name: `Committed-${seed.commitmentHours}`,
        configured_commitment_gpu_hours: seed.commitmentHours,
        invoice_preview_usd: seed.invoicePreviewUsd,
        credits_applied_usd: 0,
        burst_usage_gpu_hours: 0,
        pricing_notes: ["Account is in an active renewal cycle."],
      },
      usage_record: {
        window_start: "2026-03-01",
        window_end: "2026-03-31",
        total_gpu_hours: seed.commitmentHours - 24 + (seed.index % 19),
        covered_service_minutes_unavailable: seed.durationMinutes,
        telemetry_summary: track.telemetrySummary,
        meter_ingestion_status: "healthy",
        anomalies: [track.anomaly],
      },
      incident_record: {
        incident_id: seed.repeated
          ? `inc_bundle_syn_${String(seed.index + 1).padStart(3, "0")}`
          : `inc_goodwill_syn_${String(seed.index + 1).padStart(3, "0")}`,
        status: "resolved",
        service: "managed-training-api",
        duration_minutes: seed.repeated ? Math.max(seed.durationMinutes - 10, 7) : seed.durationMinutes,
        customer_visible: true,
        customer_impact_summary: track.customerImpactSummary,
        engineering_summary: engineeringGoodwillVariant(seed.index),
        covered_by_sla: true,
        scheduled_maintenance: false,
      },
      customer_note: customerGoodwillVariant(seed.index),
      policy_snippet: track.policySnippet,
      calculator_output:
        "Incident duration remains below the automatic service credit threshold.",
      visible_case_summary:
        "Synthetic commercially sensitive degradation case that stays below formal credit thresholds.",
    },
    ground_truth: {
      issue_type: "incident_impact_review",
      root_cause: "capacity_shortfall",
      customer_impact: "degraded_performance",
      contractual_applicability: track.contractualApplicability,
      discrepancy_detected: false,
      recommended_owner: track.recommendedOwner,
      recommended_action: track.recommendedAction,
      needs_human_review: track.needsHumanReview,
      confidence: track.confidence,
      adjudication_notes: [
        "Sub-threshold degradation plus renewal sensitivity should trigger bounded internal review rather than a formal SLA breach outcome.",
      ],
      reference_customer_note: track.referenceCustomerNote,
      reference_internal_note: track.referenceInternalNote,
    },
  });
}
