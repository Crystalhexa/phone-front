"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ErrorBoundary } from "react-error-boundary";

import { Form } from "@/components/ui/form";
import CustomFormField, { FormFieldType } from "../common/CustomFormField";
import { CategoryFormHeader } from "./SubCategoryFormHeader";
import { SubCategoryFormActions } from "./SubCategoryFormActions";
import { CategoryFormSkeleton } from "./SubCategoryFormSkeleton";

import {
  useGetCategoryByIdQuery,
  useAddSubcategoryMutation,
  useUpdateCategoryMutation,
} from "@/state/api";

// ✅ Zod Schema and Type (included inside component)
const createSubCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.string().min(1, "Category ID is required"),
});

type SubcategoryFormData = z.infer<typeof createSubCategorySchema>;

interface SubCategoryFormProps {
  categoryId?: string;
  isEdit: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
  title?: string;
}

const CategoryFormErrorFallback: React.FC<{
  error: Error;
  resetErrorBoundary: () => void;
}> = ({ error, resetErrorBoundary }) => (
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

const SubCategoryFormComponent: React.FC<SubCategoryFormProps> = ({
  categoryId,
  isEdit = false,
  onSuccess,
  onCancel,
  title,
}) => {
  if (!categoryId) {
    throw new Error("Category ID is required for this form.");
  }

  const {
    data: categoryData,
    isLoading: isCategoryLoading,
    isError: isCategoryError,
    error: categoryError,
  } = useGetCategoryByIdQuery(categoryId, {
    skip: !isEdit,
  });

  const [addSubcategory, { isLoading: isAdding }] = useAddSubcategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] = useUpdateCategoryMutation();

  const form = useForm<SubcategoryFormData>({
    resolver: zodResolver(createSubCategorySchema),
    defaultValues: {
      name: "",
      categoryId,
    },
  });

  useEffect(() => {
    if (isEdit && categoryData?.data) {
      form.reset({
        name: categoryData.data.name,
        categoryId,
      });
    }
  }, [isEdit, categoryData, categoryId, form]);

  const onSubmit = async (values: SubcategoryFormData) => {
    try {
      if (isEdit && categoryId) {
        await updateCategory({ id: categoryId, body: values }).unwrap();
        toast.success("Category updated successfully!");
      } else {
        await addSubcategory(values).unwrap();
        toast.success("Subcategory created successfully!");
        form.reset({ name: "", categoryId });
      }

      onSuccess?.();
    } catch (error: any) {
      toast.error(error?.data?.message || "Something went wrong.");
    }
  };

  if (isEdit && isCategoryLoading) return <CategoryFormSkeleton />;

  if (isEdit && isCategoryError) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-lg font-semibold text-red-600 mb-2">Error Loading Category</h2>
        <p className="text-gray-600 mb-4">
          {(categoryError as any)?.data?.message || "Failed to load category data"}
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

  const isLoading = isAdding || isUpdating;

  return (
    <div className="w-full max-w-2xl mx-auto p-2 sm:p-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <CategoryFormHeader isEdit={isEdit} title={title} />

          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="name"
            label="Subcategory Name"
            placeholder="Enter subcategory name"
            disabled={isLoading}
            required
          />

          <SubCategoryFormActions
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

export const SubCategoryForm: React.FC<SubCategoryFormProps> = (props) => (
  <ErrorBoundary
    FallbackComponent={CategoryFormErrorFallback}
    onReset={() => window.location.reload()}
  >
    <SubCategoryFormComponent {...props} />
  </ErrorBoundary>
);

export default SubCategoryForm;
