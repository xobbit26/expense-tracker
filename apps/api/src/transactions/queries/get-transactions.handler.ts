import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TransactionListResponse } from '@expense-tracker/shared';

import { toDateRange } from '../date-range.js';
import { toPublicTransaction, toTotals } from '../transactions.mapper.js';
import { TransactionsRepository } from '../transactions.repository.js';
import { GetTransactionsQuery } from './get-transactions.query.js';

@QueryHandler(GetTransactionsQuery)
export class GetTransactionsHandler
  implements IQueryHandler<GetTransactionsQuery, TransactionListResponse>
{
  constructor(private readonly repository: TransactionsRepository) {}

  async execute(query: GetTransactionsQuery): Promise<TransactionListResponse> {
    const range = toDateRange(query.year, query.month);

    const [transactions, totals] = await Promise.all([
      this.repository.findMany(query.userId, range),
      this.repository.sumByType(query.userId, range),
    ]);

    return {
      items: transactions.map(toPublicTransaction),
      totals: toTotals(totals),
    };
  }
}
