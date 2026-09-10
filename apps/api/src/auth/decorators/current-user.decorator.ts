import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { AuthenticatedRequest, AuthUser } from '../types.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
