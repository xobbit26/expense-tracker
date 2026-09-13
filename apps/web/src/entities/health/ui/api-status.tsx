import type { HealthResponse } from '@expense-tracker/shared';

export function ApiStatus({ health }: { health: HealthResponse | null }) {
  if (!health) {
    return <p className="text-destructive">API недоступен</p>;
  }

  return (
    <p className="text-muted-foreground">
      API: {health.status}, база данных: {health.database}
    </p>
  );
}
