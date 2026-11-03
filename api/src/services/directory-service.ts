import { and, asc, count, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db/database.js";
import { agents, customers, tickets } from "../db/schema.js";

export function listCustomers(limit: number, query?: string) {
  const conditions = query
    ? sql`(
        instr(lower(${customers.name}), lower(${query})) > 0
        OR instr(lower(${customers.email}), lower(${query})) > 0
        OR instr(lower(${customers.company}), lower(${query})) > 0
      )`
    : undefined;

  const rows = db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      company: customers.company,
      ticketCount: count(tickets.id),
      lastContactAt: sql<Date | null>`max(${tickets.updatedAt})`,
    })
    .from(customers)
    .leftJoin(tickets, eq(tickets.customerId, customers.id))
    .where(conditions)
    .groupBy(customers.id)
    .orderBy(asc(customers.name))
    .limit(limit)
    .all();

  return rows.map((row) => ({
    ...row,
    lastContactAt: row.lastContactAt?.toISOString() ?? null,
  }));
}

export function listAgents(limit: number) {
  const rows = db
    .select({
      id: agents.id,
      name: agents.name,
      email: agents.email,
      title: agents.title,
      team: agents.team,
      isActive: agents.isActive,
      authUserId: agents.authUserId,
      ticketCount: count(tickets.id),
      openCount: sql<number>`sum(case when ${tickets.status} <> 'Resolved' then 1 else 0 end)`,
    })
    .from(agents)
    .leftJoin(tickets, eq(tickets.assignedAgentId, agents.id))
    .groupBy(agents.id)
    .orderBy(asc(agents.name))
    .limit(limit)
    .all();

  return rows.map((agent) => ({
    id: agent.id,
    name: agent.name,
    email: agent.email,
    title: agent.title,
    team: agent.team,
    accountActive: Boolean(agent.authUserId),
    ticketCount: agent.ticketCount,
    openCount: agent.openCount ?? 0,
  }));
}

export function getAgentById(id: string) {
  return db.select().from(agents).where(eq(agents.id, id)).get() ?? null;
}

export function linkAgentAccount(id: string, authUserId: string) {
  return db
    .update(agents)
    .set({ authUserId, mustChangePassword: true, updatedAt: new Date() })
    .where(and(eq(agents.id, id), isNull(agents.authUserId)))
    .run();
}

export function completeAgentPasswordChange(authUserId: string) {
  return db
    .update(agents)
    .set({ mustChangePassword: false, updatedAt: new Date() })
    .where(eq(agents.authUserId, authUserId))
    .run();
}
