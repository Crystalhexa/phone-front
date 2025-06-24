import * as z from 'zod';

export const createBrandSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
  description: z.string().optional(),
  code: z.string().min(1, "Brand code is required"), // ← added
});

export type BrandFormData = z.infer<typeof createBrandSchema>;

