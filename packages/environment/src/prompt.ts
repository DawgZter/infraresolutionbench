import {
  CONFIDENCES,
  CONTRACTUAL_APPLICABILITIES,
  CUSTOMER_IMPACTS,
  ISSUE_TYPES,
  RECOMMENDED_ACTIONS,
  RECOMMENDED_OWNERS,
  ROOT_CAUSES,
  type CasePacket,
  type GoldCase,
} from "@infraresolutionbench/shared";

import type { EnvironmentToolDefinition } from "./tools";

export type PromptMode = "packet" | "tools";

export const BENCHMARK_SYSTEM_PROMPT = `You are an AI copilot for AI infrastructure commercial operations.

You will receive records from multiple internal systems:
- CRM/account record
- billing/pricing record
- usage summary
- incident/engineering notes
- customer note
- policy snippet if relevant

Your task:
1. identify the likely issue type
2. determine root cause and customer impact
3. determine contractual applicability
4. detect whether systems disagree
5. recommend an owner and bounded next action
6. decide whether human review is required
7. draft a customer note
8. draft an internal ops note

Important:
- do not assume facts not present
- if evidence is conflicting, reflect that in confidence and review recommendation
- do not recompute billing formulas unless calculator output is explicitly missing
- return valid JSON only`;

export function buildOutputSchemaReminder(): string {
  return `Return a single JSON object with exactly these keys:
- issue_type
- root_cause
- customer_impact
- contractual_applicability
- discrepancy_detected
- recommended_owner
- recommended_action
- needs_human_review
- confidence
- customer_note
- internal_note`;
}

export function buildEnumValueReminder(): string {
  return [
    "Use the exact benchmark enum strings for structured fields.",
    `- issue_type: ${ISSUE_TYPES.join(", ")}`,
    `- root_cause: ${ROOT_CAUSES.join(", ")}`,
    `- customer_impact: ${CUSTOMER_IMPACTS.join(", ")}`,
    `- contractual_applicability: ${CONTRACTUAL_APPLICABILITIES.join(", ")}`,
    `- recommended_owner: ${RECOMMENDED_OWNERS.join(", ")}`,
    `- recommended_action: ${RECOMMENDED_ACTIONS.join(", ")}`,
    `- confidence: ${CONFIDENCES.join(", ")}`,
    "- discrepancy_detected and needs_human_review must be booleans.",
    "- Do not replace enum values with prose labels or email addresses.",
  ].join("\n");
}

function getPacket(caseOrGoldCase: GoldCase | CasePacket): CasePacket {
  return "case_packet" in caseOrGoldCase ? caseOrGoldCase.case_packet : caseOrGoldCase;
}

export function buildPacketModeUserPrompt(caseOrGoldCase: GoldCase | CasePacket): string {
  const casePacket = getPacket(caseOrGoldCase);

  return [
    `Case ID: ${casePacket.case_id}`,
    "",
    "Here is the full case packet:",
    JSON.stringify(casePacket, null, 2),
    "",
    buildOutputSchemaReminder(),
    "",
    buildEnumValueReminder(),
  ].join("\n");
}

export function buildToolsModeUserPrompt(caseOrGoldCase: GoldCase | CasePacket): string {
  const casePacket = getPacket(caseOrGoldCase);

  return [
    `Case ID: ${casePacket.case_id}`,
    "",
    "Use the available read-only tools to inspect the internal records for this case before answering.",
    "You may call every tool if needed.",
    "",
    buildOutputSchemaReminder(),
    "",
    buildEnumValueReminder(),
  ].join("\n");
}

export function buildToolInstructions(toolDefinitions: EnvironmentToolDefinition[]): string {
  return [
    "Available tools:",
    ...toolDefinitions.map(
      (tool) => `- ${tool.name}(${tool.inputExample}): ${tool.description}`,
    ),
  ].join("\n");
}

export function buildPromptBundle(
  caseOrGoldCase: GoldCase | CasePacket,
  mode: PromptMode,
  toolDefinitions: EnvironmentToolDefinition[],
): {
  systemPrompt: string;
  userPrompt: string;
  toolInstructions: string | null;
} {
  return {
    systemPrompt: BENCHMARK_SYSTEM_PROMPT,
    userPrompt:
      mode === "packet"
        ? buildPacketModeUserPrompt(caseOrGoldCase)
        : buildToolsModeUserPrompt(caseOrGoldCase),
    toolInstructions: mode === "tools" ? buildToolInstructions(toolDefinitions) : null,
  };
}
