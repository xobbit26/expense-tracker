'use client';

import { useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  registerRequestSchema,
  type RegisterRequest,
} from '@expense-tracker/shared';

import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/shared/ui/field';

import { registerAction } from '../api/register';

export function RegisterForm() {
  const [isPending, startTransition] = useTransition();
  const form = useForm<RegisterRequest>({
    resolver: zodResolver(registerRequestSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const state = await registerAction(values);
      if (state?.formError) {
        form.setError('root', { message: state.formError });
      }
      if (state?.fieldErrors) {
        for (const [name, message] of Object.entries(state.fieldErrors)) {
          form.setError(name as keyof RegisterRequest, { message });
        }
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="name">Имя</FieldLabel>
              <Input id="name" autoComplete="name" {...field} />
              <FieldError errors={fieldState.error ? [fieldState.error] : []} />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" type="email" autoComplete="email" {...field} />
              <FieldError errors={fieldState.error ? [fieldState.error] : []} />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="password">Пароль</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...field}
              />
              <FieldError errors={fieldState.error ? [fieldState.error] : []} />
            </Field>
          )}
        />
        <FieldError
          errors={form.formState.errors.root ? [form.formState.errors.root] : []}
        />
        <Button type="submit" disabled={isPending}>
          Зарегистрироваться
        </Button>
      </FieldGroup>
    </form>
  );
}
