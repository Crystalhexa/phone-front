import React from 'react';
import { CategoryFormActionsProps } from '@/types/form';
import SubmitButton from '../common/SubmitButton';

export const SubCategoryFormActions: React.FC<CategoryFormActionsProps> = ({
  onCancel,
  onSubmit,
  isLoading,
  isEdit
}) => {
  return (
    <div className="pt-4 flex justify-between items-center">
      <div className="flex gap-2">
        
      </div>
      
      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-md font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        )}
        <SubmitButton
          isLoading={isLoading}
          onClick={onSubmit}
          className="px-6 py-2 text-md font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
        >
          {isEdit ? 'Update Subcategory' : 'Create Subcategory'}
        </SubmitButton>
      </div>
    </div>
  );
};