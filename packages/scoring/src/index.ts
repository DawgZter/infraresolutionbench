export const COMPOSITE_SCORE_WEIGHTS = {
  exact: 0.7,
  consistency: 0.2,
  rubric: 0.1,
} as const;

export function computeCompositeScore(input: {
  exactAccuracy: number;
  consistencyPassRate: number;
  rubricPassRate: number;
}): number {
  return (
    (input.exactAccuracy * COMPOSITE_SCORE_WEIGHTS.exact) +
    (input.consistencyPassRate * COMPOSITE_SCORE_WEIGHTS.consistency) +
    (input.rubricPassRate * COMPOSITE_SCORE_WEIGHTS.rubric)
  );
}

export * from "./consistency";
export * from "./exact";
export * from "./rubric";
