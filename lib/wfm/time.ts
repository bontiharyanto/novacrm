const OPEN_STATUSES = new Set(['open', 'in_progress', 'waiting', 'hold']);

export function isOpenTicketStatus(status: string) {
  return OPEN_STATUSES.has(status);
}

export function hhmm(value: string) {
  return value.slice(0, 5);
}

function zonedOffsetMs(timeZone: string, instant: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour) % 24,
    Number(map.minute),
    Number(map.second),
  );
  return asUtc - instant.getTime();
}

export function zonedTimeToUtc(ymd: string, time: string, timeZone: string) {
  const [year, month, day] = ymd.split('-').map(Number);
  const [hour, minute] = hhmm(time).split(':').map(Number);
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offset = zonedOffsetMs(timeZone, new Date(utc));
  utc -= offset;
  const offset2 = zonedOffsetMs(timeZone, new Date(utc));
  if (offset2 !== offset) utc = Date.UTC(year, month - 1, day, hour, minute, 0) - offset2;
  return new Date(utc);
}

export function zonedYmd(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function isoDow(date: Date, timeZone: string) {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date);
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return map[weekday] ?? 1;
}

export function addDaysYmd(ymd: string, days: number) {
  const [year, month, day] = ymd.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

export function shiftWindow(workDate: string, startLocal: string, endLocal: string, timeZone: string) {
  const start = zonedTimeToUtc(workDate, startLocal, timeZone);
  let end = zonedTimeToUtc(workDate, endLocal, timeZone);
  if (end.getTime() <= start.getTime()) {
    end = zonedTimeToUtc(addDaysYmd(workDate, 1), endLocal, timeZone);
  }
  return { start, end };
}

export function isWithinShift(
  at: Date,
  workDate: string,
  startLocal: string,
  endLocal: string,
  timeZone: string,
) {
  const { start, end } = shiftWindow(workDate, startLocal, endLocal, timeZone);
  return at.getTime() >= start.getTime() && at.getTime() < end.getTime();
}

export function pickActiveOrTodayShift<
  T extends { workDate: string; startLocal: string; endLocal: string; timezone?: string },
>(entries: T[], at: Date, timeZone = 'Asia/Jakarta') {
  const today = zonedYmd(at, timeZone);
  const active = entries.find((entry) =>
    isWithinShift(at, entry.workDate, entry.startLocal, entry.endLocal, entry.timezone ?? timeZone),
  );
  if (active) return { entry: active, withinShift: true };
  const planned = entries.find((entry) => entry.workDate === today);
  return { entry: planned ?? null, withinShift: false };
}

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
