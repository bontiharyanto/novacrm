import { differenceInCalendarDays, eachDayOfInterval, endOfDay, format } from 'date-fns';
import { getSlaLevel } from '@/lib/tickets/sla';
import { getWarrantyLevel } from '@/lib/assets/depreciation';
import { ticketTypeMeta } from '@/lib/tickets/process';
import { priorityLabels, priorityOrder, statusLabels, statusOrder } from '@/lib/reports/labels';
import type { ReportPeriod } from '@/lib/reports/period';
import type { NamedCount, ReportSnapshot } from '@/lib/reports/schema';

type TicketRow = {
  id: string;
  number?: string | null;
  title: string;
  type?: string | null;
  status: string;
  priority: string;
  due_date?: string | null;
  sla_resolve_by?: string | null;
  sla_paused_at?: string | null;
  sla_resolve_minutes?: number | null;
  created_at: string;
  updated_at?: string | null;
  assignee_id?: string | null;
  assignee_name?: string | null;
  change_type?: string | null;
  sla_responded_at?: string | null;
  resolved_at?: string | null;
  group_id?: string | null;
};

type AssetRow = {
  warranty_expiry?: string | null;
};

function minutesBetween(from: string, to: string) {
  const delta = new Date(to).getTime() - new Date(from).getTime();
  if (!Number.isFinite(delta) || delta < 0) return null;
  return Math.round(delta / 60000);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function buildReportSnapshot(
  tickets: TicketRow[],
  assets: AssetRow[],
  catalogPublished: number,
  period: ReportPeriod,
  groupNames: Record<string, string> = {},
): ReportSnapshot {
  const now = new Date();
  const since = period.start;
  const until = endOfDay(period.end);
  const openStatuses = new Set(['open', 'in_progress', 'waiting', 'hold']);
  const inRange = tickets.filter((ticket) => {
    const created = new Date(ticket.created_at);
    return created >= since && created <= until;
  });

  const byTypeMap = new Map<string, number>();
  const byStatusMap = new Map<string, number>();
  const byPriorityMap = new Map<string, number>();
  const assigneeMap = new Map<string, number>();
  const trendMap = new Map<string, { opened: number; closed: number }>();
  for (const day of eachDayOfInterval({ start: period.start, end: period.end })) {
    trendMap.set(format(day, 'yyyy-MM-dd'), { opened: 0, closed: 0 });
  }

  let slaBreached = 0;
  let slaRisk = 0;
  let cabReview = 0;
  let emergencyChanges = 0;
  let open = 0;
  let unassigned = 0;
  let backlogAging = 0;
  const frtSamples: number[] = [];
  const mttrSamples: number[] = [];
  const groupMap = new Map<string, number>();

  for (const ticket of tickets) {
    if (openStatuses.has(ticket.status)) {
      open += 1;
      if (!ticket.assignee_id) unassigned += 1;
      if (differenceInCalendarDays(now, new Date(ticket.created_at)) >= 7) backlogAging += 1;
      if (ticket.group_id) {
        groupMap.set(ticket.group_id, (groupMap.get(ticket.group_id) ?? 0) + 1);
      }
    }
    const sla = getSlaLevel(ticket.sla_resolve_by ?? ticket.due_date, ticket.status, {
      slaResolveBy: ticket.sla_resolve_by ?? ticket.due_date,
      slaPausedAt: ticket.sla_paused_at,
      slaResolveMinutes: ticket.sla_resolve_minutes,
    });
    if (sla === 'breached') slaBreached += 1;
    if (sla === 'risk') slaRisk += 1;
    if (ticket.type === 'change' && ticket.status === 'waiting') cabReview += 1;
    if (ticket.type === 'change' && ticket.change_type === 'emergency' && ticket.status !== 'closed') {
      emergencyChanges += 1;
    }
  }

  for (const ticket of inRange) {
    const type = ticket.type || 'incident';
    byTypeMap.set(type, (byTypeMap.get(type) ?? 0) + 1);
    byStatusMap.set(ticket.status, (byStatusMap.get(ticket.status) ?? 0) + 1);
    byPriorityMap.set(ticket.priority, (byPriorityMap.get(ticket.priority) ?? 0) + 1);
    if (ticket.assignee_name) {
      assigneeMap.set(ticket.assignee_name, (assigneeMap.get(ticket.assignee_name) ?? 0) + 1);
    }
    if (ticket.sla_responded_at) {
      const frt = minutesBetween(ticket.created_at, ticket.sla_responded_at);
      if (frt != null) frtSamples.push(frt);
    }
    if ((ticket.status === 'resolved' || ticket.status === 'closed') && ticket.resolved_at) {
      const mttr = minutesBetween(ticket.created_at, ticket.resolved_at);
      if (mttr != null) mttrSamples.push(mttr);
    }
  }

  for (const ticket of tickets) {
    const openedKey = format(new Date(ticket.created_at), 'yyyy-MM-dd');
    const opened = trendMap.get(openedKey);
    if (opened) opened.opened += 1;
    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      const closedAt = ticket.updated_at ? new Date(ticket.updated_at) : new Date(ticket.created_at);
      const closedKey = format(closedAt, 'yyyy-MM-dd');
      const closed = trendMap.get(closedKey);
      if (closed) closed.closed += 1;
    }
  }

  const aging = tickets
    .filter((ticket) => openStatuses.has(ticket.status))
    .map((ticket) => ({
      id: ticket.id,
      number: ticket.number || ticket.id.slice(0, 8),
      title: ticket.title,
      type: ticket.type || 'incident',
      status: ticket.status,
      assigneeName: ticket.assignee_name ?? undefined,
      ageDays: differenceInCalendarDays(now, new Date(ticket.created_at)),
      dueDate: ticket.due_date ?? undefined,
    }))
    .filter((row) => row.ageDays >= 2)
    .sort((a, b) => b.ageDays - a.ageDays)
    .slice(0, 12);

  const warrantySoon = assets.filter((asset) => {
    const level = getWarrantyLevel(asset.warranty_expiry ?? undefined);
    return level === 'soon' || level === 'expired';
  }).length;

  const toCounts = (
    map: Map<string, number>,
    labels?: Record<string, string>,
    order?: string[],
  ): NamedCount[] => {
    const rows = Array.from(map.entries()).map(([id, value]) => ({
      id,
      label: labels?.[id] ?? id.split('_').join(' '),
      value,
    }));
    if (!order) return rows.sort((a, b) => b.value - a.value);
    const rank = new Map(order.map((id, index) => [id, index]));
    return rows.sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99));
  };

  const typeLabels = Object.fromEntries(
    Object.entries(ticketTypeMeta).map(([id, meta]) => [id, meta.label]),
  );

  return {
    rangeDays: period.rangeDays,
    preset: period.preset,
    periodStart: period.startKey,
    periodEnd: period.endKey,
    generatedAt: now.toISOString(),
    kpis: {
      open,
      unassigned,
      slaBreached,
      slaRisk,
      cabReview,
      emergencyChanges,
      warrantySoon,
      catalogPublished,
      frtMinutes: average(frtSamples),
      mttrMinutes: average(mttrSamples),
      backlogAging,
    },
    byType: toCounts(byTypeMap, typeLabels),
    byStatus: toCounts(byStatusMap, statusLabels, statusOrder),
    byPriority: toCounts(byPriorityMap, priorityLabels, priorityOrder),
    trend: Array.from(trendMap.entries()).map(([day, value]) => ({ day, ...value })),
    assignees: toCounts(assigneeMap).slice(0, 8),
    byGroup: toCounts(groupMap, groupNames).slice(0, 8),
    aging,
  };
}
