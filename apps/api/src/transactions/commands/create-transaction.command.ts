import { Command } from '@nestjs/cqrs';
import { Transaction } from '@expense-tracker/shared';

export class CreateTransactionCommand extends Command<Transaction> {
  constructor(
    public readonly userId: string,
    public readonly type: 'income' | 'expense',
    public readonly amount: string,
    public readonly date: string,
    public readonly categoryId: string,
    public readonly description?: string,
  ) {
    super();
  }
}
