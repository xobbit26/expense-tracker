import { z } from 'zod';

const name = z.string().trim().min(1).max(50);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const icon = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(/^[a-z0-9-]+$/);

export const categorySchema = z.object({
  id: z.uuid(),
  name,
  color,
  icon,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Category = z.infer<typeof categorySchema>;

export const createCategoryRequestSchema = z.object({
  name,
  color,
  icon,
});

export type CreateCategoryRequest = z.infer<typeof createCategoryRequestSchema>;

export const updateCategoryRequestSchema = createCategoryRequestSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateCategoryRequest = z.infer<typeof updateCategoryRequestSchema>;
