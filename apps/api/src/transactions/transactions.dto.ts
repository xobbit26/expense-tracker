import {
  createTransactionRequestSchema,
  transactionListQuerySchema,
  transactionListResponseSchema,
  transactionSchema,
  updateTransactionRequestSchema,
} from '@expense-tracker/shared';
import { createZodDto } from 'nestjs-zod';

export class TransactionDto extends createZodDto(transactionSchema) {}
export class CreateTransactionRequestDto extends createZodDto(
  createTransactionRequestSchema,
) {}
export class UpdateTransactionRequestDto extends createZodDto(
  updateTransactionRequestSchema,
) {}
export class TransactionListQueryDto extends createZodDto(
  transactionListQuerySchema,
) {}
export class TransactionListResponseDto extends createZodDto(
  transactionListResponseSchema,
) {}
