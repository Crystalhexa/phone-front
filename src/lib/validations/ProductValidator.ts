import { z } from 'zod';

export class ProductValidator {
  static readonly attributeSchema = z.object({
    attribute_id: z.string().min(1, 'Attribute ID is required'),
  });

  static readonly variationAttributeSchema = z.object({
    attribute_id: z.string().min(1, 'Attribute ID is required'),
    attribute_value_id: z.string().min(1, 'Attribute value ID is required'),
  });

  static readonly variationSchema = z.object({
    sku: z.string()
      .min(1, 'SKU is required')
      .max(50, 'SKU must be less than 50 characters')
      .regex(/^[A-Za-z0-9\-_]+$/, 'SKU must contain only alphanumeric characters, hyphens, and underscores'),
    name: z.string().optional(),
    cost_price: z.number().min(0, 'Cost price must be non-negative').optional(),
    wholesale_price: z.number().min(0, 'Wholesale price must be non-negative').optional(),
    retail_price: z.number().min(0, 'Retail price must be non-negative').optional(),
    stock_quantity: z.number().int().min(0, 'Stock quantity must be non-negative').optional(),
    low_stock_threshold: z.number().int().min(0, 'Low stock threshold must be non-negative').optional(),
    warranty_period: z.number().int().min(0, 'Warranty period must be non-negative').optional(),
    barcode: z.string().max(50, 'Barcode must be less than 50 characters').optional(),
    attributes: z.array(this.variationAttributeSchema).optional().default([]),
  });

  static readonly defaultVariationSchema = z.object({
    sku: z.string()
      .min(1, 'SKU is required')
      .max(50, 'SKU must be less than 50 characters')
      .regex(/^[A-Za-z0-9\-_]+$/, 'SKU must contain only alphanumeric characters, hyphens, and underscores'),
    cost_price: z.number().min(0, 'Cost price must be non-negative').optional(),
    wholesale_price: z.number().min(0, 'Wholesale price must be non-negative').optional(),
    retail_price: z.number().min(0, 'Retail price must be non-negative').optional(),
    stock_quantity: z.number().int().min(0, 'Stock quantity must be non-negative').optional(),
    low_stock_threshold: z.number().int().min(0, 'Low stock threshold must be non-negative').optional(),
    warranty_period: z.number().int().min(0, 'Warranty period must be non-negative').optional(),
    barcode: z.string().max(50, 'Barcode must be less than 50 characters').optional(),
  });

  static readonly createProductSchema = z.object({
    name: z.string()
      .min(1, 'Product name is required')
      .max(255, 'Product name must be less than 255 characters')
      .trim(),
    description: z.string().optional(),
    subcategory_id: z.string().optional(),
    brand_id: z.string().optional(),
    is_variable: z.boolean(),
    attributes: z.array(this.attributeSchema).optional().default([]),
    variations: z.array(this.variationSchema).optional().default([]),
    default_variation: this.defaultVariationSchema.optional(),
  }).refine((data) => {
    if (data.is_variable && (!data.variations || data.variations.length === 0)) {
      return false;
    }
    if (!data.is_variable && !data.default_variation) {
      return false;
    }
    return true;
  }, {
    message: "Variable products must have variations, non-variable products must have default_variation",
  });

  static readonly getProductsSchema = z.object({
    page: z.number().int().min(1).optional().default(1),
    limit: z.number().int().min(1).max(100).optional().default(10),
    search: z.string().optional().default(''),
    subcategory_id: z.string().optional(),
    brand_id: z.string().optional(),
    sort_by: z.enum(['name', 'created_at', 'updated_at', 'price']).optional().default('created_at'),
    sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
  });
}