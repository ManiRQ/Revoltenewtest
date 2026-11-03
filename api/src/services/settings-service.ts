import { eq } from "drizzle-orm";
import { HttpError } from "../http.js";
import { db } from "../db/database.js";
import { workspaceSettings, type TicketPriority } from "../db/schema.js";

export function getWorkspaceSettings() {
  const settings = db
    .select({
      workspaceName: workspaceSettings.workspaceName,
      timezone: workspaceSettings.timezone,
      defaultPriority: workspaceSettings.defaultPriority,
    })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.id, "workspace"))
    .get();

  if (!settings)
    throw new HttpError(503, "WORKSPACE_NOT_READY", "Workspace setup is incomplete.");
  return settings;
}

export function saveWorkspaceSettings(input: {
  workspaceName: string;
  timezone: string;
  defaultPriority: TicketPriority;
}) {
  db.update(workspaceSettings)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(workspaceSettings.id, "workspace"))
    .run();
  return getWorkspaceSettings();
}
