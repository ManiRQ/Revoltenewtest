import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema.js";
export { account, session, user, verification } from "./auth-schema.js";

export type TicketStatus = "Open" | "In Progress" | "Resolved";
export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";
export type MessageAuthorKind = "customer" | "agent";

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date());

export const agents = sqliteTable(
  "agents",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    title: text("title").notNull(),
    team: text("team").notNull(),
    authUserId: text("auth_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    mustChangePassword: integer("must_change_password", { mode: "boolean" })
      .notNull()
      .default(false),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("agents_auth_user_id_idx").on(table.authUserId),
    index("agents_name_idx").on(table.name),
  ],
);

export const customers = sqliteTable(
  "customers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    company: text("company").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("customers_name_idx").on(table.name)],
);

export const workspaceSettings = sqliteTable("workspace_settings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => "workspace"),
  workspaceName: text("workspace_name").notNull().default("DeskPilot Support"),
  timezone: text("timezone").notNull().default("UTC"),
  defaultPriority: text("default_priority")
    .$type<TicketPriority>()
    .notNull()
    .default("Medium"),
  ownerAuthUserId: text("owner_auth_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  nextTicketNumber: integer("next_ticket_number").notNull().default(1042),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const tickets = sqliteTable(
  "tickets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    ticketNumber: text("ticket_number").notNull().unique(),
    subject: text("subject").notNull(),
    description: text("description").notNull(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    priority: text("priority").$type<TicketPriority>().notNull(),
    status: text("status").$type<TicketStatus>().notNull().default("Open"),
    assignedAgentId: text("assigned_agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "restrict" }),
    createdByAuthUserId: text("created_by_auth_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("tickets_status_created_at_idx").on(table.status, table.createdAt),
    index("tickets_priority_created_at_idx").on(table.priority, table.createdAt),
    index("tickets_customer_id_idx").on(table.customerId),
    index("tickets_assigned_agent_id_idx").on(table.assignedAgentId),
    index("tickets_updated_at_idx").on(table.updatedAt),
  ],
);

export const messages = sqliteTable(
  "ticket_messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    ticketId: text("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    authorKind: text("author_kind").$type<MessageAuthorKind>().notNull(),
    authorName: text("author_name").notNull(),
    authorAgentId: text("author_agent_id").references(() => agents.id, {
      onDelete: "set null",
    }),
    authorAuthUserId: text("author_auth_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    authorCustomerId: text("author_customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("ticket_messages_ticket_created_idx").on(table.ticketId, table.createdAt),
    index("ticket_messages_author_agent_idx").on(table.authorAgentId),
    index("ticket_messages_author_auth_user_idx").on(table.authorAuthUserId),
  ],
);

export const agentRelations = relations(agents, ({ one, many }) => ({
  account: one(user, {
    fields: [agents.authUserId],
    references: [user.id],
  }),
  assignedTickets: many(tickets),
  messages: many(messages),
}));

export const customerRelations = relations(customers, ({ many }) => ({
  tickets: many(tickets),
  messages: many(messages),
}));

export const ticketRelations = relations(tickets, ({ one, many }) => ({
  customer: one(customers, {
    fields: [tickets.customerId],
    references: [customers.id],
  }),
  assignedAgent: one(agents, {
    fields: [tickets.assignedAgentId],
    references: [agents.id],
  }),
  creator: one(user, {
    fields: [tickets.createdByAuthUserId],
    references: [user.id],
  }),
  messages: many(messages),
}));

export const messageRelations = relations(messages, ({ one }) => ({
  ticket: one(tickets, {
    fields: [messages.ticketId],
    references: [tickets.id],
  }),
  agent: one(agents, {
    fields: [messages.authorAgentId],
    references: [agents.id],
  }),
  customer: one(customers, {
    fields: [messages.authorCustomerId],
    references: [customers.id],
  }),
}));
