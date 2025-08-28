"use client";
import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ErrorBoundary } from 'react-error-boundary';
import { z } from 'zod';
import { Form } from '../ui/form';
import CustomFormField, { FormFieldType } from '../form/common/CustomFormField'
import { useAddCustomerMutation, useGetCustomerByIdQuery, useUpdateCustomerMutation } from '@/state/customer';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Customer form data type
interface CustomerFormData {
  customer_number?: string;
  name: string;
  email?: string;
  nic?: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  credit_limit?: number;
  outstanding_balance: number;
  loyalty_points: number;
  is_active: boolean;
}

// Customer form configuration
interface CustomerFormConfig {
  enableAutoSave: boolean;
  showCreditLimit: boolean;
  showLoyaltyPoints: boolean;
  requireNIC: boolean;
  requirePhone: boolean;
  maxCreditLimit: number;
}

const DEFAULT_CUSTOMER_CONFIG: CustomerFormConfig = {
  enableAutoSave: true,
  showCreditLimit: true,
  showLoyaltyPoints: true,
  requireNIC: false,
  requirePhone: true,
  maxCreditLimit: 1000000,
};

// Validation schema
const createCustomerSchema = (config: CustomerFormConfig) => {
  return z.object({
    customer_number: z.string().optional(),
    name: z.string()
      .min(1, "Customer name is required")
      .max(100, "Name must be at most 100 characters"),
    email: z.string()
      .email("Invalid email format")
      .max(255, "Email must be at most 255 characters")
      .optional()
      .or(z.literal("")),
    nic: config.requireNIC
      ? z.string().min(1, "NIC is required").max(20, "NIC must be at most 20 characters")
      : z.string().max(20, "NIC must be at most 20 characters").optional(),
    phone: config.requirePhone
      ? z.string().min(1, "Phone number is required").max(20, "Phone must be at most 20 characters")
      : z.string().max(20, "Phone must be at most 20 characters").optional(),
    address: z.string().optional(),
    date_of_birth: z.string().optional(),
    credit_limit: z.number()
      .min(0, "Credit limit must be positive")
      .max(config.maxCreditLimit, `Credit limit cannot exceed ${config.maxCreditLimit}`)
      .optional(),
    outstanding_balance: z.number()
      .min(0, "Outstanding balance must be positive")
      .default(0),
    loyalty_points: z.number()
      .int("Loyalty points must be a whole number")
      .min(0, "Loyalty points must be positive")
      .default(0),
    is_active: z.boolean().default(true),
  });
};

interface CustomerFormProps {
  customerId?: string;
  isEdit?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
  config?: Partial<CustomerFormConfig>;
  title?: string;
  showExport?: boolean;
}

const CustomerFormErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
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

const CustomerFormHeader: React.FC<{ isEdit: boolean; title?: string }> = ({ isEdit, title }) => (
  <div className="mb-6">
    <h1 className="text-xl font-bold text-gray-800 dark:text-white">
      {title || (isEdit ? 'Edit Customer' : 'Register New Customer')}
    </h1>
    <p className="text-gray-600 mt-2">
      {isEdit ? 'Update customer information' : 'Fill in the details to register a new customer'}
    </p>
  </div>
);

const CustomerFormActions: React.FC<{
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
        {isLoading ? 'Saving...' : (isEdit ? 'Update Customer' : 'Register Customer')}
      </button>
    </div>
  </div>
);

const CustomerFormSkeleton: React.FC = () => (
  <div className="w-full max-w-2xl mx-auto p-2 sm:p-4">
    <div className="space-y-6">
      <div className="h-8 bg-gray-200 rounded animate-pulse" />
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4" />
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const CustomerFormComponent: React.FC<CustomerFormProps> = ({
  customerId,
  isEdit = false,
  onSuccess,
  onCancel,
  config: userConfig = {},
  title,
  showExport,
}) => {
  const config = useMemo(() => ({
    ...DEFAULT_CUSTOMER_CONFIG,
    ...userConfig,
  }), [userConfig]);
  const router = useRouter()

  const customerSchema = useMemo(() => createCustomerSchema(config), [config]);

  // RTK Query hooks
  const {
    data: customerData,
    isLoading: isCustomerLoading,
    isError: isCustomerError,
    error: customerError,
  } = useGetCustomerByIdQuery(customerId!, {
    skip: !isEdit || !customerId,
  });

  const [addCustomer, { isLoading: isAddingCustomer }] = useAddCustomerMutation();
  const [updateCustomer, { isLoading: isUpdatingCustomer }] = useUpdateCustomerMutation();

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues: {
      name: '',
      email: '',
      nic: '',
      phone: '',
      address: '',
      date_of_birth: '',
      credit_limit: 0,
      outstanding_balance: 0,
      loyalty_points: 0,
      is_active: true,
    },
  });

  // Populate form with fetched data
  useEffect(() => {
    if (isEdit && customerData) {
      const customer = customerData.data;
      form.reset({
        customer_number: customer.customer_number,
        name: customer.name,
        email: customer.email || '',
        nic: customer.nic || '',
        phone: customer.phone || '',
        address: customer.address || '',
        date_of_birth: customer.date_of_birth ? new Date(customer.date_of_birth).toISOString().split('T')[0] : '',
        credit_limit: customer.credit_limit ? Number(customer.credit_limit) : 0,
        outstanding_balance: Number(customer.outstanding_balance),
        loyalty_points: customer.loyalty_points,
        is_active: customer.is_active,
      });
    }
  }, [isEdit, customerData, form]);

  const onSubmit = async (values: CustomerFormData) => {
    try {
      const customerPayload = {
        customer_number: values.customer_number,
        name: values.name,
        email: values.email || null,
        nic: values.nic || null,
        phone: values.phone || null,
        address: values.address || null,
        date_of_birth: values.date_of_birth ? new Date(values.date_of_birth) : null,
        credit_limit: values.credit_limit || null,
        outstanding_balance: values.outstanding_balance,
        loyalty_points: values.loyalty_points,
        is_active: values.is_active,
      };

      if (isEdit && customerId) {
        await updateCustomer({ id: customerId, body: customerPayload }).unwrap();
        toast.success('Customer updated successfully!');
      } else {
        await addCustomer(customerPayload).unwrap();
        toast.success('Customer registered successfully!');
        form.reset();
      }

      onSuccess?.();
    } catch (error: any) {
      const errorMessage = error?.data?.message || 'An error occurred while saving the customer';
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
    a.download = `customer-${formData.customer_number || 'draft'}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Customer data exported successfully!');
  };
  const handleBack = () => {
    router.push('/dashboard/customers')
  }

  // Handle loading states
  if (isEdit && isCustomerLoading) {
    return <CustomerFormSkeleton />;
  }

  if (isEdit && isCustomerError) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-lg font-semibent text-red-600 mb-2">Error Loading Customer</h2>
        <p className="text-gray-600 mb-4">
          {(customerError as any)?.data?.message || 'Failed to load customer data'}
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

  const isLoading = isAddingCustomer || isUpdatingCustomer;

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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 ">
          {/* Header */}
          <CustomerFormHeader isEdit={isEdit} title={title} />

          {/* Basic Information Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Basic Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {isEdit&&(<CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="customer_number"
                label="Customer Number"
                placeholder="Enter customer number"
                disabled={isLoading}
              />)}
              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="name"
                label="Full Name"
                placeholder="Enter customer full name"
                disabled={isLoading}
                required
              />
              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="email"
                label="Email"
                placeholder="Enter email address"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Contact Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                name="nic"
                label="NIC Number"
                placeholder="Enter NIC number"
                disabled={isLoading}
                required={config.requireNIC}
              />
              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="date_of_birth"
                label="Date of Birth"
                disabled={isLoading}
              />
            </div>
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="address"
              label="Address"
              placeholder="Enter full address"
              disabled={isLoading}
            />
          </div>

          {/* Financial Information Section */}
          {(config.showCreditLimit || config.showLoyaltyPoints) && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Financial Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {config.showCreditLimit && (
                  <CustomFormField
                    fieldType={FormFieldType.INPUT}
                    control={form.control}
                    name="credit_limit"
                    label="Credit Limit"
                    placeholder="Enter credit limit"
                    disabled={isLoading}
                  />
                )}
                <CustomFormField
                  fieldType={FormFieldType.INPUT}
                  control={form.control}
                  name="outstanding_balance"
                  label="Outstanding Balance"
                  placeholder="Enter outstanding balance"
                  disabled={isLoading}
                />
                {config.showLoyaltyPoints && (
                  <CustomFormField
                    fieldType={FormFieldType.INPUT}
                    control={form.control}
                    name="loyalty_points"
                    label="Loyalty Points"
                    placeholder="Enter loyalty points"
                    disabled={isLoading}
                  />
                )}
              </div>
            </div>
          )}

          {/* Status Section */}

          {/* Form Actions */}
          <CustomerFormActions
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

// Main CustomerForm component with ErrorBoundary
export const CustomerForm: React.FC<CustomerFormProps> = (props) => {
  return (
    <ErrorBoundary
      FallbackComponent={CustomerFormErrorFallback}
      onReset={() => window.location.reload()}
    >
      <CustomerFormComponent {...props} />
    </ErrorBoundary>
  );
};

export default CustomerForm;