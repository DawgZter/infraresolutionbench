import { z } from "zod";

import {
  CONFIDENCES,
  CONTRACTUAL_APPLICABILITIES,
  CUSTOMER_IMPACTS,
  ISSUE_TYPES,
  RECOMMENDED_ACTIONS,
  RECOMMENDED_OWNERS,
  ROOT_CAUSES,
} from "./enums";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const AccountTierSchema = z.enum([
  "standard",
  "enterprise",
  "strategic",
]);

export const MeterIngestionStatusSchema = z.enum([
  "healthy",
  "lagging",
  "partial",
  "unknown",
]);

export const IncidentStatusSchema = z.enum([
  "no_known_incident",
  "investigating",
  "identified",
  "monitoring",
  "resolved",
  "planned_maintenance",
]);

export const HiddenStateSchema = z.object({
  scenario_summary: z.string(),
  generator_family: z.string(),
  latent_facts: z.array(z.string()).default([]),
  likely_failure_modes: z.array(z.string()).default([]),
  commercial_context: z
    .object({
      strategic_account: z.boolean().default(false),
      renewal_days: z.number().int().nonnegative().nullable().default(null),
      prior_incidents_30d: z.number().int().nonnegative().nullable().default(null),
    })
    .default({
      strategic_account: false,
      renewal_days: null,
      prior_incidents_30d: null,
    }),
});

export const CRMRecordSchema = z.object({
  account_id: z.string(),
  account_name: z.string(),
  account_tier: AccountTierSchema,
  plan_name: z.string(),
  contracted_commitment_gpu_hours: z.number().nonnegative().nullable(),
  billing_owner: z.string().nullable(),
  sla_tier: z.string().nullable(),
  renewal_date: isoDateSchema.nullable(),
  notes: z.array(z.string()).default([]),
});

export const BillingRecordSchema = z.object({
  billing_account_id: z.string(),
  configured_plan_name: z.string(),
  configured_commitment_gpu_hours: z.number().nonnegative().nullable(),
  invoice_preview_usd: z.number().nonnegative().nullable(),
  credits_applied_usd: z.number().nonnegative().nullable(),
  burst_usage_gpu_hours: z.number().nonnegative().nullable(),
  pricing_notes: z.array(z.string()).default([]),
});

export const UsageRecordSchema = z.object({
  window_start: isoDateSchema,
  window_end: isoDateSchema,
  total_gpu_hours: z.number().nonnegative().nullable(),
  covered_service_minutes_unavailable: z.number().int().nonnegative().nullable(),
  telemetry_summary: z.string(),
  meter_ingestion_status: MeterIngestionStatusSchema,
  anomalies: z.array(z.string()).default([]),
});

export const IncidentRecordSchema = z.object({
  incident_id: z.string().nullable(),
  status: IncidentStatusSchema,
  service: z.string().nullable(),
  duration_minutes: z.number().int().nonnegative().nullable(),
  customer_visible: z.boolean(),
  customer_impact_summary: z.string().nullable(),
  engineering_summary: z.string(),
  covered_by_sla: z.boolean().nullable(),
  scheduled_maintenance: z.boolean(),
});

export const CasePacketSchema = z.object({
  case_id: z.string(),
  title: z.string(),
  crm_record: CRMRecordSchema,
  billing_record: BillingRecordSchema,
  usage_record: UsageRecordSchema,
  incident_record: IncidentRecordSchema.nullable(),
  customer_note: z.string(),
  policy_snippet: z.string().nullable(),
  calculator_output: z.string().nullable().optional(),
  visible_case_summary: z.string().optional(),
});

export const ResolutionFieldsSchema = z.object({
  issue_type: z.enum(ISSUE_TYPES),
  root_cause: z.enum(ROOT_CAUSES),
  customer_impact: z.enum(CUSTOMER_IMPACTS),
  contractual_applicability: z.enum(CONTRACTUAL_APPLICABILITIES),
  discrepancy_detected: z.boolean(),
  recommended_owner: z.enum(RECOMMENDED_OWNERS),
  recommended_action: z.enum(RECOMMENDED_ACTIONS),
  needs_human_review: z.boolean(),
  confidence: z.enum(CONFIDENCES),
});

export const GroundTruthSchema = ResolutionFieldsSchema.extend({
  adjudication_notes: z.array(z.string()).default([]),
  reference_customer_note: z.string().optional(),
  reference_internal_note: z.string().optional(),
});

export const ModelOutputSchema = ResolutionFieldsSchema.extend({
  customer_note: z.string().min(1),
  internal_note: z.string().min(1),
});

export const GoldCaseMetadataSchema = z.object({
  benchmark_version: z.literal("v1"),
  authoring_style: z.enum(["handwritten", "synthetic"]),
  created_at: isoDateSchema,
  adversarial_tags: z.array(z.string()).default([]),
});

export const GoldCaseSchema = z.object({
  metadata: GoldCaseMetadataSchema,
  hidden_state: HiddenStateSchema,
  case_packet: CasePacketSchema,
  ground_truth: GroundTruthSchema,
});

export type HiddenState = z.infer<typeof HiddenStateSchema>;
export type CRMRecord = z.infer<typeof CRMRecordSchema>;
export type BillingRecord = z.infer<typeof BillingRecordSchema>;
export type UsageRecord = z.infer<typeof UsageRecordSchema>;
export type IncidentRecord = z.infer<typeof IncidentRecordSchema>;
export type CasePacket = z.infer<typeof CasePacketSchema>;
export type ResolutionFields = z.infer<typeof ResolutionFieldsSchema>;
export type GroundTruth = z.infer<typeof GroundTruthSchema>;
export type ModelOutput = z.infer<typeof ModelOutputSchema>;
export type GoldCase = z.infer<typeof GoldCaseSchema>;
