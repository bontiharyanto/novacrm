import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { UcEditor } from '@/components/sla/uc-editor';

export default async function NewUcPage() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Sla')) {
    redirect('/dashboard');
  }
  return <UcEditor canEdit={canRole(session.profile.role, 'create', 'Sla')} />;
}
