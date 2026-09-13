import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import {
  Category,
  Prisma,
  Transaction,
  TransactionType,
} from '../generated/prisma/client.js';
import { DateRange } from './date-range.js';

export type TransactionWithCategory = Transaction & { category: Category };

export interface CreateTransactionData {
  type: TransactionType;
  amount: string;
  date: Date;
  categoryId: string;
  description?: string;
}

export type UpdateTransactionData = Partial<
  Omit<CreateTransactionData, 'description'>
> & { description?: string | null };

export interface TransactionTotals {
  income: Prisma.Decimal;
  expense: Prisma.Decimal;
}

@Injectable()
export class TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveCategory(userId: string, categoryId: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { id: categoryId, userId, deletedAt: null },
    });
  }

  create(
    userId: string,
    data: CreateTransactionData,
  ): Promise<TransactionWithCategory> {
    return this.prisma.transaction.create({
      data: { ...data, userId },
      include: { category: true },
    });
  }

  findById(userId: string, id: string): Promise<TransactionWithCategory | null> {
    return this.prisma.transaction.findFirst({
      where: { id, userId },
      include: { category: true },
    });
  }

  findMany(
    userId: string,
    range?: DateRange,
  ): Promise<TransactionWithCategory[]> {
    return this.prisma.transaction.findMany({
      where: { userId, ...(range ? { date: range } : {}) },
      include: { category: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }

  update(
    userId: string,
    id: string,
    data: UpdateTransactionData,
  ): Promise<TransactionWithCategory> {
    return this.prisma.transaction.update({
      where: { id, userId },
      data,
      include: { category: true },
    });
  }

  delete(userId: string, id: string): Promise<Transaction> {
    return this.prisma.transaction.delete({ where: { id, userId } });
  }

  async sumByType(userId: string, range?: DateRange): Promise<TransactionTotals> {
    const groups = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: { userId, ...(range ? { date: range } : {}) },
      _sum: { amount: true },
    });

    const zero = new Prisma.Decimal(0);
    const totals: TransactionTotals = { income: zero, expense: zero };

    for (const group of groups) {
      const sum = group._sum.amount ?? zero;
      totals[group.type] = sum;
    }

    return totals;
  }
}
