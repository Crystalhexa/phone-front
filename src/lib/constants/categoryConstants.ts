import { CategoryFormConfig } from '@/types/category';

export const DEFAULT_CATEGORY_CONFIG: CategoryFormConfig = {
  maxSubcategories: 20,
  maxSubcategoryLength: 30,
  allowDuplicates: false,
  separator: '|',
  showPreview: true,
  enableDragDrop: true,
  enableAutoSave: true,
};

export const COMMON_SUBCATEGORIES: Record<string, string[]> = {
  'Electronics': ['Smartphones', 'Laptops', 'Tablets', 'Smart Watches', 'Headphones'],
  'Clothing': ['Shirts', 'Pants', 'Dresses', 'Shoes', 'Accessories'],
  'Books': ['Fiction', 'Non-Fiction', 'Educational', 'Comics', 'Magazines'],
  'Food': ['Fruits', 'Vegetables', 'Dairy', 'Meat', 'Beverages'],
};

export const VALIDATION_MESSAGES = {
  CATEGORY_NAME_REQUIRED: 'Category name is required',
  CATEGORY_NAME_TOO_LONG: 'Category name must be less than 50 characters',
  CATEGORY_NAME_INVALID: 'Only letters, numbers, spaces, hyphens, and underscores allowed',
  DESCRIPTION_TOO_LONG: 'Description must be less than 500 characters',
  TOO_MANY_SUBCATEGORIES: 'Maximum {max} subcategories allowed',
  SUBCATEGORY_TOO_LONG: 'Each subcategory must be less than {max} characters',
  DUPLICATE_SUBCATEGORIES: 'Duplicate subcategories are not allowed',
} as const;