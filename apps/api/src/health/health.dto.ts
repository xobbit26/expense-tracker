import { healthResponseSchema } from '@expense-tracker/shared';
import { createZodDto } from 'nestjs-zod';

export class HealthResponseDto extends createZodDto(healthResponseSchema) {}
