'use client';

import { Moon, Sun, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/components/layout/preferences-provider';
import { cn } from '@/lib/utils';
import type { Locale, Theme } from '@/lib/preferences';

function ThemePreview({ theme }: { theme: Theme }) {
  const dark = theme === 'dark';
  const enterprise = theme === 'enterprise';
  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border',
        dark ? 'border-zinc-700 bg-[#09090b]' : enterprise ? 'border-blue-200 bg-[#eef2f7]' : 'border-zinc-300 bg-[#f7f7f8]',
      )}
    >
      <div className="flex h-24">
        <div
          className={cn(
            'w-10 border-r',
            dark ? 'border-zinc-800 bg-[#09090b]' : enterprise ? 'border-blue-200 bg-[color-mix(in_srgb,var(--accent)_18%,white)]' : 'border-zinc-200 bg-white',
          )}
        >
          <div className={cn('mx-1.5 mt-2 h-2 rounded-sm', enterprise ? 'bg-[color-mix(in_srgb,var(--accent)_55%,#1e40af)]' : 'nova-accent-bar')} />
          <div className={cn('mx-1.5 mt-1.5 h-1.5 rounded-sm', dark ? 'bg-zinc-800' : enterprise ? 'bg-blue-100' : 'bg-zinc-200')} />
          <div className={cn('mx-1.5 mt-1 h-1.5 rounded-sm', dark ? 'bg-zinc-800' : enterprise ? 'bg-blue-50' : 'bg-zinc-200')} />
          <div className="mx-1.5 mt-1 h-1.5 rounded-sm bg-[color-mix(in_srgb,var(--accent)_40%,transparent)]" />
        </div>
        <div className="flex-1 p-2">
          <div className={cn('h-2 w-16 rounded-sm', dark ? 'bg-zinc-200' : enterprise ? 'bg-slate-700' : 'bg-zinc-800')} />
          <div
            className={cn(
              'mt-2 h-8 rounded-sm border',
              dark ? 'border-zinc-800 bg-zinc-900' : enterprise ? 'border-blue-100 bg-white' : 'border-zinc-200 bg-white',
            )}
          />
        </div>
      </div>
    </div>
  );
}

export function AppearanceSettings() {
  const { t, theme, locale, setTheme, setLocale, pending } = useI18n();

  const themes: Array<{ id: Theme; icon: typeof Moon; name: string; hint: string }> = [
    { id: 'dark', icon: Moon, name: t.appearance.darkName, hint: t.appearance.darkHint },
    { id: 'light', icon: Sun, name: t.appearance.lightName, hint: t.appearance.lightHint },
    { id: 'enterprise', icon: Building2, name: t.appearance.enterpriseName, hint: t.appearance.enterpriseHint },
  ];

  const languages: Array<{ id: Locale; name: string; native: string }> = [
    { id: 'en', name: t.common.english, native: 'EN' },
    { id: 'id', name: t.common.indonesian, native: 'ID' },
  ];

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-8 p-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">{t.appearance.kicker}</p>
          <h1 className="text-2xl font-semibold text-zinc-50">{t.appearance.title}</h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-500">{t.appearance.subtitle}</p>
        </div>

        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-medium text-zinc-50">{t.appearance.themeTitle}</h2>
            <p className="mt-0.5 text-[13px] text-zinc-500">{t.appearance.themeHint}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {themes.map((item) => {
              const active = theme === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={pending}
                  onClick={() => setTheme(item.id)}
                  className={cn(
                    'rounded-xl border p-3 text-left transition-all duration-200 ease-out hover:-translate-y-0.5',
                    active ? 'border-blue-500/50 bg-blue-500/10' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700',
                  )}
                >
                  <ThemePreview theme={item.id} />
                  <div className="mt-3 flex items-center gap-2">
                    <Icon className={cn('h-3.5 w-3.5', active ? 'text-blue-400' : 'text-zinc-500')} />
                    <p className="text-sm font-medium text-zinc-50">{item.name}</p>
                    {active ? (
                      <span className="ml-auto font-mono text-[10px] uppercase tracking-wide text-blue-400">active</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[12px] leading-5 text-zinc-500">{item.hint}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-medium text-zinc-50">{t.appearance.languageTitle}</h2>
            <p className="mt-0.5 text-[13px] text-zinc-500">{t.appearance.languageHint}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {languages.map((item) => {
              const active = locale === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={pending}
                  onClick={() => setLocale(item.id)}
                  className={cn(
                    'rounded-xl border px-4 py-4 text-left transition-all duration-200 ease-out hover:-translate-y-0.5',
                    active ? 'border-blue-500/50 bg-blue-500/10' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700',
                  )}
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">{item.native}</p>
                  <p className="mt-1 text-sm font-medium text-zinc-50">{item.name}</p>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <aside className="space-y-4 border-t border-zinc-800 bg-zinc-900/40 p-6 lg:border-l lg:border-t-0">
        <Card>
          <CardContent className="space-y-3 p-4 text-sm leading-6 text-zinc-400">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.appearance.preview}</p>
            <p>{t.appearance.previewBody}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-4 text-sm leading-6 text-zinc-400">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{t.appearance.howTitle}</p>
            <p>{t.appearance.howBody}</p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
