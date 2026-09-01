import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { listAssignableAgents } from '@/lib/profiles/actions';
import { WfmReviewForm } from '@/components/wfm/wfm-review-form';

export default async function WfmReviewNewPage() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'create', 'StaffReview')) redirect('/wfm/reviews');
  const staff = await listAssignableAgents();
  return (
    <WfmReviewForm
      reviewerId={session.userId}
      staff={staff.map((agent) => ({ id: agent.id, fullName: agent.fullName }))}
      canManageWfm={canRole(session.profile.role, 'create', 'Wfm')}
    />
  );
}
