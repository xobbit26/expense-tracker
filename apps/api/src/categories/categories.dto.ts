import {
  categorySchema,
  createCategoryRequestSchema,
  updateCategoryRequestSchema,
} from '@expense-tracker/shared';
import { createZodDto } from 'nestjs-zod';

export class CategoryDto extends createZodDto(categorySchema) {}
export class CreateCategoryRequestDto extends createZodDto(
  createCategoryRequestSchema,
) {}
export class UpdateCategoryRequestDto extends createZodDto(
  updateCategoryRequestSchema,
) {}
