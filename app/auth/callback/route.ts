import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ACCOUNT_ALL, ACCOUNT_COOKIE } from '@/lib/accounts/schema';
import { finalizeSsoProfile } from '@/lib/auth/sso';
import { homePathForRole, isCustomerRole, parseAppRole } from '@/lib/rbac/roles';

function safeNextPath(value: string) {
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return '';
}

function safeSlug(value: string) {
  return /^[a-z0-9-]{2,80}$/.test(value) ? value : '';
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = safeNextPath(request.nextUrl.searchParams.get('next') ?? '');
  const tenantSlug = safeSlug(request.nextUrl.searchParams.get('tenant') ?? '');

  if (!code) {
    return NextResponse.redirect(new URL(`/login?error=sso${tenantSlug ? `&tenant=${tenantSlug}` : ''}`, request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(new URL(`/login?error=sso${tenantSlug ? `&tenant=${tenantSlug}` : ''}`, request.url));
  }

  const finalized = await finalizeSsoProfile({
    userId: data.user.id,
    email: data.user.email,
    fullName:
      typeof data.user.user_metadata?.full_name === 'string'
        ? data.user.user_metadata.full_name
        : typeof data.user.user_metadata?.name === 'string'
          ? data.user.user_metadata.name
          : null,
    tenantSlug: tenantSlug || null,
  });

  if (finalized.error) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL(`/login?error=${finalized.error}${tenantSlug ? `&tenant=${tenantSlug}` : ''}`, request.url),
    );
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  const role = parseAppRole(profile?.role ?? finalized.role);

  if (!isCustomerRole(role)) {
    cookies().set(ACCOUNT_COOKIE, ACCOUNT_ALL, {
      path: '/',
      sameSite: 'lax',
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  const dest = isCustomerRole(role)
    ? next && next.startsWith('/portal') && next !== '/portal'
      ? next
      : '/portal?welcome=1'
    : next && !next.startsWith('/portal')
      ? next
      : homePathForRole(role);

  return NextResponse.redirect(new URL(dest, request.url));
}
