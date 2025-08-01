import * as z from 'zod';

export const createBrandSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
  description: z.string().optional()
});

export type BrandFormData = z.infer<typeof createBrandSchema>;

