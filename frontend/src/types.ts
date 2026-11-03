export type TicketStatus = "Open" | "In Progress" | "Resolved";
export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";
export type AgentRole = "owner" | "agent";

export interface ApiEnvelope<T> {
  success: true;
  data: T;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: AgentRole;
}

export interface AgentProfile {
  id: string;
  name: string;
  email: string;
  title: string;
  team: string;
  accountActive: boolean;
  ticketCount: number;
  openCount: number;
}

export interface CustomerSummary {
  id: string;
  name: string;
  email: string;
  company: string;
  ticketCount: number;
  lastContactAt: string | null;
}

export interface TicketRow {
  id: string;
  ticketNumber: string;
  subject: string;
  customer: Pick<CustomerSummary, "id" | "name" | "email" | "company">;
  priority: TicketPriority;
  status: TicketStatus;
  assignedAgent: Pick<AgentProfile, "id" | "name"> | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketMessage {
  id: string;
  authorName: string;
  authorKind: "customer" | "agent";
  body: string;
  createdAt: string;
}

export interface TicketMessagePage {
  items: TicketMessage[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface TicketDetail extends TicketRow {
  description: string;
  customer: CustomerSummary;
  assignedAgent: Pick<AgentProfile, "id" | "name" | "email" | "title"> | null;
  messages: TicketMessage[];
  messageCount: number;
  hasMoreMessages: boolean;
}

export interface TicketPage {
  items: TicketRow[];
  page: number;
  pageSize: number;
  total: number;
}

export interface DashboardData {
  counts: Record<TicketStatus, number> & { total: number };
  recentTickets: TicketRow[];
}

export interface ReportData {
  byStatus: Array<{ status: TicketStatus; count: number }>;
  byPriority: Array<{ priority: TicketPriority; count: number }>;
  createdByDay: Array<{ date: string; count: number }>;
  total: number;
}

export interface WorkspaceSettings {
  workspaceName: string;
  timezone: string;
  defaultPriority: TicketPriority;
}

export interface CurrentSession {
  user: SessionUser;
  agent: Pick<AgentProfile, "id" | "name" | "email" | "title"> | null;
  mustChangePassword: boolean;
}
