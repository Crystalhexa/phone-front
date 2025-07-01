export interface CreateProductRequest {
  name: string;
  description?: string;
  subcategory_id?: string;
  brand_id?: string;
  is_variable: boolean;
  attributes?: Array<{
    attribute_id: string;
  }>;
  variations?: Array<{
    sku: string;
    name?: string;
    cost_price?: number;
    wholesale_price?: number;
    retail_price?: number;
    stock_quantity?: number;
    low_stock_threshold?: number;
    warranty_period?: number;
    barcode?: string;
    attributes?: Array<{
      attribute_id: string;
      attribute_value_id: string;
    }>;
  }>;
  default_variation?: {
    sku: string;
    cost_price?: number;
    wholesale_price?: number;
    retail_price?: number;
    stock_quantity?: number;
    low_stock_threshold?: number;
    warranty_period?: number;
    barcode?: string;
  };
}

export interface GetProductsQuery {
  page?: number;
  limit?: number;
  search?: string;
  subcategory_id?: string;
  brand_id?: string;
  sort_by?: 'name' | 'created_at' | 'updated_at' | 'price';
  sort_order?: 'asc' | 'desc';
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  subcategory_name: string;
  brand_name: string;
  variation_count: number;
  min_price: number;
  max_price: number;
  total_stock: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProductResult {
  productId: string;
}

export interface GetProductsResult {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
