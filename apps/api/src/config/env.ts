import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  WEB_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;
