import { toNodeHandler } from "better-auth/node";
import express, { type Express } from "express";
import { rateLimit } from "express-rate-limit";
import { resolve } from "node:path";
import { auth } from "./auth.js";
import { sqlite } from "./db/database.js";
import { errorHandler, notFound, sendError, sendSuccess } from "./http.js";
import { apiRouter } from "./routes/api-router.js";
import { messageRouter } from "./routes/message-router.js";

const authHandler = toNodeHandler(auth);
const production = process.env.NODE_ENV === "production";
const frontendDist = resolve(process.cwd(), "../frontend/dist");
const setupRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: "Too many setup attempts. Please try again later.",
});

function securityHeaders(app: Express) {
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (production) {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'",
      );
    }
    next();
  });
}

export function createServer(): Express {
  const app = express();
  app.disable("x-powered-by");
  securityHeaders(app);

  app.all("/api/auth/*splat", (req, res) => {
    if (req.method === "POST" && req.path === "/api/auth/sign-up/email") {
      sendError(
        res,
        403,
        "SIGN_UP_DISABLED",
        "Ask your workspace owner to create an account.",
      );
      return;
    }
    if (req.path.startsWith("/api/auth/admin/")) {
      sendError(
        res,
        403,
        "ADMIN_API_DISABLED",
        "Use the DeskPilot agent-management screen for this action.",
      );
      return;
    }
    authHandler(req, res);
  });

  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    const result = sqlite.prepare("SELECT 1 AS ok").get() as { ok: number };
    sendSuccess(res, { status: result.ok === 1 ? "ok" : "unavailable" });
  });

  app.post("/api/setup", setupRateLimit, (_req, _res, next) => next());
  app.use("/api", apiRouter);
  app.use("/api", messageRouter);
  app.use("/api", notFound);

  if (production) {
    app.use(express.static(frontendDist, { index: false, maxAge: "1h" }));
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api")) {
        next();
        return;
      }
      res.sendFile(resolve(frontendDist, "index.html"), (error) => {
        if (error) next(error);
      });
    });
  }

  app.use(errorHandler);
  return app;
}
