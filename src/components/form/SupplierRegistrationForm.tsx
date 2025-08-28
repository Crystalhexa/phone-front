"use client";
import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ErrorBoundary } from 'react-error-boundary';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CustomFormField, { FormFieldType } from '@/components/form/common/CustomFormField';
import { Form } from '@/components/ui/form';
import { useAddSupplierMutation, useGetSupplierByIdQuery, useUpdateSupplierMutation } from '@/state/supplier';

// Supplier form data type
interface SupplierFormData {
  name: string;
  code: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  sales_rep_name: string;
  sales_rep_phone?: string;
  is_active: boolean;
}

// Supplier form configuration
interface SupplierFormConfig {
  enableAutoSave: boolean;
  requireContactName: boolean;
  requirePhone: boolean;
  requireEmail: boolean;
  requireSalesRepPhone: boolean;
  maxCodeLength: number;
}

const DEFAULT_SUPPLIER_CONFIG: SupplierFormConfig = {
  enableAutoSave: true,
  requireContactName: false,
  requirePhone: false,
  requireEmail: false,
  requireSalesRepPhone: false,
  maxCodeLength: 10,
};

// Validation schema
const createSupplierSchema = (config: SupplierFormConfig) => {
  return z.object({
    name: z.string()
      .min(1, "Supplier name is required")
      .max(100, "Name must be at most 100 characters"),
    code: z.string()
      .min(1, "Supplier code is required")
      .max(config.maxCodeLength, `Code must be at most ${config.maxCodeLength} characters`)
      .regex(/^[A-Za-z0-9_-]+$/, "Code can only contain letters, numbers, hyphens, and underscores"),
    contact_name: config.requireContactName
      ? z.string().min(1, "Contact name is required").max(100, "Contact name must be at most 100 characters")
      : z.string().max(100, "Contact name must be at most 100 characters").optional(),
    phone: config.requirePhone
      ? z.string().min(1, "Phone number is required").max(20, "Phone must be at most 20 characters")
      : z.string().max(20, "Phone must be at most 20 characters").optional(),
    email: config.requireEmail
      ? z.string().email("Invalid email format").max(255, "Email must be at most 255 characters")
      : z.string()
          .email("Invalid email format")
          .max(255, "Email must be at most 255 characters")
          .optional()
          .or(z.literal("")),
    address: z.string().optional(),
    sales_rep_name: z.string()
      .min(1, "Sales representative name is required")
      .max(100, "Sales rep name must be at most 100 characters"),
    sales_rep_phone: config.requireSalesRepPhone
      ? z.string().min(1, "Sales rep phone is required").max(20, "Sales rep phone must be at most 20 characters")
      : z.string().max(20, "Sales rep phone must be at most 20 characters").optional(),
    is_active: z.boolean().default(true),
  });
};

interface SupplierFormProps {
  supplierId?: string;
  isEdit?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
  config?: Partial<SupplierFormConfig>;
  title?: string;
  showExport?: boolean;
}

const SupplierFormErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
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

const SupplierFormHeader: React.FC<{ isEdit: boolean; title?: string }> = ({ isEdit, title }) => (
  <div className="mb-6">
    <h1 className="text-xl font-bold text-gray-800 dark:text-white">
      {title || (isEdit ? 'Edit Supplier' : 'Register New Supplier')}
    </h1>
    <p className="text-gray-600 mt-2">
      {isEdit ? 'Update supplier information' : 'Fill in the details to register a new supplier'}
    </p>
  </div>
);

const SupplierFormActions: React.FC<{
  onCancel?: () => void;
  onSubmit: () => void;
  isLoading: boolean;
  isEdit: boolean;
  showExport?: boolean;
  onExport?: () => void;
}> = ({ onCancel, onSubmit, isLoading, isEdit, showExport, onExport }) => (
  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
    <div className="flex gap-3 flex-1">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
      )}
      <button
        type="button"
        onClick={onSubmit}
        disabled={isLoading}
        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Saving...' : (isEdit ? 'Update Supplier' : 'Register Supplier')}
      </button>
    </div>
    {showExport && (
      <button
        type="button"
        onClick={onExport}
        disabled={isLoading}
        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
      >
        Export Data
      </button>
    )}
  </div>
);

const SupplierFormSkeleton: React.FC = () => (
  <div className="w-full max-w-2xl mx-auto p-2 sm:p-4">
    <div className="space-y-6">
      <div className="h-8 bg-gray-200 rounded animate-pulse" />
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4" />
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const SupplierFormComponent: React.FC<SupplierFormProps> = ({
  supplierId,
  isEdit = false,
  onSuccess,
  onCancel,
  config: userConfig = {},
  title,
  showExport,
}) => {
  const config = useMemo(() => ({
    ...DEFAULT_SUPPLIER_CONFIG,
    ...userConfig,
  }), [userConfig]);
  const router = useRouter()

  const supplierSchema = useMemo(() => createSupplierSchema(config), [config]);

  // RTK Query hooks
  const {
    data: supplierData,
    isLoading: isSupplierLoading,
    isError: isSupplierError,
    error: supplierError,
  } = useGetSupplierByIdQuery(supplierId!, {
    skip: !isEdit || !supplierId,
  });

  const [addSupplier, { isLoading: isAddingSupplier }] = useAddSupplierMutation();
  const [updateSupplier, { isLoading: isUpdatingSupplier }] = useUpdateSupplierMutation();

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema) as any,
    defaultValues: {
      name: '',
      code: '',
      contact_name: '',
      phone: '',
      email: '',
      address: '',
      sales_rep_name: '',
      sales_rep_phone: '',
      is_active: true,
    },
  });

  // Populate form with fetched data
  useEffect(() => {
    if (isEdit && supplierData) {
      const supplier = supplierData.data;
      form.reset({
        name: supplier.name,
        code: supplier.code,
        contact_name: supplier.contact_name || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        sales_rep_name: supplier.sales_rep_name,
        sales_rep_phone: supplier.sales_rep_phone || '',
        is_active: supplier.is_active,
      });
    }
  }, [isEdit, supplierData, form]);

  const onSubmit = async (values: SupplierFormData) => {
    try {
      const supplierPayload = {
        name: values.name,
        code: values.code,
        contact_name: values.contact_name || null,
        phone: values.phone || null,
        email: values.email || null,
        address: values.address || null,
        sales_rep_name: values.sales_rep_name,
        sales_rep_phone: values.sales_rep_phone || null,
        is_active: values.is_active,
      };

      if (isEdit && supplierId) {
        await updateSupplier({ id: supplierId, body: supplierPayload }).unwrap();
        toast.success('Supplier updated successfully!');
      } else {
        await addSupplier(supplierPayload).unwrap();
        toast.success('Supplier registered successfully!');
        form.reset();
      }

      onSuccess?.();
    } catch (error: any) {
      const errorMessage = error?.data?.message || 'An error occurred while saving the supplier';
      toast.error(errorMessage);
    }
  };

  const handleExport = () => {
    const formData = form.getValues();
    const exportData = {
      ...formData,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supplier-${formData.code || 'draft'}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Supplier data exported successfully!');
  };

  const handleBack = () => {
    router.push('/dashboard/orders/purchase/suppliers')
  }

  // Handle loading states
  if (isEdit && isSupplierLoading) {
    return <SupplierFormSkeleton />;
  }

  if (isEdit && isSupplierError) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-lg font-semibold text-red-600 mb-2">Error Loading Supplier</h2>
        <p className="text-gray-600 mb-4">
          {(supplierError as any)?.data?.message || 'Failed to load supplier data'}
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

  const isLoading = isAddingSupplier || isUpdatingSupplier;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <button
          onClick={handleBack}
          type="button"
          className="text-blue-500 flex items-center text-lg hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="mr-2" />
          Back
        </button>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Header */}
          <SupplierFormHeader isEdit={isEdit} title={title} />

          {/* Basic Information Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Basic Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="name"
                label="Supplier Name"
                placeholder="Enter supplier name"
                disabled={isLoading}
                required
              />
              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="code"
                label="Supplier Code"
                placeholder="Enter unique supplier code"
                disabled={isLoading || isEdit} // Disable code editing in edit mode
                required
              />
              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="contact_name"
                label="Contact Person"
                placeholder="Enter contact person name"
                disabled={isLoading}
                required={config.requireContactName}
              />
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Contact Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="phone"
                label="Phone Number"
                placeholder="Enter phone number"
                disabled={isLoading}
                required={config.requirePhone}
              />
              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="email"
                label="Email Address"
                placeholder="Enter email address"
                disabled={isLoading}
                required={config.requireEmail}
              />
            </div>
            <CustomFormField
              fieldType={FormFieldType.TEXTAREA}
              control={form.control}
              name="address"
              label="Address"
              placeholder="Enter supplier address"
              disabled={isLoading}
            />
          </div>

          {/* Sales Representative Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Sales Representative</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="sales_rep_name"
                label="Sales Rep Name"
                placeholder="Enter sales representative name"
                disabled={isLoading}
                required
              />
              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="sales_rep_phone"
                label="Sales Rep Phone"
                placeholder="Enter sales rep phone number"
                disabled={isLoading}
                required={config.requireSalesRepPhone}
              />
            </div>
          </div>

          {/* Status Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Status</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CustomFormField
                fieldType={FormFieldType.CHECKBOX}
                control={form.control}
                name="is_active"
                label="Active Supplier"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Form Actions */}
          <SupplierFormActions
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

// Main SupplierForm component with ErrorBoundary
export const SupplierForm: React.FC<SupplierFormProps> = (props) => {
  return (
    <ErrorBoundary
      FallbackComponent={SupplierFormErrorFallback}
      onReset={() => window.location.reload()}
    >
      <SupplierFormComponent {...props} />
    </ErrorBoundary>
  );
};

export default SupplierForm;