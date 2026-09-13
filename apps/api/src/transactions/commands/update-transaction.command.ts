import { Command } from '@nestjs/cqrs';
import { Transaction, UpdateTransactionRequest } from '@expense-tracker/shared';

export class UpdateTransactionCommand extends Command<Transaction> {
  constructor(
    public readonly userId: string,
    public readonly id: string,
    public readonly data: UpdateTransactionRequest,
  ) {
    super();
  }
}
