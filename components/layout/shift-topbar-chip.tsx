'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { useI18n } from '@/components/layout/preferences-provider';
import { getMyDeskState } from '@/lib/wfm/actions';
import { formatShiftHours } from '@/lib/wfm/default-shifts';
import type { WfmDeskState } from '@/lib/wfm/schema';
import { cn } from '@/lib/utils';

const empty: WfmDeskState = { presence: 'offline', clockedIn: false, withinShift: false, today: null };

export function ShiftTopbarChip() {
  const { t } = useI18n();
  const [state, setState] = useState<WfmDeskState>(empty);

  useEffect(() => {
    void getMyDeskState().then(setState);
    function onPresence() {
      void getMyDeskState().then(setState);
    }
    window.addEventListener('novacrm:presence', onPresence);
    return () => window.removeEventListener('novacrm:presence', onPresence);
  }, []);

  const hours = state.today ? formatShiftHours(state.today.startLocal, state.today.endLocal) : null;
  const label = state.today
    ? [hours, state.today.templateName].filter(Boolean).join(' · ')
    : t.wfm.noShiftToday;

  const tone =
    state.clockedIn && state.withinShift
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : state.today && !state.withinShift
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
        : 'border-zinc-800 bg-zinc-900/40 text-zinc-400';

  const dotTone =
    state.clockedIn && state.withinShift
      ? 'bg-emerald-400'
      : state.today && !state.withinShift
        ? 'bg-amber-400'
        : 'bg-zinc-500';

  return (
    <Link
      href="/wfm/roster"
      title={label}
      className={cn(
        'hidden h-8 max-w-[200px] items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium transition-colors hover:opacity-90 lg:inline-flex',
        tone,
      )}
    >
      <CalendarClock className="h-3.5 w-3.5 shrink-0 opacity-80" />
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotTone)} aria-hidden />
      <span className="truncate">{state.clockedIn ? t.wfm.clockedIn : label}</span>
    </Link>
  );
}
