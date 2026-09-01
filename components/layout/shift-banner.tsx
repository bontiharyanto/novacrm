'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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

  const accentClass =
    state.clockedIn && state.withinShift
      ? 'from-emerald-500/80 to-emerald-500/10'
      : state.today && !state.withinShift
        ? 'from-amber-500/80 to-amber-500/10'
        : 'from-zinc-600/50 to-transparent';

  return (
    <div className="relative flex flex-wrap items-center gap-3 border-b border-zinc-800 bg-zinc-950/80 px-4 py-2 md:px-6">
      <div className={cn('absolute inset-y-0 left-0 w-1 bg-gradient-to-b', accentClass)} aria-hidden />
      <div className="min-w-0 flex-1 pl-2">
        <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{t.wfm.todayShift}</p>
        <p className="truncate text-sm text-zinc-100">{label}</p>
        {state.today && !state.withinShift ? <p className="text-[11px] text-amber-400">{t.wfm.offShiftNow}</p> : null}
      </div>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]',
          state.clockedIn ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-zinc-800 text-zinc-400',
        )}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', state.clockedIn ? 'bg-emerald-500' : 'bg-zinc-500')} />
        {state.clockedIn ? t.wfm.clockedIn : t.wfm.offline}
      </span>
      <Link href="/wfm/roster" className="text-[11px] text-zinc-500 hover:text-zinc-300">
        {t.wfm.viewRoster}
      </Link>
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
