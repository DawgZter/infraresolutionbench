const layers = [
  {
    name: "Issue Type",
    description:
      "The primary classification of what went wrong: pricing mismatch, metering discrepancy, outage, maintenance exclusion, customer-caused failure, degraded performance, or ambiguous case.",
    values: [
      "pricing_config_mismatch",
      "metering_discrepancy",
      "clean_covered_outage",
      "maintenance_exclusion",
      "customer_caused_failure",
      "degraded_performance_with_commercial_sensitivity",
      "ambiguous_case",
    ],
  },
  {
    name: "Root Cause",
    description:
      "What specifically caused the issue: a misconfigured pricing tier, a telemetry gap, a maintenance window overlap, a customer misconfiguration, etc.",
    values: [],
  },
  {
    name: "Customer Impact",
    description:
      "The financial, operational, or contractual impact on the customer: overbilling, underbilling, service degradation, missed SLA, or no material impact.",
    values: [
      "overbilled",
      "underbilled",
      "service_degraded",
      "sla_breach",
      "no_material_impact",
    ],
  },
  {
    name: "Contractual Applicability",
    description:
      "Whether a credit, refund, SLA adjustment, or no action is contractually warranted based on the terms and evidence.",
    values: [
      "credit_warranted",
      "refund_warranted",
      "sla_adjustment",
      "no_action_warranted",
      "needs_legal_review",
    ],
  },
  {
    name: "Owner",
    description:
      "Which team should own the resolution: finance, RevOps, engineering, shared ownership, or escalation to legal.",
    values: [
      "finance",
      "revops",
      "engineering",
      "shared_revops_finance",
      "legal_escalation",
    ],
  },
  {
    name: "Next Action",
    description:
      "The concrete next step: issue credit, adjust configuration, escalate, schedule review, or close with no action.",
    values: [
      "issue_credit",
      "adjust_pricing_config",
      "escalate_to_engineering",
      "schedule_review",
      "close_no_action",
    ],
  },
];

export default function TaxonomyPage() {
  return (
    <>
      <section className="pt-4 pb-8">
        <p className="eyebrow">Taxonomy</p>
        <h2>The 6-layer classification framework</h2>
        <p>
          Every resolution packet is classified across six orthogonal layers.
          The agent must get each one right. Partial credit comes from
          consistency and rubric checks, but the primary signal is exact match
          against ground truth.
        </p>
      </section>

      {/* Taxonomy tree */}
      <section className="mb-12">
        <div className="space-y-2">
          {layers.map((layer, index) => (
            <div key={layer.name} className="taxonomy-layer">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="font-mono text-xs text-[var(--color-accent)] font-semibold">
                  Layer {index + 1}
                </span>
                <h3 className="text-base">{layer.name}</h3>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                {layer.description}
              </p>
              {layer.values.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {layer.values.map((value) => (
                    <span key={value} className="badge">
                      {value}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <hr />

      {/* Scoring */}
      <section className="mb-12">
        <p className="eyebrow">Scoring</p>
        <h2 className="mb-6">Deterministic composite scoring</h2>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="card">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="stat-value text-2xl">70%</span>
              <span className="font-mono text-xs text-[var(--color-text-tertiary)]">weight</span>
            </div>
            <h3 className="text-sm mb-1">Exact Match</h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Each taxonomy field is compared against ground truth. All-or-nothing
              per field: the agent gets credit only for exact matches.
            </p>
          </div>
          <div className="card">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="stat-value text-2xl">20%</span>
              <span className="font-mono text-xs text-[var(--color-text-tertiary)]">weight</span>
            </div>
            <h3 className="text-sm mb-1">Consistency</h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Cross-field logical checks: does the owner match the issue type?
              Does the action match the contractual finding? Catches plausible
              but internally contradictory outputs.
            </p>
          </div>
          <div className="card">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="stat-value text-2xl">10%</span>
              <span className="font-mono text-xs text-[var(--color-text-tertiary)]">weight</span>
            </div>
            <h3 className="text-sm mb-1">Rubric</h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Structured rubric checks on the notes: are they bounded, factual,
              and non-hallucinated? Do they avoid overstepping into billing logic
              or legal interpretation?
            </p>
          </div>
        </div>
      </section>

      <hr />

      {/* Example walkthrough */}
      <section>
        <p className="eyebrow">Example</p>
        <h2 className="mb-6">How a case flows through the eval</h2>

        <div className="space-y-4">
          <div className="card">
            <p className="eyebrow">Messy Input</p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              A customer reports being overcharged. The CRM shows a recent tier
              upgrade, billing shows the old rate, usage telemetry shows
              consumption above the old tier limit, and the contract has a
              30-day pricing lock clause.
            </p>
          </div>
          <div className="flow-arrow text-center">&#8595;</div>
          <div className="card">
            <p className="eyebrow">What the Agent Should Notice</p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              The pricing config was updated in the CRM but not propagated to
              billing. The 30-day lock clause means the customer should have
              been billed at the old rate for the remaining lock period. The
              overcharge is real but partial, only the delta above the locked
              rate.
            </p>
          </div>
          <div className="flow-arrow text-center">&#8595;</div>
          <div className="card">
            <p className="eyebrow">Correct Output</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="badge">
                <span className="badge-key">issue_type:</span>
                <span className="badge-value">pricing_config_mismatch</span>
              </span>
              <span className="badge">
                <span className="badge-key">impact:</span>
                <span className="badge-value">overbilled</span>
              </span>
              <span className="badge">
                <span className="badge-key">contractual:</span>
                <span className="badge-value">credit_warranted</span>
              </span>
              <span className="badge">
                <span className="badge-key">owner:</span>
                <span className="badge-value">shared_revops_finance</span>
              </span>
              <span className="badge">
                <span className="badge-key">action:</span>
                <span className="badge-value">issue_credit</span>
              </span>
            </div>
          </div>
          <div className="flow-arrow text-center">&#8595;</div>
          <div className="card">
            <p className="eyebrow">Scoring</p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              5/5 exact matches (70% weight) + all consistency checks pass (20%
              weight) + notes are bounded and factual (10% weight) = 100%
              composite.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
