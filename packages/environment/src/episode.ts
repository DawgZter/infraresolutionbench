import { readFile } from "node:fs/promises";

import type { GoldCase, ModelOutput } from "@infraresolutionbench/shared";

import { createEnvironmentHarness } from "./harness";
import type { PromptMode } from "./prompt";
import {
  evaluateGoldCase,
  type ArtifactBundle,
  type EvaluationResult,
} from "./index";
import type {
  EnvironmentToolDefinition,
  EnvironmentToolName,
} from "./tools";

export type EpisodeToolCall = {
  tool: EnvironmentToolName;
  arguments: {
    case_id: string;
  };
  result: unknown;
};

export type EpisodePromptBundle = {
  system_prompt: string;
  user_prompt: string;
  tool_instructions: string | null;
  tool_definitions: EnvironmentToolDefinition[];
};

export type EpisodeArtifactBundle = ArtifactBundle & {
  environment: {
    prompt_mode: PromptMode;
    prompt_bundle: EpisodePromptBundle;
    tool_calls: EpisodeToolCall[];
    output_source: "mock_json" | "recorded_episode" | "adapter_execution";
  };
};

type RawToolTranscriptEntry = {
  tool?: unknown;
};

function isEnvironmentToolName(value: string): value is EnvironmentToolName {
  return [
    "get_crm_record",
    "get_billing_record",
    "get_usage_record",
    "get_incident_record",
    "get_customer_note",
    "get_policy_snippet",
    "get_calculator_output",
  ].includes(value);
}

export async function loadToolTranscriptFromFile(filePath: string): Promise<EnvironmentToolName[]> {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("Tool transcript must be a JSON array.");
  }

  return parsed.map((entry, index) => {
    const candidate =
      typeof entry === "string"
        ? entry
        : typeof entry === "object" && entry !== null
          ? (entry as RawToolTranscriptEntry).tool
          : null;

    if (typeof candidate !== "string" || !isEnvironmentToolName(candidate)) {
      throw new Error(`Invalid tool transcript entry at index ${index}.`);
    }

    return candidate;
  });
}

export function buildEpisodeToolCalls(
  goldCase: GoldCase,
  mode: PromptMode,
  requestedTools: EnvironmentToolName[],
): EpisodeToolCall[] {
  if (mode !== "tools") {
    return [];
  }

  const harness = createEnvironmentHarness(goldCase, mode);
  return requestedTools.map((tool) => {
    const invocation = harness.invokeTool(tool);
    return {
      tool: invocation.tool,
      arguments: {
        case_id: goldCase.case_packet.case_id,
      },
      result: invocation.result,
    };
  });
}

export function createEpisodeArtifactBundle(input: {
  goldCase: GoldCase;
  modelOutput: ModelOutput;
  modelName: string;
  promptMode: PromptMode;
  toolCalls?: EpisodeToolCall[];
  outputSource?: "mock_json" | "recorded_episode" | "adapter_execution";
}): EpisodeArtifactBundle {
  const {
    goldCase,
    modelOutput,
    modelName,
    promptMode,
    toolCalls = [],
    outputSource = "mock_json",
  } = input;

  const evaluation: EvaluationResult = evaluateGoldCase(goldCase, modelOutput);
  const harness = createEnvironmentHarness(goldCase, promptMode);

  return {
    generated_at: new Date().toISOString(),
    model_name: modelName,
    case_packet: goldCase.case_packet,
    ground_truth: goldCase.ground_truth,
    model_output: modelOutput,
    evaluation,
    environment: {
      prompt_mode: promptMode,
      prompt_bundle: {
        system_prompt: harness.systemPrompt,
        user_prompt: harness.userPrompt,
        tool_instructions: harness.toolInstructions,
        tool_definitions: harness.toolDefinitions,
      },
      tool_calls: toolCalls,
      output_source: outputSource,
    },
  };
}
