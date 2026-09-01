import { notFound, redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { listAssignableAgents } from '@/lib/profiles/actions';
import { getStaffReview } from '@/lib/reviews/actions';
import { WfmReviewForm } from '@/components/wfm/wfm-review-form';

export default async function WfmReviewEditPage({ params }: { params: { id: string } }) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'update', 'StaffReview')) redirect('/wfm/reviews');
  const review = await getStaffReview(params.id);
  if (!review) notFound();
  if (review.status !== 'draft') redirect(`/wfm/reviews/${review.id}`);
  const staff = await listAssignableAgents();
  return (
    <WfmReviewForm
      review={review}
      reviewerId={session.userId}
      staff={staff.map((agent) => ({ id: agent.id, fullName: agent.fullName }))}
      canManageWfm={canRole(session.profile.role, 'create', 'Wfm')}
    />
  );
}
