import { fromNodeHeaders } from "better-auth/node";
import { Router, type RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { auth } from "../auth.js";
import { db } from "../db/database.js";
import { user, workspaceSettings } from "../db/schema.js";
import { sendError, sendSuccess } from "../http.js";
import {
  requireAuth,
  requireCompletedPasswordChange,
  requireOwner,
} from "../middleware/current-user.js";
import {
  completeAgentPasswordChange,
  getAgentById,
  linkAgentAccount,
  listAgents,
  listCustomers,
} from "../services/directory-service.js";
import {
  getWorkspaceSettings,
  saveWorkspaceSettings,
} from "../services/settings-service.js";
import {
  addTicketMessage,
  createTicket,
  getDashboard,
  getReportOverview,
  getTicketDetail,
  listTickets,
  updateTicket,
} from "../services/ticket-service.js";
import {
  changePasswordSchema,
  createMessageSchema,
  createTicketSchema,
  customerSearchQuerySchema,
  directoryQuerySchema,
  provisionAgentSchema,
  setupSchema,
  ticketListQuerySchema,
  updateTicketSchema,
  workspaceSettingsSchema,
} from "../validators.js";

const router = Router();
let ownerSetupInProgress = false;

router.get("/setup/status", (_req, res) => {
  const workspace = db
    .select({ ownerAuthUserId: workspaceSettings.ownerAuthUserId })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.id, "workspace"))
    .get();
  sendSuccess(res, { complete: Boolean(workspace?.ownerAuthUserId) });
});

router.post("/setup", async (req, res, next) => {
  if (ownerSetupInProgress) {
    sendError(res, 409, "SETUP_IN_PROGRESS", "Workspace setup is already in progress.");
    return;
  }

  const input = setupSchema.safeParse(req.body);
  if (!input.success) {
    sendError(
      res,
      400,
      "INVALID_INPUT",
      "Enter a valid workspace name, owner name, email and password.",
    );
    return;
  }

  ownerSetupInProgress = true;
  try {
    const workspace = db
      .select({ ownerAuthUserId: workspaceSettings.ownerAuthUserId })
      .from(workspaceSettings)
      .where(eq(workspaceSettings.id, "workspace"))
      .get();
    if (!workspace) {
      sendError(
        res,
        503,
        "WORKSPACE_NOT_READY",
        "Workspace data is still being prepared.",
      );
      return;
    }
    if (workspace.ownerAuthUserId) {
      sendError(
        res,
        409,
        "SETUP_ALREADY_COMPLETE",
        "Workspace setup has already been completed.",
      );
      return;
    }

    const created = await auth.api.signUpEmail({
      body: {
        name: input.data.name,
        email: input.data.email,
        password: input.data.password,
      },
    });

    db.transaction((transaction) => {
      transaction
        .update(user)
        .set({ role: "admin", updatedAt: new Date() })
        .where(eq(user.id, created.user.id))
        .run();
      transaction
        .update(workspaceSettings)
        .set({
          ownerAuthUserId: created.user.id,
          workspaceName: input.data.workspaceName,
          updatedAt: new Date(),
        })
        .where(eq(workspaceSettings.id, "workspace"))
        .run();
    });

    sendSuccess(res, { created: true }, 201);
  } catch (error) {
    next(error);
  } finally {
    ownerSetupInProgress = false;
  }
});

router.get("/me", async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session) {
      sendSuccess(res, null);
      return;
    }

    requireAuth(req, res, (error?: unknown) => {
      if (error) {
        next(error);
        return;
      }

      const current = res.locals.currentUser;
      if (!current) {
        sendSuccess(res, null);
        return;
      }
      const agent = current.agentId ? getAgentById(current.agentId) : null;
      sendSuccess(res, {
        user: {
          id: current.userId,
          name: current.name,
          email: current.email,
          role: current.role,
        },
        agent: agent
          ? {
              id: agent.id,
              name: agent.name,
              email: agent.email,
              title: agent.title,
            }
          : null,
        mustChangePassword: current.mustChangePassword,
      });
    });
  } catch (error) {
    next(error);
  }
});

router.post("/account/change-password", requireAuth, async (req, res) => {
  const input = changePasswordSchema.safeParse(req.body);
  if (!input.success) {
    sendError(
      res,
      400,
      "INVALID_INPUT",
      "Enter your current password and a new password of at least 12 characters.",
    );
    return;
  }

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: input.data.currentPassword,
        newPassword: input.data.newPassword,
      },
      headers: fromNodeHeaders(req.headers),
    });
    completeAgentPasswordChange(res.locals.currentUser?.userId ?? "");
    sendSuccess(res, { changed: true });
  } catch {
    sendError(
      res,
      400,
      "PASSWORD_REJECTED",
      "The current password could not be verified. Check it and try again.",
    );
  }
});

router.use(requireAuth, requireCompletedPasswordChange);

router.get("/dashboard", (_req, res) => {
  sendSuccess(res, getDashboard());
});

router.get("/reports/overview", (_req, res) => {
  sendSuccess(res, getReportOverview());
});

router.get("/tickets", (req, res) => {
  const query = ticketListQuerySchema.safeParse(req.query);
  if (!query.success) {
    sendError(res, 400, "INVALID_FILTER", "One or more ticket filters are not valid.");
    return;
  }
  sendSuccess(res, listTickets(query.data));
});

router.post("/tickets", (req, res) => {
  const input = createTicketSchema.safeParse(req.body);
  if (!input.success) {
    sendError(
      res,
      400,
      "INVALID_TICKET",
      "Complete every required ticket field with valid information.",
    );
    return;
  }
  const current = res.locals.currentUser;
  if (!current) {
    sendError(res, 401, "UNAUTHENTICATED", "Sign in to continue.");
    return;
  }
  const ticket = createTicket(input.data, {
    userId: current.userId,
    name: current.name,
    agentId: current.agentId,
  });
  if (!ticket) {
    sendError(
      res,
      500,
      "TICKET_CREATE_FAILED",
      "The ticket could not be loaded after saving.",
    );
    return;
  }
  sendSuccess(res, ticket, 201);
});

router.get("/tickets/:ticketId", (req, res) => {
  const ticket = getTicketDetail(req.params.ticketId);
  if (!ticket) {
    sendError(res, 404, "TICKET_NOT_FOUND", "This ticket could not be found.");
    return;
  }
  sendSuccess(res, ticket);
});

router.patch("/tickets/:ticketId", (req, res) => {
  const input = updateTicketSchema.safeParse(req.body);
  if (!input.success) {
    sendError(
      res,
      400,
      "INVALID_TICKET_UPDATE",
      "Choose a valid status or priority to update.",
    );
    return;
  }
  const ticket = updateTicket(req.params.ticketId, input.data);
  if (!ticket) {
    sendError(res, 404, "TICKET_NOT_FOUND", "This ticket could not be found.");
    return;
  }
  sendSuccess(res, ticket);
});

router.post("/tickets/:ticketId/messages", (req, res) => {
  const input = createMessageSchema.safeParse(req.body);
  if (!input.success) {
    sendError(res, 400, "INVALID_MESSAGE", "Write a reply before sending it.");
    return;
  }
  const current = res.locals.currentUser;
  if (!current) {
    sendError(res, 401, "UNAUTHENTICATED", "Sign in to continue.");
    return;
  }
  const ticket = addTicketMessage(req.params.ticketId, input.data.body, {
    userId: current.userId,
    name: current.name,
    agentId: current.agentId,
  });
  if (!ticket) {
    sendError(res, 404, "TICKET_NOT_FOUND", "This ticket could not be found.");
    return;
  }
  sendSuccess(res, ticket, 201);
});

router.get("/customers", (req, res) => {
  const query = customerSearchQuerySchema.safeParse(req.query);
  if (!query.success) {
    sendError(res, 400, "INVALID_FILTER", "Customer list options are not valid.");
    return;
  }
  sendSuccess(res, listCustomers(query.data.limit, query.data.q));
});

router.get("/agents", (req, res) => {
  const query = directoryQuerySchema.safeParse(req.query);
  if (!query.success) {
    sendError(res, 400, "INVALID_FILTER", "Agent list options are not valid.");
    return;
  }
  sendSuccess(res, listAgents(query.data.limit));
});

router.post("/agents/:agentId/provision", requireOwner, async (req, res, next) => {
  const input = provisionAgentSchema.safeParse(req.body);
  if (!input.success) {
    sendError(
      res,
      400,
      "INVALID_PASSWORD",
      "Use a temporary password between 12 and 128 characters.",
    );
    return;
  }

  const agent = getAgentById(String(req.params.agentId));
  if (!agent || !agent.isActive) {
    sendError(res, 404, "AGENT_NOT_FOUND", "This agent profile is not available.");
    return;
  }
  if (agent.authUserId) {
    sendError(
      res,
      409,
      "ACCOUNT_ALREADY_EXISTS",
      "This agent already has workspace access.",
    );
    return;
  }

  try {
    const created = await auth.api.createUser({
      body: {
        name: agent.name,
        email: agent.email,
        password: input.data.temporaryPassword,
        role: "user",
      },
      headers: fromNodeHeaders(req.headers),
    });
    const linked = linkAgentAccount(agent.id, created.user.id);
    if (linked.changes === 0) {
      await auth.api.removeUser({
        body: { userId: created.user.id },
        headers: fromNodeHeaders(req.headers),
      });
      sendError(
        res,
        409,
        "ACCOUNT_ALREADY_EXISTS",
        "This agent already has workspace access.",
      );
      return;
    }
    sendSuccess(res, { provisioned: true }, 201);
  } catch (error) {
    next(error);
  }
});

router.get("/settings", (_req, res) => {
  const settings = getWorkspaceSettings();
  sendSuccess(res, {
    workspaceName: settings.workspaceName,
    timezone: settings.timezone,
    defaultPriority: settings.defaultPriority,
  });
});

router.put("/settings", requireOwner, (req, res) => {
  const input = workspaceSettingsSchema.safeParse(req.body);
  if (!input.success) {
    sendError(
      res,
      400,
      "INVALID_SETTINGS",
      "Check the workspace settings and try again.",
    );
    return;
  }
  const saved = saveWorkspaceSettings(input.data);
  sendSuccess(res, {
    workspaceName: saved.workspaceName,
    timezone: saved.timezone,
    defaultPriority: saved.defaultPriority,
  });
});

export const apiRouter: RequestHandler = router;
