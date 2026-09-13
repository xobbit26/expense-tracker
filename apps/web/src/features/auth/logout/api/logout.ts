'use server';

import { redirect } from 'next/navigation';

import { clearSession } from '@/entities/session/index.server';

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect('/login');
}
