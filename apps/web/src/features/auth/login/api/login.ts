'use server';

import { redirect } from 'next/navigation';

import {
  authResponseSchema,
  loginRequestSchema,
  type LoginRequest,
} from '@expense-tracker/shared';

import { apiFetch } from '@/shared/api/api-client';
import { setSession } from '@/entities/session/index.server';

import type { AuthFormState } from '../model/types';

export async function loginAction(input: LoginRequest): Promise<AuthFormState> {
  const parsed = loginRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { formError: 'Некорректные данные формы' };
  }

  const response = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(parsed.data),
  });

  if (!response.ok) {
    if (response.status === 401) {
      return { formError: 'Неверный email или пароль' };
    }
    return { formError: 'Не удалось выполнить вход, попробуйте позже' };
  }

  const { accessToken } = authResponseSchema.parse(await response.json());
  await setSession(accessToken);
  redirect('/');
}
