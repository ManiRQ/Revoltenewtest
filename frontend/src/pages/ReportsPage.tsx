import { ArrowDownRight, ArrowUpRight, BarChart3 } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { PriorityBadge, StatusBadge } from "../components/Badge";
import { ErrorState, LoadingState } from "../components/StatePanel";
import { useApiResource } from "../lib/use-api-resource";
import type { ReportData } from "../types";

export function ReportsPage() {
  const report = useApiResource<ReportData>("/api/reports/overview");

  if (report.loading) return <LoadingState label="Building your report…" />;
  if (report.error)
    return <ErrorState message={report.error} onRetry={report.reload} />;
  if (!report.data) return null;

  const data = report.data;
  const maxDaily = Math.max(1, ...data.createdByDay.map((entry) => entry.count));
  const maxPriority = Math.max(1, ...data.byPriority.map((entry) => entry.count));

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="WORKSPACE INSIGHTS"
        title="Reports"
        description="A clear view of ticket volume and where attention is going."
        action={
          <span className="report-period">
            <BarChart3 size={16} /> All tickets
          </span>
        }
      />

      <section className="report-summary-grid" aria-label="Report summary">
        <article className="panel report-summary-card">
          <span className="stat-label">Tickets in workspace</span>
          <strong className="report-summary-value">{data.total}</strong>
          <span className="report-summary-note">Across all statuses</span>
        </article>
        <article className="panel report-summary-card report-summary-highlight">
          <span className="stat-label">Needs attention</span>
          <strong className="report-summary-value">
            {data.byStatus
              .filter((entry) => entry.status !== "Resolved")
              .reduce((sum, entry) => sum + entry.count, 0)}
          </strong>
          <span className="report-summary-note">Open and in progress</span>
        </article>
        <article className="panel report-summary-card">
          <span className="stat-label">High priority</span>
          <strong className="report-summary-value">
            {data.byPriority
              .filter(
                (entry) => entry.priority === "High" || entry.priority === "Urgent",
              )
              .reduce((total, entry) => total + entry.count, 0)}
          </strong>
          <span className="report-summary-note">High or urgent tickets</span>
        </article>
      </section>

      <div className="reports-grid">
        <section className="panel report-panel" aria-labelledby="status-report-title">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title" id="status-report-title">
                Tickets by status
              </h2>
              <p className="panel-caption">Current distribution across your queue</p>
            </div>
            <span className="report-period-label">{data.total} total</span>
          </div>
          <div className="report-status-list">
            {data.byStatus.map((item) => (
              <div className="report-status-row" key={item.status}>
                <StatusBadge status={item.status} />
                <div className="report-bar-track">
                  <span
                    className={`report-bar report-bar-${item.status.toLowerCase().replace(" ", "-")}`}
                    style={{
                      width: `${data.total ? (item.count / data.total) * 100 : 0}%`,
                    }}
                  />
                </div>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
          <p className="chart-caption">Counts are based on saved ticket records.</p>
        </section>

        <section className="panel report-panel" aria-labelledby="priority-report-title">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title" id="priority-report-title">
                Priority breakdown
              </h2>
              <p className="panel-caption">Tickets by urgency level</p>
            </div>
          </div>
          <div className="priority-report-list">
            {data.byPriority.map((item) => (
              <div className="priority-report-row" key={item.priority}>
                <PriorityBadge priority={item.priority} />
                <div className="report-bar-track">
                  <span
                    className={`priority-report-bar priority-report-${item.priority.toLowerCase()}`}
                    style={{ width: `${(item.count / maxPriority) * 100}%` }}
                  />
                </div>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
          <p className="chart-caption">
            Sorted by priority, using direct labels and counts.
          </p>
        </section>
      </div>

      <section
        className="panel report-panel volume-panel"
        aria-labelledby="volume-title"
      >
        <div className="panel-heading">
          <div>
            <h2 className="panel-title" id="volume-title">
              New tickets
            </h2>
            <p className="panel-caption">Daily volume over the last seven days</p>
          </div>
          <span className="volume-total">
            <ArrowUpRight size={15} />{" "}
            {data.createdByDay.reduce((sum, day) => sum + day.count, 0)} created
          </span>
        </div>
        <div
          className="volume-chart"
          role="img"
          aria-label="Daily ticket creation counts for the last seven days"
        >
          {data.createdByDay.map((item) => (
            <div className="volume-day" key={item.date}>
              <div className="volume-bar-area">
                <span className="volume-count">{item.count}</span>
                <span
                  className="volume-bar"
                  style={{ height: `${Math.max(5, (item.count / maxDaily) * 100)}%` }}
                />
              </div>
              <span className="volume-day-label">
                {new Intl.DateTimeFormat("en", { weekday: "short" }).format(
                  new Date(`${item.date}T12:00:00`),
                )}
              </span>
            </div>
          ))}
        </div>
        <div className="volume-trend">
          <ArrowDownRight size={14} />
          <span>
            Volume is based on ticket creation dates, not replies or status changes.
          </span>
        </div>
      </section>
    </div>
  );
}
