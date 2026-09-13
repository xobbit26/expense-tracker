import { Query } from '@nestjs/cqrs';
import { TransactionListResponse } from '@expense-tracker/shared';

export class GetTransactionsQuery extends Query<TransactionListResponse> {
  constructor(
    public readonly userId: string,
    public readonly year?: number,
    public readonly month?: number,
  ) {
    super();
  }
}
