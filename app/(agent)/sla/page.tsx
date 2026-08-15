import { getAccountSlaAgreement } from '@/lib/sla/actions';
import { listUnderpinningContracts } from '@/lib/uc/actions';
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
  const [agreement, scope, contracts] = await Promise.all([
    getAccountSlaAgreement(),
    getAccountScope(session),
    listUnderpinningContracts(),
  ]);

  return (
    <SlaDashboard
      agreement={agreement}
      contracts={contracts}
      canEdit={canRole(session.profile.role, 'update', 'Sla')}
      accountName={scope.account?.name}
    />
  );
}
