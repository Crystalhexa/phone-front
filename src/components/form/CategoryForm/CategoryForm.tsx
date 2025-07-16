"use client";

import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ErrorBoundary } from 'react-error-boundary';
import { CategoryFormData } from '@/types/category';
import { createCategorySchema } from '@/lib/validations/categoryValidation';
import { Form } from '../../ui/form';
import CustomFormField, { FormFieldType } from '../common/CustomFormField';
import { CategoryFormHeader } from './CategoryFormHeader';
import { CategoryFormActions } from './CategoryFormActions';
import { CategoryFormSkeleton } from './CategoryFormSkeleton';
// Import RTK Query hooks
import {
  useGetCategoryByIdQuery,
  useAddCategoryMutation,
  useUpdateCategoryMutation,
} from '@/state/api';

interface CategoryFormProps {
  categoryId?: string;
  isEdit: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
  title?: string;
  showExport?: boolean;
}

const CategoryFormErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
  error,
  resetErrorBoundary,
}) => (
  <div className="p-4 text-center">
    <h2 className="text-lg font-semibold text-red-600 mb-2">Something went wrong</h2>
    <p className="text-gray-600 mb-4">{error.message}</p>
    <button
      onClick={resetErrorBoundary}
      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
    >
      Try again
    </button>
  </div>
);
const CategoryFormComponent: React.FC<CategoryFormProps> = ({
  categoryId,
  isEdit = true,
  onSuccess,
  onCancel,
  title,
}) => {

  const categorySchema =createCategorySchema();

  
  // RTK Query hooks
  const {
    data: categoryData,
    isLoading: isCategoryLoading,
    isError: isCategoryError,
    error: categoryError,
  } = useGetCategoryByIdQuery(categoryId!, {
    skip: !isEdit || !categoryId,
  });
  console.log(isEdit,categoryId)

  const [addCategory, { isLoading: isAddingCategory }] = useAddCategoryMutation();
  const [updateCategory, { isLoading: isUpdatingCategory }] = useUpdateCategoryMutation();
  const form = useForm<CategoryFormData, any, CategoryFormData>({
    resolver: zodResolver(categorySchema) as any,
    defaultValues: {
      name: '',
      description: ''
    },
  });



  // Populate form with fetched data
  useEffect(() => {
  if (isEdit && categoryData) {
    form.reset({
      name: categoryData.data.name,
      description: categoryData.data.description || '',
    });
  }
}, [isEdit, categoryData, form]);


  const onSubmit = async (values: CategoryFormData) => {
    try {
      const categoryPayload = {
        name: values.name,
        description: values.description
      };

      if (isEdit && categoryId) {
        await updateCategory({ id: categoryId, body: categoryPayload }).unwrap();
        toast.success('Category updated successfully!');
      } else {
        await addCategory(categoryPayload).unwrap();
        toast.success('Category created successfully!');
        form.reset();
      }

      onSuccess?.();
    } catch (error: any) {
      form.reset();
      const errorMessage = error?.data?.message;
      toast.error(errorMessage);
    }

  };

  if (isEdit && isCategoryLoading) {
    return <CategoryFormSkeleton />;
  }

  if (isEdit && isCategoryError) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-lg font-semibold text-red-600 mb-2">Error Loading Category</h2>
        <p className="text-gray-600 mb-4">
          {(categoryError as any)?.data?.message || 'Failed to load category data'}
        </p>
        <button
          onClick={() => onCancel?.()}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  const isLoading = isAddingCategory || isUpdatingCategory;

  return (
    <div className="w-full max-w-2xl mx-auto p-2 sm:p-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <CategoryFormHeader isEdit={isEdit} title={title} />

          {/* Category Name Field */}
          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="name"
            label="Category Name"
            placeholder="Enter category name"
            disabled={isLoading}
            
          />

          {/* Description Field */}
          <CustomFormField
            fieldType={FormFieldType.TEXTAREA}
            control={form.control}
            name="description"
            label="Description"
            placeholder="Enter category description (optional)"
            disabled={isLoading}
          />

          {/* Form Actions */}
          <CategoryFormActions
            onCancel={onCancel}
            onSubmit={form.handleSubmit(onSubmit)}
            isLoading={isLoading}
            isEdit={isEdit}
          />
        </form>
      </Form>
    </div>
  );
};

// Main CategoryForm component with ErrorBoundary
export const CategoryForm: React.FC<CategoryFormProps> = (props) => {
  return (
    <ErrorBoundary
      FallbackComponent={CategoryFormErrorFallback}
      onReset={() => window.location.reload()}
    >
      <CategoryFormComponent {...props} />
    </ErrorBoundary>
  );
};

export default CategoryForm;
