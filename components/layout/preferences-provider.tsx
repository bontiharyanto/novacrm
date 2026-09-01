'use client';

import { createContext, useCallback, useContext, useMemo, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getDictionary, type Dictionary } from '@/lib/i18n';
import { setPreferences } from '@/lib/preferences/actions';
import type { Locale, Theme } from '@/lib/preferences';

type PreferencesContextValue = {
  locale: Locale;
  theme: Theme;
  t: Dictionary;
  pending: boolean;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({
  locale,
  theme,
  children,
}: {
  locale: Locale;
  theme: Theme;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const t = useMemo(() => getDictionary(locale), [locale]);

  const apply = useCallback(
    (next: { theme?: Theme; locale?: Locale }) => {
      startTransition(async () => {
        await setPreferences(next);
        if (next.theme) {
          document.documentElement.classList.remove('dark', 'light', 'enterprise');
          document.documentElement.classList.add(next.theme);
        }
        if (next.locale) {
          document.documentElement.lang = next.locale;
        }
        router.refresh();
      });
    },
    [router],
  );

  const value = useMemo<PreferencesContextValue>(
    () => ({
      locale,
      theme,
      t,
      pending,
      setTheme: (next) => apply({ theme: next }),
      setLocale: (next) => apply({ locale: next }),
    }),
    [apply, locale, pending, t, theme],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useI18n() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('useI18n must be used within PreferencesProvider');
  }
  return context;
}
