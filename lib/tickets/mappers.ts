import type { TicketPendingReason, TicketPriority, TicketStatus, TicketType } from '@/lib/tickets/schema';
import { isSupportTier, type SupportTier } from '@/lib/tickets/pending';

export type TicketCommentRecord = {
  id: string;
  author: string;
  comment: string;
  createdAt: string;
};

export type TicketRecord = {
  id: string;
  tenantId: string;
  accountId: string;
  accountName?: string;
  accountCode?: string;
  number: string;
  title: string;
  description: string;
  type: TicketType;
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
  groupId?: string;
  groupName?: string;
  groupKind?: string;
  groupTier?: SupportTier;
  groupPartyKind?: 'internal' | 'vendor' | 'principal';
  groupPartyName?: string;
  pendingReason?: TicketPendingReason;
  pendingNote?: string;
  slaAgreementId?: string;
  slaResponseMinutes?: number;
  slaResolveMinutes?: number;
  slaResponseAt?: string;
  slaResolveBy?: string;
  slaRespondedAt?: string;
  slaPausedAt?: string;
  olaResponseMinutes?: number;
  olaResolveMinutes?: number;
  olaResponseAt?: string;
  olaResolveBy?: string;
  olaStartedAt?: string;
  ucId?: string;
  ucName?: string;
  assetId?: string;
  assetName?: string;
  assetTag?: string;
  assetType?: string;
  category?: string;
  catalogItemId?: string;
  catalogAnswers?: Record<string, string>;
  changeType?: 'standard' | 'normal' | 'emergency';
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  plannedStart?: string;
  plannedEnd?: string;
  implementationPlan?: string;
  backoutPlan?: string;
  problemId?: string;
  problemNumber?: string;
  problemTitle?: string;
  problemWorkaround?: string;
  workaround?: string;
  knownError?: boolean;
  resolvedAt?: string;
  csatScore?: number;
  csatComment?: string;
  aiSummary?: string;
  aiSummaryAt?: string;
  relatedIncidents?: Array<{ id: string; number: string; title: string; status: TicketStatus }>;
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
  account_id?: string | null;
  number?: string | null;
  title: string;
  description: unknown;
  type?: TicketType | null;
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
  group_id?: string | null;
  pending_reason?: TicketPendingReason | null;
  pending_note?: string | null;
  sla_agreement_id?: string | null;
  sla_response_minutes?: number | null;
  sla_resolve_minutes?: number | null;
  sla_response_at?: string | null;
  sla_resolve_by?: string | null;
  sla_responded_at?: string | null;
  sla_paused_at?: string | null;
  ola_response_minutes?: number | null;
  ola_resolve_minutes?: number | null;
  ola_response_at?: string | null;
  ola_resolve_by?: string | null;
  ola_started_at?: string | null;
  uc_id?: string | null;
  asset_id?: string | null;
  category?: string | null;
  catalog_item_id?: string | null;
  catalog_answers?: Record<string, string> | null;
  change_type?: 'standard' | 'normal' | 'emergency' | null;
  risk_level?: 'low' | 'medium' | 'high' | 'critical' | null;
  planned_start?: string | null;
  planned_end?: string | null;
  implementation_plan?: string | null;
  backout_plan?: string | null;
  problem_id?: string | null;
  workaround?: string | null;
  known_error?: boolean | null;
  resolved_at?: string | null;
  ai_summary?: string | null;
  ai_summary_at?: string | null;
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
    accountId: row.account_id ?? '',
    number: row.number || `INC${row.id.replace(/-/g, '').slice(0, 7).toUpperCase()}`,
    title: row.title,
    description: descriptionToText(row.description),
    type: row.type ?? 'incident',
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
    groupId: row.group_id ?? undefined,
    pendingReason: row.pending_reason ?? undefined,
    pendingNote: row.pending_note ?? undefined,
    slaAgreementId: row.sla_agreement_id ?? undefined,
    slaResponseMinutes: row.sla_response_minutes ?? undefined,
    slaResolveMinutes: row.sla_resolve_minutes ?? undefined,
    slaResponseAt: row.sla_response_at ?? undefined,
    slaResolveBy: row.sla_resolve_by ?? undefined,
    slaRespondedAt: row.sla_responded_at ?? undefined,
    slaPausedAt: row.sla_paused_at ?? undefined,
    olaResponseMinutes: row.ola_response_minutes ?? undefined,
    olaResolveMinutes: row.ola_resolve_minutes ?? undefined,
    olaResponseAt: row.ola_response_at ?? undefined,
    olaResolveBy: row.ola_resolve_by ?? undefined,
    olaStartedAt: row.ola_started_at ?? undefined,
    ucId: row.uc_id ?? undefined,
    assetId: row.asset_id ?? undefined,
    assetName: undefined,
    assetTag: undefined,
    assetType: undefined,
    category: row.category ?? undefined,
    catalogItemId: row.catalog_item_id ?? undefined,
    catalogAnswers: row.catalog_answers ?? undefined,
    changeType: row.change_type ?? undefined,
    riskLevel: row.risk_level ?? undefined,
    plannedStart: row.planned_start ?? undefined,
    plannedEnd: row.planned_end ?? undefined,
    implementationPlan: row.implementation_plan ?? undefined,
    backoutPlan: row.backout_plan ?? undefined,
    problemId: row.problem_id ?? undefined,
    workaround: row.workaround ?? undefined,
    knownError: Boolean(row.known_error),
    resolvedAt: row.resolved_at ?? undefined,
    aiSummary: row.ai_summary ?? undefined,
    aiSummaryAt: row.ai_summary_at ?? undefined,
    relatedIncidents: [],
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

export function withAccounts(
  tickets: TicketRecord[],
  accounts: Array<{ id: string; name: string; code?: string }>,
): TicketRecord[] {
  const byId = new Map(accounts.map((account) => [account.id, account]));
  return tickets.map((ticket) => {
    const account = ticket.accountId ? byId.get(ticket.accountId) : undefined;
    if (!account) return ticket;
    return {
      ...ticket,
      accountName: account.name,
      accountCode: account.code,
    };
  });
}

export function withAssets(
  tickets: TicketRecord[],
  assets: Array<{ id: string; name: string; asset_tag?: string; type?: string }>,
) {
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  return tickets.map((ticket) => {
    const asset = ticket.assetId ? byId.get(ticket.assetId) : undefined;
    if (!asset) return ticket;
    return {
      ...ticket,
      assetName: asset.name,
      assetTag: asset.asset_tag,
      assetType: asset.type,
    };
  });
}

export function withGroups(
  tickets: TicketRecord[],
  groups: Array<{
    id: string;
    name: string;
    kind?: string;
    tier?: string | null;
    party_kind?: string | null;
    party_name?: string | null;
  }>,
): TicketRecord[] {
  const byId = new Map(groups.map((group) => [group.id, group]));
  return tickets.map((ticket) => {
    const group = ticket.groupId ? byId.get(ticket.groupId) : undefined;
    if (!group) return ticket;
    const partyKind =
      group.party_kind === 'vendor' || group.party_kind === 'principal' || group.party_kind === 'internal'
        ? group.party_kind
        : undefined;
    return {
      ...ticket,
      groupName: group.name,
      groupKind: group.kind,
      groupTier: isSupportTier(group.tier) ? group.tier : undefined,
      groupPartyKind: partyKind,
      groupPartyName: group.party_name ?? undefined,
    };
  });
}

export function withContracts(
  tickets: TicketRecord[],
  contracts: Array<{ id: string; name: string; contract_number?: string }>,
): TicketRecord[] {
  const byId = new Map(contracts.map((item) => [item.id, item]));
  return tickets.map((ticket) => {
    const contract = ticket.ucId ? byId.get(ticket.ucId) : undefined;
    if (!contract) return ticket;
    return { ...ticket, ucName: contract.name };
  });
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
