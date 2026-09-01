'use client';

import { Badge } from '@/components/ui/badge';
import { WfmNav } from '@/components/wfm/wfm-nav';
import type { WfmAdherenceRow, WfmForecastBucket } from '@/lib/wfm/schema';
import { useI18n } from '@/components/layout/preferences-provider';

export function WfmForecast({
  buckets,
  adherence,
  canManageWfm = false,
}: {
  buckets: WfmForecastBucket[];
  adherence: WfmAdherenceRow[];
  canManageWfm?: boolean;
}) {
  const { t } = useI18n();
  const max = Math.max(1, ...buckets.map((bucket) => Math.max(bucket.tickets, bucket.headcount)));

  return (
    <div className="space-y-8 p-6">
      <WfmNav canManageWfm={canManageWfm} />
      <section>
        <h2 className="mb-3 text-sm font-medium text-zinc-50">{t.wfm.forecastTitle}</h2>
        <p className="mb-4 text-xs text-zinc-500">{t.wfm.forecastHint}</p>
        <div className="grid grid-cols-7 gap-2">
          {buckets.map((bucket) => (
            <div key={bucket.weekday} className="rounded-xl border border-zinc-800 p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">{bucket.label}</p>
              <div className="mt-3 flex h-24 items-end gap-1">
                <div
                  className="w-1/2 rounded-sm bg-blue-500/80"
                  style={{ height: `${(bucket.tickets / max) * 100}%` }}
                  title={`${t.wfm.volume}: ${bucket.tickets}`}
                />
                <div
                  className="w-1/2 rounded-sm bg-zinc-600"
                  style={{ height: `${(bucket.headcount / max) * 100}%` }}
                  title={`${t.wfm.headcount}: ${bucket.headcount}`}
                />
              </div>
              <p className="mt-2 font-mono text-[11px] text-zinc-400">
                {bucket.tickets} / {bucket.headcount}
              </p>
              <p className={`text-[11px] ${bucket.gap > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {bucket.gap > 0 ? `+${bucket.gap}` : bucket.gap} {t.wfm.gap}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-sm font-medium text-zinc-50">{t.wfm.adherenceTitle}</h2>
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-950 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">{t.wfm.agent}</th>
                <th className="px-3 py-2 font-medium">{t.nav.organization}</th>
                <th className="px-3 py-2 font-medium">{t.wfm.presence}</th>
                <th className="px-3 py-2 font-medium">{t.wfm.adherence}</th>
              </tr>
            </thead>
            <tbody>
              {adherence.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-zinc-500">
                    {t.wfm.emptyAdherence}
                  </td>
                </tr>
              ) : (
                adherence.map((row) => (
                  <tr key={`${row.userId}-${row.groupName}`} className="border-b border-zinc-800/80">
                    <td className="px-3 py-2.5 text-zinc-50">{row.fullName}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{row.groupName}</td>
                    <td className="px-3 py-2.5 text-zinc-300">{row.actual}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone={row.adherent ? 'success' : 'danger'}>
                        {row.adherent ? t.wfm.onPlan : t.wfm.offPlan}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
