import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AppRole } from '@/lib/rbac/ability';

export type SessionProfile = {
  id: string;
  tenantId: string;
  role: AppRole;
  fullName: string;
  email?: string;
  phone?: string;
  telegramChatId?: string;
};

export type AppSession = {
  userId: string;
  profile: SessionProfile;
};

function isConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && !url.includes('example.supabase.co'));
}

export async function getSessionProfile(): Promise<AppSession | null> {
  if (!isConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, tenant_id, role, full_name, email, phone, telegram_chat_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      return null;
    }

    return {
      userId: user.id,
      profile: {
        id: profile.id,
        tenantId: profile.tenant_id,
        role: profile.role as AppRole,
        fullName: profile.full_name,
        email: profile.email ?? user.email,
        phone: profile.phone ?? undefined,
        telegramChatId: profile.telegram_chat_id ?? undefined,
      },
    };
  } catch {
    return null;
  }
}
