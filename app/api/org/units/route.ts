import { NextResponse } from 'next/server';
import { listOrgUnits } from '@/lib/org/actions';
import { requireApiUser } from '@/lib/api/require-user';

export async function GET() {
  const auth = await requireApiUser('read', 'Org');
  if (auth.error) return auth.error;
  const units = await listOrgUnits();
  return NextResponse.json({ data: units, error: null });
}
