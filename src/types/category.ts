export interface Category {
  id: string;
  name: string;
  description?: string;
  subcategories: Subcategory[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  slug?: string;
}

export interface Subcategory {
  subcategory_id: string;
  name: string;
}
export interface CategoryFormData {
  name: string;
  description?: string;
}
export interface CategoryApiRequest {
  name: string;
  description?: string;
}


export interface AttributeValue {
  id: string;
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
export interface GetSubCategoriesParams {
  categoryId?:string;
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