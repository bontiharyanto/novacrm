import { cookies } from 'next/headers';
import { WELCOME_COOKIE } from '@/lib/auth/welcome-cookie';

export { WELCOME_COOKIE, WELCOME_COOKIE_LEGACY } from '@/lib/auth/welcome-cookie';

export function setWelcomeCookie() {
  cookies().set(WELCOME_COOKIE, '1', {
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    maxAge: 20,
  });
}

export function withWelcomeQuery(path: string) {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('welcome=')) return path;
  const hashAt = path.indexOf('#');
  const hash = hashAt >= 0 ? path.slice(hashAt) : '';
  const base = hashAt >= 0 ? path.slice(0, hashAt) : path;
  return `${base}${base.includes('?') ? '&' : '?'}welcome=1${hash}`;
}
