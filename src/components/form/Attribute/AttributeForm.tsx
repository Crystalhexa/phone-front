"use client";

import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ErrorBoundary } from 'react-error-boundary';

import { AttributeFormData, AttributeFormConfig } from '@/types/attribute';
import { DEFAULT_ATTRIBUTE_CONFIG } from '@/lib/constants/attributeConstants';
import { createAttributeSchema } from '@/lib/validations/attributeValidation';
import { trackEvent, attributeFormEvents } from '@/lib/utils/analytics';

import { useAttributeValues } from '@/hooks/useAttributeValues';

import { Form } from '../../ui/form';
import CustomFormField, { FormFieldType } from '../common/CustomFormField';
import { AttributeFormHeader } from './AttributeFormHeader';
import { AttributeValuePreview } from './AttributeValuePreview';
import { AttributeFormActions } from './AttributeFormActions';
import { AttributeFormSkeleton } from './AttributeFormSkeleton';

// RTK Query hooks
import {
  useGetAttributeByIdQuery,
  useAddAttributeMutation,
  useUpdateAttributeMutation,
} from '@/state/attribute';

interface AttributeFormProps {
  attributeId?: string;
  isEdit: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
  config?: Partial<AttributeFormConfig>;
  title?: string;
  showExport?: boolean;
}

const AttributeFormErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
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

const AttributeFormComponent: React.FC<AttributeFormProps> = ({
  attributeId,
  isEdit = true,
  onSuccess,
  onCancel,
  config: userConfig = {},
  title,
  showExport,
}) => {
  const config = useMemo(() => ({
    ...DEFAULT_ATTRIBUTE_CONFIG,
    ...userConfig,
    enableDragDrop: !!userConfig.enableDragDrop
  }), [userConfig]);

  const attributeSchema = useMemo(() => createAttributeSchema(config), [config]);

  const {
    data: attributeData,
    isLoading: isAttributeLoading,
    isError: isAttributeError,
    error: attributeError,
  } = useGetAttributeByIdQuery(attributeId!, {
    skip: !isEdit || !attributeId,
  });

  const [addAttribute, { isLoading: isAddingAttribute }] = useAddAttributeMutation();
  const [updateAttribute, { isLoading: isUpdatingAttribute }] = useUpdateAttributeMutation();

  const form = useForm<AttributeFormData, any, AttributeFormData>({
    resolver: zodResolver(attributeSchema) as any,
    defaultValues: {
      name: '',
      values: '',
    },
  });

  const { attributeValuesArray, removeAttributeValue, reorderAttributeValue } = useAttributeValues(form, config);

  useEffect(() => {
    if (isEdit && attributeData) {
      form.reset({
        name: attributeData.data.name,
        values: attributeData.data.values.join(config.separator),
      });
    }
  }, [isEdit, attributeData, form, config.separator]);

  useEffect(() => {
    trackEvent({
      name: attributeFormEvents.FORM_OPENED,
      properties: { mode: isEdit ? 'edit' : 'create', attributeId },
    });
  }, [isEdit, attributeId]);

  const onSubmit = async (values: AttributeFormData) => {
    try {
      const valuesArray = values.values
        ? values.values.split(config.separator).map(v => v.trim()).filter(Boolean)
        : [];

      const attributePayload = {
        name: values.name,
        values: valuesArray,
      };

      if (isEdit && attributeId) {
        await updateAttribute({ id: attributeId, body: attributePayload }).unwrap();
        toast.success('Attribute updated successfully!');
      } else {
        await addAttribute(attributePayload).unwrap();
        toast.success('Attribute created successfully!');
        form.reset();
      }

     

      trackEvent({
        name: attributeFormEvents.FORM_SUBMITTED,
        properties: {
          mode: isEdit ? 'edit' : 'create',
          attributeId,
          valuesCount: valuesArray.length,
        },
      });

      onSuccess?.();
    } catch (error: any) {
      form.reset();
      const errorMessage = error?.data?.message || 'Failed to submit form';
      toast.error(errorMessage);
    }
  };

  const handleExport = () => {
    const formData = form.getValues();
    const exportData = {
      ...formData,
      values: attributeValuesArray,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attribute-${formData.name || 'draft'}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    trackEvent({
      name: attributeFormEvents.FORM_EXPORTED,
      properties: { attributeName: formData.name },
    });

    toast.success('Attribute data exported successfully!');
  };

  const isLoading = isAddingAttribute || isUpdatingAttribute;

  if (isEdit && isAttributeLoading) {
    return <AttributeFormSkeleton />;
  }

  if (isEdit && isAttributeError) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-lg font-semibold text-red-600 mb-2">Error Loading Attribute</h2>
        <p className="text-gray-600 mb-4">
          {(attributeError as any)?.data?.message || 'Failed to load attribute data'}
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

  return (
    <div className="w-full max-w-2xl mx-auto p-2 sm:p-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <AttributeFormHeader isEdit={isEdit} title={title} />

          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="name"
            label="Attribute Name"
            placeholder="Enter attribute name"
            disabled={isLoading}
            required
          />

          <div className="space-y-2">
            <CustomFormField
              fieldType={FormFieldType.TEXTAREA}
              control={form.control}
              name="values"
              label={`Values (separated by "${config.separator}")`}
              placeholder={`Enter values separated by "${config.separator}"`}
              disabled={isLoading}
              helperText={`Maximum ${config.maxValues} values, each up to ${config.maxValueLength} characters`}
            />

            {config.showPreview && (
              <AttributeValuePreview
                values={attributeValuesArray}
                onRemove={removeAttributeValue}
                onReorder={config.enableDragDrop ? reorderAttributeValue : undefined}
                enableDragDrop={config.enableDragDrop}
              />
            )}
          </div>

          <AttributeFormActions
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

export const AttributeForm: React.FC<AttributeFormProps> = (props) => {
  return (
    <ErrorBoundary
      FallbackComponent={AttributeFormErrorFallback}
      onReset={() => window.location.reload()}
    >
      <AttributeFormComponent {...props} />
    </ErrorBoundary>
  );
};

export default AttributeForm;
