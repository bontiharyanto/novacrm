import { NextResponse } from 'next/server';
import { getGovernanceSnapshot } from '@/lib/governance/actions';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET() {
  const auth = await requireApiUser('read', 'Governance');
  if (auth.error) return auth.error;
  if (auth.session.profile.role === 'customer') {
    return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 });
  }
  const data = await getGovernanceSnapshot();
  return NextResponse.json({ data, error: data ? null : 'Unable to load governance' });
}
