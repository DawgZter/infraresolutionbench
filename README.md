# InfraResolution Bench

A [Prime Lab](https://docs.primeintel.ai/) environment and benchmark for evaluating AI agents on commercial operations tasks in AI infrastructure — the kind of work that sits between contracts, compute usage, incidents, billing, and customer communication.

Live frontend: [infraresolutionbench.com](https://infraresolutionbench.com)  
GitHub: [DawgZter/infraresolutionbench](https://github.com/DawgZter/infraresolutionbench)  
Prime environment: [`kariminal/infraresolutionbench`](https://app.primeintellect.ai/dashboard/environments/kariminal/infraresolutionbench)

Published on Prime's Environments Hub as [`kariminal/infraresolutionbench`](https://lab.primeintel.ai/).

## Why this exists

In an AI infrastructure business, revenue operations isn't traditional SaaS RevOps. It lives at the intersection of compute telemetry, usage-based billing, contractual SLA logic, cross-system data integrity, and customer-facing commercial judgment. When a customer's training run hits a capacity issue at 2am and it affects their bill, someone needs to understand both the technical context and the commercial implications.

This benchmark models that workflow. It tests whether an AI agent can take messy, partially conflicting evidence from multiple internal systems — CRM, billing, usage telemetry, incident reports, customer complaints, policy docs — and produce a correct, structured commercial resolution.

## What it measures

Given a case packet assembled from simulated internal systems, the agent must:

- **Classify the issue** into a bounded commercial ops taxonomy (pricing mismatch, metering discrepancy, incident review, customer-caused failure, policy applicability, or ambiguous case)
- **Interpret messy evidence** to determine root cause, customer impact, and contractual applicability — without inventing billing logic
- **Detect cross-system discrepancies** (e.g. CRM says Committed-100 but billing config says Committed-150)
- **Route and recommend** a bounded owner and next action across RevOps, Finance, and Engineering
- **Decide whether human review is needed** based on evidence quality and commercial stakes
- **Draft consistent communications** — a customer-facing note and an internal ops note that don't contradict the structured output

## Where this fits

This benchmark evaluates the **AI decision layer** in a commercial resolution workflow:

```
Event sources (tickets, telemetry, billing alerts, customer comms)
  → Case assembly (normalize evidence into a case packet)
    → AI agent (classify, interpret, route, draft)          ← benchmarked here
      → Execution (route to owner, draft response, flag risk)
        → Evaluation layer (measure agent quality)          ← and here
```

The environment is **architecture-agnostic** — it tests the decision surface, not whether the implementation is a single generalist agent, a multi-agent pipeline, or a hybrid of deterministic logic plus LLM reasoning. A high-performing agent on this bench is a candidate to handle both reactive triggers (customer billing tickets) and proactive triggers (system mismatches, usage anomalies, renewal-risk signals).

With real internal data swapped in for the synthetic cases, this becomes a reusable harness for comparing models, prompts, tool configurations, and agent designs on actual commercial operations workflows.

## Taxonomy

The benchmark uses a bounded taxonomy designed for AI infrastructure commercial operations:

| Layer | Values |
|---|---|
| **Issue type** | `pricing_config_mismatch`, `metering_discrepancy`, `incident_impact_review`, `customer_caused_issue`, `policy_applicability_review`, `ambiguous_case` |
| **Root cause** | `capacity_shortfall`, `scheduler_failure`, `gpu_node_failure`, `usage_metering_error`, `billing_config_out_of_sync_with_crm`, `customer_misconfiguration`, `scheduled_maintenance`, `unknown_root_cause` |
| **Customer impact** | `no_customer_impact`, `outage`, `degraded_performance`, `delayed_job_start`, `job_failure`, `retry_storm`, `usage_visibility_gap`, `invoice_confusion` |
| **Contractual applicability** | `not_an_sla_case`, `sla_breach`, `no_sla_breach`, `sla_excluded_scheduled_maintenance`, `sla_excluded_customer_caused`, `credit_due`, `no_credit_due`, `invoice_adjustment_due`, `goodwill_credit_optional` |
| **Owner routing** | `revops_owner`, `finance_owner`, `engineering_owner`, `shared_revops_finance`, `shared_revops_engineering`, `human_review_required` |
| **Recommended action** | `send_explanation_only`, `hold_for_revops_review`, `hold_for_finance_review`, `hold_for_engineering_review`, `consider_goodwill_credit`, `no_action_required` |
| **Confidence** | `high`, `medium`, `low` |

Full taxonomy details in [`docs/taxonomy.md`](docs/taxonomy.md).

## Dataset

**15 hand-authored gold cases** covering adversarial and edge scenarios:

| Case | Scenario |
|---|---|
| CRM/billing mismatch | CRM says Committed-100, billing config says Committed-150 |
| Clean SLA breach | Covered outage exceeds threshold, credit due |
| Scheduled maintenance exclusion | Outage-like impact, but maintenance is excluded from SLA |
| Metering discrepancy | Usage dashboard disagrees with invoice, compute path healthy |
| Customer-caused failure | Invalid checkpoint, customer blames platform |
| Goodwill optional | Degraded performance below SLA threshold, enterprise renewal in 8 days |
| Ambiguous mixed evidence | Conflicting signals, no clean resolution |
| Burst pricing confusion | Customer disputes overage charges |
| Rollover credit confusion | Lower-than-expected invoice due to credit consumption |
| Repeated minor incidents | No single breach, but pattern on strategic account |
| + 5 more | Billing-led review, retry storm, maintenance delay, scheduler credit, short GPU failure |

**140 synthetic cases** across 7 generator families, each built from programmatic truth plus bounded noise injectors for wording variation. Ground truth is always deterministic — never LLM-generated.

## Scoring

Three-layer deterministic scoring with no LLM judge required:

- **Exact scoring (weight 0.7)** — field-by-field comparison across 9 structured resolution fields
- **Consistency scoring (weight 0.2)** — 10+ keyword checks ensuring drafted notes don't contradict structured outputs (e.g. customer note shouldn't claim SLA breach when contractual applicability says excluded)
- **Rubric scoring (weight 0.1)** — required-content checks for issue mention, owner, action, next step, and account context relevance

Composite: `0.7 × exact + 0.2 × consistency + 0.1 × rubric`

Intentionally exact-heavy so note formatting can't flatten real model differences.

## Prime Lab integration

The benchmark is a native Prime [`verifiers`](https://docs.primeintel.ai/) environment:

- **Environment slug:** `kariminal/infraresolutionbench` (v0.1.12)
- **Two prompt modes:** `packet` (full case JSON in prompt) and `tools` (7 read-only tools the agent calls to inspect evidence)
- **Rubric:** composite reward function + exact/consistency/rubric/json-valid metrics
- **Hosted evals:** runs end-to-end via `prime eval run` on Prime-managed infrastructure

```bash
# Run a hosted eval
prime eval run kariminal/infraresolutionbench \
  --env-args '{"case_source":"gold","prompt_mode":"tools","limit":"10"}' \
  --provider prime --model openai/gpt-4.1-nano \
  --num-examples 10 --rollouts-per-example 3 \
  --abbreviated-summary --hosted --follow
```

### Tools mode

In tools mode, the agent has access to 7 read-only tools that mirror internal system lookups:

| Tool | Returns |
|---|---|
| `get_crm_record` | Account tier, plan, renewal date, owner, notes |
| `get_billing_record` | Pricing config, invoice preview, credits, burst usage |
| `get_usage_record` | GPU-hours, telemetry summary, retry counts |
| `get_incident_record` | Status notes, engineering notes, metric summaries |
| `get_customer_note` | Customer complaint or question |
| `get_policy_snippet` | SLA rules, exclusions, pricing policy |
| `get_calculator_output` | Invoice helper / billing calculator output |

## Hosted evaluation results

Evaluated 15+ models on Prime's hosted infrastructure with up to 205 samples per model.

**Combined leaderboard** (0.6 × gold + 0.4 × synthetic, tools mode):

| Model | Overall | Gold | Synthetic | JSON Valid |
|---|---|---|---|---|
| `anthropic/claude-opus-4.6` | **0.924** | 0.921 | 0.928 | 1.000 |
| `anthropic/claude-opus-4.5` | 0.917 | 0.911 | 0.925 | 0.994 |
| `anthropic/claude-sonnet-4.6` | 0.916 | 0.911 | 0.922 | 1.000 |
| `openai/gpt-5.1` | 0.916 | 0.917 | 0.914 | 0.996 |
| `openai/gpt-5.3-codex` | 0.915 | 0.915 | 0.915 | 1.000 |

Full sweep data including mid-pack models in `artifacts/model-sweeps/` and `artifacts/prime-evals/`.

## Workspace layout

```text
InfraResolutionBench/
  docs/                           # design docs, taxonomy, guides
  packages/
    shared/                       # TypeScript enums and Zod schemas
    data/                         # gold cases, synthetic generators
    scoring/                      # exact, consistency, rubric scorers
    environment/                  # CLI runner, adapters, Prime integration
  environments/
    infraresolutionbench/         # Prime verifiers environment (Python)
  apps/
    web/                          # Next.js frontend — cases, leaderboard, design
  artifacts/
    prime-evals/                  # imported hosted evaluation summaries
    prime-eval-samples/           # imported sample rollouts
    model-sweeps/                 # sweep plans, summaries, follow-ups
```

## Local commands

```bash
# Install
npm install

# Validate gold cases against schemas
npm run validate:cases

# Generate synthetic cases
npm run generate:synthetic

# Score a single case
npm run score:case -- --case-id gold_case_001 \
  --model-output artifacts/mock-outputs/gold_case_001_perfect.json \
  --model-name reference-perfect

# Run a tool-mode episode
npm run run:episode -- --case-id gold_case_001 --mode tools \
  --adapter replay \
  --tool-transcript artifacts/mock-transcripts/gold_case_001_tools.json \
  --model-output artifacts/mock-outputs/gold_case_001_perfect.json \
  --model-name tools-baseline

# Evaluate a batch of outputs
npm run eval:dataset -- --outputs-dir artifacts/batch-outputs/demo \
  --model-name demo-batch --case-source gold

# Inspect case prompt and tool harness
npm run inspect:case -- --case-id gold_case_001 --mode tools

# Run the frontend
npm run dev:web

# Audit benchmark diversity
npm run audit:benchmark
```

### Prime environment commands

```bash
# Push environment to Prime Hub
npm run prime:env:push

# Import a hosted eval
npm run prime:eval:import -- --eval-id <prime-eval-id>

# Run a model sweep
npm run sweep:run -- --plan artifacts/model-sweeps/latest-plan.json \
  --selection prime --case-source synthetic --prompt-mode tools \
  --num-examples 21 --rollouts-per-example 3 --limit 21

# Summarize sweep results
npm run sweep:summarize -- --plan artifacts/model-sweeps/latest-plan.json \
  --selection prime --case-source synthetic --prompt-mode tools
```

## How this was built

This project was built entirely using AI coding tools — [Claude Code](https://claude.ai/code) and OpenAI Codex — as an exercise in AI-native systems building. No code was written manually. The design, taxonomy, case authoring, scoring logic, Prime integration, frontend, and sweep tooling were all directed through AI pair programming.

## Design decisions

See [`docs/benchmark-design.md`](docs/benchmark-design.md) for the full design rationale. Key choices:

- **Eval-first, not training-first.** The workflow is measurable before any model training happens.
- **Ground truth is always programmatic or hand-adjudicated.** No LLM-generated labels.
- **Deterministic scoring before any judge model.** Exact field matching, keyword consistency checks, and required-content rubrics — no LLM-as-judge in v1.
- **The benchmark measures routing and commercial reasoning**, not replacement of billing arithmetic.
- **Gold cases before synthetic generation.** Data quality first.
