import { useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { AttributeFormData, AttributeFormConfig } from '@/types/attribute';
import { stringToSubcategories, subcategoriesToString, reorderSubcategories } from '@/lib/utils/subcategoryUtils';

export const useAttributeValues = (
  form: UseFormReturn<AttributeFormData>,
  config: AttributeFormConfig
) => {
  const attributeValues = form.watch('values');

  const attributeValuesArray = useMemo(() =>
    stringToSubcategories(attributeValues || '', config.separator),
    [attributeValues, config.separator]
  );

  const removeAttributeValue = (indexToRemove: number) => {
    const updatedAttributeValues = attributeValuesArray.filter((_, index) => index !== indexToRemove);
    const updatedString = subcategoriesToString(updatedAttributeValues, config.separator);
    form.setValue('values', updatedString);
  };

  const addAttributeValue = (newAttributeValue: string) => {
    if (!newAttributeValue.trim()) return;

    const updatedAttributeValues = [...attributeValuesArray, newAttributeValue.trim()];
    const updatedString = subcategoriesToString(updatedAttributeValues, config.separator);
    form.setValue('values', updatedString);
  };

  const reorderAttributeValue = (startIndex: number, endIndex: number) => {
    const reordered = reorderSubcategories(attributeValuesArray, startIndex, endIndex);
    const updatedString = subcategoriesToString(reordered, config.separator);
    form.setValue('values', updatedString);
  };

  const clearAllAttributeValues = () => {
    form.setValue('values', '');
  };

  const addCommonAttributeValues = (categoryName: string) => {
    // Implementation for adding common attribute values based on category type
    // This would be implemented based on your business logic
  };

  return {
    attributeValuesArray,
    removeAttributeValue,
    addAttributeValue,
    reorderAttributeValue,
    clearAllAttributeValues,
    addCommonAttributeValues,
  };
};