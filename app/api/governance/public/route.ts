import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('privacy_settings').select('is_published').eq('is_published', true).limit(1).maybeSingle();
  return NextResponse.json({ data: { enabled: Boolean(data) }, error: null });
}
