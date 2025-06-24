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
export interface AttributeFormData {
  name: string;
  description?: string;
  values: string;
}

export interface AttributeFormConfig {
  maxValues: number;
  maxValueLength: number;
  allowDuplicates: boolean;
  separator: string;
  showPreview: boolean;
  enableDragDrop: boolean;
  enableAutoSave: boolean;
}