import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Transaction } from '@expense-tracker/shared';

import {
  isPrismaError,
  PRISMA_RECORD_NOT_FOUND_CODE,
} from '../../prisma/prisma-errors.js';
import { toPublicTransaction } from '../transactions.mapper.js';
import {
  TransactionsRepository,
  UpdateTransactionData,
} from '../transactions.repository.js';
import { UpdateTransactionCommand } from './update-transaction.command.js';

@CommandHandler(UpdateTransactionCommand)
export class UpdateTransactionHandler
  implements ICommandHandler<UpdateTransactionCommand, Transaction>
{
  constructor(private readonly repository: TransactionsRepository) {}

  async execute(command: UpdateTransactionCommand): Promise<Transaction> {
    const { userId, id, data } = command;

    if (data.categoryId !== undefined) {
      const category = await this.repository.findActiveCategory(
        userId,
        data.categoryId,
      );
      if (!category) {
        throw new BadRequestException('Category not found');
      }
    }

    const updateData: UpdateTransactionData = {
      ...(data.type !== undefined && { type: data.type }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.date !== undefined && {
        date: new Date(`${data.date}T00:00:00.000Z`),
      }),
    };

    try {
      const transaction = await this.repository.update(userId, id, updateData);
      return toPublicTransaction(transaction);
    } catch (error) {
      if (isPrismaError(error, PRISMA_RECORD_NOT_FOUND_CODE)) {
        throw new NotFoundException('Transaction not found');
      }
      throw error;
    }
  }
}
