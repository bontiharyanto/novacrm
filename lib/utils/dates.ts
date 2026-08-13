import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

export function formatRelativeId(value?: string | Date | null) {
  if (!value) return '—';
  return formatDistanceToNow(new Date(value), { addSuffix: true, locale: id });
}
