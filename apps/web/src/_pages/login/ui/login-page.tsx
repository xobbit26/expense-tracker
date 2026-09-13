import Link from 'next/link';

import { LoginForm } from '@/features/auth/login';
import { redirectIfAuthenticated } from '@/entities/user/index.server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';

export async function LoginPage() {
  await redirectIfAuthenticated();

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Вход</CardTitle>
        <CardDescription>Войдите в свой аккаунт</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <LoginForm />
        <p className="text-muted-foreground text-center text-sm">
          Нет аккаунта?{' '}
          <Link href="/register" className="underline underline-offset-4">
            Зарегистрироваться
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
