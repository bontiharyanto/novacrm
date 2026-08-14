'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { signInAction, type SignInState } from './actions';
import { NovaMark } from '@/components/brand/nova-mark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PreferenceControls } from '@/components/layout/preference-controls';
import { useI18n } from '@/components/layout/preferences-provider';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction] = useFormState(signInAction, null as SignInState);

  return (
    <div className="w-full max-w-md space-y-4">
      <div className="flex justify-end">
        <PreferenceControls compact />
      </div>
      <Card className="w-full">
        <CardHeader>
          <div className="mb-4 flex justify-center">
            <NovaMark size={56} />
          </div>
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">NovaCRM</p>
          <CardTitle className="mt-3 text-center">{t.login.title}</CardTitle>
          <CardDescription className="text-center">{t.login.hosted}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-4" action={formAction}>
            <input type="hidden" name="next" value={searchParams.get('next') || ''} />
            <div className="space-y-2">
              <Label htmlFor="email">{t.login.email}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t.login.password}</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-zinc-500 hover:text-zinc-200"
                  aria-label={showPassword ? t.login.hidePassword : t.login.showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {state?.error ? <p className="text-sm text-rose-400">{state.error}</p> : null}
            <SubmitButton />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
