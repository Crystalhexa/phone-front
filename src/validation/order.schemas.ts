// validation/order.schemas.ts
import { z } from 'zod'

export const batchInfoSchema = z.object({
  batch_id: z.string().min(1, 'Batch ID is required'),
  quantity: z.number().min(1, "Batch qty need at least one").int().positive('Quantity must be positive')
})

export const barcodeInfoSchema = z.object({
  barcode_id: z.string().min(1, 'Barcode ID is required'),
  barcode: z.string().min(1, 'Barcode is required')
})

export const cartItemSchema = z.object({
  type: z.enum(['BATCH', 'INDIVIDUAL'], {
    required_error: 'Item type is required',
    invalid_type_error: 'Item type must be BATCH or INDIVIDUAL'
  }),
  wholesale_applied: z.boolean().optional(),
  total_quantity: z.number().min(1, "Total qty minimum need to have one"),
  has_custom_pricing: z.boolean().optional(),
  product_id: z.string().min(1, 'Product ID is required'),
  unit_price: z.number().positive('Unit price must be positive'),
  discount: z.number().min(0).optional().default(0),
  discount_amount_per_item: z.number().min(0).optional().default(0), // For individual items  
  batches: z.array(batchInfoSchema).optional(),
  item_barcodes: z.array(barcodeInfoSchema).optional()
}).refine(
  (data) => {
    if (data.type === 'BATCH') {
      return data.batches && data.batches.length > 0
    } else {
      return data.item_barcodes && data.item_barcodes.length > 0
    }
  },
  {
    message: "Batch items require batches array. Individual items require item_barcodes array.",
    path: ['batches', 'item_barcodes']
  }
)

export const placeOrderSchema = z.object({
  customer_id: z.string().optional(),
  items: z.array(cartItemSchema).min(1, 'At least one item is required'),
  discount: z.number().min(0).optional().default(0),
  notes: z.string().max(1000).optional(),
  delivery_date: z.string().datetime().optional()
})