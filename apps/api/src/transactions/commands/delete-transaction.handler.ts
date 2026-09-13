import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import {
  isPrismaError,
  PRISMA_RECORD_NOT_FOUND_CODE,
} from '../../prisma/prisma-errors.js';
import { TransactionsRepository } from '../transactions.repository.js';
import { DeleteTransactionCommand } from './delete-transaction.command.js';

@CommandHandler(DeleteTransactionCommand)
export class DeleteTransactionHandler
  implements ICommandHandler<DeleteTransactionCommand, void>
{
  constructor(private readonly repository: TransactionsRepository) {}

  async execute(command: DeleteTransactionCommand): Promise<void> {
    try {
      await this.repository.delete(command.userId, command.id);
    } catch (error) {
      if (isPrismaError(error, PRISMA_RECORD_NOT_FOUND_CODE)) {
        throw new NotFoundException('Transaction not found');
      }
      throw error;
    }
  }
}
