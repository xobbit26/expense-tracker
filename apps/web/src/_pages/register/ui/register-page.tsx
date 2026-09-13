import Link from 'next/link';

import { RegisterForm } from '@/features/auth/register';
import { redirectIfAuthenticated } from '@/entities/user/index.server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';

export async function RegisterPage() {
  await redirectIfAuthenticated();

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Регистрация</CardTitle>
        <CardDescription>Создайте новый аккаунт</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <RegisterForm />
        <p className="text-muted-foreground text-center text-sm">
          Уже есть аккаунт?{' '}
          <Link href="/login" className="underline underline-offset-4">
            Войти
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
