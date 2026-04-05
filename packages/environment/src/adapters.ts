import { spawn } from "node:child_process";
import path from "node:path";

import { loadModelOutputFromFile } from "@infraresolutionbench/data";
import type { GoldCase, ModelOutput } from "@infraresolutionbench/shared";

import {
  buildEpisodeToolCalls,
  createEpisodeArtifactBundle,
  loadToolTranscriptFromFile,
  type EpisodeArtifactBundle,
  type EpisodeToolCall,
} from "./episode";
import { createEnvironmentHarness, type EnvironmentHarness } from "./harness";
import type { PromptMode } from "./prompt";
import {
  buildValidatedAdapterRequest,
  validateAdapterResponse,
  type AdapterRequest as SubprocessAdapterRequest,
  type AdapterResponse as SubprocessAdapterResponse,
} from "./protocol";
import type { EnvironmentToolName } from "./tools";

export type AdapterOutputSource =
  | "mock_json"
  | "recorded_episode"
  | "adapter_execution";

export type AdapterExecutionContext = {
  goldCase: GoldCase;
  mode: PromptMode;
  harness: EnvironmentHarness;
};

export type AdapterExecutionResult = {
  modelName: string;
  modelOutput: ModelOutput;
  toolCalls: EpisodeToolCall[];
  outputSource: AdapterOutputSource;
  rawResponse?: unknown;
  adapterMetadata?: Record<string, unknown>;
};

export interface ModelAdapter {
  readonly adapterName: string;
  execute(context: AdapterExecutionContext): Promise<AdapterExecutionResult>;
}

type ReplayAdapterOptions = {
  modelOutputPath: string;
  toolTranscriptPath?: string | null;
  modelName?: string;
};

type OracleAdapterOptions = {
  modelName?: string;
};

type SubprocessAdapterOptions = {
  scriptPath: string;
  modelName?: string;
  prefetchTools?: "none" | "all";
};

type CommandAdapterOptions = {
  command: string;
  modelName?: string;
  prefetchTools?: "none" | "all";
};

export class ReplayAdapter implements ModelAdapter {
  readonly adapterName = "replay";
  private readonly options: ReplayAdapterOptions;

  constructor(options: ReplayAdapterOptions) {
    this.options = options;
  }

  async execute(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
    const resolvedModelOutputPath = path.resolve(process.cwd(), this.options.modelOutputPath);
    const modelOutput = await loadModelOutputFromFile(resolvedModelOutputPath);

    const requestedTools =
      context.mode === "tools" && this.options.toolTranscriptPath
        ? await loadToolTranscriptFromFile(
            path.resolve(process.cwd(), this.options.toolTranscriptPath),
          )
        : [];

    return {
      modelName: this.options.modelName ?? "mock-model",
      modelOutput,
      toolCalls: buildEpisodeToolCalls(context.goldCase, context.mode, requestedTools),
      outputSource: requestedTools.length > 0 ? "recorded_episode" : "mock_json",
      adapterMetadata: {
        adapter: this.adapterName,
        model_output_path: resolvedModelOutputPath,
        tool_transcript_path: this.options.toolTranscriptPath
          ? path.resolve(process.cwd(), this.options.toolTranscriptPath)
          : null,
      },
    };
  }
}

export class OracleAdapter implements ModelAdapter {
  readonly adapterName = "oracle";
  private readonly options: OracleAdapterOptions;

  constructor(options: OracleAdapterOptions = {}) {
    this.options = options;
  }

  async execute(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
    const { goldCase } = context;

    return {
      modelName: this.options.modelName ?? "oracle-adapter",
      modelOutput: {
        issue_type: goldCase.ground_truth.issue_type,
        root_cause: goldCase.ground_truth.root_cause,
        customer_impact: goldCase.ground_truth.customer_impact,
        contractual_applicability: goldCase.ground_truth.contractual_applicability,
        discrepancy_detected: goldCase.ground_truth.discrepancy_detected,
        recommended_owner: goldCase.ground_truth.recommended_owner,
        recommended_action: goldCase.ground_truth.recommended_action,
        needs_human_review: goldCase.ground_truth.needs_human_review,
        confidence: goldCase.ground_truth.confidence,
        customer_note:
          goldCase.ground_truth.reference_customer_note ??
          "Reference customer note unavailable.",
        internal_note:
          goldCase.ground_truth.reference_internal_note ??
          "Reference internal note unavailable.",
      },
      toolCalls: [],
      outputSource: "adapter_execution",
      adapterMetadata: {
        adapter: this.adapterName,
      },
    };
  }
}

export class SubprocessAdapter implements ModelAdapter {
  readonly adapterName = "subprocess";
  private readonly options: SubprocessAdapterOptions;

  constructor(options: SubprocessAdapterOptions) {
    this.options = options;
  }

  async execute(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
    const resolvedScriptPath = path.resolve(process.cwd(), this.options.scriptPath);
    const prefetchedToolCalls =
      context.mode === "tools" && (this.options.prefetchTools ?? "all") === "all"
        ? buildEpisodeToolCalls(
            context.goldCase,
            context.mode,
            context.harness.toolDefinitions.map((tool) => tool.name),
          )
        : [];

    const request = buildValidatedAdapterRequest({
      caseId: context.goldCase.case_packet.case_id,
      mode: context.mode,
      promptBundle: {
        system_prompt: context.harness.systemPrompt,
        user_prompt: context.harness.userPrompt,
        tool_instructions: context.harness.toolInstructions,
      },
      toolDefinitions: context.harness.toolDefinitions,
      casePacket: context.goldCase.case_packet,
      prefetchedToolCalls,
    });

    const response = await runSubprocessAdapter(resolvedScriptPath, request);
    const usedToolNames = response.used_tools ?? prefetchedToolCalls.map((call) => call.tool);
    const toolCalls =
      usedToolNames.length > 0
        ? buildEpisodeToolCalls(context.goldCase, context.mode, usedToolNames)
        : [];

    return {
      modelName:
        response.model_name ?? this.options.modelName ?? `subprocess:${path.basename(resolvedScriptPath)}`,
      modelOutput: response.model_output,
      toolCalls,
      outputSource: "adapter_execution",
      rawResponse: response,
      adapterMetadata: {
        adapter: this.adapterName,
        script_path: resolvedScriptPath,
        prefetch_tools: this.options.prefetchTools ?? "all",
        ...(response.adapter_metadata ?? {}),
      },
    };
  }
}

export class CommandAdapter implements ModelAdapter {
  readonly adapterName = "command";
  private readonly options: CommandAdapterOptions;

  constructor(options: CommandAdapterOptions) {
    this.options = options;
  }

  async execute(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
    const prefetchedToolCalls =
      context.mode === "tools" && (this.options.prefetchTools ?? "all") === "all"
        ? buildEpisodeToolCalls(
            context.goldCase,
            context.mode,
            context.harness.toolDefinitions.map((tool) => tool.name),
          )
        : [];

    const request = buildValidatedAdapterRequest({
      caseId: context.goldCase.case_packet.case_id,
      mode: context.mode,
      promptBundle: {
        system_prompt: context.harness.systemPrompt,
        user_prompt: context.harness.userPrompt,
        tool_instructions: context.harness.toolInstructions,
      },
      toolDefinitions: context.harness.toolDefinitions,
      casePacket: context.goldCase.case_packet,
      prefetchedToolCalls,
    });

    const response = await runCommandAdapter(this.options.command, request);
    const usedToolNames = response.used_tools ?? prefetchedToolCalls.map((call) => call.tool);
    const toolCalls =
      usedToolNames.length > 0
        ? buildEpisodeToolCalls(context.goldCase, context.mode, usedToolNames)
        : [];

    return {
      modelName:
        response.model_name ?? this.options.modelName ?? `command:${this.options.command}`,
      modelOutput: response.model_output,
      toolCalls,
      outputSource: "adapter_execution",
      rawResponse: response,
      adapterMetadata: {
        adapter: this.adapterName,
        command: this.options.command,
        prefetch_tools: this.options.prefetchTools ?? "all",
        ...(response.adapter_metadata ?? {}),
      },
    };
  }
}

async function runSubprocessAdapter(
  scriptPath: string,
  request: SubprocessAdapterRequest,
): Promise<SubprocessAdapterResponse> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Subprocess adapter exited with code ${code}. ${stderr.trim()}`.trim(),
          ),
        );
        return;
      }

      try {
        const parsed = validateAdapterResponse(JSON.parse(stdout));
        resolve(parsed);
      } catch (error) {
        reject(
          new Error(
            `Failed to parse subprocess adapter output as JSON. ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
        );
      }
    });

    child.stdin.write(JSON.stringify(request));
    child.stdin.end();
  });
}

async function runCommandAdapter(
  command: string,
  request: SubprocessAdapterRequest,
): Promise<SubprocessAdapterResponse> {
  return new Promise((resolve, reject) => {
    const child = spawn("/bin/zsh", ["-lc", command], {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(`Command adapter exited with code ${code}. ${stderr.trim()}`.trim()),
        );
        return;
      }

      try {
        const parsed = validateAdapterResponse(JSON.parse(stdout));
        resolve(parsed);
      } catch (error) {
        reject(
          new Error(
            `Failed to parse command adapter output as JSON. ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
        );
      }
    });

    child.stdin.write(JSON.stringify(request));
    child.stdin.end();
  });
}

export function createAdapterArtifactBundle(input: {
  goldCase: GoldCase;
  mode: PromptMode;
  result: AdapterExecutionResult;
}): EpisodeArtifactBundle {
  const { goldCase, mode, result } = input;

  return createEpisodeArtifactBundle({
    goldCase,
    modelOutput: result.modelOutput,
    modelName: result.modelName,
    promptMode: mode,
    toolCalls: result.toolCalls,
    outputSource: result.outputSource,
  });
}

export async function executeWithAdapter(input: {
  goldCase: GoldCase;
  mode: PromptMode;
  adapter: ModelAdapter;
}): Promise<{
  harness: EnvironmentHarness;
  result: AdapterExecutionResult;
  artifact: EpisodeArtifactBundle;
}> {
  const { goldCase, mode, adapter } = input;
  const harness = createEnvironmentHarness(goldCase, mode);
  const result = await adapter.execute({
    goldCase,
    mode,
    harness,
  });

  return {
    harness,
    result,
    artifact: createAdapterArtifactBundle({
      goldCase,
      mode,
      result,
    }),
  };
}
