import Link from "next/link";

import type { EpisodeArtifactBundle } from "@infraresolutionbench/environment";

import {
  loadCaseExplorerData,
  type StoredArtifact,
} from "../../data/dashboard";

function hasEnvironmentMetadata(
  artifact: StoredArtifact,
): artifact is EpisodeArtifactBundle {
  return "environment" in artifact;
}

type CasesPageProps = {
  searchParams?: Promise<{
    caseId?: string | string[];
  }>;
};

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawCaseId = resolvedSearchParams.caseId;
  const selectedCaseId = Array.isArray(rawCaseId) ? rawCaseId[0] : rawCaseId;
  const { cases, selectedCase, artifactsForCase } =
    await loadCaseExplorerData(selectedCaseId);

  if (!selectedCase) {
    return (
      <section className="pt-4">
        <p className="eyebrow">Cases</p>
        <h2>No cases found</h2>
        <p>Run the data pipeline to generate gold cases.</p>
      </section>
    );
  }

  const packet = selectedCase.case_packet;
  const truth = selectedCase.ground_truth;
  const hidden = selectedCase.hidden_state;

  // Group cases by family for sidebar
  const goldCases = cases;

  return (
    <div className="flex gap-6 min-h-[calc(100vh-120px)]">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-[var(--color-border)] pr-4 overflow-y-auto">
        <p className="sidebar-group-label">Gold Cases</p>
        {goldCases.map((c) => {
          const isActive =
            c.case_packet.case_id === selectedCase.case_packet.case_id;
          return (
            <Link
              key={c.case_packet.case_id}
              href={`/cases?caseId=${c.case_packet.case_id}`}
              className={`sidebar-item block no-underline mb-0.5 ${isActive ? "active" : ""}`}
            >
              <span className="font-mono text-[0.7rem] text-[var(--color-text-tertiary)]">
                {c.case_packet.case_id}
              </span>
              <br />
              <span className="text-sm">{c.case_packet.title}</span>
            </Link>
          );
        })}
      </aside>

      {/* Main panel */}
      <div className="flex-1 min-w-0">
        {/* Case header */}
        <section className="pt-2 pb-6">
          <p className="eyebrow">Case Explorer</p>
          <h2>{packet.title}</h2>
          <p className="text-[var(--color-text-secondary)] text-sm mt-1 max-w-2xl">
            {hidden.scenario_summary}
          </p>
        </section>

        {/* Evidence cards */}
        <section className="mb-8">
          <h3 className="mb-4">Evidence Packet</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="case-record">
              <p className="case-record-label">CRM Record</p>
              <div className="case-record-value">
                <p><strong>Account:</strong> {packet.crm_record.account_name}</p>
                <p><strong>Tier:</strong> {packet.crm_record.account_tier}</p>
                <p><strong>Plan:</strong> {packet.crm_record.plan_name}</p>
                {packet.crm_record.billing_owner && (
                  <p><strong>Billing Owner:</strong> {packet.crm_record.billing_owner}</p>
                )}
                {packet.crm_record.sla_tier && (
                  <p><strong>SLA Tier:</strong> {packet.crm_record.sla_tier}</p>
                )}
                {packet.crm_record.notes.length > 0 && (
                  <p className="text-[var(--color-text-secondary)] text-xs mt-1">
                    {packet.crm_record.notes.join("; ")}
                  </p>
                )}
              </div>
            </div>

            <div className="case-record">
              <p className="case-record-label">Billing Record</p>
              <div className="case-record-value">
                <p><strong>Plan:</strong> {packet.billing_record.configured_plan_name}</p>
                <p><strong>Invoice Preview:</strong> ${packet.billing_record.invoice_preview_usd?.toLocaleString() ?? "-"}</p>
                {packet.billing_record.credits_applied_usd !== null && (
                  <p><strong>Credits Applied:</strong> ${packet.billing_record.credits_applied_usd.toLocaleString()}</p>
                )}
                {packet.billing_record.burst_usage_gpu_hours !== null && (
                  <p><strong>Burst GPU Hours:</strong> {packet.billing_record.burst_usage_gpu_hours.toLocaleString()}</p>
                )}
                {packet.billing_record.pricing_notes.length > 0 && (
                  <p className="text-[var(--color-text-secondary)] text-xs mt-1">
                    {packet.billing_record.pricing_notes.join("; ")}
                  </p>
                )}
              </div>
            </div>

            <div className="case-record">
              <p className="case-record-label">Usage & Telemetry</p>
              <div className="case-record-value">
                <p><strong>Window:</strong> {packet.usage_record.window_start} to {packet.usage_record.window_end}</p>
                {packet.usage_record.total_gpu_hours !== null && (
                  <p><strong>GPU Hours:</strong> {packet.usage_record.total_gpu_hours.toLocaleString()}</p>
                )}
                <p><strong>Meter Status:</strong> {packet.usage_record.meter_ingestion_status}</p>
                <p className="text-[var(--color-text-secondary)] text-xs mt-1">
                  {packet.usage_record.telemetry_summary}
                </p>
                {packet.usage_record.anomalies.length > 0 && (
                  <p className="text-[var(--color-danger)] text-xs mt-1">
                    Anomalies: {packet.usage_record.anomalies.join("; ")}
                  </p>
                )}
              </div>
            </div>

            {packet.incident_record && (
              <div className="case-record">
                <p className="case-record-label">Incident Record</p>
                <div className="case-record-value">
                  <p><strong>Status:</strong> {packet.incident_record.status}</p>
                  {packet.incident_record.service && (
                    <p><strong>Service:</strong> {packet.incident_record.service}</p>
                  )}
                  {packet.incident_record.duration_minutes !== null && (
                    <p><strong>Duration:</strong> {packet.incident_record.duration_minutes}m</p>
                  )}
                  <p><strong>Customer Visible:</strong> {packet.incident_record.customer_visible ? "Yes" : "No"}</p>
                  {packet.incident_record.customer_impact_summary && (
                    <p className="text-[var(--color-text-secondary)] text-xs mt-1">
                      {packet.incident_record.customer_impact_summary}
                    </p>
                  )}
                  <p className="text-[var(--color-text-secondary)] text-xs mt-1">
                    {packet.incident_record.engineering_summary}
                  </p>
                </div>
              </div>
            )}

            {packet.customer_note && (
              <div className="case-record md:col-span-2">
                <p className="case-record-label">Customer Note</p>
                <div className="case-record-value whitespace-pre-wrap text-sm">
                  {packet.customer_note}
                </div>
              </div>
            )}

            {packet.policy_snippet && (
              <div className="case-record md:col-span-2">
                <p className="case-record-label">Policy Snippet</p>
                <div className="case-record-value text-sm text-[var(--color-text-secondary)]">
                  {packet.policy_snippet}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Ground truth as badges */}
        <section className="mb-8">
          <h3 className="mb-4">Ground Truth</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(truth).map(([key, value]) => (
              <span key={key} className="badge">
                <span className="badge-key">{key}:</span>{" "}
                <span className="badge-value">
                  {typeof value === "object" ? JSON.stringify(value) : String(value)}
                </span>
              </span>
            ))}
          </div>
        </section>

        {/* Model outputs */}
        {artifactsForCase.length > 0 && (
          <section className="mb-8">
            <h3 className="mb-4">Model Outputs</h3>
            <div className="space-y-3">
              {artifactsForCase.map((artifact) => (
                <div
                  key={`${artifact.model_name}-${artifact.case_packet.case_id}`}
                  className="card"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[var(--color-text)] font-semibold text-sm">
                      {artifact.model_name}
                    </span>
                    <span className={`score-pill ${artifact.evaluation.overall.compositeScore >= 0.82 ? "strong" : artifact.evaluation.overall.compositeScore >= 0.72 ? "mid" : "low"}`}>
                      {(artifact.evaluation.overall.compositeScore * 100).toFixed(1)}%
                    </span>
                    {hasEnvironmentMetadata(artifact) && (
                      <span className="badge">
                        <span className="badge-key">mode:</span>{" "}
                        <span className="badge-value">{artifact.environment.prompt_mode}</span>
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs font-mono">
                    <div>
                      <span className="text-[var(--color-text-tertiary)]">Exact</span>
                      <p className="text-[var(--color-text)]">
                        {(artifact.evaluation.overall.exactAccuracy * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-tertiary)]">Consistency</span>
                      <p className="text-[var(--color-text)]">
                        {(artifact.evaluation.overall.consistencyPassRate * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-tertiary)]">Rubric</span>
                      <p className="text-[var(--color-text)]">
                        {(artifact.evaluation.overall.rubricPassRate * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  {/* Model output as key-value pairs, not raw JSON */}
                  <details className="mt-3">
                    <summary className="text-xs text-[var(--color-text-tertiary)] cursor-pointer hover:text-[var(--color-text-secondary)]">
                      View model output
                    </summary>
                    <pre className="mt-2 text-xs bg-[var(--color-surface-raised)] p-3 rounded-lg overflow-x-auto text-[var(--color-text-secondary)]">
                      {JSON.stringify(artifact.model_output, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
