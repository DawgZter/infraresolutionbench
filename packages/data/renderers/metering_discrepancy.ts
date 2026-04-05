import type { GoldCase } from "@infraresolutionbench/shared";
import { GoldCaseSchema } from "@infraresolutionbench/shared";

import {
  customerMeteringVariant,
  engineeringMeteringVariant,
  maybeExtraIrrelevantNote,
  policyMeteringVariant,
} from "../generator/noise_injectors";
import type { MeteringDiscrepancySeed } from "../templates/base_templates/metering_discrepancy";

export function renderMeteringDiscrepancyCase(seed: MeteringDiscrepancySeed): GoldCase {
  const extraNotes = maybeExtraIrrelevantNote(seed.index + 1);
  const visibilityOnly = seed.resolutionPath === "visibility_only";
  const customerImpact = visibilityOnly ? "invoice_confusion" : "usage_visibility_gap";
  const contractualApplicability = visibilityOnly ? "not_an_sla_case" : "invoice_adjustment_due";
  const recommendedOwner = visibilityOnly ? "finance_owner" : "shared_revops_finance";
  const recommendedAction = visibilityOnly ? "send_explanation_only" : "hold_for_finance_review";
  const needsHumanReview = !visibilityOnly;
  const confidence = visibilityOnly ? "high" : seed.index % 3 === 0 ? "medium" : "high";
  const scenarioSummary = visibilityOnly
    ? "Synthetic meter-visibility case where the customer dashboard trails internal usage reporting, but the final invoice is not expected to change."
    : "Synthetic metering discrepancy where the customer-visible dashboard trails the billable meter despite healthy compute service.";
  const latentFacts = visibilityOnly
    ? [
        "There is no underlying compute incident.",
        "The discrepancy is limited to customer-visible usage reporting rather than final invoice correctness.",
        "The case should be explained clearly without promising an invoice adjustment.",
      ]
    : [
        "There is no underlying compute incident.",
        "The discrepancy is caused by lagging usage meter ingestion.",
        "Commercial handling may require invoice correction after finance review.",
      ];
  const likelyFailureModes = visibilityOnly
    ? [
        "Model escalates straight to invoice adjustment even though the issue is only a visibility gap.",
        "Model mistakes the reporting lag for an SLA service issue.",
      ]
    : [
        "Model mistakes this for pricing configuration drift.",
        "Model treats the visibility gap as an SLA service outage.",
      ];
  const anomaly = visibilityOnly
    ? `Customer dashboard trails the internal usage feed by ${seed.billableUsageHours - seed.visibleUsageHours} GPU-hours, but final invoice cutover has not happened yet.`
    : `Dashboard currently trails the internal billable meter by ${seed.billableUsageHours - seed.visibleUsageHours} GPU-hours.`;
  const calculatorOutput = visibilityOnly
    ? `Dashboard shows ${seed.visibleUsageHours} GPU-hours while the internal usage feed shows ${seed.billableUsageHours}. Final invoice has not been adjusted yet.`
    : `Invoice preview reflects ${seed.billableUsageHours} GPU-hours while dashboard shows ${seed.visibleUsageHours}.`;
  const visibleSummary = visibilityOnly
    ? "Synthetic reporting-lag case where finance explanation is needed but no invoice adjustment is expected."
    : "Synthetic visibility-gap case with healthy compute service and lagging meter ingestion.";
  const referenceCustomerNote = visibilityOnly
    ? "We found a lag in the customer-visible usage reporting pipeline, which is why the dashboard does not yet align with the latest internal usage records. At this stage, we are treating this as a reporting explanation issue rather than an invoice adjustment case."
    : "We found a lag in the usage meter pipeline, which is why the dashboard and invoice preview do not align yet. We are holding the case for finance review and will correct the final invoice if an adjustment is confirmed.";
  const referenceInternalNote = visibilityOnly
    ? "Owner: finance_owner. Action: send_explanation_only because the issue is limited to reporting visibility and does not yet support an invoice adjustment."
    : "Owner: shared_revops_finance. Action: hold_for_finance_review because the billable meter is ahead of the customer-visible dashboard and invoice adjustment may be required.";

  return GoldCaseSchema.parse({
    metadata: {
      benchmark_version: "v1",
      authoring_style: "synthetic",
      created_at: "2026-04-05",
      adversarial_tags: [
        "meter_lag",
        "wording_variation",
        ...(seed.index % 2 === 0 ? ["extra_irrelevant_fields"] : ["missing_noncritical_field"]),
      ],
    },
    hidden_state: {
      scenario_summary: scenarioSummary,
      generator_family: "metering_discrepancy",
      latent_facts: latentFacts,
      likely_failure_modes: likelyFailureModes,
      commercial_context: {
        strategic_account: seed.strategicAccount,
        renewal_days: seed.renewalDate === null ? null : 12 + (seed.index % 9),
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
        billing_owner: "finance@prime.example",
        sla_tier: "standard-covered-service",
        renewal_date: seed.renewalDate,
        notes: [
          "Customer actively monitors the self-serve usage dashboard.",
        ],
      },
      billing_record: {
        billing_account_id: seed.billingAccountId,
        configured_plan_name: `Committed-${seed.commitmentHours}`,
        configured_commitment_gpu_hours: seed.commitmentHours,
        invoice_preview_usd: seed.invoicePreviewUsd,
        credits_applied_usd: 0,
        burst_usage_gpu_hours: Math.max(seed.billableUsageHours - seed.commitmentHours, 0),
        pricing_notes: [
          `Invoice preview currently reflects ${seed.billableUsageHours} GPU-hours of billable usage.`,
          ...extraNotes,
        ],
      },
      usage_record: {
        window_start: "2026-03-01",
        window_end: "2026-03-31",
        total_gpu_hours: seed.visibleUsageHours,
        covered_service_minutes_unavailable: 0,
        telemetry_summary: engineeringMeteringVariant(seed.index),
        meter_ingestion_status: seed.index % 4 === 0 ? "partial" : "lagging",
        anomalies: [anomaly],
      },
      incident_record: {
        incident_id: null,
        status: "no_known_incident",
        service: "billing-meter-pipeline",
        duration_minutes: null,
        customer_visible: false,
        customer_impact_summary: null,
        engineering_summary: engineeringMeteringVariant(seed.index),
        covered_by_sla: false,
        scheduled_maintenance: false,
      },
      customer_note: customerMeteringVariant(seed.index),
      policy_snippet: policyMeteringVariant(seed.index),
      calculator_output:
        seed.index % 5 === 0
          ? null
          : calculatorOutput,
      visible_case_summary: visibleSummary,
    },
    ground_truth: {
      issue_type: "metering_discrepancy",
      root_cause: "usage_metering_error",
      customer_impact: customerImpact,
      contractual_applicability: contractualApplicability,
      discrepancy_detected: true,
      recommended_owner: recommendedOwner,
      recommended_action: recommendedAction,
      needs_human_review: needsHumanReview,
      confidence,
      adjudication_notes: [
        "Ground truth is driven by generator logic, not note wording.",
      ],
      reference_customer_note: referenceCustomerNote,
      reference_internal_note: referenceInternalNote,
    },
  });
}
