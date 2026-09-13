import { Test, TestingModule } from '@nestjs/testing';

import { Category, Prisma } from '../../generated/prisma/client.js';
import { TransactionsRepository } from '../transactions.repository.js';
import { GetTransactionsHandler } from './get-transactions.handler.js';
import { GetTransactionsQuery } from './get-transactions.query.js';

describe('GetTransactionsHandler', () => {
  let handler: GetTransactionsHandler;
  let repository: { findMany: jest.Mock; sumByType: jest.Mock };

  const userId = 'a5f6c1b0-1d2e-4f3a-9c8b-7e6d5f4a3b2c';

  const category: Category = {
    id: '22222222-2222-4222-8222-222222222222',
    userId,
    name: 'Food',
    color: '#ff8800',
    icon: 'utensils',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    deletedAt: null,
  };

  beforeEach(async () => {
    repository = { findMany: jest.fn(), sumByType: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetTransactionsHandler,
        { provide: TransactionsRepository, useValue: repository },
      ],
    }).compile();

    handler = module.get(GetTransactionsHandler);
  });

  it('returns items and totals with a negative balance', async () => {
    repository.findMany.mockResolvedValue([
      {
        id: '11111111-1111-4111-8111-111111111111',
        userId,
        categoryId: category.id,
        type: 'expense',
        amount: new Prisma.Decimal('400.00'),
        description: null,
        date: new Date('2026-09-14T00:00:00.000Z'),
        createdAt: new Date('2026-09-14T00:00:00.000Z'),
        updatedAt: new Date('2026-09-14T00:00:00.000Z'),
        category,
      },
    ]);
    repository.sumByType.mockResolvedValue({
      income: new Prisma.Decimal('100.00'),
      expense: new Prisma.Decimal('400.00'),
    });

    const result = await handler.execute(new GetTransactionsQuery(userId));

    expect(result.items).toHaveLength(1);
    expect(result.totals).toEqual({
      income: '100.00',
      expense: '400.00',
      balance: '-300.00',
    });
  });

  it('returns zero totals for an empty selection', async () => {
    repository.findMany.mockResolvedValue([]);
    repository.sumByType.mockResolvedValue({
      income: new Prisma.Decimal(0),
      expense: new Prisma.Decimal(0),
    });

    const result = await handler.execute(new GetTransactionsQuery(userId));

    expect(result.items).toEqual([]);
    expect(result.totals).toEqual({
      income: '0.00',
      expense: '0.00',
      balance: '0.00',
    });
  });
});
