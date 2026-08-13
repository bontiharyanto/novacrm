import { cookies } from 'next/headers';

export const THEMES = ['dark', 'light'] as const;
export const LOCALES = ['en', 'id'] as const;

export type Theme = (typeof THEMES)[number];
export type Locale = (typeof LOCALES)[number];

export const THEME_COOKIE = 'novacrm_theme';
export const LOCALE_COOKIE = 'novacrm_locale';

export function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light';
}

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'id';
}

export function getPreferences() {
  const store = cookies();
  const themeValue = store.get(THEME_COOKIE)?.value;
  const localeValue = store.get(LOCALE_COOKIE)?.value;
  return {
    theme: isTheme(themeValue) ? themeValue : 'dark',
    locale: isLocale(localeValue) ? localeValue : 'id',
  };
}
