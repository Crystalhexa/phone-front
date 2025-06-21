// app/dashboard/categories/create/page.tsx (Example Page for Creating a Category)
'use client';

import React from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter
import CategoryForm from '@/components/form/CategoryForm/CategoryForm';

const CreateCategoryPage: React.FC = () => {
  const router = useRouter();

  const handleSuccess = () => {
    // Optionally redirect after successful creation
    router.push('/dashboard/categories'); // Navigate to the categories list
  };

  const handleCancel = () => {
    // Optionally redirect if user cancels creation
    router.push('/dashboard/categories');
  };

  return (
   
        <CategoryForm
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          // No categoryId or isEdit needed for creation
          title="New Category Details" // Custom title for the header
          showExport={true} // Allow exporting form data (e.g., as a template)
        />
      
  );
};

export default CreateCategoryPage;