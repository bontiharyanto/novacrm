'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { WfmNav } from '@/components/wfm/wfm-nav';
import { useI18n } from '@/components/layout/preferences-provider';
import { toastError, toastSuccess } from '@/components/ui/toast';
import {
  ISO_WEEKDAYS,
  SHIFT_TIMEZONES,
  formatShiftHours,
  isAroundTheClockShift,
} from '@/lib/wfm/default-shifts';
import { createShiftTemplate, setShiftTemplateActive, updateShiftTemplate } from '@/lib/wfm/actions';
import type { WfmShiftTemplate } from '@/lib/wfm/schema';

const DAY_KEYS = ['dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat', 'daySun'] as const;

type Draft = {
  name: string;
  startLocal: string;
  endLocal: string;
  days: number[];
  timezone: string;
};

function toDraft(template: WfmShiftTemplate): Draft {
  return {
    name: template.name,
    startLocal: template.startLocal,
    endLocal: template.endLocal,
    days: [...template.days],
    timezone: template.timezone,
  };
}

function emptyDraft(): Draft {
  return {
    name: '',
    startLocal: '08:00',
    endLocal: '16:00',
    days: [1, 2, 3, 4, 5],
    timezone: 'Asia/Jakarta',
  };
}

function toggleDay(days: number[], day: number) {
  return days.includes(day) ? days.filter((value) => value !== day) : [...days, day].sort((a, b) => a - b);
}

function DayPills({
  days,
  disabled,
  labels,
  onToggle,
}: {
  days: number[];
  disabled?: boolean;
  labels: string[];
  onToggle: (day: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {ISO_WEEKDAYS.map((day, index) => {
        const on = days.includes(day);
        return (
          <button
            key={day}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(day)}
            className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] ${
              on ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-500 hover:text-zinc-300'
            } disabled:opacity-50`}
          >
            {labels[index]}
          </button>
        );
      })}
    </div>
  );
}

export function WfmShifts({
  templates,
  canEdit,
}: {
  templates: WfmShiftTemplate[];
  canEdit: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const dayLabels = DAY_KEYS.map((key) => t.wfm[key]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [create, setCreate] = useState<Draft>(emptyDraft);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      templates.map((template) => ({
        template,
        draft: drafts[template.id] ?? toDraft(template),
      })),
    [templates, drafts],
  );

  function patch(id: string, current: Draft, patchValue: Partial<Draft>) {
    setDrafts((state) => ({ ...state, [id]: { ...current, ...patchValue } }));
  }

  async function save(id: string, draft: Draft, isActive: boolean) {
    if (draft.days.length === 0) {
      toastError(t.wfm.shiftFailed);
      return;
    }
    setPendingId(id);
    try {
      const result = await updateShiftTemplate({
        id,
        name: draft.name,
        startLocal: draft.startLocal,
        endLocal: draft.endLocal,
        days: draft.days,
        timezone: draft.timezone,
        isActive,
      });
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess(t.wfm.shiftSaved);
      router.refresh();
    } catch {
      toastError(t.wfm.shiftFailed);
    } finally {
      setPendingId(null);
    }
  }

  async function createShift() {
    if (create.days.length === 0) {
      toastError(t.wfm.shiftFailed);
      return;
    }
    setPendingId('create');
    try {
      const result = await createShiftTemplate({
        name: create.name,
        startLocal: create.startLocal,
        endLocal: create.endLocal,
        days: create.days,
        timezone: create.timezone,
        isActive: true,
      });
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess(t.wfm.shiftCreated);
      setCreate(emptyDraft());
      router.refresh();
    } catch {
      toastError(t.wfm.shiftFailed);
    } finally {
      setPendingId(null);
    }
  }

  async function setActive(id: string, isActive: boolean) {
    setPendingId(id);
    try {
      const result = await setShiftTemplateActive({ id, isActive });
      if (result.error) {
        toastError(result.error);
        return;
      }
      toastSuccess(isActive ? t.wfm.shiftActivated : t.wfm.shiftDeactivated);
      router.refresh();
    } catch {
      toastError(t.wfm.shiftFailed);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <WfmNav />
      <p className="text-sm text-zinc-500">{t.wfm.shiftsHint}</p>
      <p className="text-xs text-amber-400/90">{t.wfm.shiftHoursLive}</p>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
          {t.wfm.shiftEmpty}
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map(({ template, draft }) => {
            const overnight = draft.endLocal < draft.startLocal;
            const around = isAroundTheClockShift(draft.startLocal, draft.endLocal);
            const busy = pendingId === template.id;
            return (
              <section key={template.id} className="rounded-xl border border-zinc-800 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-zinc-50">{template.name}</p>
                      <Badge tone={template.isActive ? 'success' : 'neutral'}>
                        {template.isActive ? t.wfm.shiftActive : t.wfm.shiftInactive}
                      </Badge>
                      {template.rosterCount ? (
                        <span className="font-mono text-[11px] text-zinc-500">
                          {t.wfm.shiftInUse.replace('{{n}}', String(template.rosterCount))}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-zinc-500">
                      {formatShiftHours(draft.startLocal, draft.endLocal)}
                      {overnight ? ` · ${t.wfm.shiftOvernight}` : null}
                      {around ? ` · ${t.wfm.shiftAroundClock}` : null}
                    </p>
                  </div>
                  {canEdit ? (
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" disabled={busy} onClick={() => void save(template.id, draft, template.isActive)}>
                        {t.common.save}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void setActive(template.id, !template.isActive)}
                      >
                        {template.isActive ? t.wfm.shiftHide : t.wfm.shiftShow}
                      </Button>
                    </div>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <Input
                    value={draft.name}
                    disabled={!canEdit}
                    onChange={(event) => patch(template.id, draft, { name: event.target.value })}
                    placeholder={t.wfm.shifts}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="time"
                      value={draft.startLocal}
                      disabled={!canEdit}
                      onChange={(event) => patch(template.id, draft, { startLocal: event.target.value.slice(0, 5) })}
                    />
                    <Input
                      type="time"
                      value={draft.endLocal}
                      disabled={!canEdit}
                      onChange={(event) => patch(template.id, draft, { endLocal: event.target.value.slice(0, 5) })}
                    />
                  </div>
                  <Select
                    value={draft.timezone}
                    disabled={!canEdit}
                    onChange={(event) => patch(template.id, draft, { timezone: event.target.value })}
                  >
                    {SHIFT_TIMEZONES.map((zone) => (
                      <option key={zone} value={zone}>
                        {zone}
                      </option>
                    ))}
                    {SHIFT_TIMEZONES.some((zone) => zone === draft.timezone) ? null : (
                      <option value={draft.timezone}>{draft.timezone}</option>
                    )}
                  </Select>
                  <DayPills
                    days={draft.days}
                    disabled={!canEdit}
                    labels={dayLabels}
                    onToggle={(day) => patch(template.id, draft, { days: toggleDay(draft.days, day) })}
                  />
                </div>
              </section>
            );
          })}
        </div>
      )}

      {canEdit ? (
        <section className="rounded-xl border border-zinc-800 p-4">
          <h2 className="mb-3 text-sm font-medium text-zinc-50">{t.wfm.shiftNew}</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Input
              value={create.name}
              onChange={(event) => setCreate((current) => ({ ...current, name: event.target.value }))}
              placeholder={t.wfm.shifts}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="time"
                value={create.startLocal}
                onChange={(event) =>
                  setCreate((current) => ({ ...current, startLocal: event.target.value.slice(0, 5) }))
                }
              />
              <Input
                type="time"
                value={create.endLocal}
                onChange={(event) =>
                  setCreate((current) => ({ ...current, endLocal: event.target.value.slice(0, 5) }))
                }
              />
            </div>
            <Select
              value={create.timezone}
              onChange={(event) => setCreate((current) => ({ ...current, timezone: event.target.value }))}
            >
              {SHIFT_TIMEZONES.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </Select>
            <DayPills
              days={create.days}
              labels={dayLabels}
              onToggle={(day) => setCreate((current) => ({ ...current, days: toggleDay(current.days, day) }))}
            />
          </div>
          <div className="mt-3">
            <Button size="sm" disabled={pendingId === 'create'} onClick={() => void createShift()}>
              {t.wfm.shiftNew}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
