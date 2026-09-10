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
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import type { AuthUser } from '../auth/types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  CategoryDto,
  CreateCategoryRequestDto,
  UpdateCategoryRequestDto,
} from './categories.dto.js';
import { CategoriesService } from './categories.service.js';

@Controller('categories')
@ApiBearerAuth()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ZodResponse({ status: 201, type: CategoryDto })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCategoryRequestDto,
  ): Promise<CategoryDto> {
    const category = await this.categoriesService.create(user.id, dto);
    return this.categoriesService.toPublic(category);
  }

  @Get()
  @ZodResponse({ type: [CategoryDto] })
  async findAll(@CurrentUser() user: AuthUser): Promise<CategoryDto[]> {
    const categories = await this.categoriesService.findAll(user.id);
    return categories.map((category) =>
      this.categoriesService.toPublic(category),
    );
  }

  @Patch(':id')
  @ZodResponse({ type: CategoryDto })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryRequestDto,
  ): Promise<CategoryDto> {
    const category = await this.categoriesService.update(user.id, id, dto);
    return this.categoriesService.toPublic(category);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.categoriesService.remove(user.id, id);
  }
}
