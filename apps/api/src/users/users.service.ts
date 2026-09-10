import { ConflictException, Injectable } from '@nestjs/common';
import { User as SharedUser } from '@expense-tracker/shared';

import { Prisma, User } from '../generated/prisma/client.js';
import { UsersRepository } from './users.repository.js';

export interface CreateUserInput {
  email: string;
  name: string;
  passwordHash: string;
}

const PRISMA_UNIQUE_CONSTRAINT_CODE = 'P2002';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(input: CreateUserInput): Promise<User> {
    try {
      return await this.usersRepository.create({
        ...input,
        email: normalizeEmail(input.email),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_UNIQUE_CONSTRAINT_CODE
      ) {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(normalizeEmail(email));
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  toPublic(user: User): SharedUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    };
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
