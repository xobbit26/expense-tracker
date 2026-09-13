import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { Category, Prisma } from '../../generated/prisma/client.js';
import { TransactionsRepository } from '../transactions.repository.js';
import { CreateTransactionCommand } from './create-transaction.command.js';
import { CreateTransactionHandler } from './create-transaction.handler.js';

describe('CreateTransactionHandler', () => {
  let handler: CreateTransactionHandler;
  let repository: {
    findActiveCategory: jest.Mock;
    create: jest.Mock;
  };

  const userId = 'a5f6c1b0-1d2e-4f3a-9c8b-7e6d5f4a3b2c';
  const categoryId = '22222222-2222-4222-8222-222222222222';

  const category: Category = {
    id: categoryId,
    userId,
    name: 'Food',
    color: '#ff8800',
    icon: 'utensils',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    deletedAt: null,
  };

  beforeEach(async () => {
    repository = {
      findActiveCategory: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateTransactionHandler,
        { provide: TransactionsRepository, useValue: repository },
      ],
    }).compile();

    handler = module.get(CreateTransactionHandler);
  });

  it('throws BadRequestException when the category is not active', async () => {
    repository.findActiveCategory.mockResolvedValue(null);

    await expect(
      handler.execute(
        new CreateTransactionCommand(
          userId,
          'expense',
          '10.00',
          '2026-09-14',
          categoryId,
        ),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('creates the transaction and returns its public form', async () => {
    repository.findActiveCategory.mockResolvedValue(category);
    repository.create.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      userId,
      categoryId,
      type: 'expense',
      amount: new Prisma.Decimal('10.00'),
      description: null,
      date: new Date('2026-09-14T00:00:00.000Z'),
      createdAt: new Date('2026-09-14T00:00:00.000Z'),
      updatedAt: new Date('2026-09-14T00:00:00.000Z'),
      category,
    });

    const result = await handler.execute(
      new CreateTransactionCommand(
        userId,
        'expense',
        '10.00',
        '2026-09-14',
        categoryId,
      ),
    );

    expect(result.amount).toBe('10.00');
    expect(result.category.id).toBe(categoryId);
  });
});
