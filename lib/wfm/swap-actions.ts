'use server';

import { revalidatePath } from 'next/cache';
import {
  createShiftSwapSchema,
  decideShiftSwapSchema,
  type WfmAttendanceRow,
  type WfmCoverageGap,
  type WfmShiftSwap,
  type WfmSwapEvent,
  type WfmSwapStatus,
} from '@/lib/wfm/schema';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { formatZodError } from '@/lib/validation/zod-error';
import { eachYmd, formatShiftHours } from '@/lib/wfm/default-shifts';
import { zonedYmd } from '@/lib/wfm/time';
import { notifySwapInbox, staffIdsAtLeast } from '@/lib/notifications/inbox';

function revalidateSwaps() {
  revalidatePath('/wfm');
  revalidatePath('/wfm/roster');
  revalidatePath('/wfm/swaps');
}

function writeClient() {
  return hasServiceRole() ? createSupabaseAdminClient() : null;
}

type SwapRow = {
  id: string;
  group_id: string;
  requester_id: string;
  counterpart_id: string;
  requester_date: string;
  counterpart_date: string;
  requester_template_id: string;
  counterpart_template_id: string;
  status: WfmSwapStatus;
  note: string | null;
  decision_note: string | null;
  decided_by: string | null;
  created_at: string;
  applied_at: string | null;
};

async function logEvent(
  tenantId: string,
  swapId: string,
  actorId: string,
  action: string,
  fromStatus: WfmSwapStatus | null,
  toStatus: WfmSwapStatus,
  payload: Record<string, unknown> = {},
) {
  const supabase = writeClient() ?? (await createSupabaseServerClient());
  await supabase.from('wfm_shift_swap_events').insert({
    tenant_id: tenantId,
    swap_id: swapId,
    action,
    from_status: fromStatus,
    to_status: toStatus,
    payload,
    created_by: actorId,
  });
}

async function mapSwaps(rows: SwapRow[]): Promise<WfmShiftSwap[]> {
  if (rows.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const userIds = Array.from(
    new Set(rows.flatMap((row) => [row.requester_id, row.counterpart_id, row.decided_by].filter(Boolean) as string[])),
  );
  const groupIds = Array.from(new Set(rows.map((row) => row.group_id)));
  const templateIds = Array.from(
    new Set(rows.flatMap((row) => [row.requester_template_id, row.counterpart_template_id])),
  );
  const [{ data: profiles }, { data: groups }, { data: templates }] = await Promise.all([
    supabase.from('profiles').select('id, full_name').in('id', userIds),
    supabase.from('assignment_groups').select('id, name').in('id', groupIds),
    supabase.from('wfm_shift_templates').select('id, name, start_local, end_local').in('id', templateIds),
  ]);
  const names = new Map((profiles ?? []).map((row) => [row.id, row.full_name]));
  const groupNames = new Map((groups ?? []).map((row) => [row.id, row.name]));
  const templateMap = new Map(
    (templates ?? []).map((row) => [
      row.id,
      {
        name: row.name as string,
        hours: formatShiftHours(String(row.start_local).slice(0, 5), String(row.end_local).slice(0, 5)),
      },
    ]),
  );
  return rows.map((row) => ({
    id: row.id,
    groupId: row.group_id,
    groupName: groupNames.get(row.group_id),
    requesterId: row.requester_id,
    requesterName: names.get(row.requester_id),
    counterpartId: row.counterpart_id,
    counterpartName: names.get(row.counterpart_id),
    requesterDate: row.requester_date,
    counterpartDate: row.counterpart_date,
    requesterTemplateName: templateMap.get(row.requester_template_id)?.name,
    counterpartTemplateName: templateMap.get(row.counterpart_template_id)?.name,
    requesterHours: templateMap.get(row.requester_template_id)?.hours,
    counterpartHours: templateMap.get(row.counterpart_template_id)?.hours,
    status: row.status,
    note: row.note ?? undefined,
    decisionNote: row.decision_note ?? undefined,
    decidedByName: row.decided_by ? names.get(row.decided_by) : undefined,
    createdAt: row.created_at,
    appliedAt: row.applied_at ?? undefined,
  }));
}

export async function listShiftSwaps(): Promise<WfmShiftSwap[]> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Wfm')) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('wfm_shift_swaps')
    .select(
      'id, group_id, requester_id, counterpart_id, requester_date, counterpart_date, requester_template_id, counterpart_template_id, status, note, decision_note, decided_by, created_at, applied_at',
    )
    .eq('tenant_id', session.profile.tenantId)
    .order('created_at', { ascending: false })
    .limit(80);
  return mapSwaps((data ?? []) as SwapRow[]);
}

export async function listSwapEvents(swapId: string): Promise<WfmSwapEvent[]> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Wfm')) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('wfm_shift_swap_events')
    .select('id, action, from_status, to_status, created_at, created_by')
    .eq('tenant_id', session.profile.tenantId)
    .eq('swap_id', swapId)
    .order('created_at');
  const actorIds = Array.from(new Set((data ?? []).map((row) => row.created_by).filter(Boolean) as string[]));
  const { data: profiles } = actorIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', actorIds)
    : { data: [] as Array<{ id: string; full_name: string }> };
  const names = new Map((profiles ?? []).map((row) => [row.id, row.full_name]));
  return (data ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    fromStatus: (row.from_status as WfmSwapStatus | null) ?? undefined,
    toStatus: row.to_status as WfmSwapStatus,
    createdAt: row.created_at,
    actorName: row.created_by ? names.get(row.created_by) : undefined,
  }));
}

async function findRosterCell(tenantId: string, userId: string, groupId: string, workDate: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('wfm_roster_entries')
    .select('id, template_id, user_id, group_id, work_date')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .eq('work_date', workDate)
    .maybeSingle();
  return data;
}

async function pingSwap(
  tenantId: string,
  actorId: string,
  userIds: string[],
  title: string,
  body: string,
) {
  try {
    await notifySwapInbox({ tenantId, actorId, userIds, title, body });
  } catch (error) {
    console.error('[swap] inbox', error instanceof Error ? error.message : error);
  }
}

async function supervisorAudience(tenantId: string) {
  return staffIdsAtLeast(tenantId, 'supervisor');
}

export async function createShiftSwap(input: unknown) {
  const parsedResult = createShiftSwapSchema.safeParse(input);
  if (!parsedResult.success) return { data: null, error: formatZodError(parsedResult.error) };
  const parsed = parsedResult.data;
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'Wfm')) {
    return { data: null, error: 'Unauthorized' };
  }
  if (parsed.counterpartId === session.userId) {
    return { data: null, error: 'Pick a different agent' };
  }

  const mine = await findRosterCell(session.profile.tenantId, session.userId, parsed.groupId, parsed.requesterDate);
  const theirs = await findRosterCell(
    session.profile.tenantId,
    parsed.counterpartId,
    parsed.groupId,
    parsed.counterpartDate,
  );
  if (!mine) return { data: null, error: 'You have no shift on that date' };
  if (!theirs) return { data: null, error: 'That agent has no shift on that date' };
  if (mine.id === theirs.id) return { data: null, error: 'Those cells are the same' };

  const supabase = writeClient() ?? (await createSupabaseServerClient());
  const { data, error } = await supabase
    .from('wfm_shift_swaps')
    .insert({
      tenant_id: session.profile.tenantId,
      group_id: parsed.groupId,
      requester_id: session.userId,
      counterpart_id: parsed.counterpartId,
      requester_date: parsed.requesterDate,
      counterpart_date: parsed.counterpartDate,
      requester_entry_id: mine.id,
      counterpart_entry_id: theirs.id,
      requester_template_id: mine.template_id,
      counterpart_template_id: theirs.template_id,
      status: 'pending_peer',
      note: parsed.note ?? null,
      created_by: session.userId,
    })
    .select('id')
    .single();
  if (error) {
    if (error.message.includes('idx_wfm_swaps_open')) {
      return { data: null, error: 'An open swap already uses one of those shifts' };
    }
    return { data: null, error: error.message };
  }
  await logEvent(session.profile.tenantId, data.id, session.userId, 'created', null, 'pending_peer', {
    requesterDate: parsed.requesterDate,
    counterpartDate: parsed.counterpartDate,
  });
  await pingSwap(
    session.profile.tenantId,
    session.userId,
    [parsed.counterpartId],
    'Shift swap requested',
    `${session.profile.fullName} wants to swap ${parsed.requesterDate} with your ${parsed.counterpartDate}. Open WFM → Swaps to accept.`,
  );
  revalidateSwaps();
  return { data, error: null };
}

export async function acceptShiftSwap(input: unknown) {
  const parsedResult = decideShiftSwapSchema.safeParse(input);
  if (!parsedResult.success) return { data: null, error: formatZodError(parsedResult.error) };
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'Wfm')) {
    return { data: null, error: 'Unauthorized' };
  }
  const supabase = writeClient() ?? (await createSupabaseServerClient());
  const { data: current } = await supabase
    .from('wfm_shift_swaps')
    .select('id, status, requester_id, counterpart_id, tenant_id')
    .eq('id', parsedResult.data.id)
    .eq('tenant_id', session.profile.tenantId)
    .maybeSingle();
  if (!current || current.counterpart_id !== session.userId || current.status !== 'pending_peer') {
    return { data: null, error: 'Nothing to accept' };
  }
  const { error } = await supabase
    .from('wfm_shift_swaps')
    .update({ status: 'pending_lead' })
    .eq('id', current.id)
    .eq('status', 'pending_peer');
  if (error) return { data: null, error: error.message };
  await logEvent(session.profile.tenantId, current.id, session.userId, 'peer_accepted', 'pending_peer', 'pending_lead');
  const leads = (await supervisorAudience(session.profile.tenantId)).filter(
    (id) => id !== current.requester_id,
  );
  await pingSwap(
    session.profile.tenantId,
    session.userId,
    [current.requester_id],
    'Swap accepted — waiting for supervisor',
    `${session.profile.fullName} accepted. A supervisor still needs to apply the roster.`,
  );
  await pingSwap(
    session.profile.tenantId,
    session.userId,
    leads,
    'Swap needs approval',
    `${session.profile.fullName} accepted a shift swap. Open WFM → Swaps to approve.`,
  );
  revalidateSwaps();
  return { data: { id: current.id }, error: null };
}

export async function rejectShiftSwap(input: unknown) {
  const parsedResult = decideShiftSwapSchema.safeParse(input);
  if (!parsedResult.success) return { data: null, error: formatZodError(parsedResult.error) };
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'Wfm')) {
    return { data: null, error: 'Unauthorized' };
  }
  const supabase = writeClient() ?? (await createSupabaseServerClient());
  const { data: current } = await supabase
    .from('wfm_shift_swaps')
    .select('id, status, requester_id, counterpart_id, tenant_id')
    .eq('id', parsedResult.data.id)
    .eq('tenant_id', session.profile.tenantId)
    .maybeSingle();
  if (!current) return { data: null, error: 'Swap not found' };

  const isPeer = current.counterpart_id === session.userId && current.status === 'pending_peer';
  const isOwner = current.requester_id === session.userId && ['pending_peer', 'pending_lead'].includes(current.status);
  const isLead = canRole(session.profile.role, 'create', 'Wfm') && ['pending_peer', 'pending_lead'].includes(current.status);
  if (!isPeer && !isOwner && !isLead) return { data: null, error: 'Unauthorized' };

  const next: WfmSwapStatus = isOwner && !isPeer && !isLead ? 'cancelled' : 'rejected';
  const action = next === 'cancelled' ? 'cancelled' : isPeer ? 'peer_rejected' : 'lead_rejected';
  const { error } = await supabase
    .from('wfm_shift_swaps')
    .update({
      status: next,
      decision_note: parsedResult.data.note ?? null,
      decided_by: session.userId,
      decided_at: new Date().toISOString(),
    })
    .eq('id', current.id);
  if (error) return { data: null, error: error.message };
  await logEvent(
    session.profile.tenantId,
    current.id,
    session.userId,
    action,
    current.status as WfmSwapStatus,
    next,
    { note: parsedResult.data.note },
  );
  if (next === 'cancelled') {
    await pingSwap(
      session.profile.tenantId,
      session.userId,
      [current.counterpart_id],
      'Swap cancelled',
      `${session.profile.fullName} cancelled the shift swap.`,
    );
  } else if (isPeer) {
    await pingSwap(
      session.profile.tenantId,
      session.userId,
      [current.requester_id],
      'Swap declined',
      `${session.profile.fullName} declined the shift swap.`,
    );
  } else {
    await pingSwap(
      session.profile.tenantId,
      session.userId,
      [current.requester_id, current.counterpart_id],
      'Swap declined',
      `${session.profile.fullName} declined the shift swap.`,
    );
  }
  revalidateSwaps();
  return { data: { id: current.id }, error: null };
}

export async function approveShiftSwap(input: unknown) {
  const parsedResult = decideShiftSwapSchema.safeParse(input);
  if (!parsedResult.success) return { data: null, error: formatZodError(parsedResult.error) };
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Wfm')) {
    return { data: null, error: 'Unauthorized' };
  }
  const supabase = await createSupabaseServerClient();
  const { data: current } = await supabase
    .from('wfm_shift_swaps')
    .select('id, status, requester_id, counterpart_id')
    .eq('id', parsedResult.data.id)
    .eq('tenant_id', session.profile.tenantId)
    .maybeSingle();
  if (!current || current.status !== 'pending_lead') {
    return { data: null, error: 'Swap is not waiting for approval' };
  }

  const { error } = await supabase.rpc('apply_wfm_shift_swap', {
    p_swap_id: current.id,
    p_actor: session.userId,
  });
  if (error) return { data: null, error: error.message };

  if (parsedResult.data.note) {
    await supabase
      .from('wfm_shift_swaps')
      .update({ decision_note: parsedResult.data.note })
      .eq('id', current.id);
  }
  await logEvent(session.profile.tenantId, current.id, session.userId, 'lead_approved', 'pending_lead', 'approved');
  await pingSwap(
    session.profile.tenantId,
    session.userId,
    [current.requester_id, current.counterpart_id],
    'Swap approved',
    `${session.profile.fullName} applied the shift swap. Check WFM → Roster.`,
  );
  revalidateSwaps();
  return { data: { id: current.id }, error: null };
}

export async function listWfmCoverage(fromDate: string, toDate: string): Promise<WfmCoverageGap[]> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Wfm')) return [];
  const supabase = await createSupabaseServerClient();
  const [{ data: roster }, { data: groups }] = await Promise.all([
    supabase
      .from('wfm_roster_entries')
      .select('group_id, work_date')
      .eq('tenant_id', session.profile.tenantId)
      .gte('work_date', fromDate)
      .lte('work_date', toDate),
    supabase.from('assignment_groups').select('id, name').eq('tenant_id', session.profile.tenantId).eq('is_active', true),
  ]);
  const counts = new Map<string, number>();
  for (const row of roster ?? []) {
    const key = `${row.group_id}:${row.work_date}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const groupsWithRoster = new Set((roster ?? []).map((row) => row.group_id));
  const gaps: WfmCoverageGap[] = [];
  for (const group of groups ?? []) {
    if (!groupsWithRoster.has(group.id)) continue;
    for (const cursor of eachYmd(fromDate, toDate)) {
      const headcount = counts.get(`${group.id}:${cursor}`) ?? 0;
      if (headcount === 0) {
        gaps.push({ workDate: cursor, groupId: group.id, groupName: group.name, headcount });
      }
    }
  }
  return gaps;
}

export async function listWfmAttendance(fromDate: string, toDate: string): Promise<WfmAttendanceRow[]> {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Wfm')) return [];
  const supabase = await createSupabaseServerClient();
  const fromIso = `${fromDate}T00:00:00+07:00`;
  const toIso = `${toDate}T23:59:59+07:00`;
  const [{ data: roster }, { data: punches }, { data: groups }] = await Promise.all([
    supabase
      .from('wfm_roster_entries')
      .select('user_id, group_id, work_date, wfm_shift_templates(name, start_local, end_local)')
      .eq('tenant_id', session.profile.tenantId)
      .gte('work_date', fromDate)
      .lte('work_date', toDate)
      .order('work_date'),
    supabase
      .from('wfm_attendance_punches')
      .select('user_id, kind, punched_at')
      .eq('tenant_id', session.profile.tenantId)
      .eq('kind', 'clock_in')
      .gte('punched_at', fromIso)
      .lte('punched_at', toIso),
    supabase.from('assignment_groups').select('id, name').eq('tenant_id', session.profile.tenantId),
  ]);

  const punchByUserDay = new Map<string, string>();
  for (const punch of punches ?? []) {
    const day = zonedYmd(new Date(punch.punched_at), 'Asia/Jakarta');
    const key = `${punch.user_id}:${day}`;
    if (!punchByUserDay.has(key)) punchByUserDay.set(key, punch.punched_at);
  }
  const userIds = Array.from(new Set((roster ?? []).map((row) => row.user_id)));
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
    : { data: [] as Array<{ id: string; full_name: string }> };
  const names = new Map((profiles ?? []).map((row) => [row.id, row.full_name]));
  const groupNames = new Map((groups ?? []).map((row) => [row.id, row.name]));

  return (roster ?? []).map((row) => {
    const template = Array.isArray(row.wfm_shift_templates) ? row.wfm_shift_templates[0] : row.wfm_shift_templates;
    const clockInAt = punchByUserDay.get(`${row.user_id}:${row.work_date}`);
    const start = template ? String(template.start_local).slice(0, 5) : '';
    const end = template ? String(template.end_local).slice(0, 5) : '';
    return {
      workDate: row.work_date,
      userId: row.user_id,
      userName: names.get(row.user_id) ?? row.user_id.slice(0, 8),
      groupName: groupNames.get(row.group_id) ?? '',
      shiftName: template?.name ?? 'Shift',
      hours: start && end ? formatShiftHours(start, end) : '',
      clockedIn: Boolean(clockInAt),
      clockInAt: clockInAt,
    };
  });
}
