import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import { PriorityBadge, StatusBadge } from "./Badge";
import type { TicketRow } from "../types";

const dateFormat = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatDate(value: string): string {
  return dateFormat.format(new Date(value));
}

export function TicketTable({ tickets }: { tickets: TicketRow[] }) {
  return (
    <>
      <div className="table-scroll hidden md:block">
        <table className="data-table ticket-table">
          <thead>
            <tr>
              <th scope="col">Ticket</th>
              <th scope="col">Subject</th>
              <th scope="col">Customer</th>
              <th scope="col">Priority</th>
              <th scope="col">Status</th>
              <th scope="col">Assigned agent</th>
              <th scope="col">Created</th>
              <th className="sr-only" scope="col">
                Open ticket
              </th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td>
                  <Link className="ticket-number" to={`/tickets/${ticket.id}`}>
                    {ticket.ticketNumber}
                  </Link>
                </td>
                <td className="max-w-[21rem]">
                  <Link className="ticket-subject-link" to={`/tickets/${ticket.id}`}>
                    <span
                      className={`urgency-rail urgency-${ticket.priority.toLowerCase()}`}
                    />
                    <span className="truncate">{ticket.subject}</span>
                  </Link>
                </td>
                <td>
                  <span className="text-ink block font-medium">
                    {ticket.customer.name}
                  </span>
                  <span className="text-ink-muted mt-0.5 block text-xs">
                    {ticket.customer.company}
                  </span>
                </td>
                <td>
                  <PriorityBadge priority={ticket.priority} />
                </td>
                <td>
                  <StatusBadge status={ticket.status} />
                </td>
                <td>
                  {ticket.assignedAgent ? (
                    <span className="agent-cell">
                      <span className="avatar avatar-tiny">
                        {ticket.assignedAgent.name.slice(0, 1)}
                      </span>
                      {ticket.assignedAgent.name}
                    </span>
                  ) : (
                    <span className="text-ink-subtle text-sm">Unassigned</span>
                  )}
                </td>
                <td className="text-ink-muted text-sm">
                  {formatDate(ticket.createdAt)}
                </td>
                <td>
                  <Link
                    aria-label={`Open ${ticket.ticketNumber}: ${ticket.subject}`}
                    className="row-open-button"
                    to={`/tickets/${ticket.id}`}
                  >
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ticket-cards md:hidden">
        {tickets.map((ticket) => (
          <Link className="ticket-card" key={ticket.id} to={`/tickets/${ticket.id}`}>
            <div className="flex items-start justify-between gap-3">
              <span className="ticket-number">{ticket.ticketNumber}</span>
              <StatusBadge status={ticket.status} />
            </div>
            <p className="ticket-card-subject">{ticket.subject}</p>
            <div className="text-ink-muted flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              <span>{ticket.customer.name}</span>
              <span>{ticket.assignedAgent?.name ?? "Unassigned"}</span>
              <span>{formatDate(ticket.createdAt)}</span>
            </div>
            <div className="mt-3">
              <PriorityBadge priority={ticket.priority} />
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
