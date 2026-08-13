'use client';

import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { signInAction, type SignInState } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PreferenceControls } from '@/components/layout/preference-controls';
import { useI18n } from '@/components/layout/preferences-provider';

function isLocalDemoHost(url: string) {
  return url.includes('127.0.0.1') || url.includes('localhost');
}

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useI18n();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? t.login.pending : t.login.submit}
    </Button>
  );
}

export function LoginForm() {
  const { t } = useI18n();
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
    <div className="w-full max-w-md space-y-4">
      <div className="flex justify-end">
        <PreferenceControls compact />
      </div>
    <Card className="w-full">
      <CardHeader>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-blue-400">{t.brand.name}</p>
        <CardTitle className="mt-2">{t.login.title}</CardTitle>
        <CardDescription>{isDemo ? t.login.demo : t.login.hosted}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-4" action={formAction}>
          <input type="hidden" name="next" value={searchParams.get('next') || ''} />
          <div className="space-y-2">
            <Label htmlFor="email">{t.login.email}</Label>
            <Input id="email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t.login.password}</Label>
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
    </div>
  );
}
