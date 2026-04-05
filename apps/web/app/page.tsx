import Link from "next/link";

import { loadOverviewData } from "../data/dashboard";
import { PipelineFlow } from "../components/pipeline-flow";

export default async function HomePage() {
  const data = await loadOverviewData();

  const leader = data.hostedLeaderboardRows[0];
  const topScore =
    leader?.overallScore !== null && leader?.overallScore !== undefined
      ? (leader.overallScore * 100).toFixed(1) + "%"
      : "---";
  const leaderName = leader
    ? (leader.modelName.split("/").pop() ?? leader.modelName)
    : "---";

  return (
    <>
      {/* Hero */}
      <section className="pt-12 pb-16">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <h1 className="mb-4 max-w-3xl">InfraResolution Bench</h1>
            <p className="text-[var(--color-text-secondary)] max-w-xl text-base leading-relaxed">
              A{" "}
              <a
                href="https://docs.primeintel.ai/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Prime Lab
              </a>{" "}
              environment and benchmark for evaluating AI models & agents on Revenue
              operations tasks in AI infrastructure.
            </p>
            <div className="mt-4 flex items-center gap-5">
              <a
                href="https://github.com/placeholder/infra-resolution-bench"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] transition-colors"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
                  />
                </svg>
                View on GitHub
              </a>
              <a
                href="https://www.primeintellect.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] transition-colors"
              >
                <svg
                  width="20"
                  height="16"
                  viewBox="0 0 203 161"
                  fill="currentColor"
                >
                  <path d="m137.5 67.51q-0.28 0.01-0.75 0.01l-0.02-0.02c-0.89 0.2-1.99 0.13-3.12 0.05-3.35-0.22-6.92-0.45-5.73 6.4 0.26 1.5-1.57 1.88-2.78 1.94q-5.17 0.29-10.35 0.19c-0.66-0.01-1.32-0.56-1.93-1.05q-0.15-0.13-0.3-0.25c-0.11-0.09 0.29-1.23 0.5-1.24 3.37-0.2 4.59-2.48 5.8-4.76 0.62-1.14 1.23-2.29 2.11-3.16 8-7.93 16.16-15.7 25.5-22.09 0.91-0.62 2.02-1.19 2.78-0.11 0.58 0.84 0.04 1.31-0.52 1.79-0.25 0.22-0.49 0.43-0.65 0.68-0.57 0.9-1.57 1.55-2.56 2.21-1.95 1.29-3.89 2.56-2.45 5.58 1.25 2.61 0.13 3.07-1.58 3.78l-0.07 0.03q-1.11 0.46-2.24 0.87c-1.59 0.59-3.18 1.18-4.61 2.05-1.44 0.87-2.12 2.56 0.22 3.56 5.13 2.18 18.39-1.31 20.97-6.11 2.43-4.49 6.04-7.82 9.65-11.15 2.03-1.87 4.06-3.74 5.87-5.81 3.92-4.46 8.5-8.34 13.08-12.22 2.28-1.93 4.55-3.85 6.75-5.86 1.65-1.5 2.34-3.49 1.05-5.66-1.29-2.15-3.48-2.44-5.54-1.96-13.54 3.19-26.62 7.49-38.25 15.51-18.55 12.82-37.13 25.59-55.87 38.13-6.38 4.28-10.25 2.19-12.38-5.22-4.73-16.45-11.67-30.8-31.61-33.03-7.28-0.82-12.62 3.74-11.57 10.98 0.54 3.67 0.05 7.13-1.71 10.57q-0.59 1.14-1.18 2.29c-2.72 5.26-5.46 10.57-7.16 16.17q-0.22 0.7-0.48 1.47c-1.51 4.58-3.44 10.41 5.76 10.73 0.38 0.01 1.1 0.96 1.02 1.31-0.21 0.84-0.61 1.83-1.27 2.32-8.82 6.5-16.07 14.38-19.19 25.03-1.58 5.38-0.54 10.97 4.06 15.13 3.29 2.98 7.48 4.71 11.17 2.2 3.36-2.28 7.04-3.82 10.72-5.35 3.24-1.35 6.47-2.69 9.47-4.55 0.72-0.44 1.6-0.85 2.49-1.27 2.46-1.14 4.99-2.32 4.55-4.46-0.7-3.35-4.24-6.45-7.18-8.89-2.93-2.42-10.37-18.67-9.49-22.57 1.24-5.46 4.04-10.2 6.83-14.93 2.39-4.05 4.78-8.09 6.21-12.6 0.59-1.86 2.85-2.88 5.03-2.14 1.48 0.5 1.23 1.86 0.99 3.13q-0.01 0.05-0.02 0.1-1.32 7.3-2.61 14.61-0.65 3.65-1.31 7.3c-0.27 1.56 0.21 2.8 1.83 3.12 3.11 0.61 3.04 2.01 1.64 4.42-1.49 2.55-1.7 5.66-0.04 8.02 1.68 2.37 4.47 2.87 7.31 1.45 1.78-0.88 3.15-0.1 3.13 1.69-0.11 9.53 3.88 7.38 8.74 3.22 0.45-0.38 1.06-0.59 1.64-0.8q0.16-0.05 0.32-0.11 0.69-0.25 1.38-0.49c9.15-3.25 18.28-6.49 23.45-15.85 0.39-0.73 1.7-1.09 2.72-1.36q0.09-0.03 0.17-0.05c5.91-1.6 11.94-1.63 17.96-1.65 4.52-0.02 9.04-0.04 13.51-0.72 4.41-0.68 9.21-3.25 9.25-7.51 0.03-3.43-2.6-3.22-5.22-3-1.13 0.09-2.27 0.18-3.19-0.02-0.18-0.04-0.38-0.03-0.7-0.02z"/>
                  <path d="m68.11 115.55c-1.1 7.27 1.68 13.5 13.05 13.42 9.71-0.4 20.69-6.27 31.43-13.79 7.08-4.96 13.21-10.2 17.19-17.94 2.92-5.68 1.41-10.25-2.99-14.24-1.94-1.76-3.8-1.95-5.97 0.17-7.72 7.56-17.33 11.68-27.2 15.83-2.51 1.06-5.37 1.58-8.26 2.11-7.68 1.42-15.51 2.86-17.25 14.44z"/>
                </svg>
                View on Prime Intellect
              </a>
            </div>
          </div>
          {/* Abstract network SVG */}
          <div className="hidden md:block shrink-0 w-96 h-60 -translate-x-36 text-[var(--color-accent)] opacity-25">
            <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Connection lines */}
              <line x1="60" y1="50" x2="140" y2="80" stroke="currentColor" strokeWidth="1.5" />
              <line x1="140" y1="80" x2="220" y2="40" stroke="currentColor" strokeWidth="1.5" />
              <line x1="140" y1="80" x2="140" y2="150" stroke="currentColor" strokeWidth="2" />
              <line x1="60" y1="50" x2="40" y2="130" stroke="currentColor" strokeWidth="1.5" />
              <line x1="40" y1="130" x2="140" y2="150" stroke="currentColor" strokeWidth="1.5" />
              <line x1="220" y1="40" x2="240" y2="120" stroke="currentColor" strokeWidth="1.5" />
              <line x1="240" y1="120" x2="140" y2="150" stroke="currentColor" strokeWidth="1.5" />
              <line x1="60" y1="50" x2="100" y2="20" stroke="currentColor" strokeWidth="1" />
              <line x1="220" y1="40" x2="260" y2="60" stroke="currentColor" strokeWidth="1" />
              <line x1="40" y1="130" x2="80" y2="170" stroke="currentColor" strokeWidth="1" />
              <line x1="240" y1="120" x2="260" y2="160" stroke="currentColor" strokeWidth="1" />
              {/* Outer nodes */}
              <circle cx="100" cy="20" r="4" fill="currentColor" opacity="0.4" />
              <circle cx="260" cy="60" r="4" fill="currentColor" opacity="0.4" />
              <circle cx="80" cy="170" r="4" fill="currentColor" opacity="0.4" />
              <circle cx="260" cy="160" r="4" fill="currentColor" opacity="0.4" />
              {/* Source nodes */}
              <circle cx="60" cy="50" r="8" fill="currentColor" opacity="0.5" />
              <circle cx="220" cy="40" r="8" fill="currentColor" opacity="0.5" />
              <circle cx="40" cy="130" r="8" fill="currentColor" opacity="0.5" />
              <circle cx="240" cy="120" r="8" fill="currentColor" opacity="0.5" />
              {/* Central node (agent) */}
              <circle cx="140" cy="80" r="12" fill="currentColor" opacity="0.7" />
              {/* Output node */}
              <circle cx="140" cy="150" r="10" fill="currentColor" opacity="0.6" />
              {/* Decision pulse rings */}
              <circle cx="140" cy="80" r="20" stroke="currentColor" strokeWidth="1" opacity="0.3" />
              <circle cx="140" cy="80" r="30" stroke="currentColor" strokeWidth="0.5" opacity="0.15" />
            </svg>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-[1fr_1.4fr_1fr_1fr] mb-16">
        <div>
          <p className="stat-value">
            {data.goldCaseCount + data.syntheticCaseCount}
          </p>
          <p className="stat-label">Total Cases</p>
        </div>
        <div className="-ml-4">
          <p className="stat-value">{topScore}</p>
          <p className="stat-label">Top Score ({leaderName})</p>
        </div>
        <div className="ml-2">
          <p className="stat-value">
            {data.hostedLeaderboardRows.filter(
              (r: (typeof data.hostedLeaderboardRows)[number]) => r.overallScore !== null,
            )
              .length}
          </p>
          <p className="stat-label">Models Ranked</p>
        </div>
        <div>
          <p className="stat-value">{data.syntheticFamilyCount}</p>
          <p className="stat-label">Scenario Families</p>
        </div>
      </section>

      <hr />

      {/* The problem */}
      <section>
        <p className="eyebrow">The Problem</p>
        <h2 className="mb-4">Revenue Operations in AI infrastructure is messy</h2>
        <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed mb-4">
          When a customer experiences an issue that could affect usage, billing, or service expectations, the relevant context is usually spread across multiple systems: CRM/account data, pricing and billing configuration, usage telemetry, incident notes, customer communications, and internal policy docs.
        </p>
        <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed mb-4">
          Let's call this collected evidence a{" "}
          <strong className="text-[var(--color-text)]">case packet</strong>: a
          normalized bundle of all relevant context from these systems, assembled
          into a single input for an AI agent to reason over.
        </p>
        <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
          This benchmark tests whether an agent can take a case packet with
          messy, partially conflicting evidence and produce a correct, structured
          commercial resolution.
        </p>
      </section>

      <hr />

      {/* What it measures */}
      <section>
        <p className="eyebrow">What It Measures</p>
        <h2 className="mb-6">Given a case packet, the agent must</h2>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="card">
            <h3 className="text-sm mb-1">Classify the issue</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Into a bounded RevOps taxonomy: pricing mismatch, metering
              discrepancy, incident review, customer-caused failure, policy
              applicability, or ambiguous case.
            </p>
          </div>
          <div className="card">
            <h3 className="text-sm mb-1">Interpret messy evidence</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Determine root cause, customer impact, and contractual
              applicability without inventing billing logic.
            </p>
          </div>
          <div className="card">
            <h3 className="text-sm mb-1">Detect cross-system discrepancies</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              E.g. CRM says Committed-100 but billing config says Committed-150.
              The agent must catch the mismatch.
            </p>
          </div>
          <div className="card">
            <h3 className="text-sm mb-1">Route and recommend</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Assign a bounded owner and next action across RevOps, Finance, and
              Engineering. Decide whether human review is needed.
            </p>
          </div>
          <div className="card md:col-span-2">
            <h3 className="text-sm mb-1">Draft consistent communications</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              A customer-facing note and an internal ops note that don&apos;t
              contradict the structured output. Scored with consistency checks,
              not vibes.
            </p>
          </div>
        </div>
      </section>

      <hr />

      {/* Where this fits */}
      <section className="mb-[6.125rem]">
        <p className="eyebrow">Where This Fits</p>
        <h2 className="mb-6">The decision layer in a resolution workflow</h2>
        <PipelineFlow />
      </section>

      <hr />

      {/* Scoring */}
      <section>
        <p className="eyebrow">Scoring</p>
        <h2 className="mb-6">
          Three-layer deterministic scoring, no LLM judge
        </h2>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="card">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="stat-value text-2xl">70%</span>
              <span className="font-mono text-xs text-[var(--color-text-tertiary)]">
                weight
              </span>
            </div>
            <h3 className="text-sm mb-1">Exact Match</h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Field-by-field comparison across 9 structured resolution fields.
              All-or-nothing per field.
            </p>
          </div>
          <div className="card">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="stat-value text-2xl">20%</span>
              <span className="font-mono text-xs text-[var(--color-text-tertiary)]">
                weight
              </span>
            </div>
            <h3 className="text-sm mb-1">Consistency</h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              10+ keyword checks ensuring drafted notes don&apos;t contradict
              structured outputs. Catches plausible but internally contradictory
              results.
            </p>
          </div>
          <div className="card">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="stat-value text-2xl">10%</span>
              <span className="font-mono text-xs text-[var(--color-text-tertiary)]">
                weight
              </span>
            </div>
            <h3 className="text-sm mb-1">Rubric</h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Required-content checks for issue mention, owner, action, next
              step, and account context. Intentionally exact-heavy so note
              formatting can&apos;t flatten real model differences.
            </p>
          </div>
        </div>
      </section>

      <hr />

      {/* Dataset */}
      <section>
        <p className="eyebrow">Dataset</p>
        <h2 className="mb-4">Gold cases + synthetic generation</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="stat-value text-2xl">
                {data.goldCaseCount}
              </span>
              <span className="font-mono text-xs text-[var(--color-text-tertiary)]">
                gold cases
              </span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Hand-authored adversarial and edge scenarios: CRM/billing
              mismatches, clean SLA breaches, maintenance exclusions, metering
              discrepancies, customer-caused failures, and ambiguous mixed
              evidence.
            </p>
          </div>
          <div className="card">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="stat-value text-2xl">
                {data.syntheticCaseCount}
              </span>
              <span className="font-mono text-xs text-[var(--color-text-tertiary)]">
                synthetic cases
              </span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Across {data.syntheticFamilyCount} generator families, each built
              from programmatic truth plus bounded noise injectors for wording
              variation. Ground truth is always deterministic, never
              LLM-generated.
            </p>
          </div>
        </div>
      </section>

      <hr />

      {/* Explore */}
      <section>
        <div className="grid md:grid-cols-3 gap-4">
          <Link
            href="/leaderboard"
            className="card no-underline group hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] transition-all"
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base group-hover:text-[var(--color-accent)] transition-colors">
                Leaderboard
              </h3>
              <span className="text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent)] group-hover:translate-x-0.5 transition-all">
                &rarr;
              </span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {data.hostedLeaderboardRows.filter(
                (r: (typeof data.hostedLeaderboardRows)[number]) => r.overallScore !== null,
              ).length}
              + models ranked on hosted Prime evaluations. Current leader:{" "}
              {leaderName} at {topScore}.
            </p>
          </Link>
          <Link
            href="/cases"
            className="card no-underline group hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] transition-all"
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base group-hover:text-[var(--color-accent)] transition-colors">
                Case Explorer
              </h3>
              <span className="text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent)] group-hover:translate-x-0.5 transition-all">
                &rarr;
              </span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Browse the {data.goldCaseCount} gold cases with structured evidence
              packets, ground truth labels, and scored model outputs.
            </p>
          </Link>
          <Link
            href="/taxonomy"
            className="card no-underline group hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] transition-all"
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base group-hover:text-[var(--color-accent)] transition-colors">
                Taxonomy
              </h3>
              <span className="text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent)] group-hover:translate-x-0.5 transition-all">
                &rarr;
              </span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              The bounded classification framework and deterministic scoring
              methodology behind every evaluation.
            </p>
          </Link>
        </div>
      </section>
    </>
  );
}
