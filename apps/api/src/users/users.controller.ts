import { Controller, Get, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UserDto } from './users.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiBearerAuth()
  @ZodResponse({ type: UserDto })
  async me(@CurrentUser() currentUser: { id: string }): Promise<UserDto> {
    const user = await this.usersService.findById(currentUser.id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.usersService.toPublic(user);
  }
}
