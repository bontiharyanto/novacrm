import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/config/env';
import { parseAppRole, type AppRole } from '@/lib/rbac/roles';

export type SessionProfile = {
  id: string;
  tenantId: string;
  role: AppRole;
  fullName: string;
  email?: string;
  phone?: string;
  telegramChatId?: string;
  site?: string;
  clientIp?: string;
};

export type AppSession = {
  userId: string;
  profile: SessionProfile;
};

export async function getSessionProfile(): Promise<AppSession | null> {
  if (!isSupabaseConfigured()) {
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
      .select('id, tenant_id, role, full_name, email, phone, telegram_chat_id, site, client_ip')
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
        role: parseAppRole(profile.role),
        fullName: profile.full_name,
        email: profile.email ?? user.email,
        phone: profile.phone ?? undefined,
        telegramChatId: profile.telegram_chat_id ?? undefined,
        site: profile.site ?? undefined,
        clientIp: profile.client_ip ?? undefined,
      },
    };
  } catch {
    return null;
  }
}
