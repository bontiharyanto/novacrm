'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toastError, toastSuccess } from '@/components/ui/toast';
import { useI18n } from '@/components/layout/preferences-provider';
import { changeOwnPassword } from '@/lib/auth/actions';

export function ChangePasswordForm({
  forced,
  afterHref,
}: {
  forced?: boolean;
  afterHref?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
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
    if (afterHref) router.replace(afterHref);
    else router.refresh();
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      {forced ? (
        <p className="rounded-lg border border-amber-500/35 bg-amber-500/[0.08] px-3 py-2 text-[13px] leading-5 text-amber-200">
          {t.passwordPolicy.expired}
        </p>
      ) : null}
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
    </form>
  );
}
