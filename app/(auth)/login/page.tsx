import { Suspense } from 'react';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-950 px-4 py-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Suspense fallback={<div className="text-zinc-400">…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
