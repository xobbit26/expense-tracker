'use server';

import { redirect } from 'next/navigation';

import {
  authResponseSchema,
  registerRequestSchema,
  type RegisterRequest,
} from '@expense-tracker/shared';

import { apiFetch } from '@/shared/api/api-client';
import { setSession } from '@/entities/session/index.server';

import type { AuthFormState } from '../model/types';

export async function registerAction(
  input: RegisterRequest,
): Promise<AuthFormState> {
  const parsed = registerRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { formError: 'Некорректные данные формы' };
  }

  const response = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(parsed.data),
  });

  if (!response.ok) {
    if (response.status === 409) {
      return { fieldErrors: { email: 'Этот email уже зарегистрирован' } };
    }
    return { formError: 'Не удалось выполнить регистрацию, попробуйте позже' };
  }

  const { accessToken } = authResponseSchema.parse(await response.json());
  await setSession(accessToken);
  redirect('/');
}
