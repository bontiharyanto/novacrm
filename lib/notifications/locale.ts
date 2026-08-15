import { getDictionary } from '@/lib/i18n';
import { getPreferences, isLocale, type Locale } from '@/lib/preferences';

export function resolveNotificationLocale(explicit?: string | null): Locale {
  if (isLocale(explicit)) return explicit;
  try {
    return getPreferences().locale;
  } catch {
    return 'id';
  }
}

export function notificationCopy(locale?: string | null) {
  return getDictionary(resolveNotificationLocale(locale)).notifications;
}
