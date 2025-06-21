import { z } from 'zod';
import { CategoryFormConfig } from '@/types/category';
import { VALIDATION_MESSAGES } from '@/lib/constants/categoryConstants';
import { stringToSubcategories } from '@/lib/utils/subcategoryUtils';

export const createCategorySchema = (config: CategoryFormConfig) => {
  return z.object({
    name: z.string()
      .min(1, VALIDATION_MESSAGES.CATEGORY_NAME_REQUIRED)
      .max(50, VALIDATION_MESSAGES.CATEGORY_NAME_TOO_LONG)
      .regex(/^[a-zA-Z0-9\s\-_]+$/, VALIDATION_MESSAGES.CATEGORY_NAME_INVALID),
    
    description: z.string()
      .max(500, VALIDATION_MESSAGES.DESCRIPTION_TOO_LONG)
      .optional(),
    
    subcategories: z.string()
      .optional()
      .refine((val) => {
        if (!val) return true;
        const subs = stringToSubcategories(val, config.separator);
        return subs.length <= config.maxSubcategories;
      }, VALIDATION_MESSAGES.TOO_MANY_SUBCATEGORIES.replace('{max}', config.maxSubcategories.toString()))
      .refine((val) => {
        if (!val) return true;
        const subs = stringToSubcategories(val, config.separator);
        return subs.every(sub => sub.length <= config.maxSubcategoryLength);
      }, VALIDATION_MESSAGES.SUBCATEGORY_TOO_LONG.replace('{max}', config.maxSubcategoryLength.toString()))
      .refine((val) => {
        if (!val || config.allowDuplicates) return true;
        const subs = stringToSubcategories(val, config.separator);
        const uniqueSubs = [...new Set(subs.map(s => s.toLowerCase()))];
        return subs.length === uniqueSubs.length;
      }, VALIDATION_MESSAGES.DUPLICATE_SUBCATEGORIES),
  });
};