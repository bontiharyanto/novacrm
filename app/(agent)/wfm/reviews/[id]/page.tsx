import { notFound, redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { getStaffReview } from '@/lib/reviews/actions';
import { WfmReviewDetail } from '@/components/wfm/wfm-review-detail';

export default async function WfmReviewDetailPage({ params }: { params: { id: string } }) {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'StaffReview')) redirect('/dashboard');
  const review = await getStaffReview(params.id);
  if (!review) notFound();
  return (
    <WfmReviewDetail
      review={review}
      userId={session.userId}
      canEditDraft={canRole(session.profile.role, 'update', 'StaffReview')}
      canRefreshAi={
        canRole(session.profile.role, 'update', 'StaffReview') &&
        (review.status === 'draft' || canRole(session.profile.role, 'manage', 'Wfm'))
      }
    />
  );
}
