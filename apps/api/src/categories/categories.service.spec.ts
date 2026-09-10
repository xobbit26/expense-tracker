import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { Category, Prisma } from '../generated/prisma/client.js';
import { CategoriesRepository } from './categories.repository.js';
import { CategoriesService } from './categories.service.js';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repository: {
    create: jest.Mock;
    findManyByUserId: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  const userId = 'a5f6c1b0-1d2e-4f3a-9c8b-7e6d5f4a3b2c';

  const category: Category = {
    id: '11111111-1111-4111-8111-111111111111',
    userId,
    name: 'Food',
    color: '#ff8800',
    icon: 'utensils',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  const uniqueConstraintError = new Prisma.PrismaClientKnownRequestError(
    'Unique constraint failed',
    { code: 'P2002', clientVersion: '7.10.0' },
  );

  const recordNotFoundError = new Prisma.PrismaClientKnownRequestError(
    'Record to update not found',
    { code: 'P2025', clientVersion: '7.10.0' },
  );

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findManyByUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: CategoriesRepository, useValue: repository },
      ],
    }).compile();

    service = module.get(CategoriesService);
  });

  describe('create', () => {
    it('passes the userId to the repository', async () => {
      repository.create.mockResolvedValue(category);

      await service.create(userId, {
        name: 'Food',
        color: '#ff8800',
        icon: 'utensils',
      });

      expect(repository.create).toHaveBeenCalledWith(userId, {
        name: 'Food',
        color: '#ff8800',
        icon: 'utensils',
      });
    });

    it('maps a unique constraint violation to ConflictException', async () => {
      repository.create.mockRejectedValue(uniqueConstraintError);

      await expect(
        service.create(userId, {
          name: 'Food',
          color: '#ff8800',
          icon: 'utensils',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rethrows unrelated errors', async () => {
      const error = new Error('connection refused');
      repository.create.mockRejectedValue(error);

      await expect(
        service.create(userId, {
          name: 'Food',
          color: '#ff8800',
          icon: 'utensils',
        }),
      ).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('maps a record-not-found error to NotFoundException', async () => {
      repository.update.mockRejectedValue(recordNotFoundError);

      await expect(
        service.update(userId, category.id, { name: 'Groceries' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('maps a unique constraint violation to ConflictException', async () => {
      repository.update.mockRejectedValue(uniqueConstraintError);

      await expect(
        service.update(userId, category.id, { name: 'Groceries' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('remove', () => {
    it('maps a record-not-found error to NotFoundException', async () => {
      repository.delete.mockRejectedValue(recordNotFoundError);

      await expect(service.remove(userId, category.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('resolves when the repository deletes successfully', async () => {
      repository.delete.mockResolvedValue(category);

      await expect(
        service.remove(userId, category.id),
      ).resolves.toBeUndefined();
    });
  });

  describe('toPublic', () => {
    it('does not include the userId', () => {
      const publicCategory = service.toPublic(category);

      expect(publicCategory).toEqual({
        id: category.id,
        name: category.name,
        color: category.color,
        icon: category.icon,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      });
      expect(publicCategory).not.toHaveProperty('userId');
    });
  });
});
