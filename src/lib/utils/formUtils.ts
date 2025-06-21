import { CategoryFormData } from '@/types/category';

export const validateFormData = (data: CategoryFormData): string[] => {
  const errors: string[] = [];
  
  if (!data.name?.trim()) {
    errors.push('Category name is required');
  }
  
  if (data.name && data.name.length > 50) {
    errors.push('Category name must be less than 50 characters');
  }
  
  if (data.description && data.description.length > 500) {
    errors.push('Description must be less than 500 characters');
  }
  
  return errors;
};

export const sanitizeFormData = (data: CategoryFormData): CategoryFormData => {
  return {
    name: data.name?.trim() || '',
    description: data.description?.trim() || '',
    subcategories: data.subcategories?.trim() || '',
  };
};

export const generateCategorySlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};