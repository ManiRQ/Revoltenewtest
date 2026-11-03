import { Check, Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/StatePanel";
import { apiRequest, getErrorMessage } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useApiResource } from "../lib/use-api-resource";
import type { TicketPriority, WorkspaceSettings } from "../types";

const settingsSchema = z.object({
  workspaceName: z
    .string()
    .trim()
    .min(2, "Use at least 2 characters.")
    .max(80, "Use fewer than 80 characters."),
  timezone: z.string().min(1, "Choose a timezone."),
  defaultPriority: z.enum(["Low", "Medium", "High", "Urgent"]),
});

const priorities: TicketPriority[] = ["Low", "Medium", "High", "Urgent"];
const timezones = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Europe/Paris",
  "Asia/Singapore",
  "Australia/Sydney",
  "UTC",
];

export function SettingsPage() {
  const settings = useApiResource<WorkspaceSettings>("/api/settings");
  const { session } = useAuth();
  const isOwner = session?.user.role === "owner";
  const [draft, setDraft] = useState<Partial<WorkspaceSettings>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const workspaceName = draft.workspaceName ?? settings.data?.workspaceName ?? "";
  const timezone = draft.timezone ?? settings.data?.timezone ?? "UTC";
  const defaultPriority =
    draft.defaultPriority ?? settings.data?.defaultPriority ?? "Medium";

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    const result = settingsSchema.safeParse({
      workspaceName,
      timezone,
      defaultPriority,
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Check the settings and try again.");
      return;
    }

    setSaving(true);
    try {
      await apiRequest<WorkspaceSettings>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(result.data),
      });
      setDraft({});
      setSuccess(true);
      settings.reload();
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  if (settings.loading) return <LoadingState label="Loading workspace settings…" />;
  if (settings.error) {
    return <ErrorState message={settings.error} onRetry={settings.reload} />;
  }
  if (!settings.data) return null;

  return (
    <div className="page-stack settings-page">
      <PageHeader
        eyebrow="WORKSPACE PREFERENCES"
        title="Settings"
        description="Set the defaults your support team works with."
      />
      {!isOwner && (
        <p className="info-banner">
          Only the workspace owner can change these settings. You can still review them
          here.
        </p>
      )}
      <form className="panel settings-panel" onSubmit={save}>
        <div className="settings-section-heading">
          <div>
            <h2 className="panel-title">Workspace</h2>
            <p className="panel-caption">Basic details shared across the team.</p>
          </div>
        </div>
        <div className="settings-fields">
          <div className="field-wrap">
            <label className="field-label" htmlFor="workspaceName">
              Workspace name
            </label>
            <input
              className="form-control"
              disabled={!isOwner}
              id="workspaceName"
              maxLength={80}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  workspaceName: event.target.value,
                }))
              }
              value={workspaceName}
            />
          </div>
          <div className="field-wrap">
            <label className="field-label" htmlFor="timezone">
              Timezone
            </label>
            <select
              className="form-control"
              disabled={!isOwner}
              id="timezone"
              onChange={(event) =>
                setDraft((current) => ({ ...current, timezone: event.target.value }))
              }
              value={timezone}
            >
              {timezones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="settings-section-heading settings-section-spacing">
          <div>
            <h2 className="panel-title">Ticket defaults</h2>
            <p className="panel-caption">Used when a new ticket is created.</p>
          </div>
        </div>
        <div className="settings-fields">
          <div className="field-wrap">
            <label className="field-label" htmlFor="defaultPriority">
              Default priority
            </label>
            <select
              className="form-control"
              disabled={!isOwner}
              id="defaultPriority"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  defaultPriority: event.target.value as TicketPriority,
                }))
              }
              value={defaultPriority}
            >
              {priorities.map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </select>
          </div>
        </div>
        {error && (
          <p className="form-error-banner settings-message" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="success-banner settings-message" role="status">
            <Check size={16} />
            Settings saved successfully.
          </p>
        )}
        {isOwner && (
          <div className="settings-footer">
            <span className="field-help">Changes are saved to this workspace.</span>
            <button className="primary-button" disabled={saving} type="submit">
              <Save size={16} aria-hidden="true" />{" "}
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
