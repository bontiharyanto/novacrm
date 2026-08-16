import { format, formatDistanceToNow } from 'date-fns';
import { enUS, id } from 'date-fns/locale';
import type { Locale } from '@/lib/preferences';

function dateFnsLocale(locale: Locale) {
  return locale === 'en' ? enUS : id;
}

export function formatRelativeId(value?: string | Date | null, locale: Locale = 'id') {
  if (!value) return '—';
  return formatDistanceToNow(new Date(value), { addSuffix: true, locale: dateFnsLocale(locale) });
}

export function formatDateLong(value?: string | Date | null, locale: Locale = 'id') {
  if (!value) return '—';
  return format(new Date(value), 'd MMMM yyyy', { locale: dateFnsLocale(locale) });
}
