import { randomUUID } from 'crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type DeliveryOutboundEvent = {
  tenantId: string;
  provider: string;
  eventType: 'work_order.created' | 'phase.updated' | 'project.updated';
  projectId: string;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
};

/**
 * Generic outbound adapter. Provider-specific CRM mapping stays outside NovaCRM;
 * the configured CRM receives a stable event envelope and owns its translation.
 */
export async function pushDeliveryEvent(event: DeliveryOutboundEvent) {
  const admin = createSupabaseAdminClient();
  const integration = await admin
    .from('integrations')
    .select('config')
    .eq('tenant_id', event.tenantId)
    .eq('kind', event.provider)
    .maybeSingle();
  const config = (integration.data?.config ?? {}) as {
    webhookUrl?: string;
    apiKey?: string;
  };
  if (!config.webhookUrl || !config.apiKey) {
    return { ok: false, error: 'Outbound Work Order CRM integration is not configured.' };
  }

  let url: URL;
  try {
    url = new URL(config.webhookUrl);
  } catch {
    return { ok: false, error: 'Outbound webhook URL is invalid.' };
  }
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    return { ok: false, error: 'Outbound webhook URL must use HTTPS.' };
  }

  const idempotencyKey = event.idempotencyKey ?? `${event.eventType}:${event.projectId}:${randomUUID()}`;
  const eventRow = await admin
    .from('integration_events')
    .insert({
      tenant_id: event.tenantId,
      provider: event.provider,
      direction: 'outbound',
      event_type: event.eventType,
      external_event_id: idempotencyKey,
      idempotency_key: idempotencyKey,
      payload: event.payload,
      status: 'processing',
      attempts: 1,
    })
    .select('id')
    .single();
  if (eventRow.error) return { ok: false, error: eventRow.error.message };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        eventId: idempotencyKey,
        eventType: event.eventType,
        projectId: event.projectId,
        payload: event.payload,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`CRM responded with HTTP ${response.status}`);
    await admin.from('integration_events').update({
      status: 'processed',
      processed_at: new Date().toISOString(),
    }).eq('id', eventRow.data.id);
    return { ok: true, error: null };
  } catch (caught) {
    const error = caught instanceof Error ? caught.message : 'Outbound CRM request failed';
    await admin.from('integration_events').update({ status: 'failed', last_error: error }).eq('id', eventRow.data.id);
    return { ok: false, error };
  }
}
