import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getPublicSupabaseConfig, isSupabaseConfigured } from '@/lib/config/env';

function isPublicPath(pathname: string) {
  return (
    pathname === '/login' ||
    pathname === '/api/health' ||
    pathname.startsWith('/api/webhooks/')
  );
}

export async function updateSession(request: NextRequest) {
  const { url, key } = getPublicSupabaseConfig();

  if (!url || !key || !isSupabaseConfigured(url, key)) {
    if (isPublicPath(request.nextUrl.pathname) || request.nextUrl.pathname.startsWith('/_next')) {
      return NextResponse.next({ request });
    }

    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 });
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
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

  const { pathname } = request.nextUrl;

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
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  if (user && !pathname.startsWith('/api/')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const role = profile?.role as 'admin' | 'agent' | 'customer' | undefined;

    if (role === 'customer' && !pathname.startsWith('/portal')) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/portal';
      return NextResponse.redirect(redirectUrl);
    }

    if (role && role !== 'customer' && pathname.startsWith('/portal')) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/tickets';
      return NextResponse.redirect(redirectUrl);
    }

    if (role === 'agent' && pathname.startsWith('/settings')) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/tickets';
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}
