import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, before, test } from "node:test";

const testDatabasePath = resolve(
  process.cwd(),
  "data",
  `deskpilot-test-${randomUUID()}.db`,
);
process.env.DATABASE_URL = `file:${testDatabasePath}`;
process.env.BETTER_AUTH_URL = "http://localhost:4174";
process.env.BETTER_AUTH_SECRET = randomBytes(32).toString("base64url");

const [{ createServer }, { migrateDatabase }, { seedDatabase }, { sqlite }] =
  await Promise.all([
    import("../src/server.js"),
    import("../src/db/migrate.js"),
    import("../src/db/seed.js"),
    import("../src/db/database.js"),
  ]);

let server: Server | undefined;
let baseUrl = "";

async function request(
  path: string,
  options: { method?: string; body?: unknown; cookie?: string } = {},
) {
  const headers = new Headers({ Origin: "http://localhost:4173" });
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.cookie) headers.set("Cookie", options.cookie);
  return fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

async function responseData<T>(response: Response): Promise<T> {
  const result = (await response.json()) as { data: T };
  return result.data;
}

function sessionCookie(response: Response): string {
  const cookies = response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]);
  assert.ok(cookies.length > 0, "sign-in should return a session cookie");
  return cookies.join("; ");
}

before(async () => {
  migrateDatabase();
  seedDatabase();
  server = createServer().listen(0, "127.0.0.1");
  await new Promise<void>((resolveListen, reject) => {
    if (!server) {
      reject(new Error("Test server did not start."));
      return;
    }
    server.once("listening", resolveListen);
    server.once("error", reject);
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server?.listening) {
    await new Promise<void>((resolveClose, reject) => {
      server?.close((error) => (error ? reject(error) : resolveClose()));
    });
  }
  sqlite.close();
  rmSync(testDatabasePath, { force: true });
  rmSync(`${testDatabasePath}-wal`, { force: true });
  rmSync(`${testDatabasePath}-shm`, { force: true });
});

test("owner and agent workflows validate permissions and persist tickets", async () => {
  const ownerPassword = randomBytes(18).toString("base64url");
  const temporaryPassword = randomBytes(18).toString("base64url");
  const agentPassword = randomBytes(18).toString("base64url");

  const anonymousTickets = await request("/api/tickets");
  assert.equal(anonymousTickets.status, 401);

  const invalidSetup = await request("/api/setup", {
    method: "POST",
    body: { workspaceName: "x", name: "", email: "not-an-email", password: "short" },
  });
  assert.equal(invalidSetup.status, 400);

  const setup = await request("/api/setup", {
    method: "POST",
    body: {
      workspaceName: "DeskPilot Support",
      name: "Jordan Rivera",
      email: "jordan.rivera@deskpilot.example",
      password: ownerPassword,
    },
  });
  assert.equal(setup.status, 201);

  const repeatedSetup = await request("/api/setup", {
    method: "POST",
    body: {
      workspaceName: "Another workspace",
      name: "Another Owner",
      email: "another.owner@deskpilot.example",
      password: ownerPassword,
    },
  });
  assert.equal(repeatedSetup.status, 409);

  const publicSignUp = await request("/api/auth/sign-up/email", {
    method: "POST",
    body: {
      name: "Uninvited User",
      email: "open@deskpilot.example",
      password: ownerPassword,
    },
  });
  assert.equal(publicSignUp.status, 403);

  const wrongPassword = await request("/api/auth/sign-in/email", {
    method: "POST",
    body: { email: "jordan.rivera@deskpilot.example", password: "incorrect-password" },
  });
  assert.equal(wrongPassword.status, 401);

  const ownerLogin = await request("/api/auth/sign-in/email", {
    method: "POST",
    body: { email: "jordan.rivera@deskpilot.example", password: ownerPassword },
  });
  assert.equal(ownerLogin.status, 200);
  const ownerCookie = sessionCookie(ownerLogin);

  const currentOwner = await request("/api/me", { cookie: ownerCookie });
  assert.equal(currentOwner.status, 200);
  const ownerSession = await responseData<{
    user: { role: string };
    mustChangePassword: boolean;
  }>(currentOwner);
  assert.equal(ownerSession.user.role, "owner");
  assert.equal(ownerSession.mustChangePassword, false);

  const seededTickets = await request("/api/tickets?page=1&pageSize=20", {
    cookie: ownerCookie,
  });
  assert.equal(seededTickets.status, 200);
  const seededPage = await responseData<{ total: number }>(seededTickets);
  assert.equal(seededPage.total, 15);

  const invalidTicket = await request("/api/tickets", {
    method: "POST",
    cookie: ownerCookie,
    body: { subject: "Missing required data" },
  });
  assert.equal(invalidTicket.status, 400);

  const createdResponse = await request("/api/tickets", {
    method: "POST",
    cookie: ownerCookie,
    body: {
      subject: "New test ticket survives refresh",
      description: "The sample workspace should save this ticket in SQLite.",
      customerId: "customer-nora-patel",
      priority: "High",
      assignedAgentId: "agent-ava-chen",
    },
  });
  assert.equal(createdResponse.status, 201);
  const created = await responseData<{
    id: string;
    ticketNumber: string;
    messages: Array<{ body: string }>;
  }>(createdResponse);
  assert.equal(created.ticketNumber, "DP-1057");
  assert.equal(
    created.messages[0]?.body,
    "The sample workspace should save this ticket in SQLite.",
  );

  const updatedResponse = await request(`/api/tickets/${created.id}`, {
    method: "PATCH",
    cookie: ownerCookie,
    body: { status: "In Progress", priority: "Urgent" },
  });
  assert.equal(updatedResponse.status, 200);
  const updated = await responseData<{ status: string; priority: string }>(
    updatedResponse,
  );
  assert.equal(updated.status, "In Progress");
  assert.equal(updated.priority, "Urgent");

  const emptyReply = await request(`/api/tickets/${created.id}/messages`, {
    method: "POST",
    cookie: ownerCookie,
    body: { body: "   " },
  });
  assert.equal(emptyReply.status, 400);

  const reply = await request(`/api/tickets/${created.id}/messages`, {
    method: "POST",
    cookie: ownerCookie,
    body: { body: "I have checked the request and will follow up shortly." },
  });
  assert.equal(reply.status, 201);
  const ownerRecord = sqlite
    .prepare("SELECT id FROM user WHERE email = ?")
    .get("jordan.rivera@deskpilot.example") as { id: string } | undefined;
  const storedReply = sqlite
    .prepare(
      "SELECT author_auth_user_id FROM ticket_messages WHERE ticket_id = ? AND body = ?",
    )
    .get(created.id, "I have checked the request and will follow up shortly.") as
    { author_auth_user_id: string | null } | undefined;
  assert.ok(ownerRecord);
  assert.ok(storedReply);
  assert.equal(storedReply.author_auth_user_id, ownerRecord.id);

  const reloadedTicket = await request(`/api/tickets/${created.id}`, {
    cookie: ownerCookie,
  });
  assert.equal(reloadedTicket.status, 200);
  const persisted = await responseData<{
    messages: Array<{ body: string }>;
    messageCount: number;
    hasMoreMessages: boolean;
  }>(reloadedTicket);
  assert.equal(
    persisted.messages.at(-1)?.body,
    "I have checked the request and will follow up shortly.",
  );
  assert.equal(persisted.messageCount, 2);
  assert.equal(persisted.hasMoreMessages, false);

  const latestMessagePage = await request(
    `/api/tickets/${created.id}/messages?page=1&pageSize=1`,
    { cookie: ownerCookie },
  );
  assert.equal(latestMessagePage.status, 200);
  const latestPage = await responseData<{
    items: Array<{ body: string }>;
    total: number;
    hasMore: boolean;
  }>(latestMessagePage);
  assert.equal(latestPage.total, 2);
  assert.equal(latestPage.hasMore, true);
  assert.equal(
    latestPage.items[0]?.body,
    "I have checked the request and will follow up shortly.",
  );

  const earlierMessagePage = await request(
    `/api/tickets/${created.id}/messages?page=2&pageSize=1`,
    { cookie: ownerCookie },
  );
  assert.equal(earlierMessagePage.status, 200);
  const earlierPage = await responseData<{
    items: Array<{ body: string }>;
    hasMore: boolean;
  }>(earlierMessagePage);
  assert.equal(earlierPage.hasMore, false);
  assert.equal(
    earlierPage.items[0]?.body,
    "The sample workspace should save this ticket in SQLite.",
  );

  const ownerSettings = await request("/api/settings", {
    method: "PUT",
    cookie: ownerCookie,
    body: {
      workspaceName: "DeskPilot Customer Care",
      timezone: "America/Los_Angeles",
      defaultPriority: "High",
    },
  });
  assert.equal(ownerSettings.status, 200);

  const provision = await request("/api/agents/agent-ava-chen/provision", {
    method: "POST",
    cookie: ownerCookie,
    body: { temporaryPassword },
  });
  assert.equal(provision.status, 201);

  const duplicateProvision = await request("/api/agents/agent-ava-chen/provision", {
    method: "POST",
    cookie: ownerCookie,
    body: { temporaryPassword },
  });
  assert.equal(duplicateProvision.status, 409);

  const agentLogin = await request("/api/auth/sign-in/email", {
    method: "POST",
    body: { email: "ava.chen@deskpilot.example", password: temporaryPassword },
  });
  assert.equal(agentLogin.status, 200);
  const agentCookie = sessionCookie(agentLogin);

  const agentSessionResponse = await request("/api/me", { cookie: agentCookie });
  const agentSession = await responseData<{
    user: { role: string };
    mustChangePassword: boolean;
  }>(agentSessionResponse);
  assert.equal(agentSession.user.role, "agent");
  assert.equal(agentSession.mustChangePassword, true);

  const blockedQueue = await request("/api/dashboard", { cookie: agentCookie });
  assert.equal(blockedQueue.status, 403);

  const invalidPasswordChange = await request("/api/account/change-password", {
    method: "POST",
    cookie: agentCookie,
    body: { currentPassword: "wrong-current-password", newPassword: agentPassword },
  });
  assert.equal(invalidPasswordChange.status, 400);

  const passwordChange = await request("/api/account/change-password", {
    method: "POST",
    cookie: agentCookie,
    body: { currentPassword: temporaryPassword, newPassword: agentPassword },
  });
  assert.equal(passwordChange.status, 200);

  const activeAgentSessionResponse = await request("/api/me", { cookie: agentCookie });
  const activeAgentSession = await responseData<{ mustChangePassword: boolean }>(
    activeAgentSessionResponse,
  );
  assert.equal(activeAgentSession.mustChangePassword, false);

  const agentDashboard = await request("/api/dashboard", { cookie: agentCookie });
  assert.equal(agentDashboard.status, 200);

  const forbiddenSettings = await request("/api/settings", {
    method: "PUT",
    cookie: agentCookie,
    body: {
      workspaceName: "Unauthorized change",
      timezone: "UTC",
      defaultPriority: "Low",
    },
  });
  assert.equal(forbiddenSettings.status, 403);

  const forbiddenProvision = await request("/api/agents/agent-elliot-park/provision", {
    method: "POST",
    cookie: agentCookie,
    body: { temporaryPassword },
  });
  assert.equal(forbiddenProvision.status, 403);
});
