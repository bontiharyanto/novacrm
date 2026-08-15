'use server';

import { getSessionProfile } from '@/lib/auth/session';
import { isStaffRole } from '@/lib/rbac/roles';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function normalizeChatId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (!/^-?\d{5,20}$/.test(trimmed)) return null;
  return trimmed;
}

export async function saveOwnTelegramChatId(chatId: string) {
  const session = await getSessionProfile();
  if (!session || !isStaffRole(session.profile.role)) {
    return { data: null, error: 'Unauthorized' };
  }

  const normalized = normalizeChatId(chatId);
  if (normalized === null) {
    return { data: null, error: 'Chat ID harus angka (contoh 123456789).' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('profiles')
    .update({ telegram_chat_id: normalized || null })
    .eq('id', session.userId)
    .eq('tenant_id', session.profile.tenantId);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: { chatId: normalized }, error: null };
}

function normalizeWhatsAppPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  let phone = digits;
  if (phone.startsWith('0')) phone = `62${phone.slice(1)}`;
  if (phone.startsWith('8') && phone.length >= 9 && phone.length <= 13) phone = `62${phone}`;
  if (!/^62\d{8,15}$/.test(phone)) return null;
  return phone;
}

export async function saveOwnWhatsAppPhone(phone: string) {
  const session = await getSessionProfile();
  if (!session || !isStaffRole(session.profile.role)) {
    return { data: null, error: 'Unauthorized' };
  }

  const normalized = normalizeWhatsAppPhone(phone);
  if (normalized === null) {
    return { data: null, error: 'Nomor WhatsApp tidak valid. Contoh 0812… atau 62812…' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('profiles')
    .update({ phone: normalized || null })
    .eq('id', session.userId)
    .eq('tenant_id', session.profile.tenantId);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: { phone: normalized }, error: null };
}
