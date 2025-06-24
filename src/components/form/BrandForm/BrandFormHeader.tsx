import React from 'react';

type Props = {
  isEdit: boolean;
  title?: string;
};

export const BrandFormHeader: React.FC<Props> = ({ isEdit, title }) => (
  <div className="mb-4">
    <h2 className="text-xl font-bold">
      {title || (isEdit ? 'Edit Brand' : 'Create Brand')}
    </h2>
    <p className="text-sm text-gray-500">
      Fill in the brand details below.
    </p>
  </div>
);