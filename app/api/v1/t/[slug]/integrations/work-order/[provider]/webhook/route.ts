import { NextRequest, NextResponse } from 'next/server';
import { ingestDeliveryWebhook } from '@/lib/delivery/actions';
import { deliveryWebhookPayloadSchema } from '@/lib/delivery/schema';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { loadTenantBySlug } from '@/lib/tenants/resolve-slug';
import { verifyWebhookSecret } from '@/lib/webhooks/verify';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string; provider: string } },
) {
  const tenant = await loadTenantBySlug(params.slug);
  if (!tenant) return NextResponse.json({ data: null, error: 'Tenant not found' }, { status: 404 });
  if (!/^[a-z][a-z0-9_-]{1,60}$/i.test(params.provider)) {
    return NextResponse.json({ data: null, error: 'Invalid provider' }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const integration = await admin
    .from('integrations')
    .select('config')
    .eq('tenant_id', tenant.id)
    .eq('kind', params.provider)
    .maybeSingle();
  const config = (integration.data?.config ?? {}) as { webhookSecret?: string };
  const secretOk =
    verifyWebhookSecret(request.headers.get('x-webhook-secret'), config.webhookSecret) ||
    verifyWebhookSecret(request.headers.get('x-webhook-secret'), process.env.WEBHOOK_SECRET);
  if (!secretOk) return NextResponse.json({ data: null, error: 'Invalid webhook secret' }, { status: 401 });

  const parsed = deliveryWebhookPayloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: 'Invalid Work Order payload' }, { status: 400 });
  }

  const result = await ingestDeliveryWebhook(tenant.id, params.provider, parsed.data);
  if (result.error) return NextResponse.json({ data: null, error: result.error }, { status: 400 });
  return NextResponse.json({ data: result.data, error: null }, { status: 202 });
}
