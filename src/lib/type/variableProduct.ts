// types/product.ts
export interface Product {
  id: string;
  name: string;
  description?: string;
  subcategory_id?: string;
  brand_id?: string;
  created_at: string;
  updated_at: string;
  brand?: {
    id: string;
    name: string;
  };
  subcategory?: {
    id: string;
    name: string;
  };
  variations: ProductVariation[];
}

export interface ProductVariation {
  id: string;
  product_id: string;
  sku: string;
  name?: string;
  cost_price: number;
  wholesale_price?: number;
  retail_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  warranty_period?: number;
  created_at: string;
  updated_at: string;
  barcodes: Barcode[];
  attributes: ProductVariationAttribute[];
}

export interface Barcode {
  id: string;
  variation_id: string;
  code: string;
  type: 'INTERNAL' | 'UPC' | 'EAN';
  is_active: boolean;
  created_at: string;
}

export interface ProductVariationAttribute {
  id: string;
  variation_id: string;
  attribute_id: string;
  attribute_value_id: string;
  attribute: {
    id: string;
    name: string;
  };
  attribute_value: {
    id: string;
    value: string;
  };
}