import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ZodResponse } from 'nestjs-zod';

import { AuthService } from './auth.service.js';
import {
  AuthResponseDto,
  LoginRequestDto,
  RegisterRequestDto,
} from './auth.dto.js';
import { Public } from './decorators/public.decorator.js';

@Controller('auth')
@Public()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ZodResponse({ status: 201, type: AuthResponseDto })
  register(@Body() dto: RegisterRequestDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ZodResponse({ status: 200, type: AuthResponseDto })
  login(@Body() dto: LoginRequestDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }
}
