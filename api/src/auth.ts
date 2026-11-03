import { randomBytes } from "node:crypto";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { db } from "./db/database.js";
import * as authSchema from "./db/auth-schema.js";

const production = process.env.NODE_ENV === "production";
const secret = process.env.BETTER_AUTH_SECRET ?? randomBytes(32).toString("base64url");
const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:4174";

if (production && !process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET must be set in production.");
}

export const auth = betterAuth({
  appName: "DeskPilot",
  baseURL,
  secret,
  trustedOrigins: [baseURL, "http://localhost:4173", "http://127.0.0.1:4173"],
  database: drizzleAdapter(db, { provider: "sqlite", schema: authSchema }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    requireEmailVerification: false,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    autoSignIn: false,
    customSyntheticUser: ({ coreFields, additionalFields, id }) => ({
      ...coreFields,
      role: "user",
      banned: false,
      banReason: null,
      banExpires: null,
      ...additionalFields,
      id,
    }),
  },
  plugins: [admin()],
  rateLimit: {
    enabled: true,
    window: 900,
    max: 40,
    customRules: {
      "/sign-in/email": { window: 900, max: 5 },
      "/sign-up/email": { window: 900, max: 5 },
    },
  },
  advanced: {
    useSecureCookies: production,
    database: { generateId: "uuid" },
  },
});
