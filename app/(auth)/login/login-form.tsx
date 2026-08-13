'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const isDemo = process.env.NODE_ENV !== 'production';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(isDemo ? 'admin@novacrm.app' : '');
  const [password, setPassword] = useState(isDemo ? 'NovaCRM!2026' : '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [envReady, setEnvReady] = useState(true);

  useEffect(() => {
    void fetch('/api/health')
      .then((response) => response.json())
      .then((payload) => {
        setEnvReady(Boolean(payload.data?.envConfigured));
      })
      .catch(() => setEnvReady(false));
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError(signInError.message);
        setIsSubmitting(false);
        return;
      }

      const next = searchParams.get('next') || '/';
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
      setIsSubmitting(false);
    }
  }

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
        {!envReady ? (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Supabase belum terhubung. Jalankan <span className="font-mono">npm run local:setup</span> lalu{' '}
            <span className="font-mono">npm run local:dev</span>. Lihat docs/LOCAL.md.
          </p>
        ) : null}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </div>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <Button type="submit" disabled={isSubmitting || !envReady} className="w-full">
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
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
