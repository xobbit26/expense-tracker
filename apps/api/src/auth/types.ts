import { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
}

export type AuthenticatedRequest = Request & { user: AuthUser };
