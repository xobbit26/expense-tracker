import { Prisma } from '../generated/prisma/client.js';

export const PRISMA_UNIQUE_CONSTRAINT_CODE = 'P2002';
export const PRISMA_RECORD_NOT_FOUND_CODE = 'P2025';

export function isPrismaError(
  error: unknown,
  code: string,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}
