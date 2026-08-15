import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';
import { canRole } from '@/lib/rbac/ability';
import { listStaffReviews } from '@/lib/reviews/actions';
import { WfmReviews } from '@/components/wfm/wfm-reviews';

export default async function WfmReviewsPage() {
  const session = await getSessionProfile();
  if (!session || !canRole(session.profile.role, 'read', 'StaffReview')) redirect('/dashboard');
  const reviews = await listStaffReviews();
  return <WfmReviews reviews={reviews} canCreate={canRole(session.profile.role, 'create', 'StaffReview')} />;
}
