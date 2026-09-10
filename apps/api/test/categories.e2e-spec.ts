import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthResponse, Category } from '@expense-tracker/shared';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { FakePrismaService } from './fake-prisma.service.js';

describe('Categories (e2e)', () => {
  let app: INestApplication;
  let ownerToken: string;
  let otherToken: string;

  const categoryBody = {
    name: 'Food',
    color: '#ff8800',
    icon: 'utensils',
  };

  const registerUser = async (email: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, name: 'Test User', password: 'password123' })
      .expect(201);
    return (response.body as AuthResponse).accessToken;
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

    ownerToken = await registerUser('owner@example.com');
    otherToken = await registerUser('other@example.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects requests without a token', () => {
    return request(app.getHttpServer()).get('/api/categories').expect(401);
  });

  it('rejects an invalid payload', async () => {
    await request(app.getHttpServer())
      .post('/api/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: '', color: '#ff8800', icon: 'utensils' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Food', color: 'not-a-color', icon: 'utensils' })
      .expect(400);
  });

  let createdId: string;

  it('creates a category', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(categoryBody)
      .expect(201);

    const body = response.body as Category;
    expect(body).toMatchObject(categoryBody);
    expect(body.id).toEqual(expect.any(String));
    createdId = body.id;
  });

  it('rejects creating a category with a duplicate name for the same user', () => {
    return request(app.getHttpServer())
      .post('/api/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(categoryBody)
      .expect(409);
  });

  it('allows another user to use the same category name', () => {
    return request(app.getHttpServer())
      .post('/api/categories')
      .set('Authorization', `Bearer ${otherToken}`)
      .send(categoryBody)
      .expect(201);
  });

  it('lists only the current user categories', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const body = response.body as Category[];
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject(categoryBody);
  });

  it('updates a category', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/categories/${createdId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Groceries' })
      .expect(200);

    expect((response.body as Category).name).toBe('Groceries');
  });

  it('rejects updating another user category', () => {
    return request(app.getHttpServer())
      .patch(`/api/categories/${createdId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ name: 'Hijacked' })
      .expect(404);
  });

  it('rejects an empty update payload', () => {
    return request(app.getHttpServer())
      .patch(`/api/categories/${createdId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})
      .expect(400);
  });

  it('rejects an invalid category id', () => {
    return request(app.getHttpServer())
      .patch('/api/categories/not-a-uuid')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Groceries' })
      .expect(400);
  });

  it('deletes a category', () => {
    return request(app.getHttpServer())
      .delete(`/api/categories/${createdId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);
  });

  it('returns 404 when deleting an already-deleted category', () => {
    return request(app.getHttpServer())
      .delete(`/api/categories/${createdId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);
  });
});
