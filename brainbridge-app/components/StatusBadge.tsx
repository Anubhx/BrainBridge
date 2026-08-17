import type { ItemStatus } from "@/lib/db";

const LABELS: Record<ItemStatus, string> = {
  pending:          "PENDING",
  ready_to_process: "QUEUED",
  processing:       "PROCESSING",
  done:             "ENRICHED",
  error:            "ERROR",
};

interface StatusBadgeProps {
  status: ItemStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className="bb-mono"
      style={{
        fontSize: "0.72rem",
        fontWeight: 600,
        letterSpacing: "0.04em",
        display: "inline-flex",
        alignItems: "center",
        color:
          status === "done"
            ? "var(--teal)"
            : status === "error"
            ? "var(--red)"
            : status === "processing"
            ? "#F59E0B"
            : "var(--amber)",
      }}
      aria-label={`Status: ${LABELS[status]}`}
    >
      <span className={`bb-status-dot bb-status-dot--${status}`} />
      {LABELS[status]}
    </span>
  );
}
