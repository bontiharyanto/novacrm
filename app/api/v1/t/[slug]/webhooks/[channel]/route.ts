import { NextRequest, NextResponse } from 'next/server';
import { TENANT_WEBHOOK_CHANNELS, tenantHeaderMatches, type TenantWebhookChannel } from '@/lib/tenants/backend-url';
import { handleTenantWebhook } from '@/lib/webhooks/tenant-inbound';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isChannel(value: string): value is TenantWebhookChannel {
  return (TENANT_WEBHOOK_CHANNELS as readonly string[]).includes(value);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string; channel: string } },
) {
  if (!isChannel(params.channel)) {
    return NextResponse.json({ data: null, error: 'Unknown webhook channel' }, { status: 404 });
  }
  if (!tenantHeaderMatches(request, params.slug)) {
    return NextResponse.json({ data: null, error: 'X-Tenant-Id does not match path tenant' }, { status: 400 });
  }
  return handleTenantWebhook(request, params.slug, params.channel);
}
