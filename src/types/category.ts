export interface Category {
  id?: string;
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

export interface CategoryFormConfig {
  maxSubcategories: number;
  maxSubcategoryLength: number;
  allowDuplicates: boolean;
  separator: string;
  showPreview: boolean;
  enableDragDrop: boolean;
  enableAutoSave: boolean;
}