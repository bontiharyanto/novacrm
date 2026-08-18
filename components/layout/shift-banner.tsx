'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/layout/preferences-provider';
import { clockIn, clockOut, getMyDeskState } from '@/lib/wfm/actions';
import { formatShiftHours } from '@/lib/wfm/default-shifts';
import type { WfmDeskState } from '@/lib/wfm/schema';
import { cn } from '@/lib/utils';

const empty: WfmDeskState = { presence: 'offline', clockedIn: false, withinShift: false, today: null };

export function ShiftBanner() {
  const { t } = useI18n();
  const [state, setState] = useState<WfmDeskState>(empty);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setState(await getMyDeskState());
  }

  useEffect(() => {
    void refresh();
    function onPresence() {
      void refresh();
    }
    window.addEventListener('novacrm:presence', onPresence);
    return () => window.removeEventListener('novacrm:presence', onPresence);
  }, []);

  async function onClock(next: 'in' | 'out') {
    setBusy(true);
    const result = next === 'in' ? await clockIn() : await clockOut();
    if (!result.error) {
      await refresh();
      window.dispatchEvent(new Event('novacrm:presence'));
    }
    setBusy(false);
  }

  const hours = state.today ? formatShiftHours(state.today.startLocal, state.today.endLocal) : null;
  const label = state.today
    ? [state.today.templateName, hours, state.today.groupName].filter(Boolean).join(' · ')
    : t.wfm.noShiftToday;

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-zinc-800 bg-zinc-950/80 px-4 py-2 md:px-6">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{t.wfm.todayShift}</p>
        <p className="truncate text-sm text-zinc-100">{label}</p>
        {state.today && !state.withinShift ? <p className="text-[11px] text-amber-400">{t.wfm.offShiftNow}</p> : null}
      </div>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-2 py-1 text-[11px]',
          state.clockedIn ? 'text-emerald-400' : 'text-zinc-400',
        )}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', state.clockedIn ? 'bg-emerald-500' : 'bg-zinc-500')} />
        {state.clockedIn ? t.wfm.clockedIn : t.wfm.offline}
      </span>
      {state.clockedIn ? (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void onClock('out')}>
          {t.wfm.clockOut}
        </Button>
      ) : (
        <Button size="sm" disabled={busy} onClick={() => void onClock('in')}>
          {t.wfm.clockIn}
        </Button>
      )}
    </div>
  );
}
