import { randomUUID } from 'node:crypto';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthResponse } from '@expense-tracker/shared';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { Prisma, User } from '../src/generated/prisma/client.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

class FakePrismaService {
  private readonly users = new Map<string, User>();

  user = {
    create: ({ data }: { data: Omit<User, 'id' | 'createdAt' | 'updatedAt'> }) => {
      const existing = [...this.users.values()].some(
        (user) => user.email === data.email,
      );
      if (existing) {
        throw new Prisma.PrismaClientKnownRequestError(
          'Unique constraint failed on the fields: (`email`)',
          { code: 'P2002', clientVersion: '7.10.0' },
        );
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
    findUnique: ({
      where,
    }: {
      where: { id?: string; email?: string };
    }) => {
      if (where.id) {
        return Promise.resolve(this.users.get(where.id) ?? null);
      }
      const byEmail = [...this.users.values()].find(
        (user) => user.email === where.email,
      );
      return Promise.resolve(byEmail ?? null);
    },
  };
}

describe('Auth (e2e)', () => {
  let app: INestApplication;

  const registerBody = {
    email: 'user@example.com',
    name: 'Test User',
    password: 'password123',
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a new user', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(registerBody)
      .expect(201);

    const body = response.body as AuthResponse;
    expect(body).toMatchObject({
      accessToken: expect.any(String) as string,
      user: {
        email: registerBody.email,
        name: registerBody.name,
      },
    });
    expect(body.user).not.toHaveProperty('passwordHash');
  });

  it('rejects registering the same email twice', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send(registerBody)
      .expect(409);
  });

  it('rejects an invalid registration payload', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'not-an-email', name: '', password: 'short' })
      .expect(400);
  });

  it('logs in with valid credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: registerBody.email, password: registerBody.password })
      .expect(200);

    const body = response.body as AuthResponse;
    expect(body.accessToken).toEqual(expect.any(String));
  });

  it('rejects login with an incorrect password', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: registerBody.email, password: 'wrong-password' })
      .expect(401);
  });

  it('returns the current user for a valid token', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: registerBody.email, password: registerBody.password })
      .expect(200);
    const loginBody = login.body as AuthResponse;

    const response = await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({ email: registerBody.email });
  });

  it('rejects /api/users/me without a token', () => {
    return request(app.getHttpServer()).get('/api/users/me').expect(401);
  });
});
