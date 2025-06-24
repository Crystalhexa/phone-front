import { z } from 'zod';
import { AttributeFormConfig } from '@/types/attribute';
import { VALIDATION_MESSAGES } from '@/lib/constants/attributeConstants';
import { stringToSubcategories } from '@/lib/utils/subcategoryUtils';

export const createAttributeSchema = (config: AttributeFormConfig) => {
  return z.object({
    name: z.string()
      .min(1, VALIDATION_MESSAGES.ATTRIBUTE_NAME_REQUIRED)
      .max(50, VALIDATION_MESSAGES.ATTRIBUTE_NAME_TOO_LONG)
      .regex(/^[a-zA-Z0-9\s\-_]+$/, VALIDATION_MESSAGES.ATTRIBUTE_NAME_INVALID),

    description: z.string()
      .max(500, VALIDATION_MESSAGES.DESCRIPTION_TOO_LONG)
      .optional(),

    values: z.string()
      .optional()
      .refine((val) => {
        if (!val) return true;
        const vals = stringToSubcategories(val, config.separator);
        return vals.length <= config.maxValues;
      }, VALIDATION_MESSAGES.TOO_MANY_VALUES.replace('{max}', config.maxValues.toString()))
      .refine((val) => {
        if (!val) return true;
        const vals = stringToSubcategories(val, config.separator);
        return vals.every(val => val.length <= config.maxValueLength);
      }, VALIDATION_MESSAGES.VALUE_TOO_LONG.replace('{max}', config.maxValueLength.toString()))
      .refine((val) => {
        if (!val || config.allowDuplicates) return true;
        const vals = stringToSubcategories(val, config.separator);
        const uniqueVals = [...new Set(vals.map(s => s.toLowerCase()))];
        return vals.length === uniqueVals.length;
      }, VALIDATION_MESSAGES.DUPLICATE_VALUES),
  });
};