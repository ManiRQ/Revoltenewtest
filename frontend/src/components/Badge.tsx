import type { TicketPriority, TicketStatus } from "../types";

export function StatusBadge({ status }: { status: TicketStatus }) {
  const tone: Record<TicketStatus, string> = {
    Open: "badge-open",
    "In Progress": "badge-progress",
    Resolved: "badge-resolved",
  };

  return <span className={`status-badge ${tone[status]}`}>{status}</span>;
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const tone: Record<TicketPriority, string> = {
    Low: "priority-low",
    Medium: "priority-medium",
    High: "priority-high",
    Urgent: "priority-urgent",
  };

  return (
    <span className={`priority-badge ${tone[priority]}`}>
      <span className="priority-dot" aria-hidden="true" />
      {priority}
    </span>
  );
}
