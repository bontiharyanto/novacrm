import { formatDistanceToNow } from 'date-fns';
import { enUS, id } from 'date-fns/locale';
import type { Locale } from '@/lib/preferences';

export function formatRelativeId(value?: string | Date | null, locale: Locale = 'id') {
  if (!value) return '—';
  return formatDistanceToNow(new Date(value), { addSuffix: true, locale: locale === 'en' ? enUS : id });
}
