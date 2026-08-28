import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getServerSupabaseConfig, isSupabaseConfigured } from '@/lib/config/env';
import { homePathForRole, isAppRole, isCustomerRole, isTenantAdminRole, parseAppRole } from '@/lib/rbac/roles';
import { DEFAULT_PASSWORD_MAX_AGE_DAYS, isPasswordExpired } from '@/lib/auth/password-policy';
import { isTenantLoginBlocked } from '@/lib/tenants/lifecycle';
import { DEFAULT_IDLE_MINUTES, IDLE_COOKIE, isIdleExpired, parseIdleMinutes } from '@/lib/auth/idle-timeout';

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
    pathname.startsWith('/api/webhooks/') ||
    pathname.startsWith('/api/t/') ||
    pathname.startsWith('/api/v1/t/')
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

  if (user && profile?.tenantId) {
    type TenantAccessRow = {
      status: string;
      expires_at: string | null;
      grace_days: number | null;
      is_protected: boolean | null;
      idle_timeout_minutes?: number | null;
    };
    const tenantQuery = await supabase
      .from('tenants')
      .select('status, expires_at, grace_days, is_protected, idle_timeout_minutes')
      .eq('id', profile.tenantId)
      .maybeSingle();
    let tenantAccess = tenantQuery.data as TenantAccessRow | null;
    if (tenantQuery.error) {
      const retry = await supabase
        .from('tenants')
        .select('status, expires_at, grace_days, is_protected')
        .eq('id', profile.tenantId)
        .maybeSingle();
      tenantAccess = retry.data as TenantAccessRow | null;
    }
    const blocked = Boolean(
      tenantAccess &&
        isTenantLoginBlocked({
          status: tenantAccess.status as 'active' | 'paused' | 'archived',
          isProtected: Boolean(tenantAccess.is_protected),
          expiresAt: tenantAccess.expires_at as string | null,
          graceDays: Number(tenantAccess.grace_days ?? 7),
        }),
    );
    if (blocked) {
      const expiredWhileActive = tenantAccess?.status === 'active';
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { data: null, error: expiredWhileActive ? 'Tenant access expired' : 'Tenant is paused' },
          { status: 403 },
        );
      }
      await supabase.auth.signOut();
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.search = expiredWhileActive ? 'error=tenant_expired' : 'error=tenant_paused';
      return NextResponse.redirect(redirectUrl);
    }

    const idleMinutes = parseIdleMinutes(tenantAccess?.idle_timeout_minutes ?? DEFAULT_IDLE_MINUTES);
    if (idleMinutes > 0 && !isPublicPath(pathname)) {
      const raw = request.cookies.get(IDLE_COOKIE)?.value;
      const lastActive = raw ? Number(raw) : NaN;
      if (Number.isFinite(lastActive) && isIdleExpired(lastActive, idleMinutes)) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ data: null, error: 'Session idle timeout' }, { status: 401 });
        }
        await supabase.auth.signOut();
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/login';
        redirectUrl.search = 'error=idle';
        const idleResponse = NextResponse.redirect(redirectUrl);
        idleResponse.cookies.set(IDLE_COOKIE, '', { path: '/', maxAge: 0 });
        return idleResponse;
      }
      if (!Number.isFinite(lastActive)) {
        supabaseResponse.cookies.set(IDLE_COOKIE, String(Date.now()), {
          path: '/',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24,
          httpOnly: false,
        });
      }
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
    redirectUrl.pathname = homePathForRole(role);
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
    redirectUrl.pathname = homePathForRole(role);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
