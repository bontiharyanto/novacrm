'use server';

import { createInboxItems } from '@/lib/notifications/inbox';
import { enqueueNotification } from '@/lib/queue/notification.queue';
import { portalPermalink } from '@/lib/notifications/email-template';
import { loadTenantPublicUrl } from '@/lib/notifications/public-url';
import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { displayTicketNumber } from '@/lib/tickets/process';
import {
  loadMajorImpactContext,
  matchMajorsForAccount,
  type MajorRow,
} from '@/lib/tickets/major-context';

type PortalUser = {
  userId: string;
  fullName: string;
  email?: string;
  phone?: string;
  site?: string;
};

export async function listAffectedPortalUsers(
  tenantId: string,
  accountId: string,
  major: MajorRow,
): Promise<PortalUser[]> {
  if (!hasServiceRole()) return [];

  const client = createSupabaseAdminClient();
  const ctx = await loadMajorImpactContext(client, tenantId, accountId);

  const { data: members } = await client
    .from('account_members')
    .select('user_id')
    .eq('tenant_id', tenantId)
    .eq('account_id', accountId)
    .eq('role', 'portal');

  const userIds = Array.from(new Set((members ?? []).map((row) => row.user_id as string)));
  if (userIds.length === 0) return [];

  const { data: profiles } = await client
    .from('profiles')
    .select('id, full_name, email, phone, site, client_ip, role')
    .eq('tenant_id', tenantId)
    .in('id', userIds);

  const affected: PortalUser[] = [];
  for (const profile of profiles ?? []) {
    if (profile.role !== 'customer') continue;
    const site = profile.site?.trim() || undefined;
    const clientIp = profile.client_ip?.trim() || undefined;
    const matches = matchMajorsForAccount(ctx, { site, location: site, clientIp });
    if (!matches.some((item) => item.id === major.id)) continue;
    affected.push({
      userId: profile.id as string,
      fullName: String(profile.full_name ?? 'Customer'),
      email: profile.email ?? undefined,
      phone: profile.phone ?? undefined,
      site,
    });
  }

  return affected;
}

export async function maybeNotifyMajorImpact(input: {
  existing: {
    type: string;
    parentTicketId?: string;
    cmdbItemId?: string;
    status: string;
    accountId: string;
    tenantId: string;
    id: string;
    number?: string;
    title: string;
    assetId?: string;
  };
  updated: {
    type: string;
    parentTicketId?: string;
    cmdbItemId?: string;
    status: string;
    accountId: string;
    tenantId: string;
    id: string;
    number?: string;
    title: string;
    assetId?: string;
  };
  parsed: { cmdbItemId?: string | null; status?: string };
  actorId?: string;
}) {
  if (input.updated.type !== 'incident' || input.updated.parentTicketId) return;
  if (!hasServiceRole()) return;

  const cmdbChanged =
    input.parsed.cmdbItemId !== undefined && input.parsed.cmdbItemId !== (input.existing.cmdbItemId ?? null);
  const statusChanged = Boolean(input.parsed.status && input.parsed.status !== input.existing.status);
  if (!cmdbChanged && !statusChanged) return;
  if (!input.updated.cmdbItemId && !cmdbChanged) return;

  const client = createSupabaseAdminClient();
  const ctx = await loadMajorImpactContext(client, input.updated.tenantId, input.updated.accountId);
  const isMajor = Boolean(input.updated.cmdbItemId) || ctx.parentIds.has(input.updated.id);
  if (!isMajor) return;

  await notifyMajorAffectedUsers({
    tenantId: input.updated.tenantId,
    accountId: input.updated.accountId,
    major: {
      id: input.updated.id,
      number: input.updated.number ?? null,
      title: input.updated.title,
      status: input.updated.status,
      cmdb_item_id: input.updated.cmdbItemId ?? null,
      asset_id: input.updated.assetId ?? null,
    },
    event: cmdbChanged ? 'opened' : 'updated',
    actorId: input.actorId,
  });
}

export async function notifyMajorAffectedUsers(input: {
  tenantId: string;
  accountId: string;
  major: MajorRow;
  event: 'opened' | 'updated';
  actorId?: string;
  statusNote?: string;
}) {
  if (!hasServiceRole()) return { count: 0 };

  const users = await listAffectedPortalUsers(input.tenantId, input.accountId, input.major);
  if (users.length === 0) return { count: 0 };

  const number = displayTicketNumber(input.major.number ?? undefined, input.major.id);
  const publicUrl = await loadTenantPublicUrl(input.tenantId);
  const detailUrl = portalPermalink(input.major.id, publicUrl);
  const title =
    input.event === 'opened'
      ? `GAMAS aktif: ${number}`
      : `Update GAMAS: ${number}`;
  const body =
    input.event === 'opened'
      ? `${input.major.title} — layanan Anda mungkin terdampak.`
      : `${input.major.title} — status: ${input.major.status.replace(/_/g, ' ')}${input.statusNote ? `. ${input.statusNote}` : ''}`;

  await createInboxItems({
    tenantId: input.tenantId,
    actorId: input.actorId,
    items: users.map((user) => ({
      userId: user.userId,
      kind: 'status',
      title,
      body: body.slice(0, 500),
      href: `/portal/${input.major.id}`,
      ticketId: input.major.id,
    })),
    includeActor: false,
  });

  const message = `${body}\n\n${detailUrl}`;
  for (const user of users) {
    if (!user.email && !user.phone) continue;
    await enqueueNotification({
      tenantId: input.tenantId,
      event: 'major.impact',
      ticketId: input.major.id,
      number,
      title: input.major.title,
      status: input.major.status,
      requesterName: user.fullName,
      requesterEmail: user.email,
      requesterPhone: user.phone,
      message,
      locale: 'id',
    });
  }

  return { count: users.length };
}
