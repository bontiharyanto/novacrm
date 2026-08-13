import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/auth/session';

export async function getNotificationSettingsFromDb() {
  const session = await getSessionProfile();
  if (!session) {
    return { data: [], error: 'Unauthorized' };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('notification_channels')
    .select('*')
    .eq('tenant_id', session.profile.tenantId)
    .eq('is_active', true)
    .limit(20);

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data ?? [], error: null };
}
