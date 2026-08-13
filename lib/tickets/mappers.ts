import type { TicketPriority, TicketStatus } from '@/lib/tickets/schema';

export type TicketCommentRecord = {
  id: string;
  author: string;
  comment: string;
  createdAt: string;
};

export type TicketRecord = {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  dueDate?: string;
  requesterId?: string;
  requesterName: string;
  requesterEmail?: string;
  requesterPhone?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeChatId?: string;
  assetId?: string;
  category?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  comments: TicketCommentRecord[];
};

export function descriptionToText(description: unknown) {
  if (!description) return '';
  if (typeof description === 'string') return description;
  if (typeof description === 'object' && description !== null && 'text' in description) {
    return String((description as { text?: string }).text ?? '');
  }
  return '';
}

export function textToDescription(text?: string) {
  return { type: 'plain', text: text ?? '' };
}

type TicketRow = {
  id: string;
  tenant_id: string;
  title: string;
  description: unknown;
  status: TicketStatus;
  priority: TicketPriority;
  due_date?: string | null;
  requester_id?: string | null;
  requester_name?: string | null;
  requester_email?: string | null;
  requester_phone?: string | null;
  assignee_id?: string | null;
  assignee_name?: string | null;
  assignee_chat_id?: string | null;
  asset_id?: string | null;
  category?: string | null;
  created_at: string;
  updated_at?: string;
  created_by?: string | null;
  ticket_comments?: Array<{
    id: string;
    author_id?: string | null;
    message: string;
    created_at: string;
    created_by?: string | null;
  }>;
};

export function mapTicketRow(row: TicketRow): TicketRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    title: row.title,
    description: descriptionToText(row.description),
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date ?? undefined,
    requesterId: row.requester_id ?? undefined,
    requesterName: row.requester_name || 'Customer',
    requesterEmail: row.requester_email ?? undefined,
    requesterPhone: row.requester_phone ?? undefined,
    assigneeId: row.assignee_id ?? undefined,
    assigneeName: row.assignee_name ?? undefined,
    assigneeChatId: row.assignee_chat_id ?? undefined,
    assetId: row.asset_id ?? undefined,
    category: row.category ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by ?? undefined,
    comments: (row.ticket_comments ?? [])
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((comment) => ({
        id: comment.id,
        author: comment.created_by ? 'Agent' : comment.author_id || 'Agent',
        comment: comment.message,
        createdAt: comment.created_at,
      })),
  };
}

export function withCommentAuthors(
  ticket: TicketRecord,
  comments: Array<{ id: string; author_id?: string | null; message: string; created_at: string; author?: string }>,
): TicketRecord {
  return {
    ...ticket,
    comments: comments.map((comment) => ({
      id: comment.id,
      author: comment.author || 'Agent',
      comment: comment.message,
      createdAt: comment.created_at,
    })),
  };
}
