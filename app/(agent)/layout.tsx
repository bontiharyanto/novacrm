import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { AbilityProvider } from '@/components/providers/ability-provider';
import { AgentShell } from '@/components/layout/admin-shell';
import { ACCOUNT_ALL } from '@/lib/accounts/schema';
import { getAccountScope } from '@/lib/accounts/scope';
import { isCustomerRole } from '@/lib/rbac/roles';
import { setActiveAccount } from '@/lib/accounts/actions';
import { getTenantConfig } from '@/lib/tenants/config';
import { resolveTenantLogoUrl } from '@/lib/tenants/logo';
import { accentCss } from '@/lib/tenants/accent';
import { AccentProvider } from '@/components/layout/accent-provider';

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionProfile();
  if (!session) {
    redirect('/login');
  }
  if (isCustomerRole(session.profile.role)) {
    redirect('/portal');
  }

  let scope = await getAccountScope(session);
  if (!scope.account && !scope.viewingAll && scope.accounts.length === 1) {
    await setActiveAccount(scope.accounts[0].id);
    scope = await getAccountScope(session);
  }

  const tenant = await getTenantConfig();
  const logoUrl = tenant
    ? await resolveTenantLogoUrl(tenant.id, tenant.logoObjectKey)
    : null;

  return (
    <AbilityProvider role={session.profile.role}>
      <style dangerouslySetInnerHTML={{ __html: accentCss(tenant?.accentColor) }} />
      <AccentProvider color={tenant?.accentColor} />
      <AgentShell
        role={session.profile.role}
        fullName={session.profile.fullName}
        userId={session.userId}
        accounts={scope.accounts}
        activeAccountId={scope.account?.id ?? (scope.accounts.length > 0 ? ACCOUNT_ALL : null)}
        idleTimeoutMinutes={tenant?.idleTimeoutMinutes ?? 30}
        logoUrl={logoUrl}
      >
        <div key={scope.account?.id ?? ACCOUNT_ALL}>{children}</div>
      </AgentShell>
    </AbilityProvider>
  );
}
