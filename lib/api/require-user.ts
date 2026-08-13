import { NextResponse } from 'next/server';
import { getSessionProfile, type AppSession } from '@/lib/auth/session';
import { canRole, type Actions, type Subjects } from '@/lib/rbac/ability';

export async function requireApiUser(action?: Actions, subject?: Subjects): Promise<
  | { session: AppSession; error: null }
  | { session: null; error: NextResponse }
> {
  const session = await getSessionProfile();

  if (!session) {
    return {
      session: null,
      error: NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (action && subject && !canRole(session.profile.role, action, subject)) {
    return {
      session: null,
      error: NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { session, error: null };
}
