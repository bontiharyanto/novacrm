'use client';

import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { signInAction, type SignInState } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function isLocalDemoHost(url: string) {
  return url.includes('127.0.0.1') || url.includes('localhost');
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Signing in...' : 'Sign in'}
    </Button>
  );
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const [isDemo, setIsDemo] = useState(false);
  const [email, setEmail] = useState('admin@novacrm.app');
  const [password, setPassword] = useState('NovaCRM!2026');
  const [state, formAction] = useFormState(signInAction, null as SignInState);

  useEffect(() => {
    const injected = typeof window !== 'undefined' ? window.__NOVACRM_ENV?.supabaseUrl ?? '' : '';
    setIsDemo(isLocalDemoHost(injected) || process.env.NODE_ENV !== 'production');
  }, []);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-blue-400">NovaCRM</p>
        <CardTitle className="mt-2">Sign in</CardTitle>
        <CardDescription>
          {isDemo
            ? 'Local test: admin / agent / customer on the same tenant.'
            : 'Gunakan akun tenant Anda untuk masuk ke operations desk.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-4" action={formAction}>
          <input type="hidden" name="next" value={searchParams.get('next') || ''} />
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {state?.error ? <p className="text-sm text-rose-400">{state.error}</p> : null}
          <SubmitButton />
        </form>
        {isDemo ? (
          <div className="space-y-1 font-mono text-[11px] text-zinc-500">
            <p>admin@novacrm.app / NovaCRM!2026</p>
            <p>agent@novacrm.app / NovaCRM!2026</p>
            <p>customer@novacrm.app / NovaCRM!2026</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
