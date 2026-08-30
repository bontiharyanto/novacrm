'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  setMfaRequired,
  startMfaEnroll,
  unenrollOwnMfa,
  verifyMfaEnroll,
  type MfaPolicy,
} from '@/lib/auth/mfa';
import { saveOwnTelegramChatId, saveOwnWhatsAppPhone } from '@/lib/settings/telegram-link';
import { savePasswordPolicy } from '@/lib/auth/password-actions';
import { saveIdlePolicy } from '@/lib/auth/idle-actions';
import { IDLE_OPTIONS, parseIdleMinutes, type IdleMinutes } from '@/lib/auth/idle-timeout';
import type { PasswordPolicy } from '@/lib/auth/password-policy';
import { ChangePasswordForm } from '@/components/auth/change-password-form';
import { useI18n } from '@/components/layout/preferences-provider';
import { cn } from '@/lib/utils';

type Factor = { id: string; status?: string; friendly_name?: string };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">{title}</p>
      {children}
    </section>
  );
}

function CardFooter({ children }: { children: ReactNode }) {
  return <div className="flex justify-end border-t border-zinc-800/80 pt-4">{children}</div>;
}

export function SecuritySettings({
  policy,
  factors,
  canToggle,
  forceEnroll,
  forcePassword,
  passwordPolicy,
  passwordDaysLeft,
  idleMinutes: initialIdleMinutes = 30,
  telegramChatId: initialTelegramChatId = '',
  whatsappPhone: initialWhatsAppPhone = '',
}: {
  policy: MfaPolicy;
  factors: Factor[];
  canToggle: boolean;
  forceEnroll?: boolean;
  forcePassword?: boolean;
  passwordPolicy?: PasswordPolicy;
  passwordDaysLeft?: number;
  idleMinutes?: number;
  telegramChatId?: string;
  whatsappPhone?: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const copy = t.securityPage;
  const [required, setRequired] = useState(policy.required);
  const [message, setMessage] = useState('');
  const [savingMfa, setSavingMfa] = useState(false);
  const [savingEnroll, setSavingEnroll] = useState(false);
  const [savingFactor, setSavingFactor] = useState(false);
  const [savingPasswordPolicy, setSavingPasswordPolicy] = useState(false);
  const [savingIdlePolicy, setSavingIdlePolicy] = useState(false);
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [telegramChatId, setTelegramChatId] = useState(initialTelegramChatId);
  const [whatsappPhone, setWhatsappPhone] = useState(initialWhatsAppPhone);
  const [rotationEnabled, setRotationEnabled] = useState(passwordPolicy?.enabled ?? true);
  const [maxAgeDays, setMaxAgeDays] = useState(String(passwordPolicy?.maxAgeDays ?? 30));
  const [idleMinutes, setIdleMinutes] = useState<IdleMinutes>(parseIdleMinutes(initialIdleMinutes));

  async function saveToggle() {
    setSavingMfa(true);
    const result = await setMfaRequired(required);
    setSavingMfa(false);
    setMessage(result.error ?? (required ? copy.mfaHint : copy.mfaLab));
    router.refresh();
  }

  async function beginEnroll() {
    setSavingEnroll(true);
    const result = await startMfaEnroll();
    setSavingEnroll(false);
    if (result.error || !result.data) {
      setMessage(result.error ?? 'Unable to start TOTP');
      return;
    }
    setEnroll(result.data);
    setMessage(copy.totpVerify);
  }

  async function confirmEnroll() {
    if (!enroll) return;
    setSavingEnroll(true);
    const result = await verifyMfaEnroll(enroll.factorId, code);
    setSavingEnroll(false);
    setMessage(result.error ?? t.common.saved);
    if (!result.error) {
      setEnroll(null);
      setCode('');
      router.refresh();
    }
  }

  async function remove(factorId: string) {
    setSavingFactor(true);
    const result = await unenrollOwnMfa(factorId);
    setSavingFactor(false);
    setMessage(result.error ?? t.common.saved);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">{copy.kicker}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">{t.nav.security}</h1>
          <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-500">{copy.subtitle}</p>
        </div>
      </div>

      {forceEnroll ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {copy.forceEnroll}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-300">{message}</p>
      ) : null}

      {canToggle ? (
        <Section title={copy.tenant}>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-base">{t.passwordPolicy.title}</CardTitle>
                <CardDescription className="text-xs leading-5">{t.passwordPolicy.hint}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-5 pt-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-zinc-200">
                    <input
                      type="checkbox"
                      checked={rotationEnabled}
                      onChange={(event) => setRotationEnabled(event.target.checked)}
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-950"
                    />
                    {t.passwordPolicy.enable}
                  </label>
                  <div className="flex h-9 items-center overflow-hidden rounded-md border border-zinc-800 bg-zinc-950">
                    <input
                      className="h-full w-16 bg-transparent text-center text-sm text-zinc-100 outline-none"
                      inputMode="numeric"
                      value={maxAgeDays}
                      onChange={(event) => setMaxAgeDays(event.target.value)}
                    />
                    <span className="border-l border-zinc-800 px-2.5 text-xs text-zinc-500">{t.passwordPolicy.days}</span>
                  </div>
                </div>
                <CardFooter>
                  <Button
                    type="button"
                    size="sm"
                    disabled={savingPasswordPolicy}
                    onClick={() => {
                      void (async () => {
                        setSavingPasswordPolicy(true);
                        const result = await savePasswordPolicy({
                          enabled: rotationEnabled,
                          maxAgeDays: Number(maxAgeDays),
                        });
                        setSavingPasswordPolicy(false);
                        setMessage(result.error ?? t.common.saved);
                        if (!result.error) router.refresh();
                      })();
                    }}
                  >
                    {t.passwordPolicy.save}
                  </Button>
                </CardFooter>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-base">{t.idlePolicy.title}</CardTitle>
                <CardDescription className="text-xs leading-5">{t.idlePolicy.hint}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-5 pt-3">
                <div className="grid grid-cols-4 gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-1">
                  {IDLE_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setIdleMinutes(option)}
                      className={cn(
                        'rounded-md px-2 py-1.5 text-xs transition-colors',
                        idleMinutes === option
                          ? 'bg-zinc-800 text-zinc-50 nova-accent-chip'
                          : 'text-zinc-500 hover:text-zinc-200',
                      )}
                    >
                      {option === 0 ? t.idlePolicy.off : t.idlePolicy.minutes.replace('{{n}}', String(option))}
                    </button>
                  ))}
                </div>
                <CardFooter>
                  <Button
                    type="button"
                    size="sm"
                    disabled={savingIdlePolicy}
                    onClick={() => {
                      void (async () => {
                        setSavingIdlePolicy(true);
                        const result = await saveIdlePolicy({ minutes: idleMinutes });
                        setSavingIdlePolicy(false);
                        setMessage(result.error ?? t.common.saved);
                        if (!result.error) router.refresh();
                      })();
                    }}
                  >
                    {t.idlePolicy.save}
                  </Button>
                </CardFooter>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-base">{copy.mfaTitle}</CardTitle>
                <CardDescription className="text-xs leading-5">
                  {policy.labLocked ? copy.mfaLab : copy.mfaHint}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-5 pt-3">
                <label className="flex items-center gap-2 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    checked={required}
                    disabled={policy.labLocked}
                    onChange={(event) => setRequired(event.target.checked)}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-950"
                  />
                  {copy.mfaRequire}
                </label>
                <CardFooter>
                  <Button type="button" size="sm" disabled={savingMfa || policy.labLocked} onClick={() => void saveToggle()}>
                    {copy.mfaSave}
                  </Button>
                </CardFooter>
              </CardContent>
            </Card>
          </div>
        </Section>
      ) : null}

      <Section title={copy.account}>
        <Card>
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base">{t.portal.changePassword}</CardTitle>
            {!forcePassword && passwordDaysLeft != null ? (
              <CardDescription className="text-xs">
                {t.passwordPolicy.daysLeft.replace('{{n}}', String(passwordDaysLeft))}
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className="p-5 pt-3">
            <ChangePasswordForm forced={forcePassword} afterHref={forcePassword ? '/dashboard' : undefined} />
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-base">WhatsApp</CardTitle>
              <CardDescription className="text-xs leading-5">{copy.waHint}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-5 pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="whatsapp-phone">{copy.waLabel}</Label>
                <Input
                  id="whatsapp-phone"
                  inputMode="tel"
                  value={whatsappPhone}
                  onChange={(event) => setWhatsappPhone(event.target.value)}
                  placeholder="0812xxxxxxxx"
                />
              </div>
              <CardFooter>
                <Button
                  type="button"
                  size="sm"
                  disabled={savingWhatsApp}
                  onClick={() => {
                    void (async () => {
                      setSavingWhatsApp(true);
                      const result = await saveOwnWhatsAppPhone(whatsappPhone);
                      setSavingWhatsApp(false);
                      setMessage(result.error ?? t.common.saved);
                      if (!result.error && result.data?.phone) setWhatsappPhone(result.data.phone);
                      if (!result.error) router.refresh();
                    })();
                  }}
                >
                  {copy.waSave}
                </Button>
              </CardFooter>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-base">Telegram</CardTitle>
              <CardDescription className="text-xs leading-5">{copy.tgHint}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-5 pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="telegram-chat-id">{copy.tgLabel}</Label>
                <Input
                  id="telegram-chat-id"
                  inputMode="numeric"
                  value={telegramChatId}
                  onChange={(event) => setTelegramChatId(event.target.value)}
                  placeholder="123456789"
                />
              </div>
              <CardFooter>
                <Button
                  type="button"
                  size="sm"
                  disabled={savingTelegram}
                  onClick={() => {
                    void (async () => {
                      setSavingTelegram(true);
                      const result = await saveOwnTelegramChatId(telegramChatId);
                      setSavingTelegram(false);
                      setMessage(result.error ?? t.common.saved);
                      if (!result.error) router.refresh();
                    })();
                  }}
                >
                  {copy.tgSave}
                </Button>
              </CardFooter>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base">Authenticator</CardTitle>
            {factors.length === 0 && !enroll ? (
              <CardDescription className="text-xs">{copy.totpEmpty}</CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3 p-5 pt-3">
            {factors.map((factor) => (
              <div
                key={factor.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-zinc-100">{factor.friendly_name || 'Authenticator'}</p>
                  <Badge tone={factor.status === 'verified' ? 'success' : 'neutral'}>{factor.status ?? 'totp'}</Badge>
                </div>
                <Button type="button" variant="outline" size="sm" disabled={savingFactor} onClick={() => void remove(factor.id)}>
                  {copy.totpRemove}
                </Button>
              </div>
            ))}
            {enroll ? (
              <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={enroll.qr} alt="TOTP QR" className="h-40 w-40 rounded-md border border-zinc-800 bg-white p-2" />
                <div className="space-y-3">
                  <p className="break-all font-mono text-xs text-zinc-500">{enroll.secret}</p>
                  <div className="space-y-1.5">
                    <Label htmlFor="mfa-code">{copy.totpCode}</Label>
                    <Input id="mfa-code" inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value)} />
                  </div>
                  <Button type="button" size="sm" disabled={savingEnroll || code.trim().length < 6} onClick={() => void confirmEnroll()}>
                    {copy.totpVerify}
                  </Button>
                </div>
              </div>
            ) : (
              <CardFooter>
                <Button type="button" variant="outline" size="sm" disabled={savingEnroll} onClick={() => void beginEnroll()}>
                  {copy.totpEnroll}
                </Button>
              </CardFooter>
            )}
          </CardContent>
        </Card>
      </Section>

      <Card>
        <CardHeader className="p-5 pb-2">
          <CardTitle className="text-base">{copy.notes}</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-2">
          <p className="max-w-3xl text-sm leading-6 text-zinc-500">{copy.notesBody}</p>
        </CardContent>
      </Card>
    </div>
  );
}
