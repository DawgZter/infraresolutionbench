import type { GoldCase } from "@infraresolutionbench/shared";
import { GoldCaseSchema } from "@infraresolutionbench/shared";

import {
  billingNoteVariant,
  crmNoteVariant,
  customerPricingMismatchVariant,
  maybeExtraIrrelevantNote,
  usageSummaryVariant,
} from "../generator/noise_injectors";
import type { PricingMismatchSeed } from "../templates/base_templates/pricing_config_mismatch";

export function renderPricingMismatchCase(seed: PricingMismatchSeed): GoldCase {
  const extraNotes = maybeExtraIrrelevantNote(seed.index);
  const renewalNote =
    seed.renewalDate === null
      ? []
      : [`Renewal conversation is tentatively scheduled before ${seed.renewalDate}.`];
  const revopsPrimary = seed.routingProfile === "revops_primary";
  const recommendedOwner = revopsPrimary ? "revops_owner" : "shared_revops_finance";
  const confidence = revopsPrimary ? "high" : seed.index % 4 === 0 ? "medium" : "high";
  const referenceCustomerNote = revopsPrimary
    ? "We found a mismatch between your signed CRM commitment and the billing configuration, so RevOps is correcting the commercial record before we confirm the final invoice."
    : "We found a mismatch between your contracted commitment and the current billing configuration, so we are routing this for commercial review before confirming the final invoice.";
  const referenceInternalNote = revopsPrimary
    ? "Owner: revops_owner. Action: hold_for_revops_review because CRM is the signed source of truth and the billing commitment needs commercial correction."
    : "Owner: shared_revops_finance. Action: hold_for_revops_review because CRM and billing commitment levels disagree while usage telemetry is healthy.";

  return GoldCaseSchema.parse({
    metadata: {
      benchmark_version: "v1",
      authoring_style: "synthetic",
      created_at: "2026-04-05",
      adversarial_tags: [
        "cross_system_disagreement",
        "wording_variation",
        ...(seed.index % 2 === 0 ? ["missing_noncritical_field"] : []),
      ],
    },
    hidden_state: {
      scenario_summary:
        "Synthetic pricing config mismatch where CRM commitment and billing commitment disagree without an operational incident.",
      generator_family: "pricing_config_mismatch",
      latent_facts: [
        "CRM remains the signed commercial source of truth.",
        "Billing configuration drifted after a manual update.",
        "Usage telemetry is healthy and not the cause of the dispute.",
      ],
      likely_failure_modes: [
        "Model trusts billing over CRM and misses the discrepancy.",
        "Model misclassifies the case as metering discrepancy because the customer mentions invoice mismatch.",
      ],
      commercial_context: {
        "strategic_account": seed.strategicAccount,
        "renewal_days": seed.renewalDays,
        "prior_incidents_30d": seed.index % 4 === 0 ? 1 : null,
      },
    },
    case_packet: {
      case_id: seed.caseId,
      title: seed.title,
      crm_record: {
        account_id: seed.accountId,
        account_name: seed.accountName,
        account_tier: seed.accountTier,
        plan_name: `Committed-${seed.crmCommitment}`,
        contracted_commitment_gpu_hours: seed.crmCommitment,
        billing_owner: seed.index % 2 === 0 ? null : "revops@prime.example",
        sla_tier: "enterprise-standard",
        renewal_date: seed.renewalDate,
        notes: [
          `Signed order form lists Committed-${seed.crmCommitment}.`,
          crmNoteVariant(seed.index),
          ...renewalNote,
        ],
      },
      billing_record: {
        billing_account_id: seed.billingAccountId,
        configured_plan_name: `Committed-${seed.billingCommitment}`,
        configured_commitment_gpu_hours: seed.billingCommitment,
        invoice_preview_usd: seed.invoicePreviewUsd,
        credits_applied_usd: 0,
        burst_usage_gpu_hours: 0,
        pricing_notes: [
          `Billing plan currently set to Committed-${seed.billingCommitment}.`,
          billingNoteVariant(seed.index),
          ...extraNotes,
        ],
      },
      usage_record: {
        window_start: "2026-03-01",
        window_end: "2026-03-31",
        total_gpu_hours: seed.usageHours,
        covered_service_minutes_unavailable: 0,
        telemetry_summary: usageSummaryVariant(seed.index),
        meter_ingestion_status: "healthy",
        anomalies: [],
      },
      incident_record: null,
      customer_note: customerPricingMismatchVariant(seed.index, seed.accountName),
      policy_snippet:
        "If CRM contract terms and billing configuration differ, route the case to RevOps for commercial review before final invoicing.",
      calculator_output: seed.index % 5 === 0 ? null : `Invoice preview currently uses Committed-${seed.billingCommitment}.`,
      visible_case_summary:
        "Synthetic commercial dispute with a plan mismatch between CRM and billing and no service incident.",
    },
    ground_truth: {
      issue_type: "pricing_config_mismatch",
      root_cause: "billing_config_out_of_sync_with_crm",
      customer_impact: "invoice_confusion",
      contractual_applicability: "not_an_sla_case",
      discrepancy_detected: true,
      recommended_owner: recommendedOwner,
      recommended_action: "hold_for_revops_review",
      needs_human_review: true,
      confidence,
      adjudication_notes: [
        "Ground truth is set programmatically from template logic.",
        "Noise injectors only vary wording and non-critical fields."
      ],
      reference_customer_note: referenceCustomerNote,
      reference_internal_note: referenceInternalNote,
    },
  });
}
