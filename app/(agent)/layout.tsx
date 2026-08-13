import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { AbilityProvider } from '@/components/providers/ability-provider';
import { AgentShell } from '@/components/layout/admin-shell';

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionProfile();
  if (!session) {
    redirect('/login');
  }
  if (session.profile.role === 'customer') {
    redirect('/portal');
  }

  return (
    <AbilityProvider role={session.profile.role}>
      <AgentShell role={session.profile.role} fullName={session.profile.fullName}>
        {children}
      </AgentShell>
    </AbilityProvider>
  );
}
