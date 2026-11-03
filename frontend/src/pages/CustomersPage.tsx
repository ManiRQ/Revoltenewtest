import { Search, Ticket } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/StatePanel";
import { useApiResource } from "../lib/use-api-resource";
import type { CustomerSummary } from "../types";

export function CustomersPage() {
  const customers = useApiResource<CustomerSummary[]>("/api/customers?limit=100");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return (customers.data ?? []).filter((customer) =>
      [customer.name, customer.email, customer.company].some((value) =>
        value.toLocaleLowerCase().includes(normalized),
      ),
    );
  }, [customers.data, query]);

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="CUSTOMER DIRECTORY"
        title="Customers"
        description="Customer context and recent support activity in one place."
      />
      <section className="panel directory-panel">
        <div className="directory-toolbar">
          <label className="list-search directory-search">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Search customers</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search customers or companies…"
              value={query}
            />
          </label>
          {customers.data && (
            <span className="ticket-result-count">{filtered.length} customers</span>
          )}
        </div>
        {customers.loading ? (
          <LoadingState label="Loading customers…" />
        ) : customers.error ? (
          <ErrorState message={customers.error} onRetry={customers.reload} />
        ) : filtered.length ? (
          <div className="table-scroll">
            <table className="data-table directory-table">
              <thead>
                <tr>
                  <th scope="col">Customer</th>
                  <th scope="col">Company</th>
                  <th scope="col">Email</th>
                  <th scope="col">Tickets</th>
                  <th scope="col">Last contact</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <span className="agent-cell">
                        <span className="avatar avatar-small avatar-customer">
                          {customer.name.slice(0, 1)}
                        </span>
                        <span className="text-ink font-semibold">{customer.name}</span>
                      </span>
                    </td>
                    <td className="text-ink-muted text-sm">{customer.company}</td>
                    <td>
                      <a className="email-link" href={`mailto:${customer.email}`}>
                        {customer.email}
                      </a>
                    </td>
                    <td>
                      <Link
                        className="count-link"
                        to={`/tickets?customerId=${customer.id}`}
                      >
                        <Ticket size={14} /> {customer.ticketCount}
                      </Link>
                    </td>
                    <td className="text-ink-muted text-sm">
                      {customer.lastContactAt
                        ? new Intl.DateTimeFormat("en", {
                            month: "short",
                            day: "numeric",
                          }).format(new Date(customer.lastContactAt))
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No customers found"
            message="Try another name, email or company."
          />
        )}
      </section>
    </div>
  );
}
