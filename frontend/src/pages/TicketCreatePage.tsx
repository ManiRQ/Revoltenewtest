import { ArrowLeft, Send } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { z } from "zod";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/StatePanel";
import { apiRequest, getErrorMessage } from "../lib/api";
import { useApiResource } from "../lib/use-api-resource";
import type {
  AgentProfile,
  CustomerSummary,
  TicketDetail,
  TicketPriority,
  WorkspaceSettings,
} from "../types";

const ticketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(1, "Enter a subject.")
    .max(160, "Keep the subject under 160 characters."),
  description: z
    .string()
    .trim()
    .min(1, "Describe the customer’s issue.")
    .max(8000, "Keep the description under 8,000 characters."),
  customerId: z.string().min(1, "Choose a customer."),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]),
  assignedAgentId: z.string().min(1, "Assign this ticket to an agent."),
});

const priorities: TicketPriority[] = ["Low", "Medium", "High", "Urgent"];

export function TicketCreatePage() {
  const customers = useApiResource<CustomerSummary[]>("/api/customers?limit=100");
  const agents = useApiResource<AgentProfile[]>("/api/agents?limit=100");
  const settings = useApiResource<WorkspaceSettings>("/api/settings");
  const navigate = useNavigate();
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [priority, setPriority] = useState<TicketPriority | null>(null);
  const [assignedAgentId, setAssignedAgentId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const priorityValue = priority ?? settings.data?.defaultPriority ?? "Medium";

  useEffect(() => {
    if (Object.keys(errors).length > 0) errorSummaryRef.current?.focus();
  }, [errors]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    const result = ticketSchema.safeParse({
      subject,
      description,
      customerId,
      priority: priorityValue,
      assignedAgentId,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const ticket = await apiRequest<TicketDetail>("/api/tickets", {
        method: "POST",
        body: JSON.stringify(result.data),
      });
      navigate(`/tickets/${ticket.id}`, { replace: true });
    } catch (error) {
      setSubmitError(getErrorMessage(error));
      setSubmitting(false);
    }
  }

  if (customers.loading || agents.loading || settings.loading) {
    return <LoadingState label="Preparing ticket form…" />;
  }
  if (customers.error) {
    return <ErrorState message={customers.error} onRetry={customers.reload} />;
  }
  if (agents.error) {
    return <ErrorState message={agents.error} onRetry={agents.reload} />;
  }
  if (settings.error) {
    return <ErrorState message={settings.error} onRetry={settings.reload} />;
  }

  const customerOptions = customers.data ?? [];
  const agentOptions = agents.data ?? [];

  return (
    <div className="page-stack form-page">
      <Link className="back-link" to="/tickets">
        <ArrowLeft size={16} /> Back to tickets
      </Link>
      <PageHeader
        eyebrow="SUPPORT QUEUE"
        title="Create a ticket"
        description="Capture the issue and send it to the right teammate."
      />

      <form className="panel form-panel" onSubmit={submit} noValidate>
        {Object.keys(errors).length > 0 && (
          <div
            className="form-error-summary"
            id="ticket-error-summary"
            ref={errorSummaryRef}
            role="alert"
            tabIndex={-1}
          >
            <strong>There’s a problem with this ticket.</strong>
            <ul>
              {Object.entries(errors).map(([field, message]) => (
                <li key={field}>
                  <a href={`#${field}`}>{message}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {submitError && (
          <p className="form-error-banner" role="alert">
            {submitError}
          </p>
        )}

        <div className="form-grid">
          <div className="field-wrap field-span-2">
            <label className="field-label" htmlFor="subject">
              Subject <span>*</span>
            </label>
            <input
              aria-describedby={errors.subject ? "subject-error" : undefined}
              aria-invalid={Boolean(errors.subject)}
              autoComplete="off"
              className="form-control"
              id="subject"
              maxLength={160}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Briefly describe the issue"
              value={subject}
            />
            {errors.subject && (
              <span className="field-error" id="subject-error">
                {errors.subject}
              </span>
            )}
          </div>

          <div className="field-wrap field-span-2">
            <label className="field-label" htmlFor="description">
              Description <span>*</span>
            </label>
            <textarea
              aria-describedby={
                errors.description ? "description-error" : "description-help"
              }
              aria-invalid={Boolean(errors.description)}
              className="form-control form-textarea"
              id="description"
              maxLength={8000}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Share what happened, what the customer has tried, and any useful context."
              rows={6}
              value={description}
            />
            <span className="field-help" id="description-help">
              Visible to your support team in the ticket conversation.
            </span>
            {errors.description && (
              <span className="field-error" id="description-error">
                {errors.description}
              </span>
            )}
          </div>

          <div className="field-wrap">
            <label className="field-label" htmlFor="customerId">
              Customer <span>*</span>
            </label>
            <select
              aria-describedby={errors.customerId ? "customer-error" : undefined}
              aria-invalid={Boolean(errors.customerId)}
              className="form-control"
              id="customerId"
              onChange={(event) => setCustomerId(event.target.value)}
              value={customerId}
            >
              <option value="">Select a customer</option>
              {customerOptions.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} — {customer.company}
                </option>
              ))}
            </select>
            {errors.customerId && (
              <span className="field-error" id="customer-error">
                {errors.customerId}
              </span>
            )}
          </div>

          <div className="field-wrap">
            <label className="field-label" htmlFor="priority">
              Priority <span>*</span>
            </label>
            <select
              className="form-control"
              id="priority"
              onChange={(event) => setPriority(event.target.value as TicketPriority)}
              value={priorityValue}
            >
              {priorities.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="field-wrap field-span-2">
            <label className="field-label" htmlFor="assignedAgentId">
              Assigned agent <span>*</span>
            </label>
            <select
              aria-describedby={
                errors.assignedAgentId ? "assigned-agent-error" : undefined
              }
              aria-invalid={Boolean(errors.assignedAgentId)}
              className="form-control"
              id="assignedAgentId"
              onChange={(event) => setAssignedAgentId(event.target.value)}
              value={assignedAgentId}
            >
              <option value="">Select an agent</option>
              {agentOptions.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} · {agent.title}
                </option>
              ))}
            </select>
            {errors.assignedAgentId && (
              <span className="field-error" id="assigned-agent-error">
                {errors.assignedAgentId}
              </span>
            )}
          </div>
        </div>

        <div className="form-footer">
          <span className="required-note">
            <span>*</span> Required fields
          </span>
          <div className="flex items-center gap-3">
            <Link className="secondary-button" to="/tickets">
              Cancel
            </Link>
            <button className="primary-button" disabled={submitting} type="submit">
              <Send size={16} aria-hidden="true" />
              {submitting ? "Creating…" : "Create ticket"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
