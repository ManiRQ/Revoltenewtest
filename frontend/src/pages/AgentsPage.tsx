import { Check, KeyRound, Search, ShieldCheck, UserPlus } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/StatePanel";
import { apiRequest, getErrorMessage } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useApiResource } from "../lib/use-api-resource";
import type { AgentProfile } from "../types";

const provisionSchema = z.object({
  temporaryPassword: z
    .string()
    .min(12, "Use at least 12 characters for the temporary password.")
    .max(128),
});

export function AgentsPage() {
  const agents = useApiResource<AgentProfile[]>("/api/agents?limit=100");
  const { session } = useAuth();
  const isOwner = session?.user.role === "owner";
  const [query, setQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return (agents.data ?? []).filter((agent) =>
      [agent.name, agent.email, agent.team].some((value) =>
        value.toLocaleLowerCase().includes(normalized),
      ),
    );
  }, [agents.data, query]);

  useEffect(() => {
    if (!selectedAgent) return;
    const dialog = dialogRef.current;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    passwordInputRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedAgent(null);
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])",
        ),
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [selectedAgent]);

  async function provision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAgent) return;
    const result = provisionSchema.safeParse({ temporaryPassword: password });
    if (!result.success) {
      setFormError(
        result.error.issues[0]?.message ?? "Enter a valid temporary password.",
      );
      return;
    }

    setSaving(true);
    setFormError(null);
    setNotice(null);
    try {
      await apiRequest(`/api/agents/${selectedAgent}/provision`, {
        method: "POST",
        body: JSON.stringify(result.data),
      });
      setPassword("");
      setSelectedAgent(null);
      setNotice(
        "Agent access is ready. Share the temporary password securely; it must be changed at first sign-in.",
      );
      agents.reload();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="TEAM DIRECTORY"
        title="Agents"
        description="See team ownership and manage access to the support workspace."
        action={
          <span className="directory-total">
            <UserPlus size={16} /> {agents.data?.length ?? "—"} agents
          </span>
        }
      />

      {notice && (
        <p className="success-banner" role="status">
          <Check size={17} />
          {notice}
        </p>
      )}
      <section className="panel directory-panel">
        <div className="directory-toolbar">
          <label className="list-search directory-search">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Search agents</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search agents…"
              value={query}
            />
          </label>
          {agents.data && (
            <span className="ticket-result-count">{filtered.length} teammates</span>
          )}
        </div>

        {agents.loading ? (
          <LoadingState label="Loading agents…" />
        ) : agents.error ? (
          <ErrorState message={agents.error} onRetry={agents.reload} />
        ) : filtered.length ? (
          <div className="table-scroll">
            <table className="data-table directory-table agent-table">
              <thead>
                <tr>
                  <th scope="col">Agent</th>
                  <th scope="col">Team</th>
                  <th scope="col">Open tickets</th>
                  <th scope="col">Access</th>
                  {isOwner && <th scope="col">Account</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((agent) => (
                  <tr key={agent.id}>
                    <td>
                      <span className="agent-cell">
                        <span className="avatar avatar-small">
                          {agent.name.slice(0, 1)}
                        </span>
                        <span>
                          <span className="text-ink block font-semibold">
                            {agent.name}
                          </span>
                          <span className="text-ink-muted mt-0.5 block text-xs">
                            {agent.email}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td>
                      <span className="text-ink block text-sm">{agent.team}</span>
                      <span className="text-ink-muted mt-0.5 block text-xs">
                        {agent.title}
                      </span>
                    </td>
                    <td>
                      <span className="ticket-count-pill">{agent.openCount}</span>
                    </td>
                    <td>
                      {agent.accountActive ? (
                        <span className="access-state access-active">
                          <ShieldCheck size={15} /> Active
                        </span>
                      ) : (
                        <span className="access-state access-pending">
                          <KeyRound size={14} /> Not set up
                        </span>
                      )}
                    </td>
                    {isOwner && (
                      <td>
                        {!agent.accountActive && (
                          <button
                            className="small-outline-button"
                            disabled={selectedAgent === agent.id}
                            onClick={() => {
                              setSelectedAgent(agent.id);
                              setFormError(null);
                              setNotice(null);
                            }}
                            type="button"
                          >
                            <UserPlus size={14} /> Set up access
                          </button>
                        )}
                        {agent.accountActive && (
                          <span className="text-ink-muted text-xs">Provisioned</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No agents found"
            message="Try searching another name or team."
          />
        )}
      </section>

      {selectedAgent && isOwner && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedAgent(null);
          }}
          role="presentation"
        >
          <section
            aria-describedby="provision-description"
            aria-labelledby="provision-title"
            aria-modal="true"
            className="modal-card"
            ref={dialogRef}
            role="dialog"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">AGENT ACCESS</p>
                <h2 id="provision-title">Set up sign-in</h2>
              </div>
              <button
                aria-label="Close dialog"
                className="icon-button"
                onClick={() => setSelectedAgent(null)}
                type="button"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <p className="modal-description" id="provision-description">
              Choose a temporary password. The agent will be asked to replace it when
              they sign in.
            </p>
            <form className="provision-form" onSubmit={provision}>
              <label className="field-label" htmlFor="temporaryPassword">
                Temporary password
              </label>
              <input
                autoComplete="new-password"
                className="form-control"
                id="temporaryPassword"
                minLength={12}
                onChange={(event) => setPassword(event.target.value)}
                ref={passwordInputRef}
                type="password"
                value={password}
              />
              <p className="field-help">
                Use at least 12 characters and share it with the agent securely.
              </p>
              {formError && (
                <span className="field-error" role="alert">
                  {formError}
                </span>
              )}
              <div className="form-footer modal-footer">
                <button
                  className="secondary-button"
                  onClick={() => setSelectedAgent(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button className="primary-button" disabled={saving} type="submit">
                  {saving ? "Setting up…" : "Create account"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
