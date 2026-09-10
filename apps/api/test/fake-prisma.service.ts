import { randomUUID } from 'node:crypto';

import { Category, Prisma, User } from '../src/generated/prisma/client.js';

function uniqueConstraintError(
  fields: string,
): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    `Unique constraint failed on the fields: (\`${fields}\`)`,
    { code: 'P2002', clientVersion: '7.10.0' },
  );
}

function recordNotFoundError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Record not found', {
    code: 'P2025',
    clientVersion: '7.10.0',
  });
}

/**
 * In-memory stand-in for PrismaService used in e2e tests, so tests don't
 * depend on a real Postgres instance. Emulates just enough Prisma behaviour
 * (unique constraint / not-found errors) for the routes under test.
 */
export class FakePrismaService {
  private readonly users = new Map<string, User>();
  private readonly categories = new Map<string, Category>();

  user = {
    create: ({
      data,
    }: {
      data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
    }) => {
      const existing = [...this.users.values()].some(
        (user) => user.email === data.email,
      );
      if (existing) {
        throw uniqueConstraintError('email');
      }
      const user: User = {
        id: randomUUID(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.set(user.id, user);
      return Promise.resolve(user);
    },
    findUnique: ({ where }: { where: { id?: string; email?: string } }) => {
      if (where.id) {
        return Promise.resolve(this.users.get(where.id) ?? null);
      }
      const byEmail = [...this.users.values()].find(
        (user) => user.email === where.email,
      );
      return Promise.resolve(byEmail ?? null);
    },
  };

  category = {
    create: ({
      data,
    }: {
      data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>;
    }) => {
      const existing = [...this.categories.values()].some(
        (category) =>
          category.userId === data.userId && category.name === data.name,
      );
      if (existing) {
        throw uniqueConstraintError('user_id,name');
      }
      const category: Category = {
        id: randomUUID(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.categories.set(category.id, category);
      return Promise.resolve(category);
    },
    findMany: ({ where }: { where: { userId: string } }) => {
      const categories = [...this.categories.values()]
        .filter((category) => category.userId === where.userId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      return Promise.resolve(categories);
    },
    update: ({
      where,
      data,
    }: {
      where: { id: string; userId: string };
      data: Partial<Pick<Category, 'name' | 'color' | 'icon'>>;
    }) => {
      const category = this.categories.get(where.id);
      if (!category || category.userId !== where.userId) {
        throw recordNotFoundError();
      }
      if (data.name !== undefined) {
        const duplicate = [...this.categories.values()].some(
          (other) =>
            other.id !== category.id &&
            other.userId === category.userId &&
            other.name === data.name,
        );
        if (duplicate) {
          throw uniqueConstraintError('user_id,name');
        }
      }
      const updated: Category = { ...category, ...data, updatedAt: new Date() };
      this.categories.set(updated.id, updated);
      return Promise.resolve(updated);
    },
    delete: ({ where }: { where: { id: string; userId: string } }) => {
      const category = this.categories.get(where.id);
      if (!category || category.userId !== where.userId) {
        throw recordNotFoundError();
      }
      this.categories.delete(where.id);
      return Promise.resolve(category);
    },
  };
}
