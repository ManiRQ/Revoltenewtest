import { ArrowLeft, Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { PageHeader } from "../components/PageHeader";
import { PriorityBadge, StatusBadge } from "../components/Badge";
import { ErrorState, LoadingState } from "../components/StatePanel";
import { formatDate } from "../components/TicketTable";
import { apiRequest, getErrorMessage } from "../lib/api";
import { useApiResource } from "../lib/use-api-resource";
import type {
  TicketDetail,
  TicketMessage,
  TicketMessagePage,
  TicketPriority,
  TicketStatus,
} from "../types";

const statuses: TicketStatus[] = ["Open", "In Progress", "Resolved"];
const priorities: TicketPriority[] = ["Low", "Medium", "High", "Urgent"];
const messagePageSize = 50;

export function TicketDetailPage() {
  const { ticketId = "" } = useParams();
  return <TicketDetailView key={ticketId} ticketId={ticketId} />;
}

function TicketDetailView({ ticketId }: { ticketId: string }) {
  const ticket = useApiResource<TicketDetail>(`/api/tickets/${ticketId}`);
  const [reply, setReply] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [savingReply, setSavingReply] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [olderMessages, setOlderMessages] = useState<TicketMessage[]>([]);
  const [messagePage, setMessagePage] = useState(1);
  const [olderHasMore, setOlderHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  async function updateField(field: "status" | "priority", value: string) {
    setSavingField(field);
    setActionError(null);
    try {
      await apiRequest<TicketDetail>(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: value }),
      });
      ticket.reload();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setSavingField(null);
    }
  }

  async function loadOlderMessages() {
    const nextPage = messagePage + 1;
    setLoadingOlder(true);
    setConversationError(null);
    try {
      const page = await apiRequest<TicketMessagePage>(
        `/api/tickets/${ticketId}/messages?page=${nextPage}&pageSize=${messagePageSize}`,
      );
      setOlderMessages((existing) => [...page.items, ...existing]);
      setMessagePage(page.page);
      setOlderHasMore(page.hasMore);
    } catch (error) {
      setConversationError(getErrorMessage(error));
    } finally {
      setLoadingOlder(false);
    }
  }

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = reply.trim();
    if (!body) {
      setReplyError("Write a reply before sending.");
      return;
    }

    setSavingReply(true);
    setReplyError(null);
    try {
      await apiRequest(`/api/tickets/${ticketId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setReply("");
      ticket.reload();
    } catch (error) {
      setReplyError(getErrorMessage(error));
    } finally {
      setSavingReply(false);
    }
  }

  if (ticket.loading) return <LoadingState label="Opening ticket…" />;
  if (ticket.error) {
    return <ErrorState message={ticket.error} onRetry={ticket.reload} />;
  }
  if (!ticket.data) return null;

  const item = ticket.data;
  const conversation = [...olderMessages, ...item.messages];
  const canLoadOlder = messagePage === 1 ? item.hasMoreMessages : olderHasMore;

  return (
    <div className="page-stack">
      <Link className="back-link" to="/tickets">
        <ArrowLeft size={16} /> Back to tickets
      </Link>
      <PageHeader
        eyebrow={`${item.ticketNumber} · CREATED ${formatDate(item.createdAt).toUpperCase()}`}
        title={item.subject}
        description={`${item.customer.name} · ${item.customer.company}`}
        action={<StatusBadge status={item.status} />}
      />

      {actionError && (
        <p className="form-error-banner" role="alert">
          {actionError}
        </p>
      )}

      <div className="ticket-detail-grid">
        <section
          className="panel conversation-panel"
          aria-labelledby="conversation-heading"
        >
          <div className="panel-heading conversation-heading">
            <div>
              <h2 className="panel-title" id="conversation-heading">
                Conversation
              </h2>
              <p className="panel-caption">Replies are visible to your support team.</p>
            </div>
            <span className="message-count">{item.messageCount} messages</span>
          </div>
          <div className="conversation-thread">
            {canLoadOlder && (
              <button
                className="load-older-button"
                disabled={loadingOlder}
                onClick={() => void loadOlderMessages()}
                type="button"
              >
                {loadingOlder ? "Loading earlier messages…" : "Load earlier messages"}
              </button>
            )}
            {conversationError && (
              <p className="form-error-banner" role="alert">
                {conversationError}
              </p>
            )}
            {conversation.map((message, index) => (
              <article
                className={`conversation-message message-${message.authorKind}`}
                key={message.id}
              >
                <span
                  className={`avatar ${message.authorKind === "customer" ? "avatar-customer" : "avatar-agent"}`}
                >
                  {message.authorName.slice(0, 1).toUpperCase()}
                </span>
                <div className="message-main">
                  <div className="message-meta">
                    <strong>{message.authorName}</strong>
                    <span>
                      {message.authorKind === "customer" ? "Customer" : "Support team"}
                    </span>
                    <time dateTime={message.createdAt}>
                      {formatDate(message.createdAt)}
                    </time>
                  </div>
                  <p className="message-body">{message.body}</p>
                  {index === 0 && messagePage === 1 && (
                    <span className="message-origin">Original request</span>
                  )}
                </div>
              </article>
            ))}
          </div>

          <form className="reply-form" onSubmit={sendReply}>
            <label className="field-label" htmlFor="ticket-reply">
              Add a reply
            </label>
            <textarea
              aria-describedby={replyError ? "reply-error" : "reply-note"}
              aria-invalid={Boolean(replyError)}
              className="form-control reply-textarea"
              id="ticket-reply"
              onChange={(event) => setReply(event.target.value)}
              placeholder="Write a clear update for your team…"
              rows={4}
              value={reply}
            />
            {replyError ? (
              <span className="field-error" id="reply-error">
                {replyError}
              </span>
            ) : (
              <span className="field-help" id="reply-note">
                Internal note · Only your team can see this reply.
              </span>
            )}
            <div className="reply-actions">
              <button className="primary-button" disabled={savingReply} type="submit">
                <Send size={15} aria-hidden="true" />
                {savingReply ? "Sending…" : "Add reply"}
              </button>
            </div>
          </form>
        </section>

        <aside className="ticket-side-column">
          <section
            className="panel property-panel"
            aria-labelledby="properties-heading"
          >
            <div className="panel-heading">
              <div>
                <h2 className="panel-title" id="properties-heading">
                  Properties
                </h2>
                <p className="panel-caption">Keep the ticket up to date</p>
              </div>
            </div>
            <div className="property-field">
              <label className="field-label" htmlFor="ticket-status">
                Status
              </label>
              <select
                className="form-control"
                disabled={savingField === "status"}
                id="ticket-status"
                onChange={(event) => void updateField("status", event.target.value)}
                value={item.status}
              >
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>
            <div className="property-field">
              <label className="field-label" htmlFor="ticket-priority">
                Priority
              </label>
              <select
                className="form-control"
                disabled={savingField === "priority"}
                id="ticket-priority"
                onChange={(event) => void updateField("priority", event.target.value)}
                value={item.priority}
              >
                {priorities.map((priority) => (
                  <option key={priority}>{priority}</option>
                ))}
              </select>
              <div className="mt-2">
                <PriorityBadge priority={item.priority} />
              </div>
            </div>
            <div className="property-field">
              <span className="field-label">Assigned agent</span>
              <div className="agent-cell property-agent">
                <span className="avatar avatar-tiny">
                  {item.assignedAgent?.name.slice(0, 1) ?? "?"}
                </span>
                <span>{item.assignedAgent?.name ?? "Unassigned"}</span>
              </div>
            </div>
            <div className="property-field property-field-last">
              <span className="field-label">Last updated</span>
              <span className="text-ink-muted text-sm">
                {formatDate(item.updatedAt)}
              </span>
            </div>
          </section>

          <section className="panel customer-panel" aria-labelledby="customer-heading">
            <div className="panel-heading">
              <div>
                <h2 className="panel-title" id="customer-heading">
                  Customer
                </h2>
                <p className="panel-caption">Requester details</p>
              </div>
            </div>
            <div className="customer-profile">
              <span className="avatar avatar-customer avatar-large">
                {item.customer.name.slice(0, 1)}
              </span>
              <div>
                <strong>{item.customer.name}</strong>
                <span>{item.customer.company}</span>
              </div>
            </div>
            <dl className="customer-facts">
              <div>
                <dt>Email</dt>
                <dd>{item.customer.email}</dd>
              </div>
              <div>
                <dt>Tickets</dt>
                <dd>{item.customer.ticketCount}</dd>
              </div>
              {item.customer.lastContactAt && (
                <div>
                  <dt>Last contact</dt>
                  <dd>{formatDate(item.customer.lastContactAt)}</dd>
                </div>
              )}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
