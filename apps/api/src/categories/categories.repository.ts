import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { Category } from '../generated/prisma/client.js';

export interface CreateCategoryData {
  name: string;
  color: string;
  icon: string;
}

export type UpdateCategoryData = Partial<CreateCategoryData>;

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, data: CreateCategoryData): Promise<Category> {
    return this.prisma.category.create({ data: { ...data, userId } });
  }

  findManyByUserId(userId: string): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  update(
    userId: string,
    id: string,
    data: UpdateCategoryData,
  ): Promise<Category> {
    return this.prisma.category.update({
      where: { id, userId, deletedAt: null },
      data,
    });
  }

  archive(userId: string, id: string): Promise<Category> {
    return this.prisma.category.update({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
