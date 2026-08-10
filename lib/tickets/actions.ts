import { ticketCommentSchema, ticketSchema, ticketStatusUpdateSchema } from '@/lib/tickets/schema';
import { dispatchTicketNotification } from '@/lib/notifications/dispatcher';
import { listTicketsFromDb } from '@/lib/supabase/queries';
import { getTenantConfig } from '@/lib/tenants/config';
import { normalizePhone, safeNotificationText } from '@/lib/notifications/helpers';

export type TicketRecord = {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting' | 'on_hold' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
  requesterName: string;
  requesterEmail?: string;
  requesterPhone?: string;
  assigneeName?: string;
  assigneeChatId?: string;
  category?: string;
  createdAt: string;
  comments: Array<{ id: string; author: string; comment: string; createdAt: string }>;
};

const tickets = new Map<string, TicketRecord>();

export async function listTickets() {
  const dbResult = await listTicketsFromDb();
  if (!dbResult.error && dbResult.data.length > 0) {
    return dbResult.data as TicketRecord[];
  }

  return Array.from(tickets.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function getDefaultDueDate(priority: 'low' | 'medium' | 'high' | 'critical') {
  const now = new Date();
  const hours = {
    low: 72,
    medium: 24,
    high: 8,
    critical: 4,
  }[priority];

  now.setHours(now.getHours() + hours);
  return now.toISOString();
}

export async function createTicket(input: unknown) {
  const parsed = ticketSchema.parse(input);
  const tenant = getTenantConfig(parsed.tenantId) ?? getTenantConfig();
  const ticketId = `TCK-${Date.now()}`;

  const ticket: TicketRecord = {
    id: ticketId,
    tenantId: tenant?.id ?? parsed.tenantId,
    title: parsed.title,
    description: parsed.description ?? '',
    status: parsed.status,
    priority: parsed.priority,
    dueDate: parsed.dueDate ?? getDefaultDueDate(parsed.priority),
    requesterName: safeNotificationText(parsed.requesterName, 'Customer'),
    requesterEmail: parsed.requesterEmail,
    requesterPhone: normalizePhone(parsed.requesterPhone),
    assigneeName: parsed.assigneeName,
    assigneeChatId: parsed.assigneeChatId,
    category: parsed.category,
    createdAt: new Date().toISOString(),
    comments: [],
  };

  tickets.set(ticket.id, ticket);

  await dispatchTicketNotification({
    event: 'ticket.create',
    ticket: {
      id: ticket.id,
      title: ticket.title,
      status: ticket.status,
      requesterName: ticket.requesterName,
      requesterEmail: ticket.requesterEmail,
      requesterPhone: ticket.requesterPhone,
      assigneeName: ticket.assigneeName,
      assigneeChatId: ticket.assigneeChatId,
      tenantId: ticket.tenantId,
    },
  });

  return { data: ticket, error: null };
}

export async function updateTicketStatus(ticketId: string, input: unknown) {
  const parsed = ticketStatusUpdateSchema.parse(input);
  const ticket = tickets.get(ticketId);

  if (!ticket) {
    return { data: null, error: 'Ticket not found' };
  }

  const previousStatus = ticket.status;
  ticket.status = parsed.status;
  if (parsed.assigneeName) ticket.assigneeName = parsed.assigneeName;
  if (parsed.assigneeChatId) ticket.assigneeChatId = parsed.assigneeChatId;

  await dispatchTicketNotification({
    event: 'ticket.status_change',
    ticket: {
      id: ticket.id,
      title: ticket.title,
      status: ticket.status,
      requesterName: ticket.requesterName,
      requesterEmail: ticket.requesterEmail,
      requesterPhone: ticket.requesterPhone,
      assigneeName: ticket.assigneeName,
      assigneeChatId: ticket.assigneeChatId,
      tenantId: ticket.tenantId,
    },
    message: `Status berubah dari ${previousStatus} menjadi ${ticket.status}`,
  });

  return { data: ticket, error: null };
}

export async function addTicketComment(ticketId: string, input: unknown) {
  const parsed = ticketCommentSchema.parse(input);
  const ticket = tickets.get(ticketId);

  if (!ticket) {
    return { data: null, error: 'Ticket not found' };
  }

  const comment = {
    id: `CMT-${Date.now()}`,
    author: parsed.author,
    comment: parsed.comment,
    createdAt: new Date().toISOString(),
  };

  ticket.comments.push(comment);

  await dispatchTicketNotification({
    event: 'ticket.comment_add',
    ticket: {
      id: ticket.id,
      title: ticket.title,
      status: ticket.status,
      requesterName: ticket.requesterName,
      requesterEmail: ticket.requesterEmail,
      requesterPhone: ticket.requesterPhone,
      assigneeName: ticket.assigneeName,
      assigneeChatId: ticket.assigneeChatId,
      tenantId: ticket.tenantId,
    },
    message: parsed.comment,
  });

  return { data: comment, error: null };
}

export async function getTicketById(ticketId: string) {
  return tickets.get(ticketId) ?? null;
}
