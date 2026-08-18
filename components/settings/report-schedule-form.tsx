'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useI18n } from '@/components/layout/preferences-provider';
import { saveReportSchedule, sendReportScheduleNow } from '@/lib/reports/schedule-actions';
import { REPORT_SEND_HOURS, type ReportSchedule } from '@/lib/reports/schedule-schema';
import { formatRelativeId } from '@/lib/utils/dates';

export function ReportScheduleForm({ initial }: { initial: ReportSchedule }) {
  const { t, locale } = useI18n();
  const copy = t.reportSchedule;
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');

  function patch<K extends keyof ReportSchedule>(key: K, value: ReportSchedule[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{copy.kicker}</p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-50">{copy.title}</h1>
        <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-500">{copy.subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{copy.cardTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-zinc-200">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => patch('isActive', event.target.checked)}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-950"
            />
            {copy.enabled}
          </label>

          <div className="space-y-1.5">
            <Label htmlFor="recipients">{copy.recipients}</Label>
            <Input
              id="recipients"
              value={form.recipients}
              onChange={(event) => patch('recipients', event.target.value)}
              placeholder={copy.recipientsHint}
            />
            <p className="text-[11px] text-zinc-500">{copy.recipientsHelp}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{copy.range}</Label>
              <Select
                value={String(form.rangeDays)}
                onChange={(event) => patch('rangeDays', Number(event.target.value) as 1 | 7 | 30)}
              >
                <option value="1">{copy.rangeYesterday}</option>
                <option value="7">{copy.range7}</option>
                <option value="30">{copy.range30}</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{copy.sendHour}</Label>
              <Select
                value={String(form.sendHour)}
                onChange={(event) => patch('sendHour', Number(event.target.value))}
              >
                {REPORT_SEND_HOURS.map((hour) => (
                  <option key={hour} value={hour}>
                    {String(hour).padStart(2, '0')}:00
                  </option>
                ))}
              </Select>
              <p className="text-[11px] text-zinc-500">{copy.timezoneHint}</p>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-200">
            <input
              type="checkbox"
              checked={form.includeAging}
              onChange={(event) => patch('includeAging', event.target.checked)}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-950"
            />
            {copy.includeAging}
          </label>

          {form.lastSentAt ? (
            <p className="text-xs text-zinc-500">
              {copy.lastSent} {formatRelativeId(form.lastSentAt, locale)}
              {form.lastOk === false && form.lastError ? ` · ${form.lastError}` : ''}
            </p>
          ) : (
            <p className="text-xs text-zinc-500">{copy.neverSent}</p>
          )}

          {message ? <p className="text-sm text-zinc-300">{message}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={saving}
              onClick={() => {
                void (async () => {
                  setSaving(true);
                  const result = await saveReportSchedule(form);
                  setSaving(false);
                  setMessage(result.error ?? copy.saved);
                  if (result.data) setForm(result.data);
                })();
              }}
            >
              {copy.save}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={testing}
              onClick={() => {
                void (async () => {
                  setTesting(true);
                  const saved = await saveReportSchedule(form);
                  if (saved.error || !saved.data) {
                    setTesting(false);
                    setMessage(saved.error ?? copy.sendFailed);
                    return;
                  }
                  setForm(saved.data);
                  const result = await sendReportScheduleNow();
                  setTesting(false);
                  setMessage(result.error ?? copy.sent);
                })();
              }}
            >
              {copy.sendNow}
            </Button>
            <Link
              href="/reports"
              className="inline-flex items-center rounded-md px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
            >
              {copy.openReports}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
