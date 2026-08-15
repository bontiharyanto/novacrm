import { cookies } from 'next/headers';
import { isLocale, isTheme, LOCALE_COOKIE, THEME_COOKIE } from '@/lib/preferences';

export function getPreferences() {
  const store = cookies();
  const themeValue = store.get(THEME_COOKIE)?.value;
  const localeValue = store.get(LOCALE_COOKIE)?.value;
  return {
    theme: isTheme(themeValue) ? themeValue : 'dark',
    locale: isLocale(localeValue) ? localeValue : 'id',
  };
}
