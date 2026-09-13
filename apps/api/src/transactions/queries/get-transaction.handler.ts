import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Transaction } from '@expense-tracker/shared';

import { toPublicTransaction } from '../transactions.mapper.js';
import { TransactionsRepository } from '../transactions.repository.js';
import { GetTransactionQuery } from './get-transaction.query.js';

@QueryHandler(GetTransactionQuery)
export class GetTransactionHandler
  implements IQueryHandler<GetTransactionQuery, Transaction>
{
  constructor(private readonly repository: TransactionsRepository) {}

  async execute(query: GetTransactionQuery): Promise<Transaction> {
    const transaction = await this.repository.findById(query.userId, query.id);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    return toPublicTransaction(transaction);
  }
}
