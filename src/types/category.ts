export interface Category {
  id: string;
  name: string;
  description?: string;
  subcategories: string[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  slug?: string;
}

export interface Subcategory {
  subcategory_id: number;
  name: string;
  description: string;
}
export interface CategoryFormData {
  name: string;
  description?: string;
  subcategories: string;
}
export interface CategoryApiRequest {
  name: string;
  description?: string;
  subcategories: string[];
}

export interface CategoryFormConfig {
  maxSubcategories: number;
  maxSubcategoryLength: number;
  allowDuplicates: boolean;
  separator: string;
  showPreview: boolean;
  enableDragDrop: boolean;
  enableAutoSave: boolean;
}

export interface AttributeValue {
  id: number;
  value: string;
}




export interface CategoriesListResponse {
  success: boolean;
  data: {
    categories: Category[];
    total: number;
    limit: number;
    offset: number;
  };
  message?: string;
}

export interface CategoryApiResponse {
  subcategories(subcategories: any, separator: string): string | undefined;
  description: string;
  name: string | undefined;
  success: boolean;
  data: Category;
  message?: string;
}


export interface GetCategoriesParams {
  limit?: number;
  offset?: number;
  page?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DeleteCategoryResponse {
  success: boolean;
  message: string;
}