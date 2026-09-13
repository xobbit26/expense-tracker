import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';

import { userSchema, type User } from '@expense-tracker/shared';

import { apiFetch } from '@/shared/api/api-client';
import { getSessionToken } from '@/entities/session/index.server';

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = await getSessionToken();
  if (!token) {
    return null;
  }

  const response = await apiFetch('/users/me', { token });
  if (!response.ok) {
    return null;
  }

  return userSchema.parse(await response.json());
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

export async function redirectIfAuthenticated(): Promise<void> {
  const user = await getCurrentUser();
  if (user) {
    redirect('/');
  }
}
