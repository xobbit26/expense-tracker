import { Prisma } from '../generated/prisma/client.js';
import { toPublicTransaction, toTotals } from './transactions.mapper.js';
import { TransactionWithCategory } from './transactions.repository.js';

describe('toPublicTransaction', () => {
  const transaction: TransactionWithCategory = {
    id: '11111111-1111-4111-8111-111111111111',
    userId: 'a5f6c1b0-1d2e-4f3a-9c8b-7e6d5f4a3b2c',
    categoryId: '22222222-2222-4222-8222-222222222222',
    type: 'expense',
    amount: new Prisma.Decimal('1500.5'),
    description: 'Lunch',
    date: new Date('2026-09-14T00:00:00.000Z'),
    createdAt: new Date('2026-09-14T10:00:00.000Z'),
    updatedAt: new Date('2026-09-14T10:00:00.000Z'),
    category: {
      id: '22222222-2222-4222-8222-222222222222',
      userId: 'a5f6c1b0-1d2e-4f3a-9c8b-7e6d5f4a3b2c',
      name: 'Food',
      color: '#ff8800',
      icon: 'utensils',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      deletedAt: null,
    },
  };

  it('does not include userId or categoryId', () => {
    const result = toPublicTransaction(transaction);

    expect(result).not.toHaveProperty('userId');
    expect(result).not.toHaveProperty('categoryId');
  });

  it('formats amount with 2 decimal places', () => {
    const result = toPublicTransaction(transaction);
    expect(result.amount).toBe('1500.50');
  });

  it('formats date as YYYY-MM-DD', () => {
    const result = toPublicTransaction(transaction);
    expect(result.date).toBe('2026-09-14');
  });

  it('marks the category as not archived when deletedAt is null', () => {
    const result = toPublicTransaction(transaction);
    expect(result.category.archived).toBe(false);
  });

  it('marks the category as archived when deletedAt is set', () => {
    const result = toPublicTransaction({
      ...transaction,
      category: { ...transaction.category, deletedAt: new Date() },
    });
    expect(result.category.archived).toBe(true);
  });
});

describe('toTotals', () => {
  it('computes a positive balance', () => {
    const totals = toTotals({
      income: new Prisma.Decimal('1000'),
      expense: new Prisma.Decimal('400'),
    });

    expect(totals).toEqual({
      income: '1000.00',
      expense: '400.00',
      balance: '600.00',
    });
  });

  it('computes a negative balance', () => {
    const totals = toTotals({
      income: new Prisma.Decimal('100'),
      expense: new Prisma.Decimal('400'),
    });

    expect(totals.balance).toBe('-300.00');
  });

  it('returns zeros for an empty selection', () => {
    const totals = toTotals({
      income: new Prisma.Decimal(0),
      expense: new Prisma.Decimal(0),
    });

    expect(totals).toEqual({
      income: '0.00',
      expense: '0.00',
      balance: '0.00',
    });
  });
});
