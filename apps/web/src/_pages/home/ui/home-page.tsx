import { getApiStatus } from '@/entities/health/index.server';
import { ApiStatus } from '@/entities/health';
import { requireUser } from '@/entities/user/index.server';
import { AppHeader } from '@/widgets/app-header';

export async function HomePage() {
  const user = await requireUser();
  const health = await getApiStatus();

  return (
    <>
      <AppHeader user={user} />
      <main className="flex min-h-[calc(100vh-65px)] flex-col items-center justify-center gap-2 p-8">
        <h1 className="text-2xl font-semibold">Привет, {user.name}!</h1>
        <ApiStatus health={health} />
      </main>
    </>
  );
}
