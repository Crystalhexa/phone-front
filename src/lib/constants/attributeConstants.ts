import { AttributeFormConfig } from '@/types/attribute';

export const DEFAULT_ATTRIBUTE_CONFIG: AttributeFormConfig = {
  maxValues: 20,
  maxValueLength: 30,
  allowDuplicates: false,
  separator: '|',
  showPreview: true,
  enableDragDrop: true,
  enableAutoSave: true,
};

export const COMMON_ATTRIBUTE_VALUES: Record<string, string[]> = {
  'Electronics': ['Smartphones', 'Laptops', 'Tablets', 'Smart Watches', 'Headphones'],
  'Clothing': ['Shirts', 'Pants', 'Dresses', 'Shoes', 'Accessories'],
  'Books': ['Fiction', 'Non-Fiction', 'Educational', 'Comics', 'Magazines'],
  'Food': ['Fruits', 'Vegetables', 'Dairy', 'Meat', 'Beverages'],
};

export const VALIDATION_MESSAGES = {
  ATTRIBUTE_NAME_REQUIRED: 'Attribute name is required',
  ATTRIBUTE_NAME_TOO_LONG: 'Attribute name must be less than 50 characters',
  ATTRIBUTE_NAME_INVALID: 'Only letters, numbers, spaces, hyphens, and underscores allowed',
  DESCRIPTION_TOO_LONG: 'Description must be less than 500 characters',
  TOO_MANY_VALUES: 'Maximum {max} values allowed',
  VALUE_TOO_LONG: 'Each value must be less than {max} characters',
  DUPLICATE_VALUES: 'Duplicate values are not allowed',
} as const;