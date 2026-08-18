import { differenceInCalendarDays, format, startOfDay, subDays } from 'date-fns';
import type { ReportPreset } from '@/lib/reports/schema';

export const REPORT_MAX_DAYS = 366;
export type { ReportPreset };

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function parseDay(value: string | null | undefined): Date | null {
  if (!value || !DAY.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return startOfDay(date);
}

export function formatDay(value: Date) {
  return format(value, 'yyyy-MM-dd');
}

export type ReportPeriod = {
  start: Date;
  end: Date;
  startKey: string;
  endKey: string;
  rangeDays: number;
  preset: ReportPreset;
};

export function parseReportPeriod(input: {
  range?: string | number | null;
  from?: string | null;
  to?: string | null;
}): ReportPeriod {
  const today = startOfDay(new Date());
  const from = parseDay(input.from ?? undefined);
  const to = parseDay(input.to ?? undefined);

  if (from || to) {
    let start = from ?? subDays(today, 29);
    let end = to ?? today;
    if (start > end) {
      const swap = start;
      start = end;
      end = swap;
    }
    if (end > today) end = today;
    let rangeDays = differenceInCalendarDays(end, start) + 1;
    if (rangeDays < 1) {
      start = today;
      end = today;
      rangeDays = 1;
    }
    if (rangeDays > REPORT_MAX_DAYS) {
      start = subDays(end, REPORT_MAX_DAYS - 1);
      rangeDays = REPORT_MAX_DAYS;
    }
    return {
      start,
      end,
      startKey: formatDay(start),
      endKey: formatDay(end),
      rangeDays,
      preset: 'custom',
    };
  }

  const range =
    input.range === 90 || input.range === '90'
      ? 90
      : input.range === 30 || input.range === '30'
        ? 30
        : 7;
  const start = startOfDay(subDays(today, range - 1));
  return {
    start,
    end: today,
    startKey: formatDay(start),
    endKey: formatDay(today),
    rangeDays: range,
    preset: range,
  };
}

export function reportSearchParams(input: {
  preset: ReportPreset;
  from?: string;
  to?: string;
  format?: string;
  preview?: boolean;
  kind?: string;
}) {
  const params = new URLSearchParams();
  if (input.preset === 'custom' && input.from && input.to) {
    params.set('from', input.from);
    params.set('to', input.to);
  } else if (input.preset !== 'custom') {
    params.set('range', String(input.preset));
  }
  if (input.format) params.set('format', input.format);
  if (input.preview) params.set('preview', '1');
  if (input.kind) params.set('kind', input.kind);
  return params.toString();
}
