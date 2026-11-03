import { ArrowRight, ArrowUpRight, Plus } from "lucide-react";
import { Link } from "react-router";
import { PageHeader } from "../components/PageHeader";
import { PriorityBadge, StatusBadge } from "../components/Badge";
import { ErrorState, LoadingState } from "../components/StatePanel";
import { formatDate } from "../components/TicketTable";
import { useApiResource } from "../lib/use-api-resource";
import type { DashboardData, ReportData, TicketRow, TicketStatus } from "../types";

const statusColor: Record<TicketStatus, string> = {
  Open: "var(--status-open)",
  "In Progress": "var(--status-progress)",
  Resolved: "var(--status-resolved)",
};

const statusOrder: TicketStatus[] = ["Open", "In Progress", "Resolved"];

function StatusDistribution({ data }: { data: ReportData }) {
  const total = data.total;
  const radius = 47;
  const circumference = 2 * Math.PI * radius;
  const arcs = statusOrder.reduce<
    Array<{ status: TicketStatus; count: number; length: number; offset: number }>
  >((result, status) => {
    const count = data.byStatus.find((item) => item.status === status)?.count ?? 0;
    const length = total ? (count / total) * circumference : 0;
    const offset = result.reduce((sum, arc) => sum + arc.length, 0);
    return [...result, { status, count, length, offset }];
  }, []);

  return (
    <section className="panel distribution-panel" aria-labelledby="distribution-title">
      <div className="panel-heading">
        <div>
          <h2 className="panel-title" id="distribution-title">
            Ticket status
          </h2>
          <p className="panel-caption">Current queue distribution</p>
        </div>
        <Link className="quiet-link" to="/reports">
          View report <ArrowRight size={14} />
        </Link>
      </div>
      <div className="distribution-content">
        <div className="donut-wrap">
          <svg
            aria-label={`Ticket status distribution: ${arcs.map((arc) => `${arc.status} ${arc.count}`).join(", ")}`}
            className="donut-chart"
            role="img"
            viewBox="0 0 112 112"
          >
            <circle className="donut-track" cx="56" cy="56" r={radius} />
            {arcs.map((arc) => (
              <circle
                cx="56"
                cy="56"
                key={arc.status}
                r={radius}
                stroke={statusColor[arc.status]}
                strokeDasharray={`${arc.length} ${circumference - arc.length}`}
                strokeDashoffset={-arc.offset}
                className="donut-segment"
              />
            ))}
          </svg>
          <div className="donut-center" aria-hidden="true">
            <strong>{total}</strong>
            <span>tickets</span>
          </div>
        </div>
        <ul className="distribution-legend">
          {arcs.map((arc) => (
            <li key={arc.status}>
              <span className="legend-label">
                <span
                  className="legend-swatch"
                  style={{ backgroundColor: statusColor[arc.status] }}
                  aria-hidden="true"
                />
                {arc.status}
              </span>
              <span className="legend-count">{arc.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function RecentTickets({ tickets }: { tickets: TicketRow[] }) {
  return (
    <section className="panel recent-panel" aria-labelledby="recent-title">
      <div className="panel-heading">
        <div>
          <h2 className="panel-title" id="recent-title">
            Recent tickets
          </h2>
          <p className="panel-caption">The latest requests across your workspace</p>
        </div>
        <Link className="quiet-link" to="/tickets">
          All tickets <ArrowRight size={14} />
        </Link>
      </div>
      <div className="recent-list">
        {tickets.map((ticket) => (
          <Link className="recent-row" key={ticket.id} to={`/tickets/${ticket.id}`}>
            <span className={`urgency-rail urgency-${ticket.priority.toLowerCase()}`} />
            <span className="recent-ticket-id">{ticket.ticketNumber}</span>
            <span className="recent-ticket-main">
              <span className="recent-ticket-subject">{ticket.subject}</span>
              <span className="recent-ticket-meta">
                {ticket.customer.name} <span aria-hidden="true">·</span>{" "}
                {formatDate(ticket.createdAt)}
              </span>
            </span>
            <span className="recent-ticket-priority">
              <PriorityBadge priority={ticket.priority} />
            </span>
            <StatusBadge status={ticket.status} />
            <ArrowUpRight className="recent-arrow" size={16} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}

export function DashboardPage() {
  const dashboard = useApiResource<DashboardData>("/api/dashboard");
  const report = useApiResource<ReportData>("/api/reports/overview");

  if (dashboard.loading || report.loading)
    return <LoadingState label="Loading your dashboard…" />;
  if (dashboard.error) {
    return <ErrorState message={dashboard.error} onRetry={dashboard.reload} />;
  }
  if (report.error) {
    return <ErrorState message={report.error} onRetry={report.reload} />;
  }
  if (!dashboard.data || !report.data) return null;

  const countCards = [
    {
      label: "Total tickets",
      value: dashboard.data.counts.total,
      accent: "stat-total",
    },
    { label: "Open", value: dashboard.data.counts.Open, accent: "stat-open" },
    {
      label: "In progress",
      value: dashboard.data.counts["In Progress"],
      accent: "stat-progress",
    },
    {
      label: "Resolved",
      value: dashboard.data.counts.Resolved,
      accent: "stat-resolved",
    },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={new Intl.DateTimeFormat("en", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })
          .format(new Date())
          .toUpperCase()}
        title={
          new Date().getHours() < 12
            ? "Good morning"
            : new Date().getHours() < 18
              ? "Good afternoon"
              : "Good evening"
        }
        description="Here’s what’s happening across your support queue."
        action={
          <Link className="primary-button" to="/tickets/new">
            <Plus size={17} aria-hidden="true" /> New ticket
          </Link>
        }
      />

      <section className="stat-grid" aria-label="Ticket summary">
        {countCards.map((card) => (
          <article className={`stat-card ${card.accent}`} key={card.label}>
            <div className="stat-card-top">
              <span className="stat-label">{card.label}</span>
              <span className="stat-mark" aria-hidden="true" />
            </div>
            <strong className="stat-value">{card.value.toLocaleString("en-US")}</strong>
            <span className="stat-footnote">Across your workspace</span>
          </article>
        ))}
      </section>

      <div className="dashboard-grid">
        <RecentTickets tickets={dashboard.data.recentTickets} />
        <StatusDistribution data={report.data} />
      </div>
    </div>
  );
}
