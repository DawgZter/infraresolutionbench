import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  computeCompositeScore,
  scoreConsistency,
  scoreExact,
  scoreRubric,
} from "@infraresolutionbench/scoring";
import type { GoldCase, ModelOutput } from "@infraresolutionbench/shared";
import type { EpisodeArtifactBundle } from "./episode";
import type { PromptMode } from "./prompt";

export type EvaluationResult = {
  caseId: string;
  exact: ReturnType<typeof scoreExact>;
  consistency: ReturnType<typeof scoreConsistency>;
  rubric: ReturnType<typeof scoreRubric>;
  overall: {
    exactAccuracy: number;
    consistencyPassRate: number;
    rubricPassRate: number;
    compositeScore: number;
  };
};

export type ArtifactBundle = {
  generated_at: string;
  model_name: string;
  case_packet: GoldCase["case_packet"];
  ground_truth: GoldCase["ground_truth"];
  model_output: ModelOutput;
  evaluation: EvaluationResult;
};

const currentFilePath = fileURLToPath(import.meta.url);
const localRunsDir = path.resolve(path.dirname(currentFilePath), "../../../artifacts/local-runs");

export function formatPromptPacket(goldCase: GoldCase): GoldCase["case_packet"] {
  return goldCase.case_packet;
}

export function evaluateGoldCase(goldCase: GoldCase, modelOutput: ModelOutput): EvaluationResult {
  const exact = scoreExact(goldCase.ground_truth, modelOutput);
  const consistency = scoreConsistency(modelOutput);
  const rubric = scoreRubric(goldCase.case_packet, modelOutput);

  return {
    caseId: goldCase.case_packet.case_id,
    exact,
    consistency,
    rubric,
    overall: {
      exactAccuracy: exact.accuracy,
      consistencyPassRate: consistency.passRate,
      rubricPassRate: rubric.passRate,
      compositeScore: computeCompositeScore({
        exactAccuracy: exact.accuracy,
        consistencyPassRate: consistency.passRate,
        rubricPassRate: rubric.passRate,
      }),
    },
  };
}

export async function writeArtifactBundle(
  artifact: ArtifactBundle | EpisodeArtifactBundle,
): Promise<string> {
  await mkdir(localRunsDir, { recursive: true });

  const artifactPath = `${localRunsDir}/${artifact.model_name}_${artifact.case_packet.case_id}.json`;

  await writeFile(artifactPath, JSON.stringify(artifact, null, 2), "utf8");
  return artifactPath;
}

export function createBasicArtifactBundle(input: {
  goldCase: GoldCase;
  modelOutput: ModelOutput;
  evaluation: EvaluationResult;
  modelName: string;
  promptMode?: PromptMode;
}): ArtifactBundle {
  const { goldCase, modelOutput, evaluation, modelName } = input;

  return {
    generated_at: new Date().toISOString(),
    model_name: modelName,
    case_packet: goldCase.case_packet,
    ground_truth: goldCase.ground_truth,
    model_output: modelOutput,
    evaluation,
  };
}

export * from "./tools";
export * from "./prompt";
export * from "./harness";
export * from "./episode";
export * from "./adapters";
export * from "./protocol";
