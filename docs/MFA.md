# MFA (TOTP) — toggle, off until production

**Status:** shipped behind a tenant toggle. Default **off**. Lab tenant `novacrm-demo` cannot turn it on.

**UI:** Settings → **Security** (`/settings/security`). Palette `⌘K` → Security.

## When to flip it

Do this **after** the app is on hosted / production Supabase:

1. Enable MFA (TOTP) on the hosted Auth project.
2. Enroll one admin authenticator on `/settings/security` (optional while toggle is off).
3. Admin flips **Require TOTP for password staff**.
4. Next password login: staff with a factor see `/login/mfa`; staff without one are sent to enroll.

Classroom / `NovaCRM!2026` stays password-only. Do not enable the toggle on the demo tenant.

## Behaviour

| Case | Result |
| --- | --- |
| Toggle off | Password login unchanged. Staff may still enroll optionally. |
| Toggle on + password | TOTP challenge or forced enroll |
| Toggle on + Google / Microsoft / Okta / SAML | App TOTP skipped (IdP already stepped up) |
| Portal customer | Out of scope |
| Lost phone | Another admin opens `/users/[id]` → **Reset authenticator** (identity check first) |

## Password rotation (portal + operations)

Separate from MFA. Default **on**, **30 days**. Settings → **Security** → Password rotation.

| Case | Result |
| --- | --- |
| Password older than the policy | Login works; only `/portal/account` or `/settings/security` is allowed until they change it |
| Admin reset | `/users/[id]` → **Reset password** — temporary password, 30-day clock restarts |
| SSO-only login | Skipped |

Lab clocks start when the migration is applied (`password_changed_at = now()`), so `NovaCRM!2026` stays usable for 30 days from that date.

## Out of scope

- SMS / email OTP
- WebAuthn / passkeys
- Forcing MFA on the customer portal
