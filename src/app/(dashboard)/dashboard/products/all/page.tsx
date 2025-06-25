"use client"
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Scan, Package, DollarSign, BarChart3, Settings, Zap, Moon, Sun } from 'lucide-react';

// Form validation schema
const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255, 'Name too long'),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  subcategoryId: z.string().min(1, 'Subcategory is required'),
  brandId: z.string().min(1, 'Brand is required'),
  sku: z.string().min(1, 'SKU is required').max(50, 'SKU too long'),
  barcode: z.string().optional(),
  costPrice: z.number().min(0, 'Cost price must be positive'),
  wholesalePrice: z.number().min(0, 'Wholesale price must be positive').optional(),
  retailPrice: z.number().min(0, 'Retail price must be positive'),
  stockQuantity: z.number().int().min(0, 'Stock quantity must be non-negative'),
  lowStockThreshold: z.number().int().min(0, 'Low stock threshold must be non-negative'),
  warrantyPeriod: z.number().int().min(0, 'Warranty period must be positive').optional()
});

type ProductFormData = z.infer<typeof productSchema>;

// Mock data
const mockCategories = [
  { id: '1', name: 'Electronics' },
  { id: '2', name: 'Clothing' },
  { id: '3', name: 'Home & Garden' },
  { id: '4', name: 'Sports' }
];

const mockSubcategories: { [key: string]: { id: string; name: string }[] } = {
  '1': [
    { id: '1-1', name: 'Smartphones' },
    { id: '1-2', name: 'Laptops' },
    { id: '1-3', name: 'Accessories' }
  ],
  '2': [
    { id: '2-1', name: 'T-Shirts' },
    { id: '2-2', name: 'Jeans' },
    { id: '2-3', name: 'Shoes' }
  ],
  '3': [
    { id: '3-1', name: 'Furniture' },
    { id: '3-2', name: 'Decor' },
    { id: '3-3', name: 'Kitchen' }
  ],
  '4': [
    { id: '4-1', name: 'Fitness' },
    { id: '4-2', name: 'Outdoor' },
    { id: '4-3', name: 'Team Sports' }
  ]
};

const mockBrands = [
  { id: '1', name: 'Apple', code: 'APL' },
  { id: '2', name: 'Samsung', code: 'SAM' },
  { id: '3', name: 'Nike', code: 'NIK' },
  { id: '4', name: 'Adidas', code: 'ADI' }
];

// Dark Mode Toggle Component
const DarkModeToggle = ({ isDark, toggle }: { isDark: boolean; toggle: () => void }) => (
  <Button
    onClick={toggle}
    variant="outline"
    size="icon"
    className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
  >
    {isDark ? (
      <Sun className="h-4 w-4 text-yellow-500" />
    ) : (
      <Moon className="h-4 w-4 text-gray-700" />
    )}
  </Button>
);

// Status Message Component
const StatusMessage = ({ status }: { status: string }) => {
  if (status === 'success') {
    return (
      <div className="mb-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border flex items-start gap-3">
        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
        <div className="text-green-800 dark:text-green-200">
          <h4 className="font-semibold">Success!</h4>
          <p>Product has been created successfully.</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
        <div className="text-red-800 dark:text-red-200">
          <h4 className="font-semibold">Error!</h4>
          <p>There was an error creating the product. Please try again.</p>
        </div>
      </div>
    );
  }

  return null;
};

// Form Section Component
const FormSection = ({ 
  icon: Icon, 
  title, 
  children 
}: { 
  icon: React.ComponentType<any>; 
  title: string; 
  children: React.ReactNode; 
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
    <div className="flex items-center gap-2 mb-6">
      <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
    </div>
    {children}
  </div>
);

// Form Field Component
const FormField = ({ 
  label, 
  required = false, 
  error, 
  children 
}: { 
  label: string; 
  required?: boolean; 
  error?: string; 
  children: React.ReactNode; 
}) => (
  <div>
    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
      {label} {required && '*'}
    </Label>
    <div className="mt-1">
      {children}
    </div>
    {error && (
      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
    )}
  </div>
);

// Basic Information Section
const BasicInfoSection = ({ register, errors }: { register: any; errors: any }) => (
  <FormSection icon={Package} title="Basic Information">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="md:col-span-2">
        <FormField label="Product Name" required error={errors.name?.message}>
          <Input
            {...register('name')}
            placeholder="Enter product name"
            className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
          />
        </FormField>
      </div>

      <div className="md:col-span-2">
        <FormField label="Description" error={errors.description?.message}>
          <Textarea
            {...register('description')}
            placeholder="Enter product description"
            rows={3}
            className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
          />
        </FormField>
      </div>
    </div>
  </FormSection>
);

// Category & Brand Section
const CategoryBrandSection = ({ 
  categories, 
  subcategories, 
  brands, 
  setValue, 
  watchedCategory, 
  errors 
}: any) => (
  <FormSection icon={Settings} title="Category & Brand">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <FormField label="Category" required error={errors.categoryId?.message}>
        <Select onValueChange={(value) => setValue('categoryId', value)}>
          <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
            {categories.map((category: any) => (
              <SelectItem 
                key={category.id} 
                value={category.id}
                className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Subcategory" required error={errors.subcategoryId?.message}>
        <Select 
          onValueChange={(value) => setValue('subcategoryId', value)}
          disabled={!watchedCategory}
        >
          <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600">
            <SelectValue placeholder="Select subcategory" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
            {subcategories.map((subcategory: any) => (
              <SelectItem 
                key={subcategory.id} 
                value={subcategory.id}
                className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {subcategory.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Brand" required error={errors.brandId?.message}>
        <Select onValueChange={(value) => setValue('brandId', value)}>
          <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600">
            <SelectValue placeholder="Select brand" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
            {brands.map((brand: any) => (
              <SelectItem 
                key={brand.id} 
                value={brand.id}
                className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs border-gray-300 dark:border-gray-600">
                    {brand.code}
                  </Badge>
                  {brand.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
    </div>
  </FormSection>
);

// Product Codes Section
const ProductCodesSection = ({ 
  register, 
  setValue, 
  errors, 
  isScanning, 
  simulateBarcodeScan, 
  generateCustomBarcode 
}: any) => (
  <FormSection icon={Zap} title="Product Codes">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FormField label="SKU (Stock Keeping Unit)" required error={errors.sku?.message}>
        <Input
          {...register('sku')}
          placeholder="Auto-generated from product name"
          readOnly
          className="bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
        />
      </FormField>

      <FormField label="Barcode">
        <div className="flex gap-2">
          <Input
            {...register('barcode')}
            placeholder="Scan or generate barcode"
            className="flex-1 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={simulateBarcodeScan}
            disabled={isScanning}
            className="shrink-0 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Scan className={`h-4 w-4 ${isScanning ? 'animate-pulse' : ''}`} />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={generateCustomBarcode}
            className="shrink-0 px-3 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Generate
          </Button>
        </div>
        {isScanning && (
          <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">Scanning barcode...</p>
        )}
      </FormField>
    </div>
  </FormSection>
);

// Pricing Section
const PricingSection = ({ register, errors }: any) => (
  <FormSection icon={DollarSign} title="Pricing">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <FormField label="Cost Price" required error={errors.costPrice?.message}>
        <Input
          type="number"
          step="0.01"
          {...register('costPrice', { valueAsNumber: true })}
          placeholder="0.00"
          className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
        />
      </FormField>

      <FormField label="Wholesale Price" error={errors.wholesalePrice?.message}>
        <Input
          type="number"
          step="0.01"
          {...register('wholesalePrice', { valueAsNumber: true })}
          placeholder="0.00"
          className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
        />
      </FormField>

      <FormField label="Retail Price" required error={errors.retailPrice?.message}>
        <Input
          type="number"
          step="0.01"
          {...register('retailPrice', { valueAsNumber: true })}
          placeholder="0.00"
          className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
        />
      </FormField>
    </div>
  </FormSection>
);

// Inventory & Warranty Section
const InventoryWarrantySection = ({ register, errors }: any) => (
  <FormSection icon={BarChart3} title="Inventory & Warranty">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <FormField label="Stock Quantity" required error={errors.stockQuantity?.message}>
        <Input
          type="number"
          {...register('stockQuantity', { valueAsNumber: true })}
          placeholder="0"
          className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
        />
      </FormField>

      <FormField label="Low Stock Threshold" required error={errors.lowStockThreshold?.message}>
        <Input
          type="number"
          {...register('lowStockThreshold', { valueAsNumber: true })}
          placeholder="5"
          className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
        />
      </FormField>

      <FormField label="Warranty Period (months)" error={errors.warrantyPeriod?.message}>
        <Input
          type="number"
          {...register('warrantyPeriod', { valueAsNumber: true })}
          placeholder="12"
          className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
        />
      </FormField>
    </div>
  </FormSection>
);

// Form Actions Component
const FormActions = ({ isSubmitting, onSubmit, onReset }: any) => (
  <div className="flex flex-col sm:flex-row gap-4 pt-6">
    <Button
      type="button"
      disabled={isSubmitting}
      onClick={onSubmit}
      className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white py-3 text-lg font-medium"
    >
      {isSubmitting ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
          Creating Product...
        </>
      ) : (
        'Create Product'
      )}
    </Button>
    <Button
      type="button"
      variant="outline"
      onClick={onReset}
      className="flex-1 sm:flex-none px-8 py-3 text-lg border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
    >
      Reset Form
    </Button>
  </div>
);

// Main Component
export default function ModularProductForm() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [categories] = useState(mockCategories);
  const [brands] = useState(mockBrands);
  const [subcategories, setSubcategories] = useState<{ id: string; name: string }[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      stockQuantity: 0,
      lowStockThreshold: 5,
      costPrice: 0,
      retailPrice: 0
    }
  });

  const watchedCategory = watch('categoryId');
  const watchedName = watch('name');

  // Update subcategories when category changes
  useEffect(() => {
    if (watchedCategory) {
      setSubcategories(mockSubcategories[watchedCategory] || []);
      setValue('subcategoryId', '');
    }
  }, [watchedCategory, setValue]);

  // Auto-generate SKU when product name changes
  useEffect(() => {
    if (watchedName && watchedName.length > 2) {
      const sku = generateSKU(watchedName);
      setValue('sku', sku);
    }
  }, [watchedName, setValue]);

  const generateSKU = (productName: string) => {
    const prefix = productName.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}`;
  };

  const generateCustomBarcode = () => {
    const barcode = '999' + Math.random().toString().slice(2, 11);
    setValue('barcode', barcode);
  };

  const simulateBarcodeScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const scannedBarcode = '123456789012';
      setValue('barcode', scannedBarcode);
      setIsScanning(false);
    }, 2000);
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Product Data:', data);
      setSubmitStatus('success');
      setTimeout(() => {
        reset();
        setSubmitStatus('');
      }, 2000);
    } catch (error) {
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus(''), 3000);
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6 transition-colors duration-200">
        
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-600 dark:bg-blue-700 rounded-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Create New Product</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">Add a new product to your inventory system</p>
          </div>

          <StatusMessage status={submitStatus} />

          <div className="space-y-8">
            <BasicInfoSection register={register} errors={errors} />
            
            <CategoryBrandSection 
              categories={categories}
              subcategories={subcategories}
              brands={brands}
              setValue={setValue}
              watchedCategory={watchedCategory}
              errors={errors}
            />
            
            <ProductCodesSection 
              register={register}
              setValue={setValue}
              errors={errors}
              isScanning={isScanning}
              simulateBarcodeScan={simulateBarcodeScan}
              generateCustomBarcode={generateCustomBarcode}
            />
            
            <PricingSection register={register} errors={errors} />
            
            <InventoryWarrantySection register={register} errors={errors} />
            
            <FormActions 
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit(onSubmit)}
              onReset={() => reset()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}