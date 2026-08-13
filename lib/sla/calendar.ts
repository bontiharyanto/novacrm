export const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type DayKey = (typeof WEEKDAYS)[number];

export type SlaCalendarConfig = {
  timezone: string;
  is24x7: boolean;
  businessHours: Partial<Record<DayKey, Array<[string, string]>>>;
  holidays: string[];
};

const WEEKDAY_FROM_SHORT: Record<string, DayKey> = {
  Sun: 'sun',
  Mon: 'mon',
  Tue: 'tue',
  Wed: 'wed',
  Thu: 'thu',
  Fri: 'fri',
  Sat: 'sat',
};

export const OFFICE_HOURS: SlaCalendarConfig['businessHours'] = {
  mon: [['08:00', '17:00']],
  tue: [['08:00', '17:00']],
  wed: [['08:00', '17:00']],
  thu: [['08:00', '17:00']],
  fri: [['08:00', '17:00']],
  sat: [],
  sun: [],
};

export const EXTENDED_HOURS: SlaCalendarConfig['businessHours'] = {
  mon: [['07:00', '21:00']],
  tue: [['07:00', '21:00']],
  wed: [['07:00', '21:00']],
  thu: [['07:00', '21:00']],
  fri: [['07:00', '21:00']],
  sat: [['08:00', '13:00']],
  sun: [],
};

function partsInZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const map: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    weekday: WEEKDAY_FROM_SHORT[map.weekday] ?? 'mon',
    dateKey: `${map.year}-${map.month}-${map.day}`,
  };
}

export function fromZoned(timeZone: string, year: number, month: number, day: number, hour: number, minute: number) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const parts = partsInZone(new Date(utcGuess), timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  return new Date(utcGuess + (utcGuess - asUtc));
}

function parseHm(value: string) {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function windowsForDay(calendar: SlaCalendarConfig, dateKey: string, weekday: DayKey) {
  if (calendar.holidays.includes(dateKey)) return [];
  return (calendar.businessHours[weekday] ?? []).map(([start, end]) => [parseHm(start), parseHm(end)] as const);
}

function nextCivilDay(year: number, month: number, day: number) {
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

export function addBusinessMinutes(from: Date, minutes: number, calendar: SlaCalendarConfig) {
  if (minutes <= 0) return from;
  if (calendar.is24x7) return new Date(from.getTime() + minutes * 60_000);

  let remaining = minutes;
  let cursor = from;
  for (let step = 0; step < 900; step += 1) {
    const parts = partsInZone(cursor, calendar.timezone);
    const windows = windowsForDay(calendar, parts.dateKey, parts.weekday);
    const cursorMin = parts.hour * 60 + parts.minute;
    for (const [start, end] of windows) {
      const windowStart = Math.max(cursorMin, start);
      if (windowStart >= end) continue;
      const available = end - windowStart;
      if (remaining <= available) {
        const total = windowStart + remaining;
        return fromZoned(calendar.timezone, parts.year, parts.month, parts.day, Math.floor(total / 60), total % 60);
      }
      remaining -= available;
    }
    const next = nextCivilDay(parts.year, parts.month, parts.day);
    cursor = fromZoned(calendar.timezone, next.year, next.month, next.day, 0, 0);
  }
  return cursor;
}

export function remainingBusinessMinutes(from: Date, until: Date, calendar: SlaCalendarConfig) {
  if (until.getTime() <= from.getTime()) return 0;
  if (calendar.is24x7) return Math.round((until.getTime() - from.getTime()) / 60_000);

  let total = 0;
  let cursor = from;
  for (let step = 0; step < 900; step += 1) {
    if (cursor.getTime() >= until.getTime()) break;
    const parts = partsInZone(cursor, calendar.timezone);
    const windows = windowsForDay(calendar, parts.dateKey, parts.weekday);
    const cursorMin = parts.hour * 60 + parts.minute;
    const untilParts = partsInZone(until, calendar.timezone);
    const sameDay = parts.dateKey === untilParts.dateKey;
    const untilMin = sameDay ? untilParts.hour * 60 + untilParts.minute : 24 * 60;
    for (const [start, end] of windows) {
      const windowStart = Math.max(cursorMin, start);
      const windowEnd = Math.min(end, untilMin);
      if (windowEnd > windowStart) total += windowEnd - windowStart;
    }
    if (sameDay) break;
    const next = nextCivilDay(parts.year, parts.month, parts.day);
    cursor = fromZoned(calendar.timezone, next.year, next.month, next.day, 0, 0);
  }
  return total;
}

export function toCalendarConfig(row: {
  timezone?: string | null;
  is_24x7?: boolean | null;
  business_hours?: SlaCalendarConfig['businessHours'] | null;
  holidays?: Array<{ date?: string } | string> | null;
}): SlaCalendarConfig {
  const holidays = (row.holidays ?? [])
    .map((item) => (typeof item === 'string' ? item : item.date))
    .filter((item): item is string => Boolean(item));
  return {
    timezone: row.timezone || 'Asia/Jakarta',
    is24x7: Boolean(row.is_24x7),
    businessHours: row.business_hours ?? OFFICE_HOURS,
    holidays,
  };
}
