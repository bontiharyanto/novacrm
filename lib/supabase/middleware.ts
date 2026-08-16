import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getServerSupabaseConfig, isSupabaseConfigured } from '@/lib/config/env';
import { homePathForRole, isAppRole, isCustomerRole, isTenantAdminRole, parseAppRole } from '@/lib/rbac/roles';
import { DEFAULT_PASSWORD_MAX_AGE_DAYS, isPasswordExpired } from '@/lib/auth/password-policy';

function isPublicPath(pathname: string) {
  return (
    pathname === '/login' ||
    pathname === '/login/mfa' ||
    pathname === '/privacy' ||
    pathname === '/api/governance/public' ||
    pathname === '/api/health' ||
    pathname === '/api/auth/sso' ||
    pathname.startsWith('/api/auth/saml') ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/api/webhooks/')
  );
}

function hasAuthCookie(request: NextRequest) {
  return request.cookies.getAll().some((cookie) => cookie.name.includes('-auth-token') || cookie.name.startsWith('sb-'));
}

function roleFromMetadata(user: { user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> } | null) {
  const meta = user?.user_metadata?.role ?? user?.app_metadata?.role;
  return isAppRole(meta) ? meta : undefined;
}

async function roleFromProfile(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  fallback?: string,
) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, tenant_id, password_changed_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    return { role: fallback, tenantId: undefined as string | undefined, passwordChangedAt: undefined as string | undefined };
  }
  if (typeof data?.role === 'string' && isAppRole(data.role)) {
    return {
      role: data.role,
      tenantId: data.tenant_id as string | undefined,
      passwordChangedAt: (data.password_changed_at as string | undefined) ?? undefined,
    };
  }
  return {
    role: parseAppRole(undefined),
    tenantId: data?.tenant_id as string | undefined,
    passwordChangedAt: (data.password_changed_at as string | undefined) ?? undefined,
  };
}

function isPasswordChangePath(pathname: string) {
  return pathname === '/portal/account' || pathname === '/settings/security';
}

function isSsoOnlyUser(user: { identities?: Array<{ provider: string }>; user_metadata?: Record<string, unknown> }) {
  const viaSaml = user.user_metadata?.auth_via === 'saml';
  return viaSaml || (Boolean(user.identities?.length) && !user.identities?.some((item) => item.provider === 'email'));
}

export async function updateSession(request: NextRequest) {
  const { url, key } = getServerSupabaseConfig();
  const { pathname } = request.nextUrl;

  if (!url || !key || !isSupabaseConfigured(url, key)) {
    if (isPublicPath(pathname) || pathname.startsWith('/_next')) {
      return NextResponse.next({ request });
    }

    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
  }

  if (isPublicPath(pathname) && !hasAuthCookie(request)) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(pathname)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const profile = user ? await roleFromProfile(supabase, user.id, roleFromMetadata(user)) : undefined;
  const role = profile?.role;

  if (user && profile?.tenantId && !pathname.startsWith('/api/')) {
    const { data: tenantStatus } = await supabase
      .from('tenants')
      .select('status')
      .eq('id', profile.tenantId)
      .maybeSingle();
    if (tenantStatus?.status && tenantStatus.status !== 'active') {
      await supabase.auth.signOut();
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.search = 'error=tenant_paused';
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (user && pathname === '/login') {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = homePathForRole(role);
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  if (user && profile?.tenantId && !isSsoOnlyUser(user) && !isPublicPath(pathname)) {
    const { data: tenantPolicy } = await supabase
      .from('tenants')
      .select('password_rotation_enabled, password_max_age_days')
      .eq('id', profile.tenantId)
      .maybeSingle();
    const expired = isPasswordExpired(profile.passwordChangedAt, {
      enabled: tenantPolicy?.password_rotation_enabled !== false,
      maxAgeDays: Number(tenantPolicy?.password_max_age_days ?? DEFAULT_PASSWORD_MAX_AGE_DAYS),
    });
    if (expired && !isPasswordChangePath(pathname)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ data: null, error: 'Password expired' }, { status: 403 });
      }
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = isCustomerRole(role) ? '/portal/account' : '/settings/security';
      redirectUrl.search = 'expired=1';
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (
    user &&
    role &&
    !isCustomerRole(role) &&
    profile?.tenantId &&
    pathname !== '/login/mfa' &&
    pathname !== '/settings/security' &&
    !pathname.startsWith('/api/')
  ) {
    const viaSaml = user.user_metadata?.auth_via === 'saml';
    const ssoOnly =
      viaSaml || (Boolean(user.identities?.length) && !user.identities?.some((item) => item.provider === 'email'));
    if (!ssoOnly) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('mfa_required, slug')
        .eq('id', profile.tenantId)
        .maybeSingle();
      if (tenant?.mfa_required && tenant.slug !== 'novacrm-demo') {
        const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal.data?.currentLevel !== 'aal2') {
          const factors = await supabase.auth.mfa.listFactors();
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = factors.data?.totp.some((item) => item.status === 'verified')
            ? '/login/mfa'
            : '/settings/security';
          redirectUrl.search = factors.data?.totp.some((item) => item.status === 'verified') ? '' : 'enroll=1';
          return NextResponse.redirect(redirectUrl);
        }
      }
    }
  }

  if (user && isCustomerRole(role) && pathname === '/select-account') {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/portal';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isCustomerRole(role) && !pathname.startsWith('/portal') && !pathname.startsWith('/api/')) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/portal';
    return NextResponse.redirect(redirectUrl);
  }

  if (user && role && !isCustomerRole(role) && pathname.startsWith('/portal')) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  if (
    user &&
    role &&
    !isTenantAdminRole(role) &&
    pathname.startsWith('/settings') &&
    pathname !== '/settings/appearance' &&
    pathname !== '/settings/security'
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
