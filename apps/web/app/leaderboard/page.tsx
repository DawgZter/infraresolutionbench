import {
  loadPrimeHostedLeaderboardRows,
  loadLatestModelSweepSummary,
} from "../../data/dashboard";
import { LeaderboardView } from "../../components/leaderboard-view";

export default async function LeaderboardPage() {
  const [hostedRows, sweepSummary] = await Promise.all([
    loadPrimeHostedLeaderboardRows(),
    loadLatestModelSweepSummary(),
  ]);

  const ranked = hostedRows.filter((r) => r.overallScore !== null);
  const pending = sweepSummary?.pending_or_missing ?? [];

  return (
    <>
      <section className="pt-4 pb-8">
        <p className="eyebrow">Leaderboard</p>
        <h2>Model rankings on InfraResolution Bench</h2>
        <p>
          Composite scores use 60% gold + 40% synthetic weighting. Hosted on
          Prime Lab with deterministic scoring, no LLM judge.
        </p>
      </section>

      <LeaderboardView rows={hostedRows} />

      {/* Sweep status */}
      {pending.length > 0 && (
        <section className="mt-12">
          <p className="eyebrow">Sweep Status</p>
          <h3 className="mb-4">Pending and blocked runs</h3>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Status</th>
                  <th>Eval ID</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((row) => (
                  <tr key={`${row.model}-${row.evaluation_id ?? row.rank}`}>
                    <td className="text-[var(--color-text)]">{row.model}</td>
                    <td>
                      <span className={`status-chip ${statusClass(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td>{row.evaluation_id ?? "-"}</td>
                    <td className="notes-cell">{row.anomaly ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function statusClass(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("complete") || s.includes("stable")) return "complete";
  if (s.includes("running") || s.includes("processing")) return "running";
  if (s.includes("failed") || s.includes("blocked") || s.includes("missing") || s.includes("unstable")) return "failed";
  if (s.includes("partial") || s.includes("incomplete")) return "partial";
  return "default";
}
