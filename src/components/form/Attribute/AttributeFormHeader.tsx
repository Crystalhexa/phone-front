import React from 'react';

interface AttributeFormHeaderProps {
  isEdit?: boolean;
  title?: string;
}

export const AttributeFormHeader: React.FC<AttributeFormHeaderProps> = ({ 
  isEdit, 
  title 
}) => {
  const defaultTitle = isEdit ? 'Edit Attribute' : 'Create New Attribute';
  
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white">
        {title || defaultTitle}
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
        {isEdit 
          ? 'Update the category information below' 
          : 'Fill in the details to create a new category'
        }
      </p>
    </div>
  );
};