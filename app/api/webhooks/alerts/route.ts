import { NextRequest, NextResponse } from 'next/server';
import { ingestInbound, mapAlertSeverity } from '@/lib/inbound/ingest';
import { verifyInboundSecret } from '@/lib/webhooks/inbound';
import { DEMO_TENANT_ID } from '@/lib/config/constants';

type AlertItem = {
  title: string;
  body: string;
  severity?: string;
  instance?: string;
  fingerprint?: string;
  resolved?: boolean;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function parseAlerts(payload: unknown): AlertItem[] {
  const root = asRecord(payload);
  const alerts = Array.isArray(root.alerts) ? root.alerts : null;
  if (alerts) {
    return alerts.map((item) => {
      const row = asRecord(item);
      const labels = asRecord(row.labels);
      const annotations = asRecord(row.annotations);
      const title =
        String(labels.alertname ?? annotations.summary ?? row.alertname ?? 'Machine alert').slice(0, 200);
      const body = String(
        annotations.description ?? annotations.summary ?? row.description ?? JSON.stringify(labels),
      );
      return {
        title,
        body,
        severity: String(labels.severity ?? labels.priority ?? row.severity ?? ''),
        instance: String(labels.instance ?? labels.host ?? labels.asset_tag ?? ''),
        fingerprint: String(row.fingerprint ?? `${labels.alertname}:${labels.instance}`),
        resolved: row.status === 'resolved',
      };
    });
  }

  const title = String(root.title ?? root.alert ?? root.alertname ?? 'Machine alert');
  const body = String(root.description ?? root.message ?? root.summary ?? title);
  return [
    {
      title,
      body,
      severity: String(root.severity ?? root.priority ?? ''),
      instance: String(root.instance ?? root.host ?? root.assetTag ?? ''),
      fingerprint: String(root.fingerprint ?? ''),
      resolved: root.status === 'resolved' || root.status === 'ok',
    },
  ];
}

export async function POST(request: NextRequest) {
  const provided =
    request.headers.get('x-webhook-secret') ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    request.nextUrl.searchParams.get('secret');

  if (!(await verifyInboundSecret(provided, process.env.ALERT_WEBHOOK_SECRET ?? process.env.WEBHOOK_SECRET, 'alert'))) {
    return NextResponse.json({ data: null, error: 'Unauthorized webhook' }, { status: 401 });
  }

  try {
    const payload = await request.json().catch(() => ({}));
    const tenantId = process.env.WEBHOOK_TENANT_ID || DEMO_TENANT_ID;
    const alerts = parseAlerts(payload);
    const results = [];

    for (const alert of alerts) {
      const result = await ingestInbound({
        tenantId,
        channel: 'alert',
        title: alert.title,
        body: alert.body,
        sender: 'monitoring',
        fingerprint: alert.fingerprint,
        priority: mapAlertSeverity(alert.severity),
        assetTag: alert.instance || undefined,
        payload: alert,
        resolved: alert.resolved,
      });
      if (result.error || !result.data) {
        return NextResponse.json({ data: null, error: result.error }, { status: 400 });
      }
      results.push(result.data);
    }

    return NextResponse.json({ data: results, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Alert webhook failed' },
      { status: 500 },
    );
  }
}
