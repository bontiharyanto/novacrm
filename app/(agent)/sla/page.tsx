import { getAccountSlaAgreement } from '@/lib/sla/actions';
import { getAccountScope } from '@/lib/accounts/scope';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { SlaDashboard } from '@/components/sla/sla-dashboard';
import { redirect } from 'next/navigation';

export default async function SlaPage() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Sla')) {
    redirect('/dashboard');
  }
  const [agreement, scope] = await Promise.all([getAccountSlaAgreement(), getAccountScope(session)]);

  return (
    <SlaDashboard
      agreement={agreement}
      canEdit={canRole(session.profile.role, 'update', 'Sla')}
      accountName={scope.account?.name}
    />
  );
}
