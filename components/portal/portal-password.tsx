'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toastError, toastSuccess } from '@/components/ui/toast';
import { useI18n } from '@/components/layout/preferences-provider';
import { changeOwnPassword } from '@/lib/auth/actions';

export function PortalPassword() {
  const { t } = useI18n();
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (nextPassword !== confirm) {
      setError(t.portal.passwordMismatch);
      return;
    }
    setSaving(true);
    setError('');
    const result = await changeOwnPassword(currentPassword, nextPassword);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      toastError(result.error);
      return;
    }
    setCurrentPassword('');
    setNextPassword('');
    setConfirm('');
    toastSuccess(t.portal.passwordSaved);
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mx-auto max-w-xl space-y-6 p-4 pb-safe md:p-8">
      <div>
        <Link href="/portal" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
          <ArrowLeft className="h-3.5 w-3.5" /> {t.portal.home}
        </Link>
        <h1 className="mt-3 text-[28px] font-semibold tracking-tight text-zinc-50">{t.portal.changePassword}</h1>
      </div>

      <div className="nova-surface space-y-4 rounded-xl border p-5">
        <div className="space-y-2">
          <Label htmlFor="current">{t.portal.currentPassword}</Label>
          <Input
            id="current"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="next">{t.portal.newPassword}</Label>
          <Input
            id="next"
            type="password"
            autoComplete="new-password"
            value={nextPassword}
            onChange={(event) => setNextPassword(event.target.value)}
            required
            minLength={8}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">{t.portal.confirmPassword}</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
            minLength={8}
          />
        </div>
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        <Button type="submit" disabled={saving || currentPassword.length < 1 || nextPassword.length < 8}>
          {saving ? t.common.save : t.portal.changePassword}
        </Button>
      </div>
    </form>
  );
}
