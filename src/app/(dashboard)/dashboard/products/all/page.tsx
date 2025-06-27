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
import { ca } from 'date-fns/locale';
import { useCategoryData } from '@/components/table/CategoryTable/useCategoryData';

// 🧪 Validation Schema
const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  categoryId: z.string().min(1, "Category is required"),
  subcategoryId: z.string().optional(),
  brandId: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  stockQuantity: z.number().min(0),
  lowStockThreshold: z.number().min(0),
  costPrice: z.number().min(0),
  wholesalePrice: z.number().optional(),
  retailPrice: z.number().min(0),
  isVariable: z.boolean(),
  selectedAttributes: z.array(z.string()).optional(),
  variations: z.array(z.any()).optional(),
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

export default function VariableProductForm() {
  // 🔄 UI + App State
  const [isVariable, setIsVariable] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [variations, setVariations] = useState<VariationData[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<AddedAttributes>({});



  // 🧾 Form setup
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      stockQuantity: 0,
      lowStockThreshold: 5,
      costPrice: 0,
      retailPrice: 0,
      isVariable: false,
      selectedAttributes: [],
      variations: [],
    },
  });

  // 👁️ Watch fields
  const watchedCategory = watch('categoryId');
  const watchedName = watch('name');


  useEffect(() => {
    if (watchedName && !isVariable) {
      const sku = watchedName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 20)
        .toUpperCase();
      setValue('sku', sku);
    }
  }, [watchedName, setValue, isVariable]);

  // 🔍 Attribute Hook
  const {
    data: attributeData,
    handleSearch: handleAttributeSearch,
    searchTerm: attributeSearchTerm,
  } = useAttributeData();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

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

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const subcategories =
    selectedCategory?.subcategories?.map((sub:any) => ({
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
  };

  const deleteVariation = (index: number) => {
    const updated = variations.filter((_, i) => i !== index);
    setVariations(updated);
    setValue('variations', updated);
  };

  const handleAttributeChange = (attributeId: string, values: AttributeValue[]) => {
    setSelectedAttributes(prev => ({ ...prev, [attributeId]: values }));
  };

  const handleGenerateVariations = () => {
    console.log("Generating variations...", selectedAttributes);

    const attributeEntries = Object.entries(selectedAttributes);

    if (attributeEntries.length === 0) return;

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

      return {
        id: `variation-${Date.now()}-${index}`,
        attributes,
        sku: `${watchedName || 'VAR'}-${index + 1}`,
        costPrice: 0,
        retailPrice: 0,
        stockQuantity: 0,
        lowStockThreshold: 5,
      };
    });

    setVariations(newVariations);
    setValue('variations', newVariations);
  };


  const resetForm = () => {
    reset();
    setIsVariable(false);
    setSelectedAttributes({});
    setVariations([]);
    setSubmitStatus('');
  };

  const onSubmit = async (data: ProductFormData) => {
    console.log('janath')
    try {
      setSubmitStatus('');
      console.log('Form data:', data);
      await new Promise(res => setTimeout(res, 2000));
      setSubmitStatus('success');
    } catch {
      setSubmitStatus('error');
    } finally {
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
            setValue={setValue}
            watchedCategory={selectedCategoryId}
            errors={errors}
            onCategoryChange={(id) => {
              setSelectedCategoryId(id);
              setValue("subcategoryId", ""); // Reset subcategory
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
          {attributeData && isVariable && (<AttributeSelectionSection
            attributes={attributeData?.data.attributes}
            selectedAttributes={selectedAttributes}
            onAttributeChange={handleAttributeChange}
            onGenerateVariations={handleGenerateVariations}
            searchTerm={attributeSearchTerm}
            onSearch={handleAttributeSearch}
          />)}
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
            onReset={resetForm}
          />
        </form>
      </div>
    </div>
  );
}