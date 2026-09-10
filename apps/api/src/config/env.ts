import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  WEB_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.coerce.number().int().positive().default(86400),
});

export type Env = z.infer<typeof envSchema>;
