import { Suspense } from 'react';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <Suspense fallback={<div className="text-zinc-400">…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
