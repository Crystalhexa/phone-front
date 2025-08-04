export interface Subcategory {
  subcategory_id: string;
  name: string;
}

export interface SubcategoryListResponse {
  success: boolean;
  message?: string;
  data: {
    categoryId: string,
    name: string,
    total: number;
    subcategories: Subcategory[];
  };
}

export interface SubcategoryFormData {
  name: string;
  categoryId: string;
}
export interface EditSubcategoryFormData {
  name: string;
}

export interface SubcategoryResponse {
  success: boolean;
  message?: string;
  data: {
    id: string;
    name: string;
    category_id: string;
  };
}

