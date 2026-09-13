import { API_URL } from '@/shared/config/env';

interface ApiFetchOptions extends RequestInit {
  token?: string;
}

export async function apiFetch(
  path: string,
  { token, headers, ...init }: ApiFetchOptions = {},
): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    cache: 'no-store',
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
}
