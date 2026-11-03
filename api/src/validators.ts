import { z } from "zod";

export const ticketStatuses = ["Open", "In Progress", "Resolved"] as const;
export const ticketPriorities = ["Low", "Medium", "High", "Urgent"] as const;

const boundedPage = z.coerce.number().int().min(1).max(10000).default(1);
const boundedPageSize = z.coerce.number().int().min(1).max(100).default(25);

export const ticketListQuerySchema = z.object({
  page: boundedPage,
  pageSize: boundedPageSize,
  q: z.string().trim().max(160).optional(),
  status: z.enum(ticketStatuses).optional(),
  priority: z.enum(ticketPriorities).optional(),
  customerId: z.string().trim().min(1).max(100).optional(),
  sort: z.enum(["created", "updated"]).default("created"),
});

export const directoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const messageListQuerySchema = z.object({
  page: boundedPage,
  pageSize: z.coerce.number().int().min(1).max(50).default(50),
});

export const customerSearchQuerySchema = directoryQuerySchema.extend({
  q: z.string().trim().max(120).optional(),
});

export const createTicketSchema = z.object({
  subject: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(8000),
  customerId: z.string().min(1).max(100),
  priority: z.enum(ticketPriorities),
  assignedAgentId: z.string().min(1).max(100),
});

export const updateTicketSchema = z
  .object({
    status: z.enum(ticketStatuses).optional(),
    priority: z.enum(ticketPriorities).optional(),
  })
  .refine((value) => value.status !== undefined || value.priority !== undefined, {
    message: "Provide a status or priority to update.",
  });

export const createMessageSchema = z.object({
  body: z.string().trim().min(1).max(8000),
});

export const setupSchema = z.object({
  workspaceName: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
});

export const provisionAgentSchema = z.object({
  temporaryPassword: z.string().min(12).max(128),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(12).max(128),
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "Choose a different password.",
  });

export const workspaceSettingsSchema = z.object({
  workspaceName: z.string().trim().min(2).max(80),
  timezone: z.enum([
    "America/Los_Angeles",
    "America/Denver",
    "America/Chicago",
    "America/New_York",
    "Europe/London",
    "Europe/Paris",
    "Asia/Singapore",
    "Australia/Sydney",
    "UTC",
  ]),
  defaultPriority: z.enum(ticketPriorities),
});
