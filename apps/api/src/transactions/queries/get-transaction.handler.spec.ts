import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { TransactionsRepository } from '../transactions.repository.js';
import { GetTransactionHandler } from './get-transaction.handler.js';
import { GetTransactionQuery } from './get-transaction.query.js';

describe('GetTransactionHandler', () => {
  let handler: GetTransactionHandler;
  let repository: { findById: jest.Mock };

  const userId = 'a5f6c1b0-1d2e-4f3a-9c8b-7e6d5f4a3b2c';
  const transactionId = '11111111-1111-4111-8111-111111111111';

  beforeEach(async () => {
    repository = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetTransactionHandler,
        { provide: TransactionsRepository, useValue: repository },
      ],
    }).compile();

    handler = module.get(GetTransactionHandler);
  });

  it('throws NotFoundException when the repository returns null', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      handler.execute(new GetTransactionQuery(userId, transactionId)),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
