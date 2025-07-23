// types/product.ts
export interface CurrentPrices {
  cost_price: number;
  wholesale_price: number | null;
  retail_price: number;
  last_updated: string;
}

export interface BranchStock {
  branch_id: string;
  branch_name: string;
  branch_code: string;
  total_quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number;
  stock_status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NOT_STOCKED';
  average_cost_price: number | null;
  last_restock_date: string | null;
  last_sale_date: string | null;
}

export interface Barcode {
  code: string;
  type: string;
  is_active: boolean;
}

export interface Specification {
  spec_name: string;
  spec_value: string;
  spec_unit: string | null;
}

export interface ProductResponse {
  id: string;
  name: string;
  model: string;
  description: string | null;
  sku: string;
  warranty_period: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  current_prices: CurrentPrices | null;
  branch_stock: BranchStock[];
  total_system_stock: number;
  total_available_stock: number;
  overall_stock_status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NOT_STOCKED';
  barcodes: Barcode[];
  specifications: Specification[];
  availableQuantity: number;
  reservedQuantity: number;
  category: string;
  subcategory: string;
  brand?: string;
  code: string;
  costPrice: number;
  retailPrice: number;
  wholesalePrice: number;
}

export interface Filters {
  search: string;
  sort: 'name' | 'created_at' | 'stock' | 'brand' | 'category';
  order: 'asc' | 'desc';
  category_id: string;
  subcategory_id: string;
  brand_id: string;
  stock_status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NOT_STOCKED' | 'ALL';
  include_inactive: boolean;
  low_stock_only: boolean;
  has_stock: boolean;
  min_stock: string;
  max_stock: string;
  branch_id: string;
}

export interface CartItem {
  id: string;
  product: {
    id: string;
    name: string;
    model?: string;
    sku?: string;
    brand?: {
      name: string;
      code: string;
    };
  };
  quantity: number;
  cost_price: number;
  wholesale_price?: number;
  retail_price: number;
  line_total: number;
  batch_number?: string;
  expiry_date?: string;
}