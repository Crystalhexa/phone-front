"use client";

import React, { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ErrorBoundary } from "react-error-boundary";
import { Form } from "../../ui/form";
import CustomFormField, { FormFieldType } from "../common/CustomFormField";
import { BrandFormActions } from "./BrandFormActions";
import { BrandFormHeader } from "./BrandFormHeader";
import { BrandFormSkeleton } from "./BrandFormSkeleton";
import { brandFormEvents, trackEvent } from "@/lib/utils/analytics";
import { createBrandSchema } from "@/lib/validations/brandValidation";
import { useAddBrandMutation, useGetBrandByIdQuery, useUpdateBrandMutation } from "@/state/brand";


// Types
interface BrandFormProps {
  brandId?: string;
  isEdit: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
  title?: string;
}

const BrandFormErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
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

const BrandFormComponent: React.FC<BrandFormProps> = ({
  brandId,
  isEdit = true,
  onSuccess,
  onCancel,
  title,
}) => {
  const schema = useMemo(() => createBrandSchema, []);

  const {
    data: brandData,
    isLoading: isBrandLoading,
    isError: isBrandError,
    error: brandError,
  } = useGetBrandByIdQuery(brandId!, { skip: !isEdit || !brandId });

  const [addBrand, { isLoading: isAddingBrand }] = useAddBrandMutation();
  const [updateBrand, { isLoading: isUpdatingBrand }] = useUpdateBrandMutation();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      code: "", // ← added
    },
  });
console.log(isEdit, brandId);
  useEffect(() => {
    if (isEdit && brandData) {
      form.reset({
        name: brandData.data.name,
        description: brandData.data.description || "",
        code: brandData.data.code || "", // ← added
      });
    }
  }, [isEdit, brandData, form]);

  useEffect(() => {
    trackEvent({
      name: brandFormEvents.FORM_OPENED,
      properties: { mode: isEdit ? "edit" : "create", brandId },
    });
  }, [isEdit, brandId]);

  const onSubmit = async (values: { name: string; description?: string ; code?: string }) => {
    try {
      const payload = {
        name: values.name,
        description: values.description ?? "",
        code: values.code ?? "", // Ensure code is always a string
      };

      if (isEdit && brandId) {
        
        await updateBrand({ id: brandId, body: payload }).unwrap();
        toast.success("Brand updated successfully!");
      } else {
        await addBrand(payload).unwrap();
        toast.success("Brand created successfully!");
        form.reset();
      }

      trackEvent({
        name: brandFormEvents.FORM_SUBMITTED,
        properties: { mode: isEdit ? "edit" : "create", brandId },
      });

      onSuccess?.();
    } catch (error: any) {
      toast.error(error?.data?.message || "Something went wrong");
    }
  };

  if (isEdit && isBrandLoading) return <BrandFormSkeleton />;

  if (isEdit && isBrandError) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-lg font-semibold text-red-600 mb-2">Error Loading Brand</h2>
        <p className="text-gray-600 mb-4">
          {(brandError as any)?.data?.message || "Failed to load brand data"}
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

  const isLoading = isAddingBrand || isUpdatingBrand;

  return (
    <div className="w-full max-w-2xl mx-auto p-2 sm:p-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <BrandFormHeader isEdit={isEdit} title={title} />
          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="code"
            label="Brand Code"
            placeholder="Enter brand code"
            disabled={isLoading}
            
          />

          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="name"
            label="Brand Name"
            placeholder="Enter brand name"
            disabled={isLoading}
           
          />

          <CustomFormField
            fieldType={FormFieldType.TEXTAREA}
            control={form.control}
            name="description"
            label="Description"
            placeholder="Enter brand description (optional)"
            disabled={isLoading}
          />

          <BrandFormActions
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

export const BrandForm: React.FC<BrandFormProps> = (props) => {
  return (
    <ErrorBoundary FallbackComponent={BrandFormErrorFallback} onReset={() => window.location.reload()}>
      <BrandFormComponent {...props} />
    </ErrorBoundary>
  );
};

export default BrandForm;
