import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import { JwtAuthGuard } from './jwt-auth.guard.js';
import { AuthenticatedRequest } from './types.js';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: { verifyAsync: jest.Mock };
  let reflector: { getAllAndOverride: jest.Mock };

  const buildContext = (
    headers: Record<string, string> = {},
  ): {
    context: ExecutionContext;
    request: Partial<AuthenticatedRequest>;
  } => {
    const request: Partial<AuthenticatedRequest> = { headers };
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { context, request };
  };

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() };
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    guard = new JwtAuthGuard(
      jwtService as unknown as JwtService,
      reflector as unknown as Reflector,
    );
  });

  it('allows public routes without a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const { context } = buildContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('rejects a request with no authorization header', async () => {
    const { context } = buildContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a request with an invalid token', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('bad token'));
    const { context } = buildContext({ authorization: 'Bearer invalid' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches the user to the request for a valid token', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'a5f6c1b0-1d2e-4f3a-9c8b-7e6d5f4a3b2c',
      email: 'user@example.com',
    });
    const { context, request } = buildContext({
      authorization: 'Bearer valid',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({
      id: 'a5f6c1b0-1d2e-4f3a-9c8b-7e6d5f4a3b2c',
      email: 'user@example.com',
    });
  });
});
