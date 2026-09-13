import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ZodResponse } from 'nestjs-zod';

import type { AuthUser } from '../auth/types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  CreateTransactionCommand,
  DeleteTransactionCommand,
  UpdateTransactionCommand,
} from './commands/index.js';
import { GetTransactionQuery, GetTransactionsQuery } from './queries/index.js';
import {
  CreateTransactionRequestDto,
  TransactionDto,
  TransactionListQueryDto,
  TransactionListResponseDto,
  UpdateTransactionRequestDto,
} from './transactions.dto.js';

@Controller('transactions')
@ApiBearerAuth()
export class TransactionsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ZodResponse({ status: 201, type: TransactionDto })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTransactionRequestDto,
  ) {
    return this.commandBus.execute(
      new CreateTransactionCommand(
        user.id,
        dto.type,
        dto.amount,
        dto.date,
        dto.categoryId,
        dto.description,
      ),
    );
  }

  @Get()
  @ZodResponse({ type: TransactionListResponseDto })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: TransactionListQueryDto,
  ) {
    return this.queryBus.execute(
      new GetTransactionsQuery(user.id, query.year, query.month),
    );
  }

  @Get(':id')
  @ZodResponse({ type: TransactionDto })
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.queryBus.execute(new GetTransactionQuery(user.id, id));
  }

  @Patch(':id')
  @ZodResponse({ type: TransactionDto })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionRequestDto,
  ) {
    return this.commandBus.execute(
      new UpdateTransactionCommand(user.id, id, dto),
    );
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.commandBus.execute(new DeleteTransactionCommand(user.id, id));
  }
}
