# MFA (prepared, not implemented)

**Status:** design only. Do not build until the tenant is ready (IdP, recovery process, and a non-lab environment).  
**Depends on:** email/password login today; optional SSO button if an identity plugin is active.

This is not a product feature yet. There is no enroll screen, no login challenge, and no tenant toggle.

## Why wait

- Local Supabase + demo passwords (`NovaCRM!2026`) are for classroom use. Forcing TOTP now locks trainers out.
- Recovery (lost phone, admin reset) is not designed.
- SSO (Google / Entra) should decide MFA at the IdP first; app MFA is for password users.

## Intended design (when we implement)

1. **Provider:** Supabase Auth MFA (TOTP). No SMS in v1.
2. **Enroll:** staff page later, likely `/settings/security`. Customer portal out of scope for v1.
3. **Login:** after `signInWithPassword`, if AAL is `aal1` and a factor exists → `/login/mfa` challenge, then existing role redirect.
4. **Policy:** optional `tenants.mfa_required` (superadmin). When true, staff without a factor are sent to enroll. Demo tenant stays `false`.
5. **RBAC:** admin can see who enrolled; cannot read TOTP secrets. Superadmin can clear a factor after identity check.
6. **SSO:** if the user signed in with OIDC, skip app TOTP (IdP already stepped up).

## Out of scope until asked

- SMS / email OTP
- WebAuthn / passkeys
- Forcing MFA on `customer@` portal
- Implementing any of the routes above

## Checklist before coding

- [ ] Recovery runbook (who resets a locked admin)
- [ ] Hosted Supabase Auth MFA enabled
- [ ] Demo tenant explicitly excluded
- [ ] Trainer guide updated so class logins stay password-only
