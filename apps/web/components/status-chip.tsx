type StatusChipProps = {
  value: string;
};

function getClass(value: string): string {
  const s = value.toLowerCase();
  if (s.includes("complete") || s.includes("stable")) return "complete";
  if (s.includes("running") || s.includes("processing")) return "running";
  if (s.includes("failed") || s.includes("blocked") || s.includes("missing") || s.includes("unstable")) return "failed";
  if (s.includes("partial") || s.includes("incomplete") || s.includes("stale")) return "partial";
  return "default";
}

export function StatusChip({ value }: StatusChipProps) {
  return <span className={`status-chip ${getClass(value)}`}>{value}</span>;
}
