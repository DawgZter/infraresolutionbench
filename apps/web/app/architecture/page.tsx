const flowSteps = [
  {
    label: "Event Sources",
    description:
      "CRM updates, billing events, usage telemetry, incident reports, customer emails, and policy documents.",
  },
  {
    label: "Case Assembly",
    description:
      "Evidence from multiple sources is assembled into a single structured case packet with all records and context.",
  },
  {
    label: "Agent Interface",
    description:
      "The model receives the case packet (or tool-calling interface) and must produce a structured JSON resolution.",
  },
  {
    label: "Deterministic Eval",
    description:
      "Exact match, consistency, and rubric checks score the output. No LLM judge, fully reproducible.",
  },
  {
    label: "Scoring & Ranking",
    description:
      "Composite scores (70%/20%/10% weighting) are computed and models are ranked on the hosted leaderboard.",
  },
];

export default function ArchitecturePage() {
  return (
    <>
      <section className="pt-4 pb-8">
        <p className="eyebrow">Architecture</p>
        <h2>Full-stack benchmark design</h2>
        <p>
          InfraResolution Bench sits at the intersection of commercial
          operations and AI evaluation. It tests whether models can do the
          actual job, not just answer questions about it.
        </p>
      </section>

      {/* Pipeline flow */}
      <section className="mb-12">
        <h3 className="mb-4">Pipeline</h3>
        <div className="space-y-2">
          {flowSteps.map((step, index) => (
            <div key={step.label}>
              <div className="flow-step">
                <span className="font-mono text-xs text-[var(--color-accent)] font-semibold w-6 flex-shrink-0">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    {step.label}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>
              {index < flowSteps.length - 1 && (
                <div className="flow-arrow">&#8595;</div>
              )}
            </div>
          ))}
        </div>
      </section>

      <hr />

      {/* Agent interface */}
      <section className="mb-12">
        <p className="eyebrow">Agent Interface</p>
        <h2 className="mb-6">What goes in, what comes out</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="text-sm mb-3">Input: Case Packet</h3>
            <div className="space-y-1.5 text-xs font-mono text-[var(--color-text-secondary)]">
              <p>case_id: string</p>
              <p>title: string</p>
              <p>crm_record: CRMRecord</p>
              <p>billing_record: BillingRecord</p>
              <p>usage_record: UsageRecord</p>
              <p>incident_record: IncidentRecord</p>
              <p>customer_note: string | CustomerNote</p>
              <p>policy_snippet: string | PolicySnippet</p>
            </div>
          </div>
          <div className="card">
            <h3 className="text-sm mb-3">Output: Resolution Packet</h3>
            <div className="space-y-1.5 text-xs font-mono text-[var(--color-text-secondary)]">
              <p>issue_type: IssueTypeEnum</p>
              <p>root_cause: string</p>
              <p>customer_impact: ImpactEnum</p>
              <p>contractual_applicability: ContractEnum</p>
              <p>owner: OwnerEnum</p>
              <p>next_action: ActionEnum</p>
              <p>confidence: number</p>
              <p>human_review_flag: boolean</p>
              <p>customer_facing_note: string</p>
              <p>internal_ops_note: string</p>
            </div>
          </div>
        </div>
      </section>

      <hr />

      {/* Prime Lab integration */}
      <section className="mb-12">
        <p className="eyebrow">Prime Lab Integration</p>
        <h2 className="mb-6">Hosted evaluation infrastructure</h2>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="card">
            <h3 className="text-sm mb-2">Verifiers Environment</h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Published as a Prime Lab environment with deterministic verifiers.
              The eval runs server-side with full sandboxing. Models interact
              through the standard environment API.
            </p>
          </div>
          <div className="card">
            <h3 className="text-sm mb-2">Hosted Evaluations</h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Prime orchestrates model sweeps across multiple providers. Each
              eval run produces per-sample scores that get imported into the
              leaderboard.
            </p>
          </div>
          <div className="card">
            <h3 className="text-sm mb-2">Tools Mode</h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Beyond full-packet prompting, models can use tool calls to query
              individual evidence records. This tests whether tool use improves
              or hurts resolution accuracy.
            </p>
          </div>
        </div>
      </section>

      <hr />

      {/* Two prompt modes */}
      <section>
        <p className="eyebrow">Prompt Modes</p>
        <h2 className="mb-6">Packet vs Tools</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="text-sm mb-2">Packet Mode</h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              The entire case packet is provided in the prompt as a single JSON
              document. The model must parse all evidence and produce a
              resolution in one shot. Simpler, but requires the model to handle
              long context well.
            </p>
          </div>
          <div className="card">
            <h3 className="text-sm mb-2">Tools Mode</h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              The model receives the case title and can call tools to fetch
              specific records (CRM, billing, usage, etc.). Tests whether
              agentic tool use helps the model focus on relevant evidence
              rather than being overwhelmed by the full packet.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
