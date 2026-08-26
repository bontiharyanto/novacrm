import { Suspense } from 'react';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-zinc-950 text-sm text-zinc-500">…</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
