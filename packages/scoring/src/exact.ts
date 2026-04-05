import type { GroundTruth, ModelOutput, ResolutionFields } from "@infraresolutionbench/shared";

export const EXACT_SCORABLE_FIELDS = [
  "issue_type",
  "root_cause",
  "customer_impact",
  "contractual_applicability",
  "discrepancy_detected",
  "recommended_owner",
  "recommended_action",
  "needs_human_review",
  "confidence",
] as const;

export type ExactScorableField = (typeof EXACT_SCORABLE_FIELDS)[number];

export type ExactFieldResult = {
  field: ExactScorableField;
  expected: ResolutionFields[ExactScorableField];
  actual: ModelOutput[ExactScorableField];
  correct: boolean;
};

export type ExactScoreResult = {
  passed: number;
  total: number;
  accuracy: number;
  fields: Record<ExactScorableField, ExactFieldResult>;
};

export function scoreExact(groundTruth: GroundTruth, modelOutput: ModelOutput): ExactScoreResult {
  const fieldResults = Object.fromEntries(
    EXACT_SCORABLE_FIELDS.map((field) => {
      const expected = groundTruth[field];
      const actual = modelOutput[field];
      const correct = expected === actual;

      return [
        field,
        {
          field,
          expected,
          actual,
          correct,
        },
      ];
    }),
  ) as Record<ExactScorableField, ExactFieldResult>;

  const passed = EXACT_SCORABLE_FIELDS.filter((field) => fieldResults[field].correct).length;
  const total = EXACT_SCORABLE_FIELDS.length;

  return {
    passed,
    total,
    accuracy: passed / total,
    fields: fieldResults,
  };
}
