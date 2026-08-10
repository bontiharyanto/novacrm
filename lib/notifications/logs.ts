import { supabase } from '@/lib/supabase/client';

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

const logStore = new Map<string, NotificationLogEntry[]>();

export async function appendNotificationLog(input: {
  tenantId: string;
  channel: string;
  recipient: string;
  subject?: string;
  body: string;
  status: 'queued' | 'sent' | 'failed';
  ticketId?: string;
}) {
  const entry: NotificationLogEntry = {
    id: `LOG-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    tenantId: input.tenantId,
    channel: input.channel,
    recipient: input.recipient,
    subject: input.subject ?? 'NovaCRM notification',
    body: input.body,
    status: input.status,
    ticketId: input.ticketId ?? null,
    createdAt: new Date().toISOString(),
  };

  const tenantLogs = logStore.get(input.tenantId) ?? [];
  logStore.set(input.tenantId, [entry, ...tenantLogs].slice(0, 50));

  try {
    const { error } = await supabase.from('notification_logs').insert({
      tenant_id: input.tenantId,
      channel: input.channel,
      recipient: input.recipient,
      subject: input.subject ?? 'NovaCRM notification',
      body: input.body,
      status: input.status,
      ticket_id: input.ticketId ?? null,
    });

    if (error) {
      return { data: entry, error: error.message };
    }

    return { data: entry, error: null };
  } catch (error) {
    return {
      data: entry,
      error: error instanceof Error ? error.message : 'Unable to save notification log',
    };
  }
}

export async function listNotificationLogs(tenantId = 'default') {
  try {
    const { data, error } = await supabase.from('notification_logs').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(20);

    if (!error && data) {
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
        })),
        error: null,
      };
    }
  } catch {
    // fall through to in-memory logs
  }

  return {
    data: logStore.get(tenantId) ?? [],
    error: null,
  };
}
