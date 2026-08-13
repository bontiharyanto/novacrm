import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { OrgGroupCreate } from '@/components/org/org-group-create';

export default async function NewOrgGroupPage() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'Org')) {
    redirect('/org');
  }
  return <OrgGroupCreate />;
}
