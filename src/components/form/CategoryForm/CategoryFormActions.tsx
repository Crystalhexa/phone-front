import React from 'react';
import { Download } from 'lucide-react';
import { CategoryFormActionsProps } from '@/types/form';
import SubmitButton from '../common/SubmitButton';

export const CategoryFormActions: React.FC<CategoryFormActionsProps> = ({
  onCancel,
  onSubmit,
  isLoading,
  isEdit,
  showExport = false,
  onExport,
}) => {
  return (
    <div className="pt-4 flex justify-between items-center">
      <div className="flex gap-2">
        {showExport && onExport && (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        )}
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
          {isEdit ? 'Update Category' : 'Create Category'}
        </SubmitButton>
      </div>
    </div>
  );
};