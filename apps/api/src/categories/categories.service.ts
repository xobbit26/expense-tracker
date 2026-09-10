import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Category as SharedCategory } from '@expense-tracker/shared';

import { Category } from '../generated/prisma/client.js';
import {
  isPrismaError,
  PRISMA_RECORD_NOT_FOUND_CODE,
  PRISMA_UNIQUE_CONSTRAINT_CODE,
} from '../prisma/prisma-errors.js';
import {
  CategoriesRepository,
  CreateCategoryData,
  UpdateCategoryData,
} from './categories.repository.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async create(userId: string, data: CreateCategoryData): Promise<Category> {
    try {
      return await this.categoriesRepository.create(userId, data);
    } catch (error) {
      if (isPrismaError(error, PRISMA_UNIQUE_CONSTRAINT_CODE)) {
        throw new ConflictException('Category with this name already exists');
      }
      throw error;
    }
  }

  findAll(userId: string): Promise<Category[]> {
    return this.categoriesRepository.findManyByUserId(userId);
  }

  async update(
    userId: string,
    id: string,
    data: UpdateCategoryData,
  ): Promise<Category> {
    try {
      return await this.categoriesRepository.update(userId, id, data);
    } catch (error) {
      if (isPrismaError(error, PRISMA_RECORD_NOT_FOUND_CODE)) {
        throw new NotFoundException('Category not found');
      }
      if (isPrismaError(error, PRISMA_UNIQUE_CONSTRAINT_CODE)) {
        throw new ConflictException('Category with this name already exists');
      }
      throw error;
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    try {
      await this.categoriesRepository.delete(userId, id);
    } catch (error) {
      if (isPrismaError(error, PRISMA_RECORD_NOT_FOUND_CODE)) {
        throw new NotFoundException('Category not found');
      }
      throw error;
    }
  }

  toPublic(category: Category): SharedCategory {
    return {
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }
}
