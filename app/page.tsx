import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/session';

export default async function HomePage() {
  const session = await getSessionProfile();
  if (!session) {
    redirect('/login');
  }
  if (session.profile.role === 'customer') {
    redirect('/portal');
  }
  redirect('/tickets');
}
