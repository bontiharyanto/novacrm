'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ChangePasswordForm } from '@/components/auth/change-password-form';
import { useI18n } from '@/components/layout/preferences-provider';
import { signOutAction } from '@/lib/auth/actions';

export function PortalPassword({ forced }: { forced?: boolean }) {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-xl space-y-6 p-4 pb-safe md:p-8">
      <div>
        {forced ? null : (
          <Link href="/portal" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
            <ArrowLeft className="h-3.5 w-3.5" /> {t.portal.home}
          </Link>
        )}
        <h1 className="mt-3 text-[28px] font-semibold tracking-tight text-zinc-50">{t.portal.changePassword}</h1>
        <p className="mt-1.5 text-sm text-zinc-500">{t.passwordPolicy.hint}</p>
      </div>
      <div className="nova-surface space-y-4 rounded-xl border p-5">
        <ChangePasswordForm forced={forced} afterHref={forced ? '/portal' : undefined} />
      </div>
      {forced ? (
        <form action={signOutAction}>
          <button type="submit" className="text-[12px] text-zinc-500 hover:text-zinc-200">
            {t.common.signOut}
          </button>
        </form>
      ) : null}
    </div>
  );
}
