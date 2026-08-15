import { getDictionary } from '@/lib/i18n';
import { isLocale, type Locale } from '@/lib/preferences';
import { getPreferences } from '@/lib/preferences/server';

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
