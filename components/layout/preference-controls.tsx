'use client';

import { Moon, Sun, Building2 } from 'lucide-react';
import { useI18n } from '@/components/layout/preferences-provider';
import { cn } from '@/lib/utils';

export function PreferenceControls({ compact = false }: { compact?: boolean }) {
  const { theme, locale, setTheme, setLocale, pending, t } = useI18n();

  return (
    <div className={cn('flex items-center gap-1', compact ? '' : 'w-full')}>
      <div className="flex rounded-md border border-zinc-800 p-0.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => setTheme('dark')}
          className={cn(
            'rounded-[5px] p-1.5 transition-colors',
            theme === 'dark' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-500 hover:text-zinc-200',
          )}
          aria-label={t.common.dark}
        >
          <Moon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setTheme('light')}
          className={cn(
            'rounded-[5px] p-1.5 transition-colors',
            theme === 'light' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-500 hover:text-zinc-200',
          )}
          aria-label={t.common.light}
        >
          <Sun className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setTheme('enterprise')}
          className={cn(
            'rounded-[5px] p-1.5 transition-colors',
            theme === 'enterprise' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-500 hover:text-zinc-200',
          )}
          aria-label={t.common.enterprise}
          title={t.appearance.enterpriseName}
        >
          <Building2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex rounded-md border border-zinc-800 p-0.5 font-mono text-[10px]">
        <button
          type="button"
          disabled={pending}
          onClick={() => setLocale('en')}
          className={cn(
            'rounded-[5px] px-1.5 py-1 uppercase tracking-wide transition-colors',
            locale === 'en' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-500 hover:text-zinc-200',
          )}
        >
          EN
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setLocale('id')}
          className={cn(
            'rounded-[5px] px-1.5 py-1 uppercase tracking-wide transition-colors',
            locale === 'id' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-500 hover:text-zinc-200',
          )}
        >
          ID
        </button>
      </div>
    </div>
  );
}
