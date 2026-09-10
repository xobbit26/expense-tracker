import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { Prisma, User } from '../generated/prisma/client.js';
import { UsersRepository } from './users.repository.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  let service: UsersService;
  let repository: {
    create: jest.Mock;
    findByEmail: jest.Mock;
    findById: jest.Mock;
  };

  const user: User = {
    id: 'a5f6c1b0-1d2e-4f3a-9c8b-7e6d5f4a3b2c',
    email: 'user@example.com',
    name: 'User',
    passwordHash: 'hashed',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: repository },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('create', () => {
    it('normalizes the email before creating', async () => {
      repository.create.mockResolvedValue(user);

      await service.create({
        email: '  User@Example.com  ',
        name: 'User',
        passwordHash: 'hashed',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'user@example.com' }),
      );
    });

    it('maps a unique constraint violation to ConflictException', async () => {
      repository.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.10.0',
        }),
      );

      await expect(
        service.create({
          email: 'user@example.com',
          name: 'User',
          passwordHash: 'hashed',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rethrows unrelated errors', async () => {
      const error = new Error('connection refused');
      repository.create.mockRejectedValue(error);

      await expect(
        service.create({
          email: 'user@example.com',
          name: 'User',
          passwordHash: 'hashed',
        }),
      ).rejects.toBe(error);
    });
  });

  describe('findByEmail', () => {
    it('normalizes the email before looking it up', async () => {
      repository.findByEmail.mockResolvedValue(user);

      await service.findByEmail('  User@Example.com  ');

      expect(repository.findByEmail).toHaveBeenCalledWith('user@example.com');
    });
  });

  describe('toPublic', () => {
    it('does not include the password hash', () => {
      const publicUser = service.toPublic(user);

      expect(publicUser).toEqual({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
      });
      expect(publicUser).not.toHaveProperty('passwordHash');
    });
  });
});
