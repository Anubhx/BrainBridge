import type { ItemStatus } from "@/lib/db";

const LABELS: Record<ItemStatus, string> = {
  pending:          "Pending",
  ready_to_process: "Queued",
  processing:       "Processing",
  done:             "Done",
  error:            "Error",
};

const DOTS: Record<ItemStatus, string> = {
  pending:          "○",
  ready_to_process: "◎",
  processing:       "◌",
  done:             "●",
  error:            "✕",
};

interface StatusBadgeProps {
  status: ItemStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`bb-badge bb-badge--${status}`} aria-label={`Status: ${LABELS[status]}`}>
      <span aria-hidden="true">{DOTS[status]}</span>
      {LABELS[status]}
    </span>
  );
}
