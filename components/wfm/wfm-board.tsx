'use client';

import { useCallback, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { WfmNav } from '@/components/wfm/wfm-nav';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import { setMyPresence } from '@/lib/wfm/actions';
import type { WfmOccupancyRow, WfmPresenceStatus } from '@/lib/wfm/schema';
import { useI18n } from '@/components/layout/preferences-provider';
import { useRouter } from 'next/navigation';

const presenceTone: Record<WfmPresenceStatus, 'success' | 'warning' | 'info' | 'neutral'> = {
  available: 'success',
  busy: 'warning',
  break: 'info',
  offline: 'neutral',
};

export function WfmBoard({ rows, canSetPresence }: { rows: WfmOccupancyRow[]; canSetPresence: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [presence, setPresence] = useState<WfmPresenceStatus>('offline');
  const refresh = useCallback(() => router.refresh(), [router]);
  useRealtimeTable('wfm_presence', refresh);
  useRealtimeTable('tickets', refresh);
  useRealtimeTable('wfm_roster_entries', refresh);

  return (
    <div className="space-y-6 p-6">
      <WfmNav />
      {canSetPresence ? (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={presence} onChange={(event) => setPresence(event.target.value as WfmPresenceStatus)} className="w-40">
            <option value="available">{t.wfm.available}</option>
            <option value="busy">{t.wfm.busy}</option>
            <option value="break">{t.wfm.break}</option>
            <option value="offline">{t.wfm.offline}</option>
          </Select>
          <Button size="sm" variant="outline" onClick={() => void setMyPresence({ status: presence }).then(() => router.refresh())}>
            {t.wfm.setPresence}
          </Button>
        </div>
      ) : null}
      {rows.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">{t.wfm.emptyGroups}</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {rows.map((row) => (
            <section key={row.groupId} className="overflow-hidden rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/60 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-50">{row.groupName}</p>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                    {row.tier ? row.tier.toUpperCase() : row.kind} · {row.strategy.replace('_', ' ')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge tone={row.unassigned ? 'warning' : 'neutral'}>{row.unassigned} {t.wfm.unassigned}</Badge>
                  <Badge tone="info">{row.available} {t.wfm.eligible}</Badge>
                </div>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-800 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t.wfm.agent}</th>
                    <th className="px-3 py-2 font-medium">{t.wfm.presence}</th>
                    <th className="px-3 py-2 font-medium">{t.wfm.load}</th>
                    <th className="px-3 py-2 font-medium">{t.wfm.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {row.agents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-zinc-500">
                        {t.wfm.noMembers}
                      </td>
                    </tr>
                  ) : (
                    row.agents.map((agent) => (
                      <tr key={agent.id} className="border-b border-zinc-800/80">
                        <td className="px-3 py-2.5 text-zinc-50">{agent.fullName}</td>
                        <td className="px-3 py-2.5">
                          <Badge tone={presenceTone[agent.presence]}>{t.wfm[agent.presence]}</Badge>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-zinc-400">
                          {agent.openTickets}/{agent.maxOpen}
                        </td>
                        <td className="px-3 py-2.5">
                          {agent.eligible ? (
                            <Badge tone="success">{t.wfm.eligible}</Badge>
                          ) : (
                            <span className="text-xs text-zinc-500">
                              {agent.reasons.map((reason) => t.wfm.reason[reason]).join(', ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
