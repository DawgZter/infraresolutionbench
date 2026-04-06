"use client";

import { Fragment, useState, useMemo } from "react";

type LeaderboardRow = {
  modelName: string;
  providerLabel: string;
  benchmarkLabel: string;
  promptMode: string;
  statusLabel: string;
  notes: string | null;
  goldStatus: string;
  syntheticStatus: string;
  overallScore: number | null;
  goldScore: number | null;
  syntheticScore: number | null;
  goldExactScore: number | null;
  syntheticExactScore: number | null;
  overallExactScore: number | null;
  goldSamples: number;
  syntheticSamples: number;
  totalSamples: number;
  jsonValid: number | null;
  goldEvalId: string | null;
  syntheticEvalId: string | null;
  costEstimate: number | null;
};

type SortKey = "score" | "gold" | "synthetic" | "model" | "cost";

function fmtPct(score: number | null): string {
  if (score === null) return "-";
  return (score * 100).toFixed(1) + "%";
}

function fmtCost(cost: number | null): string {
  if (cost === null) return "-";
  if (cost === 0) return "Free";
  if (cost < 0.01) return "<$0.01";
  return `$${cost.toFixed(2)}`;
}

function scoreClass(score: number | null): string {
  if (score === null) return "mid";
  if (score >= 0.82) return "strong";
  if (score >= 0.72) return "mid";
  return "low";
}

function statusClass(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("complete") || s.includes("stable")) return "complete";
  if (s.includes("running") || s.includes("processing")) return "running";
  if (s.includes("failed") || s.includes("blocked") || s.includes("missing") || s.includes("unstable")) return "failed";
  if (s.includes("partial") || s.includes("incomplete")) return "partial";
  return "default";
}

function shortModel(name: string): string {
  const parts = name.split("/");
  return parts[parts.length - 1] ?? name;
}

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: "#C96442",
  openai: "#8B8FA3",
  google: "#34A853",
  "z-ai": "#4285F4",
  "x-ai": "#7B68EE",
  qwen: "#FF6B35",
  moonshotai: "#FFB800",
  minimax: "#E91E8E",
  xiaomi: "#FF6900",
  deepseek: "#0066FF",
  nvidia: "#76B900",
  stepfun: "#00CED1",
  "arcee-ai": "#8B4513",
  "prime-intellect": "#5e54a4",
  primeintellect: "#5e54a4",
};

function getProviderColor(provider: string): string {
  return PROVIDER_COLORS[provider.toLowerCase()] ?? "#9295A5";
}

function isIntellectProvider(provider: string): boolean {
  const p = provider.toLowerCase();
  return p === "prime-intellect" || p === "primeintellect";
}

// Prime Intellect logo SVG paths (from logo-dark-font.svg, viewBox 0 0 203 161)
const PI_LOGO_PATH_1 =
  "m137.5 67.51q-0.28 0.01-0.75 0.01l-0.02-0.02c-0.89 0.2-1.99 0.13-3.12 0.05-3.35-0.22-6.92-0.45-5.73 6.4 0.26 1.5-1.57 1.88-2.78 1.94q-5.17 0.29-10.35 0.19c-0.66-0.01-1.32-0.56-1.93-1.05q-0.15-0.13-0.3-0.25c-0.11-0.09 0.29-1.23 0.5-1.24 3.37-0.2 4.59-2.48 5.8-4.76 0.62-1.14 1.23-2.29 2.11-3.16 8-7.93 16.16-15.7 25.5-22.09 0.91-0.62 2.02-1.19 2.78-0.11 0.58 0.84 0.04 1.31-0.52 1.79-0.25 0.22-0.49 0.43-0.65 0.68-0.57 0.9-1.57 1.55-2.56 2.21-1.95 1.29-3.89 2.56-2.45 5.58 1.25 2.61 0.13 3.07-1.58 3.78l-0.07 0.03q-1.11 0.46-2.24 0.87c-1.59 0.59-3.18 1.18-4.61 2.05-1.44 0.87-2.12 2.56 0.22 3.56 5.13 2.18 18.39-1.31 20.97-6.11 2.43-4.49 6.04-7.82 9.65-11.15 2.03-1.87 4.06-3.74 5.87-5.81 3.92-4.46 8.5-8.34 13.08-12.22 2.28-1.93 4.55-3.85 6.75-5.86 1.65-1.5 2.34-3.49 1.05-5.66-1.29-2.15-3.48-2.44-5.54-1.96-13.54 3.19-26.62 7.49-38.25 15.51-18.55 12.82-37.13 25.59-55.87 38.13-6.38 4.28-10.25 2.19-12.38-5.22-4.73-16.45-11.67-30.8-31.61-33.03-7.28-0.82-12.62 3.74-11.57 10.98 0.54 3.67 0.05 7.13-1.71 10.57q-0.59 1.14-1.18 2.29c-2.72 5.26-5.46 10.57-7.16 16.17q-0.22 0.7-0.48 1.47c-1.51 4.58-3.44 10.41 5.76 10.73 0.38 0.01 1.1 0.96 1.02 1.31-0.21 0.84-0.61 1.83-1.27 2.32-8.82 6.5-16.07 14.38-19.19 25.03-1.58 5.38-0.54 10.97 4.06 15.13 3.29 2.98 7.48 4.71 11.17 2.2 3.36-2.28 7.04-3.82 10.72-5.35 3.24-1.35 6.47-2.69 9.47-4.55 0.72-0.44 1.6-0.85 2.49-1.27 2.46-1.14 4.99-2.32 4.55-4.46-0.7-3.35-4.24-6.45-7.18-8.89-2.93-2.42-10.37-18.67-9.49-22.57 1.24-5.46 4.04-10.2 6.83-14.93 2.39-4.05 4.78-8.09 6.21-12.6 0.59-1.86 2.85-2.88 5.03-2.14 1.48 0.5 1.23 1.86 0.99 3.13q-0.01 0.05-0.02 0.1-1.32 7.3-2.61 14.61-0.65 3.65-1.31 7.3c-0.27 1.56 0.21 2.8 1.83 3.12 3.11 0.61 3.04 2.01 1.64 4.42-1.49 2.55-1.7 5.66-0.04 8.02 1.68 2.37 4.47 2.87 7.31 1.45 1.78-0.88 3.15-0.1 3.13 1.69-0.11 9.53 3.88 7.38 8.74 3.22 0.45-0.38 1.06-0.59 1.64-0.8q0.16-0.05 0.32-0.11 0.69-0.25 1.38-0.49c9.15-3.25 18.28-6.49 23.45-15.85 0.39-0.73 1.7-1.09 2.72-1.36q0.09-0.03 0.17-0.05c5.91-1.6 11.94-1.63 17.96-1.65 4.52-0.02 9.04-0.04 13.51-0.72 4.41-0.68 9.21-3.25 9.25-7.51 0.03-3.43-2.6-3.22-5.22-3-1.13 0.09-2.27 0.18-3.19-0.02-0.18-0.04-0.38-0.03-0.7-0.02z";
const PI_LOGO_PATH_2 =
  "m68.11 115.55c-1.1 7.27 1.68 13.5 13.05 13.42 9.71-0.4 20.69-6.27 31.43-13.79 7.08-4.96 13.21-10.2 17.19-17.94 2.92-5.68 1.41-10.25-2.99-14.24-1.94-1.76-3.8-1.95-5.97 0.17-7.72 7.56-17.33 11.68-27.2 15.83-2.51 1.06-5.37 1.58-8.26 2.11-7.68 1.42-15.51 2.86-17.25 14.44z";

function PiLogoMarker({
  cx,
  cy,
  size,
  opacity,
}: {
  cx: number;
  cy: number;
  size: number;
  opacity: number;
}) {
  // Original viewBox: 203x161, center at ~101.5, 80.5
  const scale = size / 80;
  return (
    <g
      transform={`translate(${cx}, ${cy}) scale(${scale}) translate(-101.5, -80.5)`}
      opacity={opacity}
      style={{ transition: "all 150ms ease" }}
    >
      <path d={PI_LOGO_PATH_1} fill="#5e54a4" />
      <path d={PI_LOGO_PATH_2} fill="#5e54a4" />
    </g>
  );
}

type ChartPoint = {
  model: string;
  provider: string;
  score: number;
  cost: number;
};

function ScoreCostChart({ data }: { data: ChartPoint[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [hoveredProvider, setHoveredProvider] = useState<string | null>(null);

  const W = 800;
  const H = 420;
  const m = { t: 40, r: 30, b: 55, l: 65 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;

  const costs = data.map((d) => d.cost);
  const scores = data.map((d) => d.score);

  const logMin = Math.log10(Math.max(Math.min(...costs) * 0.6, 0.05));
  const logMax = Math.log10(Math.max(...costs) * 1.5);
  const scoreMin = Math.floor(Math.min(...scores) * 20) / 20;
  const scoreMax = Math.ceil(Math.max(...scores) * 20) / 20;

  const xScale = (cost: number) =>
    m.l + ((Math.log10(Math.max(cost, 0.01)) - logMin) / (logMax - logMin)) * pw;
  const yScale = (score: number) =>
    m.t + ph - ((score - scoreMin) / (scoreMax - scoreMin)) * ph;

  const xTickCandidates = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
  const xTicks = xTickCandidates.filter(
    (v) => Math.log10(v) >= logMin && Math.log10(v) <= logMax
  );

  const yTicks: number[] = [];
  for (let s = scoreMin; s <= scoreMax + 0.001; s += 0.05) {
    yTicks.push(Math.round(s * 100) / 100);
  }

  const providers = [...new Set(data.map((d) => d.provider))].sort();

  return (
    <div className="card p-4">
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 px-2">
        {providers.map((p) => (
          <div
            key={p}
            className="flex items-center gap-1.5 cursor-pointer select-none"
            style={{
              opacity: hoveredProvider && hoveredProvider !== p ? 0.3 : 1,
              transition: "opacity 150ms ease",
            }}
            onMouseEnter={() => setHoveredProvider(p)}
            onMouseLeave={() => setHoveredProvider(null)}
          >
            {isIntellectProvider(p) ? (
              <svg
                width={12}
                height={10}
                viewBox="0 0 203 161"
                className="inline-block"
              >
                <path d={PI_LOGO_PATH_1} fill="#5e54a4" />
                <path d={PI_LOGO_PATH_2} fill="#5e54a4" />
              </svg>
            ) : (
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ background: getProviderColor(p) }}
              />
            )}
            <span className="font-mono text-[0.65rem] text-[var(--color-text-secondary)] capitalize">
              {p === "primeintellect" ? "Prime Intellect" : p}
            </span>
          </div>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ maxHeight: 420 }}
      >
        {/* Grid lines */}
        {yTicks.map((t) => (
          <line
            key={`yg-${t}`}
            x1={m.l}
            x2={W - m.r}
            y1={yScale(t)}
            y2={yScale(t)}
            stroke="var(--color-border)"
            strokeWidth={0.5}
          />
        ))}
        {xTicks.map((t) => (
          <line
            key={`xg-${t}`}
            x1={xScale(t)}
            x2={xScale(t)}
            y1={m.t}
            y2={H - m.b}
            stroke="var(--color-border)"
            strokeWidth={0.5}
          />
        ))}

        {/* Axes */}
        <line
          x1={m.l}
          x2={W - m.r}
          y1={H - m.b}
          y2={H - m.b}
          stroke="var(--color-border-strong)"
          strokeWidth={1}
        />
        <line
          x1={m.l}
          x2={m.l}
          y1={m.t}
          y2={H - m.b}
          stroke="var(--color-border-strong)"
          strokeWidth={1}
        />

        {/* X tick labels */}
        {xTicks.map((t) => (
          <text
            key={`xt-${t}`}
            x={xScale(t)}
            y={H - m.b + 18}
            textAnchor="middle"
            className="fill-[var(--color-text-tertiary)]"
            style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
          >
            ${t < 1 ? t.toFixed(1) : t}
          </text>
        ))}

        {/* Y tick labels */}
        {yTicks.map((t) => (
          <text
            key={`yt-${t}`}
            x={m.l - 8}
            y={yScale(t) + 3.5}
            textAnchor="end"
            className="fill-[var(--color-text-tertiary)]"
            style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
          >
            {(t * 100).toFixed(0)}%
          </text>
        ))}

        {/* Axis labels */}
        <text
          x={m.l + pw / 2}
          y={H - 6}
          textAnchor="middle"
          className="fill-[var(--color-text-secondary)]"
          style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
        >
          Cost to Run (USD, Log Scale)
        </text>
        <text
          x={14}
          y={m.t + ph / 2}
          textAnchor="middle"
          className="fill-[var(--color-text-secondary)]"
          style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
          transform={`rotate(-90, 14, ${m.t + ph / 2})`}
        >
          Score
        </text>

        {/* Data points + labels */}
        {data.map((d) => {
          const cx = xScale(d.cost);
          const cy = yScale(d.score);
          const isHovered = hovered === d.model;
          const isProviderHovered = hoveredProvider === d.provider;
          const anyHover = hovered !== null || hoveredProvider !== null;
          const isActive = isHovered || isProviderHovered;
          const color = getProviderColor(d.provider);
          const isPi = isIntellectProvider(d.provider);
          const markerOpacity = anyHover && !isActive ? 0.15 : 0.85;
          return (
            <g
              key={d.model}
              onMouseEnter={() => setHovered(d.model)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            >
              {isPi ? (
                <PiLogoMarker
                  cx={cx}
                  cy={cy}
                  size={isActive ? 10 : 7}
                  opacity={markerOpacity}
                />
              ) : (
                <circle
                  cx={cx}
                  cy={cy}
                  r={isActive ? 7 : 5}
                  fill={color}
                  opacity={markerOpacity}
                  style={{ transition: "all 150ms ease" }}
                />
              )}
              <text
                x={cx + (isPi ? 12 : 8)}
                y={cy + 3.5}
                className="fill-[var(--color-text-secondary)]"
                style={{
                  fontSize: isActive ? 11 : 9,
                  fontFamily: "var(--font-mono)",
                  fontWeight: isActive ? 600 : 400,
                  opacity: anyHover && !isActive ? 0.15 : 1,
                  transition: "all 150ms ease",
                }}
              >
                {d.model}
              </text>
              {isHovered && (
                <text
                  x={cx + (isPi ? 12 : 8)}
                  y={cy + 15}
                  className="fill-[var(--color-text-tertiary)]"
                  style={{
                    fontSize: 9,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {(d.score * 100).toFixed(1)}% · ${d.cost.toFixed(2)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function LeaderboardView({ rows }: { rows: LeaderboardRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [expandedModel, setExpandedModel] = useState<string | null>(null);

  const ranked = useMemo(() => {
    return rows.filter((r) => r.overallScore !== null);
  }, [rows]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    switch (sortKey) {
      case "score":
        copy.sort((a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1));
        break;
      case "gold":
        copy.sort((a, b) => (b.goldScore ?? -1) - (a.goldScore ?? -1));
        break;
      case "synthetic":
        copy.sort((a, b) => (b.syntheticScore ?? -1) - (a.syntheticScore ?? -1));
        break;
      case "model":
        copy.sort((a, b) => a.modelName.localeCompare(b.modelName));
        break;
      case "cost":
        copy.sort((a, b) => (a.costEstimate ?? Infinity) - (b.costEstimate ?? Infinity));
        break;
    }
    return copy;
  }, [rows, sortKey]);

  const maxScore = useMemo(() => {
    return Math.max(...ranked.map((r) => r.overallScore ?? 0), 0.001);
  }, [ranked]);

  const chartData = useMemo(() => {
    return ranked
      .filter((r) => r.costEstimate !== null && r.costEstimate > 0)
      .map((r) => {
        const rawProvider = (
          r.modelName.includes("/") ? (r.modelName.split("/")[0] ?? r.providerLabel) : r.providerLabel
        ).toLowerCase();
        // Normalize all Prime Intellect variants to a single key
        const provider = rawProvider === "primeintellect" ? "prime-intellect" : rawProvider;
        return {
          model: shortModel(r.modelName),
          provider,
          score: r.overallScore!,
          cost: r.costEstimate!,
        };
      });
  }, [ranked]);

  return (
    <>
      {/* Bar chart, top 10 */}
      <section className="mb-10">
        <h3 className="mb-4">Top models</h3>
        <div className="space-y-1">
          {ranked.slice(0, 10).map((row) => (
            <div key={row.modelName} className="bar-chart-row">
              <span className="bar-chart-label">{shortModel(row.modelName)}</span>
              <div className="bar-chart-track">
                <div
                  className="bar-chart-fill"
                  style={{
                    width: `${((row.overallScore ?? 0) / maxScore) * 100}%`,
                  }}
                />
              </div>
              <span className="bar-chart-score">
                {fmtPct(row.overallScore)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Score vs Cost scatter chart */}
      {chartData.length > 0 && (
        <section className="mb-10">
          <h3 className="mb-4">Score vs Cost to Run</h3>
          <ScoreCostChart data={chartData} />
        </section>
      )}

      <hr />

      {/* Full table */}
      <section>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h3>All models</h3>
          <div className="toggle-group flex-wrap">
            {(["score", "cost", "gold", "synthetic", "model"] as SortKey[]).map((key) => (
              <button
                key={key}
                className={`toggle-btn ${sortKey === key ? "active" : ""}`}
                onClick={() => setSortKey(key)}
              >
                {key === "score" ? "Overall" : key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Model</th>
                <th>Status</th>
                <th>Overall</th>
                <th>Cost to Run</th>
                <th>Gold</th>
                <th>Synthetic</th>
                <th>Samples</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, index) => {
                const isExpanded = expandedModel === row.modelName;
                const hasScore = row.overallScore !== null;
                return (
                  <Fragment key={row.modelName}>
                    <tr
                      className="cursor-pointer"
                      onClick={() =>
                        setExpandedModel(isExpanded ? null : row.modelName)
                      }
                    >
                      <td>
                        {hasScore ? index + 1 : "-"}
                      </td>
                      <td className="text-[var(--color-text)]">
                        {shortModel(row.modelName)}
                      </td>
                      <td>
                        <span className={`status-chip ${statusClass(row.statusLabel)}`}>
                          {row.statusLabel}
                        </span>
                      </td>
                      <td>
                        <span className={`score-pill ${scoreClass(row.overallScore)}`}>
                          {fmtPct(row.overallScore)}
                        </span>
                      </td>
                      <td className="font-mono text-xs text-[var(--color-text-secondary)]">
                        {hasScore ? fmtCost(row.costEstimate) : "-"}
                      </td>
                      <td>
                        <span className={`score-pill ${scoreClass(row.goldScore)}`}>
                          {fmtPct(row.goldScore)}
                        </span>
                      </td>
                      <td>
                        <span className={`score-pill ${scoreClass(row.syntheticScore)}`}>
                          {fmtPct(row.syntheticScore)}
                        </span>
                      </td>
                      <td>{row.totalSamples || "-"}</td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="!p-0">
                          <div className="bg-[var(--color-surface-raised)] px-6 py-4 border-t border-[var(--color-border)]">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                              <div>
                                <span className="text-[var(--color-text-tertiary)]">Provider</span>
                                <p className="text-[var(--color-text)] mt-0.5">{row.providerLabel}</p>
                              </div>
                              <div>
                                <span className="text-[var(--color-text-tertiary)]">Est. Cost</span>
                                <p className="text-[var(--color-text)] mt-0.5">
                                  {fmtCost(row.costEstimate)}
                                </p>
                              </div>
                              <div>
                                <span className="text-[var(--color-text-tertiary)]">JSON Valid</span>
                                <p className="text-[var(--color-text)] mt-0.5">
                                  {fmtPct(row.jsonValid)}
                                </p>
                              </div>
                              <div>
                                <span className="text-[var(--color-text-tertiary)]">Gold Exact</span>
                                <p className="text-[var(--color-text)] mt-0.5">
                                  {fmtPct(row.goldExactScore)}
                                </p>
                              </div>
                              <div>
                                <span className="text-[var(--color-text-tertiary)]">Synthetic Exact</span>
                                <p className="text-[var(--color-text)] mt-0.5">
                                  {fmtPct(row.syntheticExactScore)}
                                </p>
                              </div>
                              <div>
                                <span className="text-[var(--color-text-tertiary)]">Gold Eval</span>
                                <p className="text-[var(--color-text)] mt-0.5 break-all">
                                  {row.goldEvalId ? (
                                    <a
                                      href={`https://app.primeintellect.ai/dashboard/evaluations/${row.goldEvalId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-mono"
                                    >
                                      {row.goldEvalId}
                                    </a>
                                  ) : "-"}
                                </p>
                              </div>
                              <div>
                                <span className="text-[var(--color-text-tertiary)]">Synthetic Eval</span>
                                <p className="text-[var(--color-text)] mt-0.5 break-all">
                                  {row.syntheticEvalId ? (
                                    <a
                                      href={`https://app.primeintellect.ai/dashboard/evaluations/${row.syntheticEvalId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-mono"
                                    >
                                      {row.syntheticEvalId}
                                    </a>
                                  ) : "-"}
                                </p>
                              </div>
                              <div>
                                <span className="text-[var(--color-text-tertiary)]">Gold Status</span>
                                <p className="mt-0.5">
                                  <span className={`status-chip ${statusClass(row.goldStatus)}`}>
                                    {row.goldStatus}
                                  </span>
                                </p>
                              </div>
                              <div>
                                <span className="text-[var(--color-text-tertiary)]">Synthetic Status</span>
                                <p className="mt-0.5">
                                  <span className={`status-chip ${statusClass(row.syntheticStatus)}`}>
                                    {row.syntheticStatus}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
