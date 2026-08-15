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
