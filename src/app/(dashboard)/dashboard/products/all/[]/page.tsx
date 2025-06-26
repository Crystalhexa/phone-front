"use client"
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {Moon, Sun} from 'lucide-react';
import { FormActions } from '@/components/form/productForm/FormAction';
import { InventoryWarrantySection } from '@/components/form/productForm/InventoryWarrantySection';
import { PricingSection } from '@/components/form/productForm/PricingSection';
import { ProductCodesSection } from '@/components/form/productForm/ProductCodesSection';
import { CategoryBrandSection } from '@/components/form/productForm/CategoryBrandSection';
import { VariationsSection } from '@/components/form/productForm/VariationsSection';
import { AttributeSelectionSection } from '@/components/form/productForm/AttributeSelectionSection';
import { VariableProductSection } from '@/components/form/productForm/VariableProductSection';
import { BasicInfoSection } from '@/components/form/productForm/BasicInfoSection';
import { StatusMessage } from '@/components/form/productForm/StatusMessage';


// Main Component
export default function VariableProductForm() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [categories] = useState(mockCategories);
  const [brands] = useState(mockBrands);
  const [subcategories, setSubcategories] = useState<{ id: string; name: string }[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');
  const [isVariable, setIsVariable] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [variations, setVariations] = useState<VariationData[]>([]);

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
      retailPrice: 0,
      isVariable: false,
      selectedAttributes: [],
      variations: []
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

  // Auto-generate SKU from product name
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

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  // Handle variable product toggle
  const handleVariableToggle = (checked: boolean) => {
    setIsVariable(checked);
    setValue('isVariable', checked);
    if (!checked) {
      setSelectedAttributes([]);
      setVariations([]);
      setValue('selectedAttributes', []);
      setValue('variations', []);
    }
  };

  // Handle attribute selection
  const handleAttributeChange = (attributeId: string, checked: boolean) => {
    if (checked) {
      setSelectedAttributes([...selectedAttributes, attributeId]);
    } else {
      setSelectedAttributes(selectedAttributes.filter(id => id !== attributeId));
    }
  };

  // Generate variations based on selected attributes
  const generateVariations = () => {
    if (selectedAttributes.length === 0) return;

    const selectedAttrs = mockAttributes.filter(attr => selectedAttributes.includes(attr.id));
    const combinations = generateCombinations(selectedAttrs);
    
    const newVariations: VariationData[] = combinations.map((combo, index) => {
      const attributes: { [key: string]: string } = {};
      combo.forEach((attr, i) => {
        attributes[selectedAttrs[i].name] = attr;
      });

      const variationId = `var-${Date.now()}-${index}`;
      const baseSku = watchedName ? 
        watchedName.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').substring(0, 10) : 
        'PROD';
      const variationSku = `${baseSku.toUpperCase()}-${Object.values(attributes).join('-').toUpperCase()}`;

      return {
        id: variationId,
        attributes,
        sku: variationSku,
        costPrice: 0,
        wholesalePrice: 0,
        retailPrice: 0,
        stockQuantity: 0,
        lowStockThreshold: 5,
        barcode: '',
        weight: 0,
        dimensions: {
          length: 0,
          width: 0,
          height: 0
        }
      };
    });

    setVariations(newVariations);
    setValue('variations', newVariations);
  };

  // Generate all combinations of attribute values
  const generateCombinations = (attributes: any[]) => {
    if (attributes.length === 0) return [];
    if (attributes.length === 1) return attributes[0].values.map((v: string) => [v]);

    const [first, ...rest] = attributes;
    const restCombos = generateCombinations(rest);
    const combinations: string[][] = [];

    first.values.forEach((value: string) => {
      restCombos.forEach((combo: string[]) => {
        combinations.push([value, ...combo]);
      });
    });

    return combinations;
  };

  // Update variation
  const updateVariation = (index: number, field: string, value: any) => {
    const updatedVariations = [...variations];
    updatedVariations[index] = { ...updatedVariations[index], [field]: value };
    setVariations(updatedVariations);
    setValue('variations', updatedVariations);
  };

  // Delete variation
  const deleteVariation = (index: number) => {
    const updatedVariations = variations.filter((_, i) => i !== index);
    setVariations(updatedVariations);
    setValue('variations', updatedVariations);
  };

  // Simulate barcode scanning
  const simulateBarcodeScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const mockBarcode = `${Date.now()}`.substring(0, 12);
      setValue('barcode', mockBarcode);
      setIsScanning(false);
    }, 2000);
  };

  // Generate custom barcode
  const generateCustomBarcode = () => {
    const barcode = Math.random().toString().substring(2, 14);
    setValue('barcode', barcode);
  };

  // Form submission
  const onSubmit = async (data: ProductFormData) => {
    try {
      setSubmitStatus('');
      console.log('Form data:', data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSubmitStatus('success');
      setTimeout(() => setSubmitStatus(''), 5000);
    } catch (error) {
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus(''), 5000);
    }
  };

  // Reset form
  const resetForm = () => {
    reset();
    setIsVariable(false);
    setSelectedAttributes([]);
    setVariations([]);
    setSubmitStatus('');
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Add New Product</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Create a new product with detailed information and variations</p>
          </div>
          <Button
            onClick={toggleDarkMode}
            variant="outline"
            size="icon"
            className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        {/* Status Message */}
        <StatusMessage status={submitStatus} />

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <BasicInfoSection register={register} errors={errors} />
          
          <VariableProductSection 
            register={register} 
            isVariable={isVariable} 
            onVariableToggle={handleVariableToggle} 
          />

          {isVariable && (
            <AttributeSelectionSection
              selectedAttributes={selectedAttributes}
              onAttributeChange={handleAttributeChange}
              onGenerateVariations={generateVariations}
            />
          )}

          {isVariable && variations.length > 0 && (
            <VariationsSection
              variations={variations}
              onUpdateVariation={updateVariation}
              onDeleteVariation={deleteVariation}
              selectedAttributes={selectedAttributes}
            />
          )}

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
            errors={errors}
            isScanning={isScanning}
            simulateBarcodeScan={simulateBarcodeScan}
            generateCustomBarcode={generateCustomBarcode}
            isVariable={isVariable}
          />

          <PricingSection register={register} errors={errors} isVariable={isVariable} />
          
          <InventoryWarrantySection register={register} errors={errors} isVariable={isVariable} />

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