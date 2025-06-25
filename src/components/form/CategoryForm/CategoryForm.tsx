"use client";

import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ErrorBoundary } from 'react-error-boundary';
import { CategoryFormData, CategoryFormConfig } from '@/types/category';
import { DEFAULT_CATEGORY_CONFIG } from '@/lib/constants/categoryConstants';
import { createCategorySchema } from '@/lib/validations/categoryValidation';
import { trackEvent, categoryFormEvents } from '@/lib/utils/analytics';
import { useSubcategories } from '@/hooks/useSubcategories';
import { useFormDraft } from '@/hooks/useFormDraft';
import { Form } from '../../ui/form';
import CustomFormField, { FormFieldType } from '../common/CustomFormField';
import { CategoryFormHeader } from './CategoryFormHeader';
import { SubcategoryPreview } from './SubcategoryPreview';
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
  config?: Partial<CategoryFormConfig>;
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
  config: userConfig = {},
  title,
  showExport,
}) => {
  const config = useMemo(() => ({
    ...DEFAULT_CATEGORY_CONFIG,
    ...userConfig,
    enableDragDrop: !!userConfig.enableDragDrop // ✅ Ensures boolean
  }), [userConfig]);

  const categorySchema = useMemo(() => createCategorySchema(config), [config]);

  
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
      description: '',
      subcategories: '',
    },
  });


  // Custom hooks
  const { subcategoriesArray, removeSubcategory, reorderSubcategory } = useSubcategories(form, config);
  const { clearDraft } = useFormDraft(form, categoryId, config.enableAutoSave);

  // Populate form with fetched data
  useEffect(() => {
  if (isEdit && categoryData) {
    form.reset({
      name: categoryData.data.name,
      description: categoryData.data.description || '',
        subcategories: categoryData.data.subcategories.join(config.separator),
    });
  }
}, [isEdit, categoryData, form, config.separator]);

  // Analytics tracking
  useEffect(() => {
    trackEvent({
      name: categoryFormEvents.FORM_OPENED,
      properties: { mode: isEdit ? 'edit' : 'create', categoryId },
    });
  }, [isEdit, categoryId]);

  const onSubmit = async (values: CategoryFormData) => {
    try {
      const subcategoriesArray = values.subcategories
        ? values.subcategories.split(config.separator).map(s => s.trim()).filter(Boolean)
        : [];

      const categoryPayload = {
        name: values.name,
        description: values.description,
        subcategories: subcategoriesArray,
      };

      if (isEdit && categoryId) {
        await updateCategory({ id: categoryId, body: categoryPayload }).unwrap();
        toast.success('Category updated successfully!');
      } else {
        await addCategory(categoryPayload).unwrap();
        toast.success('Category created successfully!');
        form.reset();
      }

      clearDraft();

      trackEvent({
        name: categoryFormEvents.FORM_SUBMITTED,
        properties: {
          mode: isEdit ? 'edit' : 'create',
          categoryId,
          subcategoriesCount: subcategoriesArray.length,
        },
      });

      onSuccess?.();
    } catch (error: any) {
      form.reset();
      const errorMessage = error?.data?.message;
      toast.error(errorMessage);
    }

  };


  const handleExport = () => {
    const formData = form.getValues();
    const exportData = {
      ...formData,
      subcategories: subcategoriesArray,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `category-${formData.name || 'draft'}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    trackEvent({
      name: categoryFormEvents.FORM_EXPORTED,
      properties: { categoryName: formData.name },
    });

    toast.success('Category data exported successfully!');
  };

  // Handle loading states
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
            required
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

          {/* Subcategories Field */}
          <div className="space-y-2">
            <CustomFormField
              fieldType={FormFieldType.TEXTAREA}
              control={form.control}
              name="subcategories"
              label={`Subcategories (separated by "${config.separator}")`}
              placeholder={`Enter subcategories separated by "${config.separator}"`}
              disabled={isLoading}
              helperText={`Maximum ${config.maxSubcategories} subcategories, each up to ${config.maxSubcategoryLength} characters`}
            />

            {/* Subcategory Preview */}
            {config.showPreview && (
              <SubcategoryPreview
                subcategories={subcategoriesArray}
                onRemove={removeSubcategory}
                onReorder={config.enableDragDrop ? reorderSubcategory : undefined}
                enableDragDrop={config.enableDragDrop}
              />
            )}
          </div>

          {/* Form Actions */}
          <CategoryFormActions
            onCancel={onCancel}
            onSubmit={form.handleSubmit(onSubmit)}
            isLoading={isLoading}
            isEdit={isEdit}
            showExport={showExport}
            onExport={handleExport}
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
