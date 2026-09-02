import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { MfaChallenge } from '@/components/auth/mfa-challenge';
import { NovaMark } from '@/components/brand/nova-mark';

export default async function LoginMfaPage({ searchParams }: { searchParams?: { next?: string } }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase.auth.mfa.listFactors();
  const factor = data?.totp.find((item) => item.status === 'verified') ?? data?.totp[0];
  if (!factor) redirect('/settings/security?enroll=1');

  return (
    <div className="auth-page flex min-h-dvh flex-col bg-zinc-950">
      <div className="flex items-center gap-2.5 px-5 py-4 pt-safe md:px-8">
        <NovaMark size={28} />
        <span className="text-[13px] font-medium tracking-tight text-zinc-100">NovaCRM</span>
      </div>
      <div className="flex flex-1 items-center justify-center px-5 py-10 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="w-full max-w-[400px] space-y-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Authenticator</h1>
            <p className="text-sm text-zinc-500">Enter the 6-digit code from your authenticator app.</p>
          </div>
          <MfaChallenge factorId={factor.id} nextPath={searchParams?.next} />
        </div>
      </div>
    </div>
  );
}
