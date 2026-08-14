import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { isCustomerRole } from '@/lib/rbac/roles';

export default async function HomePage() {
  const session = await getSessionProfile();
  if (!session) {
    redirect('/login');
  }
  if (isCustomerRole(session.profile.role)) {
    redirect('/portal');
  }
  redirect('/dashboard');
}
