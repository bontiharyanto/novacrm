import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { ACCOUNT_ALL, ACCOUNT_COOKIE } from '@/lib/accounts/schema';
import {
  createSamlClient,
  createSessionFromSamlEmail,
  decodeRelayState,
  emailFromSamlProfile,
  loadSamlIdp,
  nameFromSamlProfile,
  safeSlug,
} from '@/lib/auth/saml';
import { finalizeSsoProfile } from '@/lib/auth/sso';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { homePathForRole, isCustomerRole, parseAppRole } from '@/lib/rbac/roles';

export const runtime = 'nodejs';

function loginError(request: NextRequest, tenantSlug: string, code = 'sso') {
  return NextResponse.redirect(
    new URL(`/login?error=${code}${tenantSlug ? `&tenant=${tenantSlug}` : ''}`, request.url),
  );
}

async function finishSaml(request: NextRequest, samlResponse: string, relayState: string) {
  const relay = decodeRelayState(relayState);
  const tenantSlug = relay.tenantSlug || safeSlug(request.nextUrl.searchParams.get('tenant'));
  const idp = await loadSamlIdp(tenantSlug || null);
  if (!idp || !samlResponse) return loginError(request, tenantSlug);

  try {
    const saml = createSamlClient(request.nextUrl.origin, idp);
    const { profile, loggedOut } = await saml.validatePostResponseAsync({ SAMLResponse: samlResponse });
    if (loggedOut || !profile) return loginError(request, idp.tenantSlug);

    const email = emailFromSamlProfile(profile as unknown as Record<string, unknown>);
    if (!email) return loginError(request, idp.tenantSlug, 'sso_email');

    const fullName = nameFromSamlProfile(profile as unknown as Record<string, unknown>, email);
    const session = await createSessionFromSamlEmail({ email, fullName });
    if (session.error || !session.user) return loginError(request, idp.tenantSlug);

    const finalized = await finalizeSsoProfile({
      userId: session.user.id,
      email,
      fullName,
      tenantSlug: idp.tenantSlug,
    });
    if (finalized.error) {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
      return loginError(request, idp.tenantSlug, finalized.error);
    }

    const supabase = await createSupabaseServerClient();
    const { data: row } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
    const role = parseAppRole(row?.role ?? finalized.role);

    if (!isCustomerRole(role)) {
      cookies().set(ACCOUNT_COOKIE, ACCOUNT_ALL, {
        path: '/',
        sameSite: 'lax',
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    const dest = isCustomerRole(role)
      ? relay.nextPath && relay.nextPath.startsWith('/portal')
        ? relay.nextPath
        : '/portal'
      : relay.nextPath && !relay.nextPath.startsWith('/portal')
        ? relay.nextPath
        : homePathForRole(role);

    return NextResponse.redirect(new URL(dest, request.url));
  } catch {
    return loginError(request, tenantSlug);
  }
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  return finishSaml(
    request,
    String(form.get('SAMLResponse') ?? ''),
    String(form.get('RelayState') ?? ''),
  );
}

export async function GET(request: NextRequest) {
  return finishSaml(
    request,
    request.nextUrl.searchParams.get('SAMLResponse') ?? '',
    request.nextUrl.searchParams.get('RelayState') ?? '',
  );
}
