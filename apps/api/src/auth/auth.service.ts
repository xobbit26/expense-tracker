import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
} from '@expense-tracker/shared';
import * as argon2 from 'argon2';

import { User } from '../generated/prisma/client.js';
import { UsersService } from '../users/users.service.js';

let dummyHashPromise: Promise<string> | undefined;

function getDummyHash(): Promise<string> {
  dummyHashPromise ??= argon2.hash('dummy-password-for-timing-safety');
  return dummyHashPromise;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterRequest): Promise<AuthResponse> {
    const passwordHash = await argon2.hash(dto.password);
    const user = await this.usersService.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
    });
    return this.issue(user);
  }

  async login(dto: LoginRequest): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(dto.email);
    const passwordHash = user?.passwordHash ?? (await getDummyHash());
    const passwordValid = await argon2.verify(passwordHash, dto.password);

    if (!user || !passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issue(user);
  }

  private async issue(user: User): Promise<AuthResponse> {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });
    return { accessToken, user: this.usersService.toPublic(user) };
  }
}
