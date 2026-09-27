'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { deleteAccount } from '@/lib/accounts/actions';
import type { AccountRecord } from '@/lib/accounts/schema';
import { toastError, toastSuccess } from '@/components/ui/toast';
import { useI18n } from '@/components/layout/preferences-provider';

export function AccountDeleteButton({ account }: { account: AccountRecord }) {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (account.type !== 'customer') return null;

  async function confirm() {
    setDeleting(true);
    const result = await deleteAccount(account.id);
    setDeleting(false);
    if (result.error) {
      toastError(result.error);
      return;
    }
    toastSuccess(t.accounts.deleted);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button type="button" className="text-[11px] text-zinc-500 hover:text-rose-300" onClick={() => setOpen(true)}>
        {t.accounts.deleteAccount}
      </button>
      <Dialog open={open} title={t.accounts.deleteTitle} onClose={() => (deleting ? undefined : setOpen(false))}>
        <p className="text-sm leading-6 text-zinc-400">
          {account.name} · {account.code ?? account.slug}
        </p>
        <p className="mt-2 text-[13px] leading-5 text-zinc-500">{t.accounts.deleteHint}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" size="sm" variant="ghost" disabled={deleting} onClick={() => setOpen(false)}>
            {t.common.cancel}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={deleting} onClick={() => void confirm()}>
            {deleting ? t.common.saving : t.accounts.deleteAccount}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
