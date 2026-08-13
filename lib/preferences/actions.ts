'use server';

import { cookies } from 'next/headers';
import { LOCALE_COOKIE, THEME_COOKIE, isLocale, isTheme, type Locale, type Theme } from '@/lib/preferences';

export async function setPreferences(input: { theme?: Theme; locale?: Locale }) {
  const store = cookies();
  if (isTheme(input.theme)) {
    store.set(THEME_COOKIE, input.theme, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  }
  if (isLocale(input.locale)) {
    store.set(LOCALE_COOKIE, input.locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  }
  return { data: { ok: true }, error: null };
}
