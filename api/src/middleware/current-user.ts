import { fromNodeHeaders } from "better-auth/node";
import type { RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { auth } from "../auth.js";
import { db } from "../db/database.js";
import { agents, workspaceSettings } from "../db/schema.js";
import { sendError } from "../http.js";

export interface CurrentUser {
  userId: string;
  name: string;
  email: string;
  role: "owner" | "agent";
  agentId: string | null;
  mustChangePassword: boolean;
}

declare module "express-serve-static-core" {
  interface Locals {
    currentUser?: CurrentUser;
  }
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session) {
      sendError(res, 401, "UNAUTHENTICATED", "Sign in to continue.");
      return;
    }

    const userRole = session.user.role;
    if (userRole === "admin") {
      const workspace = db
        .select({ ownerAuthUserId: workspaceSettings.ownerAuthUserId })
        .from(workspaceSettings)
        .where(eq(workspaceSettings.id, "workspace"))
        .get();
      if (workspace?.ownerAuthUserId !== session.user.id) {
        sendError(
          res,
          403,
          "OWNER_REQUIRED",
          "This account is not the workspace owner.",
        );
        return;
      }
      res.locals.currentUser = {
        userId: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: "owner",
        agentId: null,
        mustChangePassword: false,
      };
      next();
      return;
    }

    const agent = db
      .select({
        id: agents.id,
        name: agents.name,
        email: agents.email,
        authUserId: agents.authUserId,
        isActive: agents.isActive,
        mustChangePassword: agents.mustChangePassword,
      })
      .from(agents)
      .where(eq(agents.authUserId, session.user.id))
      .get();

    if (!agent || !agent.isActive || agent.authUserId !== session.user.id) {
      sendError(
        res,
        403,
        "AGENT_ACCESS_REQUIRED",
        "This account does not have active agent access.",
      );
      return;
    }

    res.locals.currentUser = {
      userId: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: "agent",
      agentId: agent.id,
      mustChangePassword: agent.mustChangePassword,
    };
    next();
  } catch (error) {
    next(error);
  }
};

export const requireOwner: RequestHandler = (_req, res, next) => {
  if (!res.locals.currentUser) {
    sendError(res, 401, "UNAUTHENTICATED", "Sign in to continue.");
    return;
  }
  if (res.locals.currentUser.role !== "owner") {
    sendError(res, 403, "OWNER_REQUIRED", "Only the workspace owner can do that.");
    return;
  }
  next();
};

export const requireCompletedPasswordChange: RequestHandler = (_req, res, next) => {
  if (res.locals.currentUser?.mustChangePassword) {
    sendError(
      res,
      403,
      "PASSWORD_CHANGE_REQUIRED",
      "Change your temporary password before continuing.",
    );
    return;
  }
  next();
};
