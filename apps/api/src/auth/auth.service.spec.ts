import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';

import { User } from '../generated/prisma/client.js';
import { CreateUserInput, UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    create: jest.Mock<Promise<User>, [CreateUserInput]>;
    findByEmail: jest.Mock<Promise<User | null>, [string]>;
    toPublic: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock };

  const password = 'super-secret-1';
  let user: User;
  let publicUser: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
  };

  beforeEach(async () => {
    user = {
      id: 'a5f6c1b0-1d2e-4f3a-9c8b-7e6d5f4a3b2c',
      email: 'user@example.com',
      name: 'User',
      passwordHash: await argon2.hash(password),
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    };

    publicUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    };
    usersService = {
      create: jest.fn<Promise<User>, [CreateUserInput]>(),
      findByEmail: jest.fn<Promise<User | null>, [string]>(),
      toPublic: jest.fn().mockReturnValue(publicUser),
    };
    jwtService = { signAsync: jest.fn().mockResolvedValue('signed-jwt') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('hashes the password and issues a token', async () => {
      usersService.create.mockResolvedValue(user);

      const result = await service.register({
        email: user.email,
        name: user.name,
        password,
      });

      const [createArgs] = usersService.create.mock.calls[0];
      expect(createArgs.passwordHash).not.toBe(password);
      await expect(
        argon2.verify(createArgs.passwordHash, password),
      ).resolves.toBe(true);

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
      });
      expect(result).toEqual({
        accessToken: 'signed-jwt',
        user: publicUser,
      });
    });
  });

  describe('login', () => {
    it('issues a token for valid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(user);

      const result = await service.login({ email: user.email, password });

      expect(result.accessToken).toBe('signed-jwt');
    });

    it('rejects an incorrect password', async () => {
      usersService.findByEmail.mockResolvedValue(user);

      await expect(
        service.login({ email: user.email, password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an unknown email without revealing that it is unknown', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password }),
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
