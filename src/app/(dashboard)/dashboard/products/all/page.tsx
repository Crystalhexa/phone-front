"use client"
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormActions } from '@/components/form/productForm/FormAction';
import { InventoryWarrantySection } from '@/components/form/productForm/InventoryWarrantySection';
import { PricingSection } from '@/components/form/productForm/PricingSection';
import { ProductCodesSection } from '@/components/form/productForm/ProductCodesSection';
import { VariationsSection } from '@/components/form/productForm/VariationsSection';
import { AttributeSelectionSection } from '@/components/form/productForm/AttributeSelectionSection';
import { VariableProductSection } from '@/components/form/productForm/VariableProductSection';
import { BasicInfoSection } from '@/components/form/productForm/BasicInfoSection';
import { StatusMessage } from '@/components/form/productForm/StatusMessage';
import { z } from 'zod';
import { useAttributeData } from '@/components/table/AttributeTable/useAttributeData';
import { useBrandData } from '@/components/table/BrandTable/useBrandData';
import { CategoryBrandSection } from '@/components/form/productForm/CategoryBrandSection';
import { useCategoryData } from '@/components/table/CategoryTable/useCategoryData';

// 🧪 Enhanced Validation Schema
const variationSchema = z.object({
  id: z.string(),
  attributes: z.record(z.string()).refine((attrs) => {
    // Ensure at least one attribute is selected for each variation
    return Object.keys(attrs).length > 0;
  }, {
    message: "Each variation must have at least one attribute combination"
  }),
  name: z.string().min(1, "Variation name is required"),
  sku: z.string().min(1, "SKU is required for each variation"),
  barcode: z.string().min(1, "Barcode is required for each variation"),
  costPrice: z.number().min(0, "Cost price must be positive"),
  wholesalePrice: z.number().optional(),
  retailPrice: z.number().min(0, "Retail price must be positive"),
  stockQuantity: z.number().min(0, "Stock quantity must be positive"),
  lowStockThreshold: z.number().min(0, "Low stock threshold must be positive"),
});

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  subcategoryId: z.string().min(1, "Subcategory is required"), // Always required
  brandId: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  stockQuantity: z.number().min(0).optional(),
  lowStockThreshold: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  wholesalePrice: z.number().optional(),
  retailPrice: z.number().min(0).optional(),
  warrantyPeriod: z.number().min(0).optional(),
  isVariable: z.boolean().optional(),
  selectedAttributes: z.array(z.string()).optional(),
  variations: z.array(variationSchema).optional(),
}).refine((data) => {
  // For simple (non-variable) products
  if (!data.isVariable) {
    // Required: name, barcode, subcategoryId (already handled above)
    return data.barcode && data.barcode.length > 0;
  }
  
  // For variable products
  if (data.isVariable) {
    // Must have variations with proper attributes and required fields
    if (!data.variations || data.variations.length === 0) {
      return false;
    }
    
    // Each variation must have: name, barcode, sku, subcategoryId, and attribute combination
    return data.variations.every(variation => 
      variation.name && 
      variation.barcode && 
      variation.sku && 
      Object.keys(variation.attributes).length > 0
    );
  }
  
  return true;
}, {
  message: "Please ensure all required fields are filled correctly",
  path: ["root"]
});

// 🧾 Types
type VariationData = {
  id: string;
  attributes: { [key: string]: string };
  name: string; // Added name field
  sku: string;
  costPrice: number;
  wholesalePrice?: number;
  retailPrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  barcode: string; // Made required
};

type ProductFormData = z.infer<typeof productSchema>;

type AttributeValue = { id: string; value: string };
type AddedAttributes = { [attributeId: string]: AttributeValue[] };

// Default form values
const DEFAULT_VALUES: Partial<ProductFormData> = {
  stockQuantity: 0,
  lowStockThreshold: 5,
  costPrice: 0,
  retailPrice: 0,
  wholesalePrice:0,
  isVariable: false,
  selectedAttributes: [],
  variations: [],
  warrantyPeriod: 0,
};

export default function VariableProductForm() {
  // 🔄 UI + App State
  const [isVariable, setIsVariable] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [variations, setVariations] = useState<VariationData[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<AddedAttributes>({});
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // 🧾 Form setup
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
    trigger,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: DEFAULT_VALUES,
    mode: 'onChange',
  });

  // 🔍 Hooks
  const {
    data: attributeData,
    handleSearch: handleAttributeSearch,
    searchTerm: attributeSearchTerm,
  } = useAttributeData();

  const {
    data: brandApi,
    handleSearch: handleBrandSearch,
    searchTerm: brandSearchTerm,
  } = useBrandData();

  const {
    data: categoryApi,
    handleSearch: handleCategorySearch,
    searchTerm: categorySearchTerm,
  } = useCategoryData();

  const categories = categoryApi?.data?.categories || [];
  const brands = brandApi?.data?.brands || [];

  // 👁️ Watch fields
  const watchedName = watch('name');
  const watchedCategoryId = watch('categoryId');
  const watchedBrandId = watch('brandId');
  const watchedSubcategoryId = watch('subcategoryId');
  
  const categoryName = categories.find(c => c.id === watchedCategoryId)?.name || '';
  const brandName = brands.find(b => b.id === watchedBrandId)?.name || '';

  // Auto-generate SKU for simple products
  useEffect(() => {
    if (!isVariable && watchedName && categoryName) {
      const rawParts = [watchedName, categoryName, brandName];
      const cleaned = rawParts
        .filter(Boolean)
        .map(part => part.toLowerCase().replace(/[^a-z0-9]+/g, '').substring(0, 8));

      const sku = cleaned.join('-').toUpperCase();
      setValue('sku', sku);
    }
  }, [watchedName, categoryName, brandName, isVariable, setValue]);

  // Get subcategories based on selected category
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const subcategories =
    selectedCategory?.subcategories?.map((sub: any) => ({
      id: sub.subcategory_id,
      name: sub.name,
    })) || [];

  // 📦 Handlers
  const handleVariableToggle = (checked: boolean) => {
    setIsVariable(checked);
    setValue('isVariable', checked);
    if (!checked) {
      setSelectedAttributes({});
      setVariations([]);
      setValue('selectedAttributes', []);
      setValue('variations', []);
    }
    // Re-trigger validation
    setTimeout(() => trigger(), 100);
  };

  const simulateBarcodeScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const newBarcode = `${Date.now()}`.substring(0, 12);
      setValue('barcode', newBarcode);
      setIsScanning(false);
      trigger('barcode'); // Trigger validation for barcode
    }, 2000);
  };

  const generateCustomBarcode = () => {
    const newBarcode = Math.random().toString().substring(2, 14);
    setValue('barcode', newBarcode);
    trigger('barcode'); // Trigger validation for barcode
  };

  const updateVariation = (index: number, field: string, value: any) => {
    const updated = [...variations];
    updated[index] = { ...updated[index], [field]: value };
    setVariations(updated);
    setValue('variations', updated);
    // Trigger validation for variations
    trigger('variations');
  };

  const deleteVariation = (index: number) => {
    const updated = variations.filter((_, i) => i !== index);
    setVariations(updated);
    setValue('variations', updated);
    trigger('variations');
  };

  const handleAttributeChange = (attributeId: string, values: AttributeValue[]) => {
    setSelectedAttributes(prev => {
      if (values.length === 0) {
        const newAttributes = { ...prev };
        delete newAttributes[attributeId];
        return newAttributes;
      }
      return { ...prev, [attributeId]: values };
    });
  };

  const generateVariationBarcode = () => {
    return Math.random().toString().substring(2, 14);
  };

  const handleGenerateVariations = () => {
    const attributeEntries = Object.entries(selectedAttributes);
    if (attributeEntries.length === 0) {
      alert('Please select at least one attribute to generate variations.');
      return;
    }

    const cartesian = (arr: AttributeValue[][]): AttributeValue[][] => {
      return arr.reduce<AttributeValue[][]>(
        (acc, curr) =>
          acc.flatMap(a => curr.map(b => [...a, b])),
        [[]]
      );
    };

    const attributeCombinations = cartesian(attributeEntries.map(([, values]) => values));

    const newVariations: VariationData[] = attributeCombinations.map((combo, index) => {
      const attributes: Record<string, string> = {};
      combo.forEach((value, i) => {
        const attributeId = attributeEntries[i][0];
        attributes[attributeId] = value.id;
      });

      const skuBase = watchedName
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .substring(0, 20) || 'VAR';

      const variationPart = combo
        .map(val => val.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 10))
        .join('-');

      const fullSKU = `${skuBase}-${variationPart}`.toUpperCase();

      // Generate variation name based on product name and attributes
      const attributeString = combo.map(val => val.value).join(' / ');
      const variationName = `${watchedName} - ${attributeString}`;

      return {
        id: `variation-${Date.now()}-${index}`,
        attributes,
        name: variationName, // Required field
        sku: fullSKU,
        barcode: generateVariationBarcode(), // Required field
        costPrice: 0,
        retailPrice: 0,
        stockQuantity: 0,
        lowStockThreshold: 5,
      };
    });

    setVariations(newVariations);
    setValue('variations', newVariations);
    trigger('variations');
  };

  // 🔄 Reset Functions
  const resetFormState = () => {
    reset(DEFAULT_VALUES);
    setIsVariable(false);
    setSelectedAttributes({});
    setVariations([]);
    setSelectedCategoryId(null);
    setSubmitStatus('');
    setIsScanning(false);
    handleAttributeSearch('');
    handleBrandSearch('');
    handleCategorySearch('');
  };

  // 📤 Submit Handler
  const onSubmit = async (data: ProductFormData) => {
    console.log('Form submission data:', data);
    
    // Additional client-side validation
    if (!isVariable && !data.barcode) {
      setSubmitStatus('error');
      alert('Barcode is required for non-variable products');
      return;
    }

    if (isVariable && (!data.variations || data.variations.length === 0)) {
      setSubmitStatus('error');
      alert('At least one variation is required for variable products');
      return;
    }

    if (isVariable && data.variations) {
      const invalidVariations = data.variations.filter(v => 
        !v.name || !v.barcode || !v.sku || Object.keys(v.attributes).length === 0
      );
      
      if (invalidVariations.length > 0) {
        setSubmitStatus('error');
        alert('All variations must have name, barcode, SKU, and attribute combinations');
        return;
      }
    }

    try {
      setSubmitStatus('submitting');

      // Prepare payload according to API structure
      const payload = {
        name: data.name!,
        description: data.description || null,
        subcategory_id: data.subcategoryId!, // Required field
        brand_id: data.brandId || null,
        is_variable: data.isVariable || false,
        attributes: data.isVariable 
          ? Object.keys(selectedAttributes).map(attrId => ({
              attribute_id: attrId
            }))
          : [],
        variations: data.isVariable && data.variations
          ? data.variations.map(variation => ({
              sku: variation.sku,
              name: variation.name, // Required for variations
              cost_price: variation.costPrice,
              wholesale_price: variation.wholesalePrice || null,
              retail_price: variation.retailPrice,
              stock_quantity: variation.stockQuantity,
              low_stock_threshold: variation.lowStockThreshold,
              warranty_period: data.warrantyPeriod || null,
              barcode: variation.barcode, // Required for variations
              attributes: Object.entries(variation.attributes).map(([attrId, attrValueId]) => ({
                attribute_id: attrId,
                attribute_value_id: attrValueId,
              })),
            }))
          : [],
        default_variation: {
          sku: data.sku || `${data.name?.replace(/\s+/g, '-').toUpperCase()}-DEFAULT`,
          cost_price: data.costPrice || 0,
          wholesale_price: data.wholesalePrice || null,
          retail_price: data.retailPrice || 0,
          stock_quantity: data.stockQuantity || 0,
          low_stock_threshold: data.lowStockThreshold || 5,
          warranty_period: data.warrantyPeriod || null,
          barcode: data.barcode || null, // Required for non-variable products
        }
      };

      const response = await fetch('/api/products/all', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit product');
      }

      setSubmitStatus('success');
      setTimeout(() => {
        resetFormState();
        setSubmitStatus('');
      }, 2000);

    } catch (error) {
      console.error('Submission error:', error);
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus(''), 5000);
    }
  };

  // 🧱 UI
  return (
    <div>
      <div className="max-w-6xl mx-auto p-6">
        {/* 🔖 Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Add New Product</h1>
          <p className="text-gray-600 dark:text-gray-400">Create a product with variations and detailed info</p>
          
          {/* Required Fields Info */}
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Required Fields:</h3>
            {!isVariable ? (
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                <strong>Non-Variable Product:</strong> Product Name, Barcode, Subcategory
              </p>
            ) : (
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                <strong>Variable Product:</strong> Product Name, Subcategory, and for each variation: Name, Barcode, SKU, Attribute Combination
              </p>
            )}
          </div>
        </div>

        {/* 🔔 Status */}
        <StatusMessage status={submitStatus} />

        {/* 📝 Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <VariableProductSection
            register={register}
            isVariable={isVariable}
            onVariableToggle={handleVariableToggle}
          />

          <BasicInfoSection register={register} errors={errors} />
          
          <CategoryBrandSection
            categories={categories}
            subcategories={subcategories}
            brands={brands}
            setValue={(field: string, value: any) => setValue(field as any, value)}
            watchedCategory={selectedCategoryId}
            errors={errors}
            onCategoryChange={(id) => {
              setSelectedCategoryId(id);
              setValue("subcategoryId", "");
            }}
          />

          <ProductCodesSection
            register={register}
            errors={errors}
            isScanning={isScanning}
            simulateBarcodeScan={simulateBarcodeScan}
            generateCustomBarcode={generateCustomBarcode}
            isVariable={isVariable}
          />

          {attributeData && isVariable && (
            <AttributeSelectionSection
              attributes={attributeData?.data.attributes}
              selectedAttributes={selectedAttributes}
              onAttributeChange={handleAttributeChange}
              onGenerateVariations={handleGenerateVariations}
              searchTerm={attributeSearchTerm}
              onSearch={handleAttributeSearch}
            />
          )}

          {!isVariable && <PricingSection register={register} errors={errors} />}
          {!isVariable && <InventoryWarrantySection register={register} errors={errors} />}

          {isVariable && variations.length > 0 && (
            <VariationsSection
              variations={variations}
              onUpdateVariation={updateVariation}
              onDeleteVariation={deleteVariation}
              selectedAttributes={selectedAttributes}
            />
          )}

          <FormActions
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit(onSubmit)}
            onReset={resetFormState}
          />
        </form>
      </div>
    </div>
  );
}