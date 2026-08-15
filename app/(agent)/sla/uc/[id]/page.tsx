import { notFound, redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { getUnderpinningContract } from '@/lib/uc/actions';
import { UcEditor } from '@/components/sla/uc-editor';

export default async function UcDetailPage({ params }: { params: { id: string } }) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'Sla')) {
    redirect('/dashboard');
  }
  const contract = await getUnderpinningContract(params.id);
  if (!contract) notFound();
  return <UcEditor contract={contract} canEdit={canRole(session.profile.role, 'update', 'Sla')} />;
}
