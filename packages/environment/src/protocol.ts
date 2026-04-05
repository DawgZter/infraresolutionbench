import { z } from "zod";

import { CasePacketSchema, ModelOutputSchema } from "@infraresolutionbench/shared";

import type { PromptMode } from "./prompt";
import type { EnvironmentToolDefinition } from "./tools";

export const EnvironmentToolNameSchema = z.enum([
  "get_crm_record",
  "get_billing_record",
  "get_usage_record",
  "get_incident_record",
  "get_customer_note",
  "get_policy_snippet",
  "get_calculator_output",
]);

export const EnvironmentToolDefinitionSchema = z.object({
  name: EnvironmentToolNameSchema,
  description: z.string(),
  inputExample: z.string(),
});

export const EpisodeToolCallSchema = z.object({
  tool: EnvironmentToolNameSchema,
  arguments: z.object({
    case_id: z.string(),
  }),
  result: z.unknown(),
});

export const AdapterPromptBundleSchema = z.object({
  system_prompt: z.string(),
  user_prompt: z.string(),
  tool_instructions: z.string().nullable(),
});

export const AdapterProtocolVersionSchema = z.literal("v1");

export const AdapterRequestSchema = z.object({
  protocol_version: AdapterProtocolVersionSchema,
  case_id: z.string(),
  mode: z.custom<PromptMode>((value) => value === "packet" || value === "tools", {
    message: 'Mode must be "packet" or "tools".',
  }),
  prompt_bundle: AdapterPromptBundleSchema,
  tool_definitions: z.array(EnvironmentToolDefinitionSchema),
  case_packet: CasePacketSchema,
  prefetched_tool_calls: z.array(EpisodeToolCallSchema),
});

export const AdapterResponseSchema = z.object({
  model_name: z.string().optional(),
  model_output: ModelOutputSchema,
  used_tools: z.array(EnvironmentToolNameSchema).optional(),
  adapter_metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AdapterRequest = z.infer<typeof AdapterRequestSchema>;
export type AdapterResponse = z.infer<typeof AdapterResponseSchema>;
export type AdapterProtocolVersion = z.infer<typeof AdapterProtocolVersionSchema>;
export type ProtocolToolCall = z.infer<typeof EpisodeToolCallSchema>;

export function validateAdapterRequest(value: unknown): AdapterRequest {
  return AdapterRequestSchema.parse(value);
}

export function validateAdapterResponse(value: unknown): AdapterResponse {
  return AdapterResponseSchema.parse(value);
}

export function buildValidatedAdapterRequest(input: {
  caseId: string;
  mode: PromptMode;
  promptBundle: {
    system_prompt: string;
    user_prompt: string;
    tool_instructions: string | null;
  };
  toolDefinitions: EnvironmentToolDefinition[];
  casePacket: z.infer<typeof CasePacketSchema>;
  prefetchedToolCalls: ProtocolToolCall[];
}): AdapterRequest {
  return validateAdapterRequest({
    protocol_version: "v1",
    case_id: input.caseId,
    mode: input.mode,
    prompt_bundle: input.promptBundle,
    tool_definitions: input.toolDefinitions,
    case_packet: input.casePacket,
    prefetched_tool_calls: input.prefetchedToolCalls,
  });
}
