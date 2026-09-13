import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { Prisma } from '../../generated/prisma/client.js';
import { TransactionsRepository } from '../transactions.repository.js';
import { DeleteTransactionCommand } from './delete-transaction.command.js';
import { DeleteTransactionHandler } from './delete-transaction.handler.js';

describe('DeleteTransactionHandler', () => {
  let handler: DeleteTransactionHandler;
  let repository: { delete: jest.Mock };

  const userId = 'a5f6c1b0-1d2e-4f3a-9c8b-7e6d5f4a3b2c';
  const transactionId = '11111111-1111-4111-8111-111111111111';

  const recordNotFoundError = new Prisma.PrismaClientKnownRequestError(
    'Record to delete does not exist',
    { code: 'P2025', clientVersion: '7.10.0' },
  );

  beforeEach(async () => {
    repository = { delete: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteTransactionHandler,
        { provide: TransactionsRepository, useValue: repository },
      ],
    }).compile();

    handler = module.get(DeleteTransactionHandler);
  });

  it('maps a record-not-found error to NotFoundException', async () => {
    repository.delete.mockRejectedValue(recordNotFoundError);

    await expect(
      handler.execute(new DeleteTransactionCommand(userId, transactionId)),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('resolves when the repository deletes successfully', async () => {
    repository.delete.mockResolvedValue(undefined);

    await expect(
      handler.execute(new DeleteTransactionCommand(userId, transactionId)),
    ).resolves.toBeUndefined();
  });
});
