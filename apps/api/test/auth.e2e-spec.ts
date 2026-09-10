import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthResponse } from '@expense-tracker/shared';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { FakePrismaService } from './fake-prisma.service.js';

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
