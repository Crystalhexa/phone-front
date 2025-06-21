import { useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { CategoryFormData, CategoryFormConfig } from '@/types/category';
import { stringToSubcategories, subcategoriesToString, reorderSubcategories } from '@/lib/utils/subcategoryUtils';

export const useSubcategories = (
  form: UseFormReturn<CategoryFormData>,
  config: CategoryFormConfig
) => {
  const subcategoriesValue = form.watch('subcategories');
  
  const subcategoriesArray = useMemo(() => 
    stringToSubcategories(subcategoriesValue || '', config.separator),
    [subcategoriesValue, config.separator]
  );

  const removeSubcategory = (indexToRemove: number) => {
    const updatedSubcategories = subcategoriesArray.filter((_, index) => index !== indexToRemove);
    const updatedString = subcategoriesToString(updatedSubcategories, config.separator);
    form.setValue('subcategories', updatedString);
  };

  const addSubcategory = (newSubcategory: string) => {
    if (!newSubcategory.trim()) return;
    
    const updatedSubcategories = [...subcategoriesArray, newSubcategory.trim()];
    const updatedString = subcategoriesToString(updatedSubcategories, config.separator);
    form.setValue('subcategories', updatedString);
  };

  const reorderSubcategory = (startIndex: number, endIndex: number) => {
    const reordered = reorderSubcategories(subcategoriesArray, startIndex, endIndex);
    const updatedString = subcategoriesToString(reordered, config.separator);
    form.setValue('subcategories', updatedString);
  };

  const clearAllSubcategories = () => {
    form.setValue('subcategories', '');
  };

  const addCommonSubcategories = (categoryName: string) => {
    // Implementation for adding common subcategories based on category type
    // This would be implemented based on your business logic
  };

  return {
    subcategoriesArray,
    removeSubcategory,
    addSubcategory,
    reorderSubcategory,
    clearAllSubcategories,
    addCommonSubcategories,
  };
};