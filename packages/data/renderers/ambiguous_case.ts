import type { GoldCase } from "@infraresolutionbench/shared";
import { GoldCaseSchema } from "@infraresolutionbench/shared";

import {
  customerAmbiguousVariant,
  engineeringAmbiguousVariant,
  maybeExtraIrrelevantNote,
  policyAmbiguousVariant,
} from "../generator/noise_injectors";
import type { AmbiguousCaseSeed } from "../templates/base_templates/ambiguous_case";

export function renderAmbiguousCase(seed: AmbiguousCaseSeed): GoldCase {
  const extraNotes = maybeExtraIrrelevantNote(seed.index + 2);
  const profile = (() => {
    switch (seed.ambiguityProfile) {
      case "billing_dominant":
        return {
          scenarioSummary:
            "Synthetic mixed-evidence case where invoice confusion is the clearest customer-facing symptom, but limited operational noise makes the commercial answer still require review.",
          latentFacts: [
            "Billing surprise is the most concrete customer-facing problem in the packet.",
            "Operational evidence is too weak to support an SLA remedy.",
            "The case should stay conservative and route to finance review.",
          ],
          likelyFailureModes: [
            "Model overcommits to an outage or SLA claim because an incident note exists.",
            "Model ignores the billing-led nature of the case and routes away from finance review.",
          ],
          telemetrySummary:
            "A brief degradation notice overlapped with customer billing confusion, but usage remained mostly stable.",
          anomaly:
            "Invoice preview and customer expectation remain materially misaligned despite no CRM mismatch.",
          customerImpactSummary: "Customer noticed minor stalls, but the billing confusion is the dominant concern.",
          visibleSummary:
            "Synthetic mixed-evidence case where billing surprise is stronger than the operational signal.",
          calculatorOutput:
            `Invoice preview reflects ${seed.burstUsageHours} burst GPU-hours, but the final commercial explanation still needs finance review.`,
          customerImpact: "invoice_confusion" as const,
          contractualApplicability: "not_an_sla_case" as const,
          discrepancyDetected: true,
          recommendedOwner: "shared_revops_finance" as const,
          recommendedAction: "hold_for_finance_review" as const,
          confidence: "low" as const,
          needsHumanReview: true,
          referenceCustomerNote:
            "We found a mismatch between the invoice preview and the commercial explanation available in the current records, so we are routing this for finance review before sending a final answer. At this stage, we are not treating it as an SLA credit case.",
          referenceInternalNote:
            "Owner: shared_revops_finance. Action: hold_for_finance_review because the root cause remains unknown, customer impact is invoice_confusion, and the strongest unresolved signal is commercial rather than contractual outage exposure.",
        };
      case "ops_dominant":
        return {
          scenarioSummary:
            "Synthetic mixed-evidence case where operational symptoms are stronger than the billing signal, but the evidence still does not support a confident root-cause call.",
          latentFacts: [
            "Operational symptoms are more material than the billing question.",
            "The available incident evidence is not strong enough to support a covered-breach conclusion.",
            "The case should stay with engineering review until the incident classification is confirmed.",
          ],
          likelyFailureModes: [
            "Model overstates the weak billing signal as a discrepancy that needs finance routing.",
            "Model upgrades the case into a covered outage despite unresolved operational evidence.",
          ],
          telemetrySummary:
            "Queue depth rose during the complaint window and several runs started late, while billing variance stayed within expected burst ranges.",
          anomaly:
            "Delayed job starts were visible, but the incident classification stayed inconclusive.",
          customerImpactSummary: "Runs started late and throughput dropped briefly.",
          visibleSummary:
            "Synthetic mixed-evidence case where operational delay is more concrete than the billing signal.",
          calculatorOutput:
            `Burst usage remained within expected ranges. No automatic calculator remedy is triggered while incident classification stays unresolved.`,
          customerImpact: "delayed_job_start" as const,
          contractualApplicability: "no_sla_breach" as const,
          discrepancyDetected: false,
          recommendedOwner: "shared_revops_engineering" as const,
          recommendedAction: "hold_for_engineering_review" as const,
          confidence: "low" as const,
          needsHumanReview: true,
          referenceCustomerNote:
            "We found unresolved operational evidence behind the delayed job starts, so we are routing this for engineering review before giving you a final answer. Based on the current records, we are not yet treating this as an SLA credit case.",
          referenceInternalNote:
            "Owner: shared_revops_engineering. Action: hold_for_engineering_review because the root cause remains unknown, the operational signal is stronger than the billing signal, and current evidence does not support a breach finding.",
        };
      case "policy_dominant":
        return {
          scenarioSummary:
            "Synthetic mixed-evidence case where policy wording is the main blocker, leaving the model unable to resolve contractual applicability cleanly from the packet alone.",
          latentFacts: [
            "The customer did see degraded performance, but policy wording is the main source of ambiguity.",
            "Operational and billing evidence do not independently resolve the contractual question.",
            "The case should be escalated for bounded human review rather than overclaimed.",
          ],
          likelyFailureModes: [
            "Model treats ambiguous policy language as a confirmed credit exclusion or credit approval.",
            "Model acts certain despite the packet leaving contractual applicability unresolved.",
          ],
          telemetrySummary:
            "Performance degraded briefly, but the evidence remains insufficient to resolve the policy path without review.",
          anomaly:
            "Policy wording conflicts with the observed customer symptoms and the available commercial notes.",
          customerImpactSummary: "Customer experienced degraded performance while commercial applicability stayed unclear.",
          visibleSummary:
            "Synthetic policy-led ambiguous case where the final contractual path still needs explicit human review.",
          calculatorOutput:
            "Calculator output is non-deterministic because the policy path is not conclusively resolved from the current case packet.",
          customerImpact: "degraded_performance" as const,
          contractualApplicability: "not_an_sla_case" as const,
          discrepancyDetected: false,
          recommendedOwner: "human_review_required" as const,
          recommendedAction: "hold_for_revops_review" as const,
          confidence: "low" as const,
          needsHumanReview: true,
          referenceCustomerNote:
            "We found conflicting policy and case evidence, so we are routing this for human review before giving you a final commercial answer. We are not confirming an SLA remedy or invoice adjustment until that review is complete.",
          referenceInternalNote:
            "Owner: human_review_required. Action: hold_for_revops_review because the root cause remains unknown, confidence is low, and policy wording is the main blocker to resolving contractual applicability.",
        };
      case "ops_and_billing":
      default:
        return {
          scenarioSummary:
            "Synthetic mixed-evidence case where service degradation symptoms and unexpected billing signals co-occur without enough evidence to commit to a single root cause.",
          latentFacts: [
            "Operational and commercial signals are both present, but the evidence is incomplete.",
            "The case should stay conservative and route for review.",
          ],
          likelyFailureModes: [
            "Model overcommits to a confident root cause despite unresolved evidence.",
            "Model promises a service credit or invoice correction before the case is confirmed.",
          ],
          telemetrySummary:
            "Status page reported degraded performance while some jobs appeared stalled intermittently.",
          anomaly: "Queue depth elevated during the same period as the customer complaint.",
          customerImpactSummary: "Some runs stalled and throughput dropped.",
          visibleSummary:
            "Synthetic mixed-evidence case spanning degraded runtime behavior and unexpected billing signals.",
          calculatorOutput:
            `Invoice preview reflects ${seed.burstUsageHours} burst GPU-hours. No explicit remedy is triggered from current calculator output.`,
          customerImpact: "degraded_performance" as const,
          contractualApplicability: "no_sla_breach" as const,
          discrepancyDetected: true,
          recommendedOwner: "shared_revops_engineering" as const,
          recommendedAction: "hold_for_engineering_review" as const,
          confidence: "low" as const,
          needsHumanReview: true,
          referenceCustomerNote:
            "We found mixed evidence across the incident and billing records, so we are routing this for further review before giving you a final commercial answer. We will follow up once the incident classification and billing context are confirmed.",
          referenceInternalNote:
            "Owner: shared_revops_engineering. Action: hold_for_engineering_review because the root cause remains unknown, confidence is low, and both service symptoms and billing surprise are present.",
        };
    }
  })();

  return GoldCaseSchema.parse({
    metadata: {
      benchmark_version: "v1",
      authoring_style: "synthetic",
      created_at: "2026-04-05",
      adversarial_tags: ["mixed_evidence", "ambiguous_policy", "billing_signal_noise"],
    },
    hidden_state: {
      scenario_summary: profile.scenarioSummary,
      generator_family: "ambiguous_case",
      latent_facts: profile.latentFacts,
      likely_failure_modes: profile.likelyFailureModes,
      commercial_context: {
        strategic_account: seed.accountTier === "strategic",
        renewal_days: seed.renewalDate === null ? null : 18 + (seed.index % 9),
        prior_incidents_30d: 1 + (seed.index % 2),
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
        sla_tier: "enterprise-standard",
        renewal_date: seed.renewalDate,
        notes: [
          "Customer has raised both operational and billing concerns in the same thread.",
        ],
      },
      billing_record: {
        billing_account_id: seed.billingAccountId,
        configured_plan_name: `Committed-${seed.commitmentHours}`,
        configured_commitment_gpu_hours: seed.commitmentHours,
        invoice_preview_usd: seed.invoicePreviewUsd,
        credits_applied_usd: 0,
        burst_usage_gpu_hours: seed.burstUsageHours,
        pricing_notes: [
          `Invoice preview includes ${seed.burstUsageHours} burst GPU-hours above commitment.`,
          "No billing config mismatch detected.",
          ...extraNotes,
        ],
      },
      usage_record: {
        window_start: "2026-03-01",
        window_end: "2026-03-31",
        total_gpu_hours: seed.totalUsageHours,
        covered_service_minutes_unavailable: seed.incidentMinutes,
        telemetry_summary: profile.telemetrySummary,
        meter_ingestion_status: "healthy",
        anomalies: [profile.anomaly],
      },
      incident_record: {
        incident_id: `inc_amb_syn_${String(seed.index + 1).padStart(3, "0")}`,
        status: seed.index % 2 === 0 ? "identified" : "investigating",
        service: "managed-training-api",
        duration_minutes: seed.incidentMinutes,
        customer_visible: true,
        customer_impact_summary: profile.customerImpactSummary,
        engineering_summary: engineeringAmbiguousVariant(seed.index),
        covered_by_sla: true,
        scheduled_maintenance: false,
      },
      customer_note: customerAmbiguousVariant(seed.index),
      policy_snippet: policyAmbiguousVariant(seed.index),
      calculator_output: profile.calculatorOutput,
      visible_case_summary: profile.visibleSummary,
    },
    ground_truth: {
      issue_type: "ambiguous_case",
      root_cause: "unknown_root_cause",
      customer_impact: profile.customerImpact,
      contractual_applicability: profile.contractualApplicability,
      discrepancy_detected: profile.discrepancyDetected,
      recommended_owner: profile.recommendedOwner,
      recommended_action: profile.recommendedAction,
      needs_human_review: profile.needsHumanReview,
      confidence: profile.confidence,
      adjudication_notes: [
        "Ambiguous cases should preserve uncertainty and avoid overclaiming a remedy.",
        `This case follows the ${seed.ambiguityProfile} ambiguity profile and should route according to the strongest unresolved signal.`,
      ],
      reference_customer_note: profile.referenceCustomerNote,
      reference_internal_note: profile.referenceInternalNote,
    },
  });
}
