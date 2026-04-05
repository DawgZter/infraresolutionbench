import type { CasePacket, GoldCase } from "@infraresolutionbench/shared";

import { buildPromptBundle, type PromptMode } from "./prompt";
import {
  LOCAL_READ_ONLY_TOOLS,
  getEnvironmentToolDefinitions,
  type EnvironmentToolDefinition,
  type EnvironmentToolName,
} from "./tools";

function getPacket(caseOrGoldCase: GoldCase | CasePacket): CasePacket {
  return "case_packet" in caseOrGoldCase ? caseOrGoldCase.case_packet : caseOrGoldCase;
}

export type ToolInvocationResult = {
  tool: EnvironmentToolName;
  result: unknown;
};

export type EnvironmentHarness = {
  caseId: string;
  mode: PromptMode;
  toolDefinitions: EnvironmentToolDefinition[];
  systemPrompt: string;
  userPrompt: string;
  toolInstructions: string | null;
  invokeTool: (tool: EnvironmentToolName) => ToolInvocationResult;
};

export function createEnvironmentHarness(
  caseOrGoldCase: GoldCase | CasePacket,
  mode: PromptMode,
): EnvironmentHarness {
  const casePacket = getPacket(caseOrGoldCase);
  const toolDefinitions = getEnvironmentToolDefinitions();
  const promptBundle = buildPromptBundle(casePacket, mode, toolDefinitions);

  return {
    caseId: casePacket.case_id,
    mode,
    toolDefinitions,
    systemPrompt: promptBundle.systemPrompt,
    userPrompt: promptBundle.userPrompt,
    toolInstructions: promptBundle.toolInstructions,
    invokeTool(tool) {
      return {
        tool,
        result: LOCAL_READ_ONLY_TOOLS[tool](casePacket),
      };
    },
  };
}
