import { userSchema } from '@expense-tracker/shared';
import { createZodDto } from 'nestjs-zod';

export class UserDto extends createZodDto(userSchema) {}
