import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthResponse, Category, Transaction } from '@expense-tracker/shared';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { FakePrismaService } from './fake-prisma.service.js';

describe('Transactions (e2e)', () => {
  let app: INestApplication;
  let ownerToken: string;
  let otherToken: string;
  let categoryId: string;

  const registerUser = async (email: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, name: 'Test User', password: 'password123' })
      .expect(201);
    return (response.body as AuthResponse).accessToken;
  };

  const createCategory = async (token: string, name: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name, color: '#ff8800', icon: 'utensils' })
      .expect(201);
    return (response.body as Category).id;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(new FakePrismaService())
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    ownerToken = await registerUser('tx-owner@example.com');
    otherToken = await registerUser('tx-other@example.com');
    categoryId = await createCategory(ownerToken, 'Food');
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects requests without a token', () => {
    return request(app.getHttpServer()).get('/api/transactions').expect(401);
  });

  let createdId: string;

  it('creates a transaction and rounds the amount to 2 decimals', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        type: 'expense',
        amount: '1500.5',
        date: '2026-09-14',
        categoryId,
        description: 'Lunch',
      })
      .expect(201);

    const body = response.body as Transaction;
    expect(body.amount).toBe('1500.50');
    expect(body.category.id).toBe(categoryId);
    expect(body.category.archived).toBe(false);
    createdId = body.id;
  });

  it.each([
    ['negative amount', { amount: '-5' }],
    ['too many decimals', { amount: '1.234' }],
    ['non-numeric amount', { amount: 'abc' }],
  ])('rejects an invalid amount: %s', async (_label, override) => {
    await request(app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        type: 'expense',
        date: '2026-09-14',
        categoryId,
        ...override,
      })
      .expect(400);
  });

  it('rejects an invalid date', () => {
    return request(app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        type: 'expense',
        amount: '10.00',
        date: 'not-a-date',
        categoryId,
      })
      .expect(400);
  });

  it('rejects an invalid type', () => {
    return request(app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        type: 'invalid',
        amount: '10.00',
        date: '2026-09-14',
        categoryId,
      })
      .expect(400);
  });

  it("rejects another user's category", () => {
    return request(app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        type: 'expense',
        amount: '10.00',
        date: '2026-09-14',
        categoryId,
      })
      .expect(400);
  });

  it('rejects an archived category', async () => {
    const archivedCategoryId = await createCategory(ownerToken, 'Temp');
    await request(app.getHttpServer())
      .delete(`/api/categories/${archivedCategoryId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        type: 'expense',
        amount: '10.00',
        date: '2026-09-14',
        categoryId: archivedCategoryId,
      })
      .expect(400);
  });

  it('filters the list by year and month and computes totals', async () => {
    await request(app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        type: 'income',
        amount: '2000.00',
        date: '2026-09-01',
        categoryId,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        type: 'expense',
        amount: '100.00',
        date: '2026-08-01',
        categoryId,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/api/transactions')
      .query({ year: 2026, month: 9 })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const body = response.body as { items: Transaction[]; totals: Record<string, string> };
    expect(body.items.every((item) => item.date.startsWith('2026-09'))).toBe(
      true,
    );
    expect(body.totals.income).toBe('2000.00');
    expect(body.totals.expense).toBe('1500.50');
    expect(body.totals.balance).toBe('499.50');
  });

  it('rejects month without year', () => {
    return request(app.getHttpServer())
      .get('/api/transactions')
      .query({ month: 9 })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(400);
  });

  it('rejects an out-of-range month', () => {
    return request(app.getHttpServer())
      .get('/api/transactions')
      .query({ year: 2026, month: 13 })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(400);
  });

  it('returns an empty list for another user', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/transactions')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200);

    const body = response.body as { items: Transaction[] };
    expect(body.items).toEqual([]);
  });

  it('gets a single transaction', () => {
    return request(app.getHttpServer())
      .get(`/api/transactions/${createdId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
  });

  it("returns 404 for another user's transaction", () => {
    return request(app.getHttpServer())
      .get(`/api/transactions/${createdId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });

  it('rejects a non-uuid id', () => {
    return request(app.getHttpServer())
      .get('/api/transactions/not-a-uuid')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(400);
  });

  it('updates a transaction', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/transactions/${createdId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ description: 'Dinner' })
      .expect(200);

    expect((response.body as Transaction).description).toBe('Dinner');
  });

  it('rejects an empty update payload', () => {
    return request(app.getHttpServer())
      .patch(`/api/transactions/${createdId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})
      .expect(400);
  });

  it("returns 404 when updating another user's transaction", () => {
    return request(app.getHttpServer())
      .patch(`/api/transactions/${createdId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ description: 'Hijacked' })
      .expect(404);
  });

  it('keeps an archived category on its transactions and totals unchanged', async () => {
    await request(app.getHttpServer())
      .delete(`/api/categories/${categoryId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);

    const listResponse = await request(app.getHttpServer())
      .get('/api/transactions')
      .query({ year: 2026, month: 9 })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const body = listResponse.body as {
      items: Transaction[];
      totals: Record<string, string>;
    };
    const transaction = body.items.find((item) => item.id === createdId);
    expect(transaction?.category.archived).toBe(true);
    expect(body.totals.income).toBe('2000.00');
    expect(body.totals.expense).toBe('1500.50');
  });

  it('deletes a transaction', () => {
    return request(app.getHttpServer())
      .delete(`/api/transactions/${createdId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);
  });

  it('returns 404 when deleting an already-deleted transaction', () => {
    return request(app.getHttpServer())
      .delete(`/api/transactions/${createdId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);
  });
});
