import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { AbilityProvider } from '@/components/providers/ability-provider';
import { AgentShell } from '@/components/layout/admin-shell';
import { getAccountScope } from '@/lib/accounts/scope';

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionProfile();
  if (!session) {
    redirect('/login');
  }
  if (session.profile.role === 'customer') {
    redirect('/portal');
  }

  const scope = await getAccountScope(session);

  return (
    <AbilityProvider role={session.profile.role}>
      <AgentShell
        role={session.profile.role}
        fullName={session.profile.fullName}
        accounts={scope.accounts}
        activeAccountId={scope.account?.id ?? null}
      >
        <div key={scope.account?.id ?? 'none'}>{children}</div>
      </AgentShell>
    </AbilityProvider>
  );
}
