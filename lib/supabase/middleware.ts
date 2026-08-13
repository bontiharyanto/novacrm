import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getServerSupabaseConfig, isSupabaseConfigured } from '@/lib/config/env';

function isPublicPath(pathname: string) {
  return (
    pathname === '/login' ||
    pathname === '/api/health' ||
    pathname.startsWith('/api/webhooks/')
  );
}

function hasAuthCookie(request: NextRequest) {
  return request.cookies.getAll().some((cookie) => cookie.name.includes('-auth-token') || cookie.name.startsWith('sb-'));
}

function roleFromUser(user: { user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> } | null) {
  const meta = user?.user_metadata?.role ?? user?.app_metadata?.role;
  return typeof meta === 'string' ? meta : undefined;
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

  if (user && pathname === '/login') {
    const role = roleFromUser(user);
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = role === 'customer' ? '/portal' : '/dashboard';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  const role = roleFromUser(user);

  if (user && role === 'customer' && !pathname.startsWith('/portal') && !pathname.startsWith('/api/')) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/portal';
    return NextResponse.redirect(redirectUrl);
  }

  if (user && role && role !== 'customer' && pathname.startsWith('/portal')) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  if (user && role === 'agent' && pathname.startsWith('/settings') && pathname !== '/settings/appearance') {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
