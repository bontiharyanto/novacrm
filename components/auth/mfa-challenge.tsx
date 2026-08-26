'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { verifyMfaLogin } from '@/lib/auth/mfa';

export function MfaChallenge({ factorId, nextPath }: { factorId: string; nextPath?: string }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const result = await verifyMfaLogin(factorId, code);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace(
      nextPath && nextPath.startsWith('/')
        ? `${nextPath}${nextPath.includes('?') ? '&' : '?'}welcome=1`
        : '/dashboard?welcome=1',
    );
    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-800/90 bg-zinc-900/30 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        <div className="space-y-2">
          <Label htmlFor="totp">6-digit code</Label>
          <Input
            id="totp"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="h-10 font-mono tracking-[0.2em]"
          />
        </div>
        {error ? (
          <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>
        ) : null}
        <Button type="submit" className="h-10 w-full" disabled={pending || code.trim().length < 6}>
          {pending ? 'Verifying…' : 'Continue'}
        </Button>
      </form>
    </div>
  );
}
