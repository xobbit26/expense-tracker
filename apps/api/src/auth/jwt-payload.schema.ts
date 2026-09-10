import { z } from 'zod';

export const jwtPayloadSchema = z.object({
  sub: z.uuid(),
  email: z.string(),
});

export type JwtPayload = z.infer<typeof jwtPayloadSchema>;
