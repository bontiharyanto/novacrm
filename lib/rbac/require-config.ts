import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { canAccessConfig, type ConfigModule } from '@/lib/rbac/ability';

export async function requireConfig(module: ConfigModule) {
  const session = await getSessionProfile();
  if (!session || !canAccessConfig(session.profile.role, module)) {
    redirect('/dashboard');
  }
}
