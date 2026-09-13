import { Transaction as SharedTransaction } from '@expense-tracker/shared';

import { Prisma } from '../generated/prisma/client.js';
import {
  TransactionTotals,
  TransactionWithCategory,
} from './transactions.repository.js';

export function toPublicTransaction(
  transaction: TransactionWithCategory,
): SharedTransaction {
  return {
    id: transaction.id,
    type: transaction.type,
    amount: transaction.amount.toFixed(2),
    description: transaction.description,
    date: transaction.date.toISOString().slice(0, 10),
    category: {
      id: transaction.category.id,
      name: transaction.category.name,
      color: transaction.category.color,
      icon: transaction.category.icon,
      archived: transaction.category.deletedAt !== null,
    },
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };
}

export function toTotals(totals: TransactionTotals): {
  income: string;
  expense: string;
  balance: string;
} {
  const balance: Prisma.Decimal = totals.income.minus(totals.expense);

  return {
    income: totals.income.toFixed(2),
    expense: totals.expense.toFixed(2),
    balance: balance.toFixed(2),
  };
}
