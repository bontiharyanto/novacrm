import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { CONFIG_MODULES, type ConfigModule } from '@/lib/rbac/ability';
import { canAccessConfiguredCapability } from '@/lib/rbac/capability-actions';

export async function requireConfig(module: ConfigModule) {
  const session = await getSessionProfile();
  const rule = CONFIG_MODULES[module];
  if (!session || !(await canAccessConfiguredCapability(rule.action, rule.subject))) {
    redirect('/dashboard');
  }
}
