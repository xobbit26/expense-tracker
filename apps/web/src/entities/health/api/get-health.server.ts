import 'server-only';

import { healthResponseSchema, type HealthResponse } from '@expense-tracker/shared';

import { apiFetch } from '@/shared/api/api-client';

export async function getApiStatus(): Promise<HealthResponse | null> {
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
