'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    router.replace(nextPath && nextPath.startsWith('/') ? `${nextPath}${nextPath.includes('?') ? '&' : '?'}welcome=1` : '/dashboard?welcome=1');
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center">Authenticator</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          <div className="space-y-1.5">
            <Label htmlFor="totp">6-digit code</Label>
            <Input id="totp" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} />
          </div>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending || code.trim().length < 6}>
            {pending ? 'Verifying…' : 'Continue'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
