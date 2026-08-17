import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { isStaffRole, isTenantAdminRole } from '@/lib/rbac/roles';
import { getMfaPolicy, listOwnMfaFactors } from '@/lib/auth/mfa';
import { getOwnPasswordStatus } from '@/lib/auth/password-actions';
import { getIdlePolicy } from '@/lib/auth/idle-actions';
import { SecuritySettings } from '@/components/settings/security-settings';

export default async function SecurityPage({ searchParams }: { searchParams?: { enroll?: string; expired?: string } }) {
  const session = await getSessionProfile();
  if (!session || !isStaffRole(session.profile.role)) {
    redirect('/login');
  }
  const [policy, factors, password, idle] = await Promise.all([
    getMfaPolicy(),
    listOwnMfaFactors(),
    getOwnPasswordStatus(),
    getIdlePolicy(),
  ]);
  return (
    <SecuritySettings
      policy={policy}
      factors={factors.data}
      canToggle={isTenantAdminRole(session.profile.role)}
      forceEnroll={searchParams?.enroll === '1'}
      forcePassword={searchParams?.expired === '1' || password.status.expired}
      passwordPolicy={password.policy}
      passwordDaysLeft={password.status.daysLeft}
      idleMinutes={idle.minutes}
      telegramChatId={session.profile.telegramChatId ?? ''}
      whatsappPhone={session.profile.phone ?? ''}
    />
  );
}
