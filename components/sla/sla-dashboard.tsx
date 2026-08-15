'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { ensureSlaAgreement, updateSlaAgreement } from '@/lib/sla/actions';
import { WEEKDAYS, type DayKey } from '@/lib/sla/calendar';
import type { SlaAgreement, SlaHoliday, SlaTargetInput } from '@/lib/sla/schema';
import type { UnderpinningContract } from '@/lib/uc/schema';
import { UcPanel } from '@/components/sla/uc-panel';
import { TICKET_TYPES } from '@/lib/tickets/process';
import { useI18n } from '@/components/layout/preferences-provider';
import { localizedType } from '@/lib/i18n/labels';
import type { TicketPriority, TicketType } from '@/lib/tickets/schema';

const PRIORITIES: TicketPriority[] = ['critical', 'high', 'medium', 'low'];
const DISPLAY_DAYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABEL: Record<DayKey, string> = {
  sun: 'Sunday',
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
};

function cellKey(type: TicketType, priority: TicketPriority) {
  return `${type}:${priority}`;
}

function minutesLabel(value: number) {
  if (value >= 60 && value % 60 === 0) return `${value / 60}h`;
  if (value >= 60) return `${Math.floor(value / 60)}h ${value % 60}m`;
  return `${value}m`;
}

export function SlaDashboard({
  agreement,
  contracts = [],
  canEdit,
  accountName,
}: {
  agreement: SlaAgreement | null;
  contracts?: UnderpinningContract[];
  canEdit: boolean;
  accountName?: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(agreement?.name ?? 'Standard');
  const [pauseOnWaiting, setPauseOnWaiting] = useState(agreement?.pauseOnWaiting ?? true);
  const [calendarName, setCalendarName] = useState(agreement?.calendar.name ?? 'Office hours');
  const [timezone, setTimezone] = useState(agreement?.calendar.timezone ?? 'Asia/Jakarta');
  const [is24x7, setIs24x7] = useState(agreement?.calendar.is24x7 ?? false);
  const [hours, setHours] = useState<Record<DayKey, { start: string; end: string }>>(() => {
    const next = {} as Record<DayKey, { start: string; end: string }>;
    for (const day of WEEKDAYS) {
      const window = agreement?.calendar.businessHours[day]?.[0];
      next[day] = { start: window?.[0] ?? '', end: window?.[1] ?? '' };
    }
    return next;
  });
  const [holidays, setHolidays] = useState<SlaHoliday[]>(agreement?.calendar.holidays ?? []);
  const [targets, setTargets] = useState<Record<string, { response: number; resolve: number }>>(() => {
    const next: Record<string, { response: number; resolve: number }> = {};
    for (const type of TICKET_TYPES) {
      for (const priority of PRIORITIES) {
        const found = agreement?.targets.find((item) => item.ticketType === type && item.priority === priority);
        next[cellKey(type, priority)] = {
          response: found?.responseMinutes ?? 60,
          resolve: found?.resolveMinutes ?? 480,
        };
      }
    }
    return next;
  });

  const sample = useMemo(() => {
    const gold = targets[cellKey('incident', 'critical')];
    return gold ? `INC P1 · response ${minutesLabel(gold.response)} / resolve ${minutesLabel(gold.resolve)}` : '';
  }, [targets]);

  async function createAgreement() {
    setSaving(true);
    const result = await ensureSlaAgreement();
    setSaving(false);
    setMessage(result.error ?? 'Agreement created');
    router.refresh();
  }

  async function save() {
    setSaving(true);
    const businessHours = Object.fromEntries(
      DISPLAY_DAYS.map((day) => {
        const slot = hours[day];
        if (!slot.start || !slot.end) return [day, []];
        return [day, [[slot.start, slot.end]]];
      }),
    );
    const payloadTargets: SlaTargetInput[] = TICKET_TYPES.flatMap((ticketType) =>
      PRIORITIES.map((priority) => ({
        ticketType,
        priority,
        responseMinutes: targets[cellKey(ticketType, priority)].response,
        resolveMinutes: targets[cellKey(ticketType, priority)].resolve,
      })),
    );
    const result = await updateSlaAgreement({
      name,
      pauseOnWaiting,
      calendar: {
        name: calendarName,
        timezone,
        is24x7,
        businessHours,
        holidays: holidays.filter((item) => item.date),
      },
      targets: payloadTargets,
    });
    setSaving(false);
    setMessage(result.error ?? 'Saved');
    router.refresh();
  }

  if (!agreement) {
    return (
      <div className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6 p-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Configuration</p>
            <h1 className="text-2xl font-semibold text-zinc-50">SLA</h1>
            {accountName ? <p className="mt-1 text-sm text-zinc-500">{accountName}</p> : null}
          </div>
          <UcPanel contracts={contracts} canEdit={canEdit} />
          <p className="rounded-xl border border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
            No agreement on this account. Internal tickets use office hours; customers need a contract matrix.
          </p>
          {canEdit ? (
            <Button onClick={() => void createAgreement()} disabled={saving}>
              {saving ? 'Creating...' : 'Create SLA agreement'}
            </Button>
          ) : null}
        </div>
        <aside className="border-l border-zinc-800 p-6 text-sm text-zinc-500">
          Snapshot on ticket create. Later edits do not rewrite open tickets.
        </aside>
      </div>
    );
  }

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Configuration</p>
            <h1 className="text-2xl font-semibold text-zinc-50">SLA</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {accountName ?? 'Current account'} · {sample}
            </p>
          </div>
          {canEdit ? (
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving...' : 'Save agreement'}
            </Button>
          ) : null}
        </div>
        {message ? <p className="text-xs text-zinc-400">{message}</p> : null}
        <UcPanel contracts={contracts} canEdit={canEdit} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sla-name">Agreement</Label>
            <Input id="sla-name" value={name} disabled={!canEdit} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Pause clock</Label>
            <Select
              value={pauseOnWaiting ? 'yes' : 'no'}
              disabled={!canEdit}
              onChange={(event) => setPauseOnWaiting(event.target.value === 'yes')}
            >
              <option value="yes">Pause on waiting / hold</option>
              <option value="no">Keep running</option>
            </Select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-950 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">Process</th>
                {PRIORITIES.map((priority) => (
                  <th key={priority} className="px-3 py-2 font-medium">
                    {priority}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TICKET_TYPES.map((type) => (
                <tr key={type} className="border-b border-zinc-800/80">
                  <td className="px-3 py-3">
                    <p className="text-sm text-zinc-50">{localizedType(t, type)}</p>
                    <p className="text-[11px] text-zinc-500">Response / resolve (min)</p>
                  </td>
                  {PRIORITIES.map((priority) => {
                    const key = cellKey(type, priority);
                    const cell = targets[key];
                    return (
                      <td key={key} className="px-2 py-2 align-top">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={1}
                            disabled={!canEdit}
                            value={cell.response}
                            onChange={(event) =>
                              setTargets((current) => ({
                                ...current,
                                [key]: { ...current[key], response: Number(event.target.value) },
                              }))
                            }
                            className="w-16 px-2 py-1 font-mono text-xs"
                          />
                          <span className="text-[10px] text-zinc-600">/</span>
                          <Input
                            type="number"
                            min={1}
                            disabled={!canEdit}
                            value={cell.resolve}
                            onChange={(event) =>
                              setTargets((current) => ({
                                ...current,
                                [key]: { ...current[key], resolve: Number(event.target.value) },
                              }))
                            }
                            className="w-16 px-2 py-1 font-mono text-xs"
                          />
                        </div>
                        <p className="mt-1 font-mono text-[10px] text-zinc-600">
                          {minutesLabel(cell.response)} / {minutesLabel(cell.resolve)}
                        </p>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="space-y-4 border-l border-zinc-800 p-6 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">Calendar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge tone="info">{timezone}</Badge>
              {is24x7 ? <Badge>24×7</Badge> : <Badge tone="success">Business hours</Badge>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cal-name">Name</Label>
              <Input id="cal-name" value={calendarName} disabled={!canEdit} onChange={(event) => setCalendarName(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tz">Timezone</Label>
              <Input id="tz" value={timezone} disabled={!canEdit} onChange={(event) => setTimezone(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Coverage</Label>
              <Select value={is24x7 ? '24' : 'bh'} disabled={!canEdit} onChange={(event) => setIs24x7(event.target.value === '24')}>
                <option value="bh">Business hours</option>
                <option value="24">24×7</option>
              </Select>
            </div>
            {!is24x7
              ? DISPLAY_DAYS.map((day) => (
                  <div key={day} className="grid grid-cols-[88px_1fr_1fr] items-center gap-2">
                    <p className="text-xs text-zinc-400">{DAY_LABEL[day]}</p>
                    <Input
                      type="time"
                      disabled={!canEdit}
                      value={hours[day].start}
                      onChange={(event) => setHours((current) => ({ ...current, [day]: { ...current[day], start: event.target.value } }))}
                      className="px-2 py-1 font-mono text-xs"
                    />
                    <Input
                      type="time"
                      disabled={!canEdit}
                      value={hours[day].end}
                      onChange={(event) => setHours((current) => ({ ...current, [day]: { ...current[day], end: event.target.value } }))}
                      className="px-2 py-1 font-mono text-xs"
                    />
                  </div>
                ))
              : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">Holidays</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {holidays.map((holiday, index) => (
              <div key={`${holiday.date}-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input
                  type="date"
                  disabled={!canEdit}
                  value={holiday.date}
                  onChange={(event) =>
                    setHolidays((current) => current.map((item, i) => (i === index ? { ...item, date: event.target.value } : item)))
                  }
                  className="px-2 py-1 font-mono text-xs"
                />
                <Input
                  disabled={!canEdit}
                  value={holiday.name ?? ''}
                  onChange={(event) =>
                    setHolidays((current) => current.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)))
                  }
                  className="px-2 py-1 text-xs"
                />
                {canEdit ? (
                  <button
                    type="button"
                    className="text-xs text-zinc-500 hover:text-zinc-200"
                    onClick={() => setHolidays((current) => current.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
            {canEdit ? (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => setHolidays((current) => [...current, { date: '', name: '' }])}
              >
                Add holiday
              </Button>
            ) : null}
            <p className="text-[11px] text-zinc-600">Ticket create snapshots this policy. Waiting/hold pauses the clock.</p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
