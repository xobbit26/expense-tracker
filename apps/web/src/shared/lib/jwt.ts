import { z } from 'zod';

const jwtPayloadSchema = z.object({ exp: z.number() });

/**
 * Читает `exp` из payload без проверки подписи — подпись проверяет API.
 * Нужен только чтобы выставить `expires` у cookie и отсеять явно просроченный токен в proxy.
 */
export function getTokenExpiry(token: string): Date | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) {
      return null;
    }
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const { exp } = jwtPayloadSchema.parse(JSON.parse(json));
    return new Date(exp * 1000);
  } catch {
    return null;
  }
}
