'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { savePasswordPolicy, type PasswordPolicy } from '@/lib/auth/password-policy';
import { ChangePasswordForm } from '@/components/auth/change-password-form';
import { useI18n } from '@/components/layout/preferences-provider';

type Factor = { id: string; status?: string; friendly_name?: string };

export function SecuritySettings({
  policy,
  factors,
  canToggle,
  forceEnroll,
  forcePassword,
  passwordPolicy,
  passwordDaysLeft,
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
  telegramChatId?: string;
  whatsappPhone?: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [required, setRequired] = useState(policy.required);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [telegramChatId, setTelegramChatId] = useState(initialTelegramChatId);
  const [whatsappPhone, setWhatsappPhone] = useState(initialWhatsAppPhone);
  const [rotationEnabled, setRotationEnabled] = useState(passwordPolicy?.enabled ?? true);
  const [maxAgeDays, setMaxAgeDays] = useState(String(passwordPolicy?.maxAgeDays ?? 30));

  async function saveToggle() {
    setSaving(true);
    const result = await setMfaRequired(required);
    setSaving(false);
    setMessage(result.error ?? (required ? 'MFA required for password staff after next login.' : 'MFA requirement off. Lab passwords still work.'));
    router.refresh();
  }

  async function beginEnroll() {
    setSaving(true);
    const result = await startMfaEnroll();
    setSaving(false);
    if (result.error || !result.data) {
      setMessage(result.error ?? 'Unable to start TOTP');
      return;
    }
    setEnroll(result.data);
    setMessage('Scan the QR in an authenticator app, then enter the 6-digit code.');
  }

  async function confirmEnroll() {
    if (!enroll) return;
    setSaving(true);
    const result = await verifyMfaEnroll(enroll.factorId, code);
    setSaving(false);
    setMessage(result.error ?? 'Authenticator enrolled.');
    if (!result.error) {
      setEnroll(null);
      setCode('');
      router.refresh();
    }
  }

  async function remove(factorId: string) {
    setSaving(true);
    const result = await unenrollOwnMfa(factorId);
    setSaving(false);
    setMessage(result.error ?? 'Authenticator removed.');
    router.refresh();
  }

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6 p-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Settings</p>
          <h1 className="text-2xl font-semibold text-zinc-50">Security</h1>
          <p className="mt-1 text-sm text-zinc-500">TOTP authenticator. Leave the tenant toggle off until production Auth is ready.</p>
        </div>
        {forceEnroll ? (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            This tenant requires MFA. Enroll an authenticator to continue.
          </p>
        ) : null}
        {message ? <p className="text-sm text-zinc-400">{message}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.portal.changePassword}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!forcePassword && passwordDaysLeft != null ? (
              <p className="text-xs text-zinc-500">{t.passwordPolicy.daysLeft.replace('{{n}}', String(passwordDaysLeft))}</p>
            ) : null}
            <ChangePasswordForm forced={forcePassword} afterHref={forcePassword ? '/dashboard' : undefined} />
          </CardContent>
        </Card>

        {canToggle ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.passwordPolicy.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs leading-5 text-zinc-500">{t.passwordPolicy.hint}</p>
              <label className="flex items-center gap-2 text-sm text-zinc-200">
                <input type="checkbox" checked={rotationEnabled} onChange={(event) => setRotationEnabled(event.target.checked)} />
                {t.passwordPolicy.enable}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  className="w-24"
                  inputMode="numeric"
                  value={maxAgeDays}
                  onChange={(event) => setMaxAgeDays(event.target.value)}
                />
                <span className="text-sm text-zinc-500">{t.passwordPolicy.days}</span>
              </div>
              <Button
                type="button"
                disabled={saving}
                onClick={() => {
                  void (async () => {
                    setSaving(true);
                    const result = await savePasswordPolicy({
                      enabled: rotationEnabled,
                      maxAgeDays: Number(maxAgeDays),
                    });
                    setSaving(false);
                    setMessage(result.error ?? t.common.saved);
                    if (!result.error) router.refresh();
                  })();
                }}
              >
                {t.passwordPolicy.save}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {canToggle ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Require MFA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-zinc-200">
                <input
                  type="checkbox"
                  checked={required}
                  disabled={policy.labLocked}
                  onChange={(event) => setRequired(event.target.checked)}
                />
                Require TOTP for password staff
              </label>
              {policy.labLocked ? (
                <p className="text-xs text-amber-300">Demo tenant is locked off so classroom logins stay `NovaCRM!2026`.</p>
              ) : (
                <p className="text-xs text-zinc-500">
                  Turn this on after hosted Supabase Auth MFA is enabled. SSO (Google / Microsoft) skips app TOTP.
                </p>
              )}
              <Button type="button" disabled={saving || policy.labLocked} onClick={() => void saveToggle()}>
                Save policy
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">WhatsApp</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-zinc-500">
              Nomor HP pribadi. Admin harus sudah mengisi API Key Fonnte di Integrations. Assign tiket ke Anda
              masuk ke nomor ini.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp-phone">Nomor WhatsApp</Label>
              <Input
                id="whatsapp-phone"
                inputMode="tel"
                value={whatsappPhone}
                onChange={(event) => setWhatsappPhone(event.target.value)}
                placeholder="0812xxxxxxxx"
              />
            </div>
            <Button
              type="button"
              disabled={saving}
              onClick={() => {
                void (async () => {
                  setSaving(true);
                  const result = await saveOwnWhatsAppPhone(whatsappPhone);
                  setSaving(false);
                  setMessage(result.error ?? 'Nomor WhatsApp disimpan. Assign tiket ke Anda akan masuk ke sini.');
                  if (!result.error && result.data?.phone) setWhatsappPhone(result.data.phone);
                  if (!result.error) router.refresh();
                })();
              }}
            >
              Simpan WhatsApp
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Telegram</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-zinc-500">
              Buka Telegram, cari <span className="font-mono text-zinc-300">@userinfobot</span>, kirim /start, salin
              Id. Admin harus sudah mengisi Bot Token di Integrations.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="telegram-chat-id">Chat ID</Label>
              <Input
                id="telegram-chat-id"
                inputMode="numeric"
                value={telegramChatId}
                onChange={(event) => setTelegramChatId(event.target.value)}
                placeholder="123456789"
              />
            </div>
            <Button
              type="button"
              disabled={saving}
              onClick={() => {
                void (async () => {
                  setSaving(true);
                  const result = await saveOwnTelegramChatId(telegramChatId);
                  setSaving(false);
                  setMessage(result.error ?? 'Telegram Chat ID disimpan. Assign tiket ke Anda akan masuk ke bot.');
                  if (!result.error) router.refresh();
                })();
              }}
            >
              Simpan Telegram
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Authenticator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {factors.length === 0 && !enroll ? (
              <p className="text-sm text-zinc-500">No TOTP factor yet. Optional until the tenant toggle is on.</p>
            ) : null}
            {factors.map((factor) => (
              <div key={factor.id} className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2">
                <div>
                  <p className="text-sm text-zinc-100">{factor.friendly_name || 'Authenticator'}</p>
                  <Badge tone={factor.status === 'verified' ? 'success' : 'neutral'}>{factor.status ?? 'totp'}</Badge>
                </div>
                <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => void remove(factor.id)}>
                  Remove
                </Button>
              </div>
            ))}
            {enroll ? (
              <div className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={enroll.qr} alt="TOTP QR" className="h-40 w-40 rounded-md border border-zinc-800 bg-white p-2" />
                <p className="font-mono text-xs text-zinc-500">{enroll.secret}</p>
                <div className="space-y-1.5">
                  <Label htmlFor="mfa-code">6-digit code</Label>
                  <Input id="mfa-code" inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value)} />
                </div>
                <Button type="button" disabled={saving || code.trim().length < 6} onClick={() => void confirmEnroll()}>
                  Verify and enroll
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" disabled={saving} onClick={() => void beginEnroll()}>
                Enroll authenticator
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
      <aside className="border-t border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-500 lg:border-l lg:border-t-0">
        Production: enable MFA in hosted Supabase Auth, enroll one admin, then flip Require MFA. Lost phone: another admin
        removes the factor from the user record.
      </aside>
    </div>
  );
}
