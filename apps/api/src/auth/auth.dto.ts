import {
  authResponseSchema,
  loginRequestSchema,
  registerRequestSchema,
} from '@expense-tracker/shared';
import { createZodDto } from 'nestjs-zod';

export class RegisterRequestDto extends createZodDto(registerRequestSchema) {}
export class LoginRequestDto extends createZodDto(loginRequestSchema) {}
export class AuthResponseDto extends createZodDto(authResponseSchema) {}
