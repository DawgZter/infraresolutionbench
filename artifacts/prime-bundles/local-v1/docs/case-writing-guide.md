# Case Writing Guide

## Gold case principles

- Keep cases realistic for AI infrastructure commercial operations.
- Use multi-source evidence, not single-field toy examples.
- Make at least some cases adversarial or ambiguous on purpose.
- Keep the resolution space bounded by the taxonomy.
- Prefer concrete numbers and concrete notes.

## What good gold cases should contain

- a visible packet that feels like real internal system data
- a hidden scenario summary explaining the latent truth
- adjudicated structured outputs
- reference customer and internal notes
- notes about likely model failure modes

## What to avoid

- making the model invent billing formulas
- relying on private unstated assumptions
- using prose-only ground truth with no bounded labels
- letting an LLM decide the canonical answer
- overfitting every case to the same wording pattern

## Synthetic case rule

Synthetic cases may vary wording, omit non-critical fields, or add irrelevant detail, but the ground truth must still come directly from generator logic.
