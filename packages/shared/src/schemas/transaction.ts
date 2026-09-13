import { z } from 'zod';

import { categorySchema } from './category.js';

export const transactionTypeSchema = z.enum(['income', 'expense']);

export type TransactionType = z.infer<typeof transactionTypeSchema>;

const amount = z
  .string()
  .regex(/^\d{1,10}(\.\d{1,2})?$/)
  .refine((value) => Number(value) > 0, {
    message: 'Amount must be greater than 0',
  });

const money = z.string().regex(/^-?\d+\.\d{2}$/);

const date = z.iso.date();

const description = z.string().trim().max(255);

export const transactionCategorySchema = categorySchema
  .pick({ id: true, name: true, color: true, icon: true })
  .extend({ archived: z.boolean() });

export type TransactionCategory = z.infer<typeof transactionCategorySchema>;

export const transactionSchema = z.object({
  id: z.uuid(),
  type: transactionTypeSchema,
  amount,
  description: description.nullable(),
  date,
  category: transactionCategorySchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Transaction = z.infer<typeof transactionSchema>;

export const createTransactionRequestSchema = z.object({
  type: transactionTypeSchema,
  amount,
  date,
  categoryId: z.uuid(),
  description: description.optional(),
});

export type CreateTransactionRequest = z.infer<
  typeof createTransactionRequestSchema
>;

export const updateTransactionRequestSchema = z
  .object({
    type: transactionTypeSchema,
    amount,
    date,
    categoryId: z.uuid(),
    description: description.nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateTransactionRequest = z.infer<
  typeof updateTransactionRequestSchema
>;

export const transactionListQuerySchema = z
  .object({
    year: z.coerce.number().int().min(1970).max(9999).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
  })
  .refine((data) => data.month === undefined || data.year !== undefined, {
    message: 'month requires year',
    path: ['month'],
  });

export type TransactionListQuery = z.infer<typeof transactionListQuerySchema>;

export const transactionListResponseSchema = z.object({
  items: z.array(transactionSchema),
  totals: z.object({
    income: money,
    expense: money,
    balance: money,
  }),
});

export type TransactionListResponse = z.infer<
  typeof transactionListResponseSchema
>;
