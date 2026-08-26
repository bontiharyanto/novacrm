'use client';

import Link from 'next/link';
import { Gauge } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/components/layout/preferences-provider';
import { cn } from '@/lib/utils';
import {
  meterDimensions,
  type MeterDimension,
  type MeterLevel,
  type TenantMeterSnapshot,
} from '@/lib/tenants/meter-view';

function barClass(level: MeterLevel) {
  if (level === 'critical') return 'bg-rose-500';
  if (level === 'warn') return 'bg-amber-500';
  return 'bg-emerald-500';
}

function toneFor(level: MeterLevel): 'success' | 'warning' | 'danger' | 'neutral' {
  if (level === 'critical') return 'danger';
  if (level === 'warn') return 'warning';
  return 'success';
}

function labelFor(t: ReturnType<typeof useI18n>['t'], key: MeterDimension['key']) {
  if (key === 'accounts') return t.usage.accounts;
  if (key === 'agents') return t.usage.agents;
  return t.usage.tickets;
}

function levelLabel(t: ReturnType<typeof useI18n>['t'], level: MeterLevel) {
  if (level === 'critical') return t.usage.levelCritical;
  if (level === 'warn') return t.usage.levelWarn;
  return t.usage.levelOk;
}

function MeterBars({ dimensions }: { dimensions: MeterDimension[] }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      {dimensions.map((dim) => (
        <div key={dim.key} className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-zinc-200">{labelFor(t, dim.key)}</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-zinc-400">
                {dim.used} / {dim.max}
              </span>
              <Badge tone={toneFor(dim.level)}>{levelLabel(t, dim.level)}</Badge>
            </div>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={cn('h-full rounded-full transition-all duration-200 ease-out', barClass(dim.level))}
              style={{ width: `${dim.percent}%` }}
            />
          </div>
          <p className="text-[11px] text-zinc-500">
            {dim.key === 'tickets' ? t.usage.ticketsHint : null}
            {dim.key === 'agents' ? t.usage.agentsHint : null}
            {dim.key === 'accounts' ? t.usage.accountsHint : null}
          </p>
        </div>
      ))}
    </div>
  );
}

export function UsageSettings({ snapshot }: { snapshot: TenantMeterSnapshot }) {
  const { t } = useI18n();
  const dimensions = meterDimensions(snapshot);

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-8 p-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">{t.usage.kicker}</p>
          <h1 className="text-2xl font-semibold text-zinc-50">{t.usage.title}</h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-500">{t.usage.subtitle}</p>
        </div>

        <Card>
          <CardContent className="space-y-5 p-5">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-zinc-400" />
              <h2 className="text-sm font-medium text-zinc-50">{t.usage.metersTitle}</h2>
            </div>
            <MeterBars dimensions={dimensions} />
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4 border-t border-zinc-800 p-6 lg:border-l lg:border-t-0">
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.usage.asideTitle}</p>
            <p className="text-xs leading-5 text-zinc-500">{t.usage.asideBody}</p>
            <p className="text-xs leading-5 text-zinc-600">{t.usage.warnHint}</p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

export function UsageWarnBanner({ snapshot }: { snapshot: TenantMeterSnapshot }) {
  const { t } = useI18n();
  const dimensions = meterDimensions(snapshot);
  const stressed = dimensions.filter((d) => d.level !== 'ok');
  if (stressed.length === 0) return null;

  const critical = stressed.some((d) => d.level === 'critical');

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3',
        critical ? 'border-rose-500/40 bg-rose-500/10' : 'border-amber-500/40 bg-amber-500/10',
      )}
    >
      <div className="min-w-0">
        <p className={cn('text-sm font-medium', critical ? 'text-rose-200' : 'text-amber-100')}>
          {critical ? t.usage.bannerCritical : t.usage.bannerWarn}
        </p>
        <p className="mt-0.5 text-xs text-zinc-400">
          {stressed.map((d) => `${labelFor(t, d.key)} ${d.used}/${d.max}`).join(' · ')}
        </p>
      </div>
      <Link
        href="/settings/usage"
        className="shrink-0 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 transition-colors hover:border-zinc-500 hover:text-zinc-50"
      >
        {t.usage.viewUsage}
      </Link>
    </div>
  );
}
