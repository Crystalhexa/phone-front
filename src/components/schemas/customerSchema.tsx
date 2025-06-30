// schemas/customerSchema.ts
import { z } from 'zod'


export const customerSchema = z.object({
  customer_number: z.string().min(1, 'Customer number is required'),
  name: z.string().min(1, 'Customer name is required'),
  email: z.string().email().optional(),
  nic: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  date_of_birth: z.coerce.date().optional(),
  customer_type: z.enum(['RETAIL', 'CORPORATE']).default('RETAIL'),
  credit_limit: z.coerce.number().optional(),
  outstanding_balance: z.coerce.number().default(0),
  loyalty_points: z.number().default(0),
  is_active: z.boolean().default(true),
})


export type CustomerFormData = z.infer<typeof customerSchema>
