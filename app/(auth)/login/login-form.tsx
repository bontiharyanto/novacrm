'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, ShieldCheck, Workflow } from 'lucide-react';
import { signInAction, type SignInState } from './actions';
import { NovaMark, NovaWordmark } from '@/components/brand/nova-mark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PreferenceControls } from '@/components/layout/preference-controls';
import { useI18n } from '@/components/layout/preferences-provider';
import { SsoButtons } from '@/components/auth/sso-buttons';
import { usePublicPrivacyEnabled } from '@/components/portal/privacy-module';
import { cn } from '@/lib/utils';

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useI18n();
  return (
    <Button type="submit" disabled={pending} className="h-10 w-full text-[13px] font-medium">
      {pending ? t.login.pending : t.login.submit}
    </Button>
  );
}

export function LoginForm() {
  const { t } = useI18n();
  const { enabled: privacyEnabled } = usePublicPrivacyEnabled();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction] = useFormState(signInAction, null as SignInState);
  const tenantSlug = searchParams.get('tenant')?.trim() || '';
  const nextPath = searchParams.get('next')?.trim() || '';
  const ssoError = searchParams.get('error');
  const ssoMessage =
    ssoError === 'sso_email'
      ? t.login.ssoEmail
      : ssoError === 'sso_denied'
        ? t.login.ssoDenied
        : ssoError === 'sso'
          ? t.login.ssoFailed
          : ssoError === 'tenant_paused'
            ? t.login.tenantPaused
            : ssoError === 'tenant_expired'
              ? t.login.tenantExpired
              : ssoError === 'idle'
                ? t.login.idleTimeout
                : '';

  const points = [
    { icon: Workflow, text: t.login.points.desk },
    { icon: ShieldCheck, text: t.login.points.portal },
    { icon: Lock, text: t.login.points.cmdb },
  ];

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <aside className="relative hidden overflow-hidden border-r border-zinc-800/80 bg-zinc-950 lg:flex lg:flex-col">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgb(39 39 42 / 0.45) 1px, transparent 1px), linear-gradient(to bottom, rgb(39 39 42 / 0.45) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse at 30% 20%, black 0%, transparent 70%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-1 flex-col justify-between p-10 xl:p-14">
          <NovaWordmark subtitle={t.brand.operations} size={36} />
          <div className="max-w-md space-y-8">
            <div className="space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">{t.brand.name}</p>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 xl:text-4xl">{t.login.tagline}</h1>
            </div>
            <ul className="space-y-3">
              {points.map((point) => {
                const Icon = point.icon;
                return (
                  <li key={point.text} className="flex items-start gap-3 text-[13px] leading-5 text-zinc-400">
                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/70">
                      <Icon className="h-3.5 w-3.5 nova-accent-icon" />
                    </span>
                    <span>{point.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="text-[11px] text-zinc-600">{t.login.secureHint}</p>
        </div>
      </aside>

      <section className="relative flex flex-col bg-zinc-950">
        <div className="flex items-center justify-between gap-3 px-5 py-4 pt-safe md:px-8">
          <div className="flex items-center gap-2.5 lg:invisible">
            <NovaMark size={28} />
            <span className="text-[13px] font-medium tracking-tight text-zinc-100">{t.brand.name}</span>
          </div>
          <PreferenceControls compact />
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-[400px] space-y-6"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-50">{t.login.title}</h2>
              <p className="text-sm leading-6 text-zinc-500">{t.login.hosted}</p>
              {tenantSlug ? (
                <p className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 px-2.5 py-1 font-mono text-[11px] text-zinc-300">
                  <span className="uppercase tracking-[0.14em] text-zinc-500">{t.login.workspace}</span>
                  {tenantSlug}
                </p>
              ) : null}
            </div>

            <div className="space-y-4 rounded-xl border border-zinc-800/90 bg-zinc-900/30 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">{t.login.continueEmail}</p>
              <form className="space-y-4" action={formAction}>
                <input type="hidden" name="next" value={searchParams.get('next') || ''} />
                <div className="space-y-2">
                  <Label htmlFor="email">{t.login.email}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-10"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t.login.password}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className={cn(
                        'absolute inset-y-0 right-0 flex w-10 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-200',
                      )}
                      aria-label={showPassword ? t.login.hidePassword : t.login.showPassword}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {state?.error || ssoMessage ? (
                  <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                    {state?.error ?? ssoMessage}
                  </p>
                ) : null}
                <SubmitButton />
              </form>

              <SsoButtons tenantSlug={tenantSlug || undefined} nextPath={nextPath || undefined} />
            </div>

            {privacyEnabled ? (
              <p className="text-center text-[12px] leading-5 text-zinc-500">
                {t.pdp.loginAck}{' '}
                <Link href="/privacy" className="nova-accent-text underline-offset-2 hover:underline">
                  {t.pdp.readNotice}
                </Link>
              </p>
            ) : null}

            <p className="text-center text-[11px] text-zinc-600">{t.brand.copyright}</p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
