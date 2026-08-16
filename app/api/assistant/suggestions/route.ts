import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/require-user';
import { listPortalTicketSuggestions } from '@/lib/assistant/portal-suggestions';
import { getPreferences } from '@/lib/preferences/server';

export async function GET() {
  const auth = await requireApiUser('read', 'Ticket');
  if (auth.error) return auth.error;

  const data = await listPortalTicketSuggestions(getPreferences().locale);
  return NextResponse.json({ data, error: null });
}
