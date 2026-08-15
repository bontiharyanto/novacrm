'use client';

import { useEffect, useState } from 'react';
import { getMyPresence, setMyPresence } from '@/lib/wfm/actions';
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
  const [status, setStatus] = useState<WfmPresenceStatus>('available');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getMyPresence().then(setStatus);
  }, []);

  async function onChange(next: WfmPresenceStatus) {
    const previous = status;
    setStatus(next);
    setSaving(true);
    const result = await setMyPresence({ status: next });
    if (result.error) setStatus(previous);
    setSaving(false);
  }

  return (
    <label className="flex h-7 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950/80 px-2">
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
    </label>
  );
}
