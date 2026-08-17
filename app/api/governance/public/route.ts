import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/config/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ data: { enabled: false }, error: null });
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('privacy_settings')
      .select('is_published')
      .eq('is_published', true)
      .limit(1)
      .maybeSingle();
    return NextResponse.json({ data: { enabled: Boolean(data) }, error: null });
  } catch {
    return NextResponse.json({ data: { enabled: false }, error: null });
  }
}
