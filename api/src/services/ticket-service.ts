import { and, count, desc, eq, gte, max, sql } from "drizzle-orm";
import { HttpError } from "../http.js";
import { db } from "../db/database.js";
import {
  agents,
  customers,
  messages,
  tickets,
  workspaceSettings,
} from "../db/schema.js";
import type { TicketPriority, TicketStatus } from "../db/schema.js";

interface TicketListOptions {
  page: number;
  pageSize: number;
  q?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  customerId?: string;
  sort: "created" | "updated";
}

interface NewTicket {
  subject: string;
  description: string;
  customerId: string;
  priority: TicketPriority;
  assignedAgentId: string;
}

interface Actor {
  userId: string;
  name: string;
  agentId: string | null;
}

const statusOrder: TicketStatus[] = ["Open", "In Progress", "Resolved"];
const priorityOrder: TicketPriority[] = ["Urgent", "High", "Medium", "Low"];

function filtersFor(options: TicketListOptions) {
  const filters = [];
  if (options.status) filters.push(eq(tickets.status, options.status));
  if (options.priority) filters.push(eq(tickets.priority, options.priority));
  if (options.customerId) filters.push(eq(tickets.customerId, options.customerId));
  if (options.q) {
    const query = options.q;
    filters.push(sql`(
      instr(lower(${tickets.ticketNumber}), lower(${query})) > 0
      OR instr(lower(${tickets.subject}), lower(${query})) > 0
    )`);
  }
  return filters.length ? and(...filters) : undefined;
}

export function listTickets(options: TicketListOptions) {
  const where = filtersFor(options);
  const total =
    db.select({ value: count() }).from(tickets).where(where).get()?.value ?? 0;
  const orderColumn =
    options.sort === "updated" ? tickets.updatedAt : tickets.createdAt;
  const rows = db
    .select({
      ticket: tickets,
      customer: {
        id: customers.id,
        name: customers.name,
        email: customers.email,
        company: customers.company,
      },
      assignedAgent: {
        id: agents.id,
        name: agents.name,
      },
    })
    .from(tickets)
    .innerJoin(customers, eq(tickets.customerId, customers.id))
    .leftJoin(agents, eq(tickets.assignedAgentId, agents.id))
    .where(where)
    .orderBy(desc(orderColumn), desc(tickets.id))
    .limit(options.pageSize)
    .offset((options.page - 1) * options.pageSize)
    .all();

  return {
    items: rows.map(({ ticket, customer, assignedAgent }) => ({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      customer,
      priority: ticket.priority,
      status: ticket.status,
      assignedAgent: assignedAgent?.id ? assignedAgent : null,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    })),
    page: options.page,
    pageSize: options.pageSize,
    total,
  };
}

export function getTicketDetail(id: string) {
  const row = db
    .select({
      ticket: tickets,
      customer: customers,
      assignedAgent: {
        id: agents.id,
        name: agents.name,
        email: agents.email,
        title: agents.title,
      },
    })
    .from(tickets)
    .innerJoin(customers, eq(tickets.customerId, customers.id))
    .leftJoin(agents, eq(tickets.assignedAgentId, agents.id))
    .where(eq(tickets.id, id))
    .get();

  if (!row) return null;

  const customerStats = db
    .select({ ticketCount: count(), lastContactAt: max(tickets.updatedAt) })
    .from(tickets)
    .where(eq(tickets.customerId, row.customer.id))
    .get();
  const messageCount =
    db.select({ value: count() }).from(messages).where(eq(messages.ticketId, id)).get()
      ?.value ?? 0;
  const conversation = db
    .select({
      id: messages.id,
      authorName: messages.authorName,
      authorKind: messages.authorKind,
      body: messages.body,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.ticketId, id))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(50)
    .all()
    .reverse();

  return {
    id: row.ticket.id,
    ticketNumber: row.ticket.ticketNumber,
    subject: row.ticket.subject,
    description: row.ticket.description,
    customer: {
      id: row.customer.id,
      name: row.customer.name,
      email: row.customer.email,
      company: row.customer.company,
      ticketCount: customerStats?.ticketCount ?? 0,
      lastContactAt: customerStats?.lastContactAt ?? null,
    },
    priority: row.ticket.priority,
    status: row.ticket.status,
    assignedAgent: row.assignedAgent?.id ? row.assignedAgent : null,
    createdAt: row.ticket.createdAt,
    updatedAt: row.ticket.updatedAt,
    messages: conversation,
    messageCount,
    hasMoreMessages: messageCount > conversation.length,
  };
}

export function listTicketMessages(id: string, page: number, pageSize: number) {
  const ticket = db
    .select({ id: tickets.id })
    .from(tickets)
    .where(eq(tickets.id, id))
    .get();
  if (!ticket) return null;

  const total =
    db.select({ value: count() }).from(messages).where(eq(messages.ticketId, id)).get()
      ?.value ?? 0;
  const items = db
    .select({
      id: messages.id,
      authorName: messages.authorName,
      authorKind: messages.authorKind,
      body: messages.body,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.ticketId, id))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .all()
    .reverse();

  return {
    items,
    page,
    pageSize,
    total,
    hasMore: page * pageSize < total,
  };
}

export function createTicket(input: NewTicket, actor: Actor) {
  const customer = db
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .where(eq(customers.id, input.customerId))
    .get();
  if (!customer)
    throw new HttpError(400, "CUSTOMER_NOT_FOUND", "Choose an existing customer.");

  const agent = db
    .select({ id: agents.id, name: agents.name, isActive: agents.isActive })
    .from(agents)
    .where(eq(agents.id, input.assignedAgentId))
    .get();
  if (!agent || !agent.isActive) {
    throw new HttpError(400, "AGENT_NOT_AVAILABLE", "Choose an active support agent.");
  }

  const now = new Date();
  const id = crypto.randomUUID();
  db.transaction((transaction) => {
    const workspace = transaction
      .select({ nextTicketNumber: workspaceSettings.nextTicketNumber })
      .from(workspaceSettings)
      .where(eq(workspaceSettings.id, "workspace"))
      .get();
    if (!workspace)
      throw new HttpError(500, "WORKSPACE_NOT_READY", "Workspace setup is incomplete.");

    const number = workspace.nextTicketNumber;
    transaction
      .update(workspaceSettings)
      .set({ nextTicketNumber: number + 1, updatedAt: now })
      .where(eq(workspaceSettings.id, "workspace"))
      .run();
    transaction
      .insert(tickets)
      .values({
        id,
        ticketNumber: `DP-${number}`,
        subject: input.subject,
        description: input.description,
        customerId: input.customerId,
        priority: input.priority,
        status: "Open",
        assignedAgentId: input.assignedAgentId,
        createdByAuthUserId: actor.userId,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    transaction
      .insert(messages)
      .values({
        ticketId: id,
        authorKind: "customer",
        authorName: customer.name,
        authorCustomerId: customer.id,
        body: input.description,
        createdAt: now,
      })
      .run();
  });

  return getTicketDetail(id);
}

export function updateTicket(
  id: string,
  updates: { status?: TicketStatus; priority?: TicketPriority },
) {
  const result = db
    .update(tickets)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(tickets.id, id))
    .run();
  if (result.changes === 0) return null;
  return getTicketDetail(id);
}

export function addTicketMessage(id: string, body: string, actor: Actor) {
  const ticket = db
    .select({ id: tickets.id })
    .from(tickets)
    .where(eq(tickets.id, id))
    .get();
  if (!ticket) return null;
  const now = new Date();
  db.transaction((transaction) => {
    transaction
      .insert(messages)
      .values({
        ticketId: id,
        authorKind: "agent",
        authorName: actor.name,
        authorAgentId: actor.agentId,
        authorAuthUserId: actor.userId,
        body,
        createdAt: now,
      })
      .run();
    transaction.update(tickets).set({ updatedAt: now }).where(eq(tickets.id, id)).run();
  });
  return getTicketDetail(id);
}

function statusCounts() {
  const grouped = db
    .select({ status: tickets.status, value: count() })
    .from(tickets)
    .groupBy(tickets.status)
    .all();
  const values = new Map(grouped.map((row) => [row.status, row.value]));
  return {
    total: grouped.reduce((sum, row) => sum + row.value, 0),
    Open: values.get("Open") ?? 0,
    "In Progress": values.get("In Progress") ?? 0,
    Resolved: values.get("Resolved") ?? 0,
  };
}

function priorityCounts() {
  const grouped = db
    .select({ priority: tickets.priority, value: count() })
    .from(tickets)
    .groupBy(tickets.priority)
    .all();
  const values = new Map(grouped.map((row) => [row.priority, row.value]));
  return priorityOrder.map((priority) => ({
    priority,
    count: values.get(priority) ?? 0,
  }));
}

export function getDashboard() {
  return {
    counts: statusCounts(),
    recentTickets: listTickets({ page: 1, pageSize: 5, sort: "updated" }).items,
  };
}

export function getReportOverview() {
  const counts = statusCounts();
  const days: string[] = [];
  const today = new Date();
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate() - offset,
      ),
    );
    days.push(date.toISOString().slice(0, 10));
  }

  const since = new Date(`${days[0]}T00:00:00.000Z`);
  const daily = db
    .select({
      date: sql<string>`strftime('%Y-%m-%d', ${tickets.createdAt} / 1000, 'unixepoch')`,
      value: count(),
    })
    .from(tickets)
    .where(gte(tickets.createdAt, since))
    .groupBy(sql`strftime('%Y-%m-%d', ${tickets.createdAt} / 1000, 'unixepoch')`)
    .all();
  const dailyCounts = new Map(daily.map((row) => [row.date, row.value]));

  return {
    byStatus: statusOrder.map((status) => ({ status, count: counts[status] })),
    byPriority: priorityCounts(),
    createdByDay: days.map((date) => ({ date, count: dailyCounts.get(date) ?? 0 })),
    total: counts.total,
  };
}
