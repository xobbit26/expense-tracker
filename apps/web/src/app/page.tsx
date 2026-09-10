import { healthResponseSchema } from '@expense-tracker/shared';

import { apiFetch } from '@/lib/api';

async function getApiStatus() {
  try {
    const response = await apiFetch('/health');
    if (!response.ok) {
      return null;
    }
    return healthResponseSchema.parse(await response.json());
  } catch {
    return null;
  }
}

export default async function Home() {
  const health = await getApiStatus();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-8">
      <h1 className="text-2xl font-semibold">Expense Tracker</h1>
      {health ? (
        <p className="text-muted-foreground">
          API: {health.status}, база данных: {health.database}
        </p>
      ) : (
        <p className="text-destructive">API недоступен</p>
      )}
    </main>
  );
}
