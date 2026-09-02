import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { ACCOUNT_ALL } from '@/lib/accounts/schema';
import { getAccountScope } from '@/lib/accounts/scope';
import { setActiveAccount } from '@/lib/accounts/actions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SelectAccountForm } from './select-account-form';

function safeNextPath(value: string | undefined) {
  if (!value) return '/dashboard';
  if (value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/portal')) return value;
  return '/dashboard';
}

export default async function SelectAccountPage({
  searchParams,
}: {
  searchParams: { next?: string; change?: string };
}) {
  const session = await getSessionProfile();
  if (!session) redirect('/login');
  if (session.profile.role === 'customer') redirect('/portal');

  const nextPath = safeNextPath(searchParams.next);
  const scope = await getAccountScope(session);

  if (scope.accounts.length === 0) {
    redirect('/dashboard');
  }

  if (scope.accounts.length === 1) {
    await setActiveAccount(scope.accounts[0].id);
    redirect(nextPath);
  }

  if (searchParams.change !== '1') {
    redirect(nextPath);
  }

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('last_account_id')
    .eq('id', session.userId)
    .maybeSingle();

  return (
    <div className="auth-page flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <SelectAccountForm
        accounts={scope.accounts}
        lastAccountId={scope.account?.id ?? (scope.viewingAll ? ACCOUNT_ALL : profile?.last_account_id) ?? ACCOUNT_ALL}
        nextPath={nextPath}
      />
    </div>
  );
}
