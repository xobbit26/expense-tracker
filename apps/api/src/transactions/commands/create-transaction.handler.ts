import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Transaction } from '@expense-tracker/shared';

import { toPublicTransaction } from '../transactions.mapper.js';
import { TransactionsRepository } from '../transactions.repository.js';
import { CreateTransactionCommand } from './create-transaction.command.js';

@CommandHandler(CreateTransactionCommand)
export class CreateTransactionHandler
  implements ICommandHandler<CreateTransactionCommand, Transaction>
{
  constructor(private readonly repository: TransactionsRepository) {}

  async execute(command: CreateTransactionCommand): Promise<Transaction> {
    const category = await this.repository.findActiveCategory(
      command.userId,
      command.categoryId,
    );
    if (!category) {
      throw new BadRequestException('Category not found');
    }

    const transaction = await this.repository.create(command.userId, {
      type: command.type,
      amount: command.amount,
      date: new Date(`${command.date}T00:00:00.000Z`),
      categoryId: command.categoryId,
      description: command.description,
    });

    return toPublicTransaction(transaction);
  }
}
