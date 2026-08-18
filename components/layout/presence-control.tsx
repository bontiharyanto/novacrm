'use client';

import { useEffect, useState } from 'react';
import { getMyDeskState, setMyPresence } from '@/lib/wfm/actions';
import { formatShiftHours } from '@/lib/wfm/default-shifts';
import type { WfmPresenceStatus } from '@/lib/wfm/schema';
import { useI18n } from '@/components/layout/preferences-provider';
import { cn } from '@/lib/utils';

const STATUSES: WfmPresenceStatus[] = ['available', 'busy', 'break', 'offline'];

const DOT: Record<WfmPresenceStatus, string> = {
  available: 'bg-emerald-500',
  busy: 'bg-amber-500',
  break: 'bg-sky-500',
  offline: 'bg-zinc-500',
};

export function PresenceControl() {
  const { t } = useI18n();
  const [status, setStatus] = useState<WfmPresenceStatus>('offline');
  const [shiftLabel, setShiftLabel] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const state = await getMyDeskState();
      setStatus(state.presence);
      setShiftLabel(
        state.today
          ? `${state.today.templateName} ${formatShiftHours(state.today.startLocal, state.today.endLocal)}`
          : null,
      );
    }
    void load();
    window.addEventListener('novacrm:presence', load);
    return () => window.removeEventListener('novacrm:presence', load);
  }, []);

  async function onChange(next: WfmPresenceStatus) {
    const previous = status;
    setStatus(next);
    setSaving(true);
    const result = await setMyPresence({ status: next });
    if (result.error) setStatus(previous);
    else window.dispatchEvent(new Event('novacrm:presence'));
    setSaving(false);
  }

  return (
    <label className="flex flex-col gap-1 rounded-md border border-zinc-800 bg-zinc-950/80 px-2 py-1.5">
      <div className="flex h-6 items-center gap-2">
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOT[status])} />
        <select
          value={status}
          disabled={saving}
          aria-label={t.wfm.presence}
          onChange={(event) => void onChange(event.target.value as WfmPresenceStatus)}
          className="min-w-0 flex-1 appearance-none bg-transparent text-[11px] text-zinc-300 outline-none hover:text-zinc-100 disabled:opacity-60"
        >
          {STATUSES.map((item) => (
            <option key={item} value={item}>
              {t.wfm[item]}
            </option>
          ))}
        </select>
      </div>
      {shiftLabel ? <p className="truncate font-mono text-[10px] text-zinc-500">{shiftLabel}</p> : null}
    </label>
  );
}
