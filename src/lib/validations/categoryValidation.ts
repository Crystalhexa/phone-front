import { z } from 'zod';
import { VALIDATION_MESSAGES } from '@/lib/constants/categoryConstants';

export const createCategorySchema = () => {
  return z.object({
    name: z.string()
      .min(1, VALIDATION_MESSAGES.CATEGORY_NAME_REQUIRED)
      .max(50, VALIDATION_MESSAGES.CATEGORY_NAME_TOO_LONG)
      .regex(/^[a-zA-Z0-9\s\-_]+$/, VALIDATION_MESSAGES.CATEGORY_NAME_INVALID),
    
    description: z.string()
      .max(500, VALIDATION_MESSAGES.DESCRIPTION_TOO_LONG)
      .optional(),
    
  })
};
export const createSubCategorySchema = () => {
  return z.object({
    name: z.string()
      .min(1, VALIDATION_MESSAGES.CATEGORY_NAME_REQUIRED)
      .max(50, VALIDATION_MESSAGES.CATEGORY_NAME_TOO_LONG)
      .regex(/^[a-zA-Z0-9\s\-_]+$/, VALIDATION_MESSAGES.CATEGORY_NAME_INVALID),
    
    categoryId:z.string()
    
  })
};