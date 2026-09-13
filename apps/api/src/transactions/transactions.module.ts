import { Module } from '@nestjs/common';

import { CommandHandlers } from './commands/index.js';
import { QueryHandlers } from './queries/index.js';
import { TransactionsController } from './transactions.controller.js';
import { TransactionsRepository } from './transactions.repository.js';

@Module({
  controllers: [TransactionsController],
  providers: [TransactionsRepository, ...CommandHandlers, ...QueryHandlers],
})
export class TransactionsModule {}
