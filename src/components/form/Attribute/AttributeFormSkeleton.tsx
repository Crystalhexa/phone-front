import React from 'react';

export const AttributeFormSkeleton: React.FC = () => {
  return (
    <div className="p-2 sm:p-4 animate-pulse">
      <div className="space-y-6">
        {/* Header */}
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        
        {/* Form Fields */}
        <div className="space-y-4">
          {/* Name field */}
          <div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          
          {/* Description field */}
          <div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          
          {/* Subcategories field */}
          <div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex justify-end gap-3">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
        </div>
      </div>
    </div>
  );
};