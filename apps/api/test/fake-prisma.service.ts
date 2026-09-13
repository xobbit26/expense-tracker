import { randomUUID } from 'node:crypto';

import {
  Category,
  Prisma,
  Transaction,
  TransactionType,
  User,
} from '../src/generated/prisma/client.js';

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

type TransactionWithCategory = Transaction & { category: Category };

/**
 * In-memory stand-in for PrismaService used in e2e tests, so tests don't
 * depend on a real Postgres instance. Emulates just enough Prisma behaviour
 * (unique constraint / not-found errors) for the routes under test.
 */
export class FakePrismaService {
  private readonly users = new Map<string, User>();
  private readonly categories = new Map<string, Category>();
  private readonly transactions = new Map<string, Transaction>();

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
      data: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
    }) => {
      const existing = [...this.categories.values()].some(
        (category) =>
          category.userId === data.userId &&
          category.name === data.name &&
          category.deletedAt === null,
      );
      if (existing) {
        throw uniqueConstraintError('user_id,name');
      }
      const category: Category = {
        id: randomUUID(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      this.categories.set(category.id, category);
      return Promise.resolve(category);
    },
    findFirst: ({
      where,
    }: {
      where: { id: string; userId: string; deletedAt: null };
    }) => {
      const category = this.categories.get(where.id);
      if (
        !category ||
        category.userId !== where.userId ||
        category.deletedAt !== null
      ) {
        return Promise.resolve(null);
      }
      return Promise.resolve(category);
    },
    findMany: ({ where }: { where: { userId: string; deletedAt: null } }) => {
      const categories = [...this.categories.values()]
        .filter(
          (category) =>
            category.userId === where.userId && category.deletedAt === null,
        )
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      return Promise.resolve(categories);
    },
    update: ({
      where,
      data,
    }: {
      where: { id: string; userId: string; deletedAt: null };
      data: Partial<Pick<Category, 'name' | 'color' | 'icon' | 'deletedAt'>>;
    }) => {
      const category = this.categories.get(where.id);
      if (
        !category ||
        category.userId !== where.userId ||
        category.deletedAt !== null
      ) {
        throw recordNotFoundError();
      }
      if (data.name !== undefined) {
        const duplicate = [...this.categories.values()].some(
          (other) =>
            other.id !== category.id &&
            other.userId === category.userId &&
            other.name === data.name &&
            other.deletedAt === null,
        );
        if (duplicate) {
          throw uniqueConstraintError('user_id,name');
        }
      }
      const updated: Category = { ...category, ...data, updatedAt: new Date() };
      this.categories.set(updated.id, updated);
      return Promise.resolve(updated);
    },
  };

  transaction = {
    create: ({
      data,
    }: {
      data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;
      include?: { category: true };
    }) => {
      const transaction: Transaction = {
        id: randomUUID(),
        ...data,
        amount: new Prisma.Decimal(data.amount),
        description: data.description ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.transactions.set(transaction.id, transaction);
      return Promise.resolve(this.withCategory(transaction));
    },
    findFirst: ({ where }: { where: { id: string; userId: string } }) => {
      const transaction = this.transactions.get(where.id);
      if (!transaction || transaction.userId !== where.userId) {
        return Promise.resolve(null);
      }
      return Promise.resolve(this.withCategory(transaction));
    },
    findMany: ({
      where,
    }: {
      where: {
        userId: string;
        date?: { gte: Date; lt: Date };
      };
    }) => {
      const transactions = [...this.transactions.values()]
        .filter((transaction) => transaction.userId === where.userId)
        .filter((transaction) =>
          where.date
            ? transaction.date >= where.date.gte &&
              transaction.date < where.date.lt
            : true,
        )
        .sort(
          (a, b) =>
            b.date.getTime() - a.date.getTime() ||
            b.createdAt.getTime() - a.createdAt.getTime(),
        );
      return Promise.resolve(transactions.map((t) => this.withCategory(t)));
    },
    update: ({
      where,
      data,
    }: {
      where: { id: string; userId: string };
      data: Partial<
        Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
      >;
    }) => {
      const transaction = this.transactions.get(where.id);
      if (!transaction || transaction.userId !== where.userId) {
        throw recordNotFoundError();
      }
      const definedData = Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined),
      );
      const updated: Transaction = {
        ...transaction,
        ...definedData,
        amount:
          data.amount !== undefined
            ? new Prisma.Decimal(data.amount)
            : transaction.amount,
        updatedAt: new Date(),
      };
      this.transactions.set(updated.id, updated);
      return Promise.resolve(this.withCategory(updated));
    },
    delete: ({ where }: { where: { id: string; userId: string } }) => {
      const transaction = this.transactions.get(where.id);
      if (!transaction || transaction.userId !== where.userId) {
        throw recordNotFoundError();
      }
      this.transactions.delete(where.id);
      return Promise.resolve(transaction);
    },
    groupBy: ({
      where,
    }: {
      by: ['type'];
      where: {
        userId: string;
        date?: { gte: Date; lt: Date };
      };
      _sum: { amount: true };
    }) => {
      const transactions = [...this.transactions.values()]
        .filter((transaction) => transaction.userId === where.userId)
        .filter((transaction) =>
          where.date
            ? transaction.date >= where.date.gte &&
              transaction.date < where.date.lt
            : true,
        );

      const sums = new Map<TransactionType, Prisma.Decimal>();
      for (const transaction of transactions) {
        const current = sums.get(transaction.type) ?? new Prisma.Decimal(0);
        sums.set(transaction.type, current.plus(transaction.amount));
      }

      return Promise.resolve(
        [...sums.entries()].map(([type, sum]) => ({
          type,
          _sum: { amount: sum },
        })),
      );
    },
  };

  private withCategory(transaction: Transaction): TransactionWithCategory {
    const category = this.categories.get(transaction.categoryId);
    if (!category) {
      throw recordNotFoundError();
    }
    return { ...transaction, category };
  }
}
