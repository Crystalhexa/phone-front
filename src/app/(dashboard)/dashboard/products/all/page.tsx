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
  attributes: z.record(z.string()),
  sku: z.string().min(1, "SKU is required"),
  costPrice: z.number().min(0, "Cost price must be positive"),
  wholesalePrice: z.number().min(0).optional(),
  retailPrice: z.number().min(0, "Retail price must be positive"),
  stockQuantity: z.number().min(0, "Stock quantity must be positive"),
  lowStockThreshold: z.number().min(0, "Low stock threshold must be positive"),
  barcode: z.string().optional(),
  weight: z.number().optional(),
  dimensions: z.object({
    length: z.number(),
    width: z.number(),
    height: z.number(),
  }).optional(),
});

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  subcategoryId: z.string().optional(),
  brandId: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  stockQuantity: z.number().min(0).optional(),
  lowStockThreshold: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  wholesalePrice: z.number().min(0).optional(),
  retailPrice: z.number().min(0).optional(),
  warrantyPeriod: z.number().min(0).optional(),
  isVariable: z.boolean().optional(),
  selectedAttributes: z.array(z.string()).optional(),
  variations: z.array(variationSchema).optional(),
}).refine((data) => {
  // For simple products, require pricing fields
  if (!data.isVariable) {
    return data.retailPrice !== undefined && data.retailPrice > 0;
  }
   if (!data.isVariable) {
    return data.wholesalePrice !== undefined && data.wholesalePrice > 0;
  }
  // For variable products, require variations
  if (data.isVariable) {
    return data.variations && data.variations.length > 0;
  }
  return true;
}, {
  message: "Invalid product configuration",
  path: ["root"]
});

// 🧾 Types
type VariationData = {
  id: string;
  attributes: { [key: string]: string };
  sku: string;
  costPrice: number;
  wholesalePrice?: number;
  retailPrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  barcode?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
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
      setValue('barcode', `${Date.now()}`.substring(0, 12));
      setIsScanning(false);
    }, 2000);
  };

  const generateCustomBarcode = () => {
    setValue('barcode', Math.random().toString().substring(2, 14));
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

      return {
        id: `variation-${Date.now()}-${index}`,
        attributes,
        sku: fullSKU,
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
    console.log("jana")
    try {
      setSubmitStatus('submitting');

      // Prepare payload according to API structure
      const payload = {
        name: data.name!,
        description: data.description || null,
        subcategory_id: data.subcategoryId || null,
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
              name: data.name!,
              cost_price: variation.costPrice,
              wholesale_price: variation.wholesalePrice || null,
              retail_price: variation.retailPrice,
              stock_quantity: variation.stockQuantity,
              low_stock_threshold: variation.lowStockThreshold,
              warranty_period: data.warrantyPeriod || null,
              barcode: variation.barcode || null,
              weight: variation.weight || null,
              length: variation.dimensions?.length || null,
              width: variation.dimensions?.width || null,
              height: variation.dimensions?.height || null,
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
          barcode: data.barcode || null,
        }
      };

      const response = await fetch('/api/products', {
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

  // 🧱 UI Render
  return (
    <div>
      <div className="max-w-6xl mx-auto p-6">
        {/* 🔖 Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Add New Product</h1>
          <p className="text-gray-600 dark:text-gray-400">Create a simple or variable product with detailed information</p>
        </div>

        {/* 🔔 Status */}
        <StatusMessage status={submitStatus} />

        {/* 📝 Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Variable Product Toggle */}
          <VariableProductSection
            register={register}
            isVariable={isVariable}
            onVariableToggle={handleVariableToggle}
          />

          {/* Basic Product Information */}
          <BasicInfoSection register={register} errors={errors} />

          {/* Category & Brand Selection */}
          <CategoryBrandSection
            categories={categories}
            subcategories={subcategories}
            brands={brands}
            setValue={(field: string, value: any) => setValue(field as any, value)}
            watchedCategory={selectedCategoryId}
            errors={errors}
            onCategoryChange={(id) => {
              setSelectedCategoryId(id);
              setValue("categoryId", id);
              setValue("subcategoryId", "");
            }}
          />

          {/* Product Codes (SKU, Barcode) */}
          <ProductCodesSection
            register={register}
            errors={errors}
            isScanning={isScanning}
            simulateBarcodeScan={simulateBarcodeScan}
            generateCustomBarcode={generateCustomBarcode}
            isVariable={isVariable}
          />

          {/* Attribute Selection (Only for Variable Products) */}
          {attributeData && isVariable && (
            <AttributeSelectionSection
              attributes={attributeData?.data?.attributes || []}
              selectedAttributes={selectedAttributes}
              onAttributeChange={handleAttributeChange}
              onGenerateVariations={handleGenerateVariations}
              searchTerm={attributeSearchTerm}
              onSearch={handleAttributeSearch}
            />
          )}

          {/* Pricing Section (Only for Simple Products) */}
          {!isVariable && <PricingSection register={register} errors={errors} />}

          {/* Inventory & Warranty (Only for Simple Products) */}
          {!isVariable && <InventoryWarrantySection register={register} errors={errors} />}

          {/* Variations Section (Only for Variable Products with Variations) */}
          {isVariable && variations.length > 0 && (
            <VariationsSection
              variations={variations}
              onUpdateVariation={updateVariation}
              onDeleteVariation={deleteVariation}
              selectedAttributes={selectedAttributes}
              errors={errors.variations as any}
            />
          )}

          {/* Form Actions */}
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