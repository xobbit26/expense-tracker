import { Query } from '@nestjs/cqrs';
import { Transaction } from '@expense-tracker/shared';

export class GetTransactionQuery extends Query<Transaction> {
  constructor(
    public readonly userId: string,
    public readonly id: string,
  ) {
    super();
  }
}
