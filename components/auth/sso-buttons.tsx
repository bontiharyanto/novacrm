'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import type { SsoProviderOption } from '@/lib/auth/sso-types';
import { useI18n } from '@/components/layout/preferences-provider';

export function SsoButtons({ tenantSlug, nextPath }: { tenantSlug?: string; nextPath?: string }) {
  const { t } = useI18n();
  const [options, setOptions] = useState<SsoProviderOption[]>([]);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    const query = tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : '';
    void fetch(`/api/auth/sso${query}`)
      .then((response) => response.json())
      .then((payload) => setOptions(payload.data ?? []))
      .catch(() => setOptions([]));
  }, [tenantSlug]);

  if (options.length === 0) return null;

  async function start(option: SsoProviderOption) {
    if (!option.ready || !option.provider) {
      setError(option.hint ?? t.login.ssoUnavailable);
      return;
    }
    setPending(option.kind);
    setError('');
    try {
      const supabase = createSupabaseBrowserClient();
      const origin = window.location.origin;
      const callback = new URL('/auth/callback', origin);
      if (nextPath) callback.searchParams.set('next', nextPath);
      const slug = option.tenantSlug || tenantSlug;
      if (slug) callback.searchParams.set('tenant', slug);
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: option.provider,
        options: {
          redirectTo: callback.toString(),
          ...(option.provider === 'google' ? { queryParams: { prompt: 'select_account' } } : {}),
        },
      });
      if (oauthError) setError(oauthError.message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.login.ssoUnavailable);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-zinc-800" />
        </div>
        <p className="relative mx-auto w-fit bg-zinc-900 px-2 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
          {t.login.ssoOr}
        </p>
      </div>
      {options.map((option) => (
        <Button
          key={option.kind}
          type="button"
          variant="outline"
          className="w-full"
          disabled={pending === option.kind}
          onClick={() => void start(option)}
        >
          {option.label}
        </Button>
      ))}
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
    </div>
  );
}
