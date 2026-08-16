'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { runTenantIsolationAudit } from '@/lib/tenants/actions';
import { useI18n } from '@/components/layout/preferences-provider';
import { formatRelativeId } from '@/lib/utils/dates';

type Finding = {
  severity: 'fail' | 'warn' | 'pass';
  checkId: string;
  objectName: string;
  detail: string;
  rowCount: number;
};

type AuditResult = {
  ranAt: string;
  fail: number;
  warn: number;
  pass: number;
  ok: boolean;
  findings: Finding[];
};

const tone: Record<Finding['severity'], 'danger' | 'warning' | 'success'> = {
  fail: 'danger',
  warn: 'warning',
  pass: 'success',
};

export function TenantIsolationAudit() {
  const { t, locale } = useI18n();
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError('');
    const next = await runTenantIsolationAudit();
    setBusy(false);
    if (next.error || !next.data) {
      setError(next.error ?? t.tenantAudit.failed);
      return;
    }
    setResult(next.data);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/tenants" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
            <ArrowLeft className="h-3.5 w-3.5" /> {t.nav.tenants}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-50">{t.tenantAudit.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">{t.tenantAudit.subtitle}</p>
        </div>
        <Button type="button" disabled={busy} onClick={() => void run()}>
          <ShieldCheck className="h-3.5 w-3.5" />
          {busy ? t.tenantAudit.running : t.tenantAudit.run}
        </Button>
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      {result ? (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            {[
              {
                label: t.tenantAudit.verdict,
                value: result.ok ? t.tenantAudit.isolated : t.tenantAudit.leakRisk,
                className: result.ok ? 'text-emerald-400' : 'text-rose-400',
              },
              { label: t.tenantAudit.fail, value: String(result.fail), className: 'text-rose-400' },
              { label: t.tenantAudit.warn, value: String(result.warn), className: 'text-amber-400' },
              { label: t.tenantAudit.pass, value: String(result.pass), className: 'text-emerald-400' },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4">
                  <p className={`text-[11px] uppercase tracking-[0.16em] ${stat.className}`}>{stat.label}</p>
                  <p className="mt-1 text-xl font-semibold text-zinc-50">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-[11px] text-zinc-600">
            {t.tenantAudit.ran} {formatRelativeId(result.ranAt, locale)}
          </p>
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">{t.tenantAudit.severity}</th>
                  <th className="px-3 py-2 font-medium">{t.tenantAudit.object}</th>
                  <th className="px-3 py-2 font-medium">{t.tenantAudit.check}</th>
                  <th className="px-3 py-2 font-medium">{t.tenantAudit.detail}</th>
                  <th className="px-3 py-2 font-medium">{t.tenantAudit.rows}</th>
                </tr>
              </thead>
              <tbody>
                {result.findings.map((item, index) => (
                  <tr key={`${item.checkId}-${item.objectName}-${index}`} className="border-t border-zinc-800/80">
                    <td className="px-3 py-2.5">
                      <Badge tone={tone[item.severity]}>{item.severity}</Badge>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-zinc-200">{item.objectName}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-zinc-500">{item.checkId}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{item.detail}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-zinc-300">{item.rowCount || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-sm text-zinc-500">{t.tenantAudit.empty}</CardContent>
        </Card>
      )}
    </div>
  );
}
