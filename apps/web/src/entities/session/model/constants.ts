import { getTokenExpiry } from '@/shared/lib/jwt';

export const SESSION_COOKIE = 'access_token';

export function isSessionTokenExpired(token: string): boolean {
  const expiry = getTokenExpiry(token);
  return expiry === null || expiry.getTime() <= Date.now();
}
