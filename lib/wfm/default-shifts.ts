export const DEFAULT_SHIFT_TEMPLATES = [
  { name: 'Pagi', startLocal: '08:00', endLocal: '16:00', days: [1, 2, 3, 4, 5] },
  { name: 'Siang', startLocal: '12:00', endLocal: '20:00', days: [1, 2, 3, 4, 5] },
  { name: 'Malam', startLocal: '21:00', endLocal: '05:00', days: [1, 2, 3, 4, 5, 6, 7] },
  { name: '24 jam', startLocal: '00:00', endLocal: '00:00', days: [1, 2, 3, 4, 5, 6, 7] },
] as const;

const SHIFT_ORDER = ['pagi', 'siang', 'malam', '24 jam'] as const;

export function isAroundTheClockShift(startLocal: string, endLocal: string) {
  return startLocal.slice(0, 5) === endLocal.slice(0, 5);
}

export function formatShiftHours(startLocal: string, endLocal: string) {
  if (isAroundTheClockShift(startLocal, endLocal)) return '1×24 jam';
  return `${startLocal.slice(0, 5)}-${endLocal.slice(0, 5)}`;
}

export function shiftTemplateLabel(name: string, startLocal: string, endLocal: string) {
  return `${name} ${formatShiftHours(startLocal, endLocal)}`;
}

export function sortShiftTemplates<T extends { name: string; startLocal: string }>(templates: T[]) {
  return [...templates].sort((left, right) => {
    const leftRank = SHIFT_ORDER.indexOf(left.name.trim().toLowerCase() as (typeof SHIFT_ORDER)[number]);
    const rightRank = SHIFT_ORDER.indexOf(right.name.trim().toLowerCase() as (typeof SHIFT_ORDER)[number]);
    if (leftRank === -1 && rightRank === -1) return left.startLocal.localeCompare(right.startLocal);
    if (leftRank === -1) return 1;
    if (rightRank === -1) return -1;
    return leftRank - rightRank;
  });
}

export function defaultShiftInsertRows(tenantId: string, accountId: string | null, createdBy: string | null) {
  return DEFAULT_SHIFT_TEMPLATES.map((template) => ({
    tenant_id: tenantId,
    account_id: accountId,
    name: template.name,
    start_local: template.startLocal,
    end_local: template.endLocal,
    days: [...template.days],
    timezone: 'Asia/Jakarta',
    is_active: true,
    created_by: createdBy,
  }));
}

export function isoWeekdayFromYmd(ymd: string) {
  const [year, month, day] = ymd.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export function eachYmd(fromDate: string, toDate: string) {
  const dates: string[] = [];
  let cursor = fromDate;
  while (cursor <= toDate) {
    dates.push(cursor);
    const [year, month, day] = cursor.split('-').map(Number);
    cursor = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
  }
  return dates;
}
