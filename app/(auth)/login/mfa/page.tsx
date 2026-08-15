import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { MfaChallenge } from '@/components/auth/mfa-challenge';

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
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6">
      <MfaChallenge factorId={factor.id} nextPath={searchParams?.next} />
    </div>
  );
}
