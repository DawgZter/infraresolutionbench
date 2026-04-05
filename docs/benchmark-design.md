# Benchmark Design

## Objective

`InfraResolutionBench` evaluates an AI copilot operating in AI infrastructure commercial operations. The model is given messy internal evidence across multiple systems and must return a commercial resolution packet.

## Inputs

- CRM or account record
- billing or pricing record
- usage or telemetry summary
- incident or engineering notes
- customer note
- policy or SLA snippet
- optional calculator output

## Outputs

- `issue_type`
- `root_cause`
- `customer_impact`
- `contractual_applicability`
- `discrepancy_detected`
- `recommended_owner`
- `recommended_action`
- `needs_human_review`
- `confidence`
- `customer_note`
- `internal_note`

## Design principles

1. Data quality first.
2. Gold cases before synthetic generation.
3. Ground truth is always programmatic or manually adjudicated, never judged by an LLM in v1.
4. Deterministic exact scoring comes before any judge model.
5. The benchmark measures routing and commercial reasoning, not replacement of billing math.

## Current implementation order

1. Shared schemas and enums
2. Handwritten gold cases
3. Validation script
4. Exact scorers
5. Consistency and rubric checks
6. Local runner and artifact logging
7. Synthetic generator families
8. Local dataset evaluation loop
9. Lightweight frontend

## Environment model

The local environment exposes read-only access to the case packet and evaluates model output with deterministic scorers. This mirrors the intended Prime-style environment pattern where a dataset, harness, and reward or rubric travel together.

## Current synthetic coverage

- pricing config mismatch
- metering discrepancy
- clean covered outage
- maintenance exclusion
- customer-caused failure
- degraded performance with commercial sensitivity
- ambiguous mixed-evidence case

Each synthetic case is rendered from programmatic truth plus bounded noise injectors for wording and non-critical field variation.

## Current benchmark shape

- 15 handwritten gold cases with 14 distinct structured ground-truth combinations
- 140 synthetic cases with 22 distinct structured ground-truth combinations
- composite scoring weighted toward exact correctness: `0.7 exact / 0.2 consistency / 0.1 rubric`

This weighting is intentional. Note consistency and rubric still matter, but they should not be allowed to flatten model differences once note formatting becomes easy.
