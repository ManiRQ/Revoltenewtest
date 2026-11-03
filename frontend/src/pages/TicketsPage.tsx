import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { useMemo } from "react";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/StatePanel";
import { TicketTable } from "../components/TicketTable";
import { useApiResource } from "../lib/use-api-resource";
import type { TicketPage } from "../types";

const pageSize = 10;

export function TicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const status = searchParams.get("status") ?? "";
  const customerId = searchParams.get("customerId") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (query) params.set("q", query);
    if (priority) params.set("priority", priority);
    if (status) params.set("status", status);
    if (customerId) params.set("customerId", customerId);
    return `/api/tickets?${params.toString()}`;
  }, [customerId, page, priority, query, status]);
  const tickets = useApiResource<TicketPage>(endpoint);

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setSearchParams(next);
  }

  function setPage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    if (nextPage > 1) next.set("page", String(nextPage));
    else next.delete("page");
    setSearchParams(next);
  }

  const pageCount = tickets.data
    ? Math.max(1, Math.ceil(tickets.data.total / tickets.data.pageSize))
    : 1;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="SUPPORT QUEUE"
        title="Tickets"
        description="Find, prioritize and follow every customer request."
        action={
          <Link className="primary-button" to="/tickets/new">
            <Plus size={17} aria-hidden="true" /> Create ticket
          </Link>
        }
      />

      <section className="panel ticket-list-panel" aria-label="Ticket list">
        <div className="ticket-toolbar">
          <label className="list-search">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Search tickets by ID or subject</span>
            <input
              onChange={(event) => updateFilter("q", event.target.value)}
              placeholder="Search by subject or ID…"
              value={query}
            />
            {query && (
              <button
                aria-label="Clear search"
                className="inline-icon-button"
                onClick={() => updateFilter("q", "")}
                type="button"
              >
                <X size={15} />
              </button>
            )}
          </label>
          <div className="filters-row">
            <span className="filter-label">
              <SlidersHorizontal size={15} /> Filters
            </span>
            <label className="sr-only" htmlFor="priority-filter">
              Filter by priority
            </label>
            <select
              className="filter-select"
              id="priority-filter"
              onChange={(event) => updateFilter("priority", event.target.value)}
              value={priority}
            >
              <option value="">All priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <label className="sr-only" htmlFor="status-filter">
              Filter by status
            </label>
            <select
              className="filter-select"
              id="status-filter"
              onChange={(event) => updateFilter("status", event.target.value)}
              value={status}
            >
              <option value="">All statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
          {tickets.data && (
            <span className="ticket-result-count">
              {tickets.data.total} {tickets.data.total === 1 ? "ticket" : "tickets"}
            </span>
          )}
        </div>

        {tickets.loading ? (
          <LoadingState label="Loading tickets…" />
        ) : tickets.error ? (
          <ErrorState message={tickets.error} onRetry={tickets.reload} />
        ) : tickets.data?.items.length ? (
          <>
            <TicketTable tickets={tickets.data.items} />
            <div className="pagination-bar">
              <span className="pagination-summary">
                Showing {Math.min((page - 1) * pageSize + 1, tickets.data.total)}–
                {Math.min(page * pageSize, tickets.data.total)} of {tickets.data.total}
              </span>
              <div className="pagination-actions">
                <button
                  aria-label="Previous page"
                  className="pagination-button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  type="button"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="pagination-page">
                  {page} / {pageCount}
                </span>
                <button
                  aria-label="Next page"
                  className="pagination-button"
                  disabled={page >= pageCount}
                  onClick={() => setPage(page + 1)}
                  type="button"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            title="No matching tickets"
            message="Try another search or clear one of the filters."
          />
        )}
      </section>
    </div>
  );
}
