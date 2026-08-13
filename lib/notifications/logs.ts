import { createSupabaseAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export type NotificationLogEntry = {
  id: string;
  tenantId: string;
  channel: string;
  recipient: string;
  subject: string;
  body: string;
  status: 'queued' | 'sent' | 'failed';
  ticketId?: string | null;
  createdAt: string;
};

async function getLogClient(): Promise<SupabaseClient> {
  if (hasServiceRole()) {
    return createSupabaseAdminClient();
  }
  return createSupabaseServerClient();
}

export async function appendNotificationLog(input: {
  tenantId: string;
  channel: string;
  recipient: string;
  subject?: string;
  body: string;
  status: 'queued' | 'sent' | 'failed';
  ticketId?: string;
  createdBy?: string;
}) {
  const client = await getLogClient();
  const { data, error } = await client
    .from('notification_logs')
    .insert({
      tenant_id: input.tenantId,
      channel: input.channel,
      recipient: input.recipient,
      subject: input.subject ?? 'NovaCRM notification',
      body: input.body,
      status: input.status,
      ticket_id: input.ticketId ?? null,
      created_by: input.createdBy ?? null,
    })
    .select('*')
    .single();

  const entry: NotificationLogEntry = {
    id: data?.id ?? `LOG-${Date.now()}`,
    tenantId: input.tenantId,
    channel: input.channel,
    recipient: input.recipient,
    subject: input.subject ?? 'NovaCRM notification',
    body: input.body,
    status: input.status,
    ticketId: input.ticketId ?? null,
    createdAt: data?.created_at ?? new Date().toISOString(),
  };

  return { data: entry, error: error?.message ?? null };
}

export async function listNotificationLogs(tenantId: string) {
  const client = await getLogClient();
  const { data, error } = await client
    .from('notification_logs')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return { data: [] as NotificationLogEntry[], error: error.message };
  }

  return {
    data: (data ?? []).map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      channel: row.channel,
      recipient: row.recipient,
      subject: row.subject,
      body: row.body,
      status: row.status,
      ticketId: row.ticket_id,
      createdAt: row.created_at,
    })) as NotificationLogEntry[],
    error: null,
  };
}
