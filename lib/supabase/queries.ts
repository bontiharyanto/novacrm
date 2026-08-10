import { supabase } from '@/lib/supabase/client';

export async function getNotificationSettingsFromDb() {
  const { data, error } = await supabase
    .from('notification_channels')
    .select('*')
    .eq('is_active', true)
    .limit(20);

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data ?? [], error: null };
}

export async function upsertNotificationSettingsDb(payload: Record<string, unknown>) {
  const { data, error } = await supabase.from('notification_channels').upsert(payload, {
    onConflict: 'id',
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function listTicketsFromDb() {
  const { data, error } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data ?? [], error: null };
}
