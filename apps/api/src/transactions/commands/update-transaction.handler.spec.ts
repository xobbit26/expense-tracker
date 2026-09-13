import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { Category, Prisma } from '../../generated/prisma/client.js';
import { TransactionsRepository } from '../transactions.repository.js';
import { UpdateTransactionCommand } from './update-transaction.command.js';
import { UpdateTransactionHandler } from './update-transaction.handler.js';

describe('UpdateTransactionHandler', () => {
  let handler: UpdateTransactionHandler;
  let repository: {
    findActiveCategory: jest.Mock;
    update: jest.Mock;
  };

  const userId = 'a5f6c1b0-1d2e-4f3a-9c8b-7e6d5f4a3b2c';
  const transactionId = '11111111-1111-4111-8111-111111111111';
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

  const recordNotFoundError = new Prisma.PrismaClientKnownRequestError(
    'Record to update not found',
    { code: 'P2025', clientVersion: '7.10.0' },
  );

  beforeEach(async () => {
    repository = {
      findActiveCategory: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateTransactionHandler,
        { provide: TransactionsRepository, useValue: repository },
      ],
    }).compile();

    handler = module.get(UpdateTransactionHandler);
  });

  it('throws BadRequestException when the new category is archived', async () => {
    repository.findActiveCategory.mockResolvedValue(null);

    await expect(
      handler.execute(
        new UpdateTransactionCommand(userId, transactionId, { categoryId }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('maps a record-not-found error to NotFoundException', async () => {
    repository.update.mockRejectedValue(recordNotFoundError);

    await expect(
      handler.execute(
        new UpdateTransactionCommand(userId, transactionId, {
          description: 'Updated',
        }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not check the category when categoryId is not provided', async () => {
    repository.update.mockResolvedValue({
      id: transactionId,
      userId,
      categoryId,
      type: 'expense',
      amount: new Prisma.Decimal('10.00'),
      description: 'Updated',
      date: new Date('2026-09-14T00:00:00.000Z'),
      createdAt: new Date('2026-09-14T00:00:00.000Z'),
      updatedAt: new Date('2026-09-14T00:00:00.000Z'),
      category,
    });

    await handler.execute(
      new UpdateTransactionCommand(userId, transactionId, {
        description: 'Updated',
      }),
    );

    expect(repository.findActiveCategory).not.toHaveBeenCalled();
  });
});
