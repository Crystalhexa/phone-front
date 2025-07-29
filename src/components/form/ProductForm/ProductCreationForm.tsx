"use client"
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Plus, Package, Barcode, Tag, FileText, Scan, QrCode, Printer, Eye, AlertCircle, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { useCategoryData } from '@/components/table/CategoryTable/useCategoryData';
import { CategoriesListResponse, Subcategory } from '@/types/category';
import { useBrandData } from '@/components/table/BrandTable/useBrandData';
import { ApiResponse } from '@/types/customer';
import { toast } from "sonner";
import { SearchableDropdown } from '../SearchableDropdown';

// Zod schemas
const ProductSpecificationSchema = z.object({
  id: z.string(),
  spec_name: z.string().min(1, 'Specification name is required').max(100, 'Specification name too long'),
  spec_value: z.string().min(1, 'Specification value is required').max(200, 'Specification value too long'),
  spec_unit: z.string().max(20, 'Unit too long').optional(),
});

const ProductFormSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200, 'Product name too long'),
  model: z.string().max(100, 'Model too long').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  subcategory_id: z.string().min(1, 'Subcategory is required'),
  brand_id: z.string().min(1, 'Brand is required'),
  sku: z.string().min(1, 'SKU is required').max(500, 'SKU too long'),
  warranty_period: z.number().min(0, 'Warranty period must be positive').max(120, 'Warranty period too long'),
  is_active: z.boolean(),
  wholesale_quantity: z.number().min(1, 'Wholesale quantity must be at least 1').max(10000, 'Wholesale quantity too high').optional(),
  specifications: z.array(ProductSpecificationSchema).default([]),
});

// New spec schema for adding specifications
const NewSpecSchema = z.object({
  spec_name: z.string().min(1, 'Specification name is required').max(100, 'Specification name too long').optional(),
  spec_value: z.string().min(1, 'Specification value is required').max(200, 'Specification value too long').optional(),
  spec_unit: z.string().max(20, 'Unit too long').optional(),
});


type ProductSpecification = z.infer<typeof ProductSpecificationSchema>;
type ProductFormData = z.infer<typeof ProductFormSchema>;

const ProductCreationForm: React.FC = () => {
  // Updated categories with nested subcategories
  const [categories, setCategories] = useState<CategoriesListResponse>();
  const {
    data: category,
    handleSearch: handleCategorySearch,
    searchTerm: categorySearchTerm,
  } = useCategoryData();

  const {
    data: brands,
    handleSearch: handleBrandSearch,
    searchTerm: brandSearchTerm,
  } = useBrandData();

  useEffect(() => {
    if (category) {
      setCategories(category);
    }
  }, [category]);

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [availableSubcategories, setAvailableSubcategories] = useState<Subcategory[]>([]);

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    model: '',
    description: '',
    subcategory_id: '',
    brand_id: '',
    sku: '',
    warranty_period: 12,
    is_active: true,
    wholesale_quantity: 0,
    specifications: [],
  });

  const [newSpec, setNewSpec] = useState({
    spec_name: '',
    spec_value: '',
    spec_unit: '',
  });


  // Validation states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [specErrors, setSpecErrors] = useState<Record<string, string>>({});
  const [barcodeError, setBarcodeError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Transform data for SearchableDropdown
  const categoryOptions = categories?.data.categories?.map(cat => ({
    id: cat.id,
    name: cat.name,
    code: cat.name, // Using name as code since category code isn't available
    description: `${cat.subcategories.length} subcategories`
  })) || [];

  const subcategoryOptions = availableSubcategories.map(sub => ({
    id: sub.subcategory_id,
    name: sub.name,
    description: `ID: ${sub.subcategory_id}`
  }));

  const brandOptions = brands?.data.brands?.map(brand => ({
    id: brand.id,
    name: brand.name,
    code: brand.code,
    description: brand.description
  })) || [];

  // Filter subcategories based on selected category
  useEffect(() => {
    if (selectedCategory) {
      const selectedCategoryData = categories?.data.categories.find(cat => cat.id === selectedCategory);
      if (selectedCategoryData) {
        setAvailableSubcategories(selectedCategoryData.subcategories);
      }
    } else {
      setAvailableSubcategories([]);
    }

    // Reset subcategory selection when category changes
    setFormData(prev => ({ ...prev, subcategory_id: '' }));
  }, [selectedCategory, categories]);

  // Helper function to get current subcategory
  const getCurrentSubcategory = () => {
    return availableSubcategories.find(sub => sub.subcategory_id === formData.subcategory_id);
  };

  useEffect(() => {
    const generateProductName = () => {
      const subcategory = getCurrentSubcategory();
      const brand = brands?.data.brands?.find(b => b.id === formData.brand_id);

      if (brand && subcategory) {
        // Include model if it's available, otherwise skip it
        const parts = [brand.name];
        if (formData.model) parts.push(formData.model);
        parts.push(subcategory.name);

        const name = parts.join(' ');
        setFormData(prev => ({ ...prev, name }));
        // Clear name error when auto-generated
        setErrors(prev => ({ ...prev, name: '' }));
      }
    };

    generateProductName();
  }, [
    selectedCategory,
    formData.subcategory_id,
    formData.brand_id,
    formData.model,
    categories,
    brands,
    availableSubcategories
  ]);

  // Generate SKU automatically
  useEffect(() => {
    const generateSKU = () => {
      const subcategory = getCurrentSubcategory();
      const brand = brands?.data.brands.find(b => b.id === formData.brand_id);

      if (subcategory && brand) {
        let sku = `${subcategory.name}-${brand.code}`;
        
        // Add model if it exists
        if (formData.model) {
          sku += `-${formData.model.toUpperCase().replace(/\s+/g, '')}`;
        }

        // Add specification codes to SKU (only short values <= 5 characters)
        formData.specifications.forEach(spec => {
          const specValue = spec.spec_value.replace(/\s+/g, '').toUpperCase();
          if (specValue.length <= 10) {
            sku += `-${specValue}`;
          }
        });

        setFormData(prev => ({ ...prev, sku }));
        // Clear SKU error when auto-generated
        setErrors(prev => ({ ...prev, sku: '' }));
      }
    };

    generateSKU();
  }, [formData.subcategory_id, formData.brand_id, formData.model, formData.specifications, brands, availableSubcategories]);

  // Generate CUID-like ID
  const generateCUID = () => {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8);
    return `${timestamp}${randomPart}`;
  };

  // Validate individual field
  const validateField = (field: keyof ProductFormData, value: any) => {
    try {
      const fieldSchema = ProductFormSchema.shape[field];
      fieldSchema.parse(value);
      setErrors(prev => ({ ...prev, [field]: '' }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, [field]: error.errors[0].message }));
      }
      return false;
    }
  };

  // Clear specification errors when clicking outside
  useEffect(() => {
    const handleClickOutside = (event:any) => {
      const specSection = document.querySelector('[data-spec-section]');
      if (specSection && !specSection.contains(event.target)) {
        setSpecErrors({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle input changes with validation
  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Validate field on change (except for auto-generated fields)
    if (field !== 'name' && field !== 'sku') {
      validateField(field, value);
    }
  };

  // Handle category selection
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    // Clear any category-related errors
    setErrors(prev => ({ ...prev, category: '' }));
  };

  // Validate new specification
  const validateNewSpec = () => {
    try {
      NewSpecSchema.parse(newSpec);
      setSpecErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setSpecErrors(fieldErrors);
      }
      return false;
    }
  };

  // Add specification with validation
  const addSpecification = () => {
    if (validateNewSpec()) {
      const specification: ProductSpecification = {
        id: generateCUID(),
        ...newSpec,
      };

      setFormData(prev => ({
        ...prev,
        specifications: [...prev.specifications, specification],
      }));

      setNewSpec({ spec_name: '', spec_value: '', spec_unit: '' });
      setSpecErrors({});
    }
  };

  // Remove specification
  const removeSpecification = (id: string) => {
    setFormData(prev => ({
      ...prev,
      specifications: prev.specifications.filter(spec => spec.id !== id),
    }));
  };

  // Validate entire form
  const validateForm = () => {
    try {
      // Add category validation
      if (!selectedCategory) {
        setErrors(prev => ({ ...prev, category: 'Category is required' }));
        return false;
      }

      ProductFormSchema.parse(formData);
      setErrors(prev => ({ ...prev, category: '' }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    if (validateForm()) {
      try {
        // Build final form data with category details
        const selectedCategoryData = categories?.data.categories.find(
          (cat) => cat.id === selectedCategory
        );

        const finalFormData = {
          ...formData,
          category_id: selectedCategory,
          category_name: selectedCategoryData?.name,
          category_code: selectedCategoryData?.name,
        };

        const response = await fetch("/api/products/all", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(finalFormData),
        });

        const result: ApiResponse = await response.json();

        if (!result.success) {
          if (result.errors) {
            toast.error("❌ Validation Failed", {
              description: Object.values(result.errors).flat().join(", "),
            });
          } else {
            toast.error(`❌ ${result.message || "Product creation failed"}`);
          }
        } else {
          toast.success("✅ Product Created Successfully", {
            description: `The product "${finalFormData.name}" was added.`,
          });
          resetForm();
        }
      } catch (error: any) {
        console.error("Error creating product:", error);
        toast.error("❌ Server Error", {
          description: error.message || "An unexpected error occurred.",
        });
      }
    } else {
      toast.error("⚠️ Form validation failed", {
        description: "Please check required fields and try again.",
      });
    }

    setIsSubmitting(false);
  };

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      name: '',
      model: '',
      description: '',
      subcategory_id: '',
      brand_id: '',
      sku: '',
      warranty_period: 12,
      is_active: true,
      wholesale_quantity: 0,
      specifications: [],
    });
    
    setSelectedCategory('');
    setAvailableSubcategories([]);
    setNewSpec({
      spec_name: '',
      spec_value: '',
      spec_unit: '',
    });
    
    // Clear all errors
    setErrors({});
    setSpecErrors({});
    setBarcodeError('');
  };

  // Error display component
  const ErrorMessage = ({ message }: { message: string }) => (
    message ? (
      <div className="flex items-center gap-1 text-red-500 text-sm mt-1">
        <AlertCircle className="h-3 w-3" />
        {message}
      </div>
    ) : null
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => window.history.back()}
          type="button"
          className="text-blue-500 flex items-center text-lg hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="mr-2" />
          Back
        </button>
      </div>

      <div className="space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Package className="h-5 w-5" />
            Create New Product
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Fill in the details to create a new product
          </p>
        </div>

        {/* Basic Information Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Basic Information</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Category - Using SearchableDropdown */}
            <div className="space-y-2 w-full max-w-xs">
              <Label htmlFor="category" className="text-sm font-medium text-gray-700 dark:text-gray-300">Category *</Label>
              <SearchableDropdown
                value={selectedCategory}
                onValueChange={handleCategoryChange}
                placeholder="Select a category"
                searchPlaceholder="Search categories..."
                options={categoryOptions}
                emptyMessage="No categories found"
                onSearch={handleCategorySearch}
                searchTerm={categorySearchTerm}
                size="md"
              />
              <ErrorMessage message={errors.category} />
            </div>

            {/* Subcategory - Using SearchableDropdown */}
            <div className="space-y-2 w-full max-w-xs">
              <Label htmlFor="subcategory" className="text-sm font-medium text-gray-700 dark:text-gray-300">Subcategory *</Label>
              <SearchableDropdown
                value={formData.subcategory_id}
                onValueChange={(value) => handleInputChange('subcategory_id', value)}
                placeholder="Select a subcategory"
                searchPlaceholder="Search subcategories..."
                options={subcategoryOptions}
                disabled={!selectedCategory}
                emptyMessage={!selectedCategory ? "Please select a category first" : "No subcategories found"}
                size="md"
              />
              <ErrorMessage message={errors.subcategory_id} />
            </div>

            {/* Brand - Using SearchableDropdown */}
            <div className="space-y-2 w-full max-w-xs">
              <Label htmlFor="brand" className="text-sm font-medium text-gray-700 dark:text-gray-300">Brand *</Label>
              <SearchableDropdown
                value={formData.brand_id}
                onValueChange={(value) => handleInputChange('brand_id', value)}
                placeholder="Select a brand"
                searchPlaceholder="Search brands..."
                options={brandOptions}
                emptyMessage="No brands found"
                onSearch={handleBrandSearch}
                searchTerm={brandSearchTerm}
                size="md"
              />
              <ErrorMessage message={errors.brand_id} />
            </div>
          </div>
        </div>

        {/* Product Details Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Product Details</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="model" className="text-sm font-medium text-gray-700 dark:text-gray-300">Wholesale quantity</Label>
              <Input
                id="wholesale_quantity"
                type="number"
                value={formData.wholesale_quantity}
                onChange={(e) => handleInputChange('wholesale_quantity', parseInt(e.target.value) || 0)}
                placeholder="Enter wholesale quantity"
                className={`${errors.wholesale_quantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
              />
              <ErrorMessage message={errors.wholesale_quantity} />


              <Label htmlFor="model" className="text-sm font-medium text-gray-700 dark:text-gray-300">Model *</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => handleInputChange('model', e.target.value)}
                placeholder="Enter model name"
                className={`${errors.model ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
              />
              <ErrorMessage message={errors.model} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">Product Name (Auto-generated) *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Product name will be generated automatically"
                className={`${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
              />
              <ErrorMessage message={errors.name} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter product description"
              rows={3}
              className={`${errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
            />
            <ErrorMessage message={errors.description} />
          </div>
        </div>

        {/* Specifications Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Product Specifications
          </h2>

          {/* Add New Specification */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" data-spec-section>
            <div className="space-y-1">
              <Input
                placeholder="Specification name *"
                value={newSpec.spec_name}
                onChange={(e) => setNewSpec(prev => ({ ...prev, spec_name: e.target.value }))}
                className={`${specErrors.spec_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
              />
              <ErrorMessage message={specErrors.spec_name} />
            </div>
            <div className="space-y-1">
              <Input
                placeholder="Value *"
                value={newSpec.spec_value}
                onChange={(e) => setNewSpec(prev => ({ ...prev, spec_value: e.target.value }))}
                className={`${specErrors.spec_value ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
              />
              <ErrorMessage message={specErrors.spec_value} />
            </div>
            <div className="space-y-1">
              <Input
                placeholder="Unit (optional)"
                value={newSpec.spec_unit}
                onChange={(e) => setNewSpec(prev => ({ ...prev, spec_unit: e.target.value }))}
                className={`${specErrors.spec_unit ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
              />
              <ErrorMessage message={specErrors.spec_unit} />
            </div>
            <Button type="button" onClick={addSpecification} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4" />
              Add Spec
            </Button>
          </div>

          {/* Display Specifications */}
          {formData.specifications.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Added Specifications:</Label>
              <div className="flex flex-wrap gap-2">
                {formData.specifications.map(spec => (
                  <Badge key={spec.id} variant="secondary" className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    <span>{spec.spec_name}: {spec.spec_value}</span>
                    {spec.spec_unit && <span>{spec.spec_unit}</span>}
                    <button
                      type="button"
                      onClick={() => removeSpecification(spec.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>


        {/* SKU and Warranty Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">SKU and Warranty</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="sku" className="text-sm font-medium text-gray-700 dark:text-gray-300">SKU (Auto-generated) *</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => handleInputChange('sku', e.target.value)}
                placeholder="SKU will be generated automatically"
                className={`${errors.sku ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
              />
              <ErrorMessage message={errors.sku} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="warranty" className="text-sm font-medium text-gray-700 dark:text-gray-300">Warranty Period (months) *</Label>
              <Input
                id="warranty"
                type="number"
                min="0"
                max="120"
                value={formData.warranty_period}
                onChange={(e) => handleInputChange('warranty_period', parseInt(e.target.value) || 0)}
                placeholder="Enter warranty period"
                className={`${errors.warranty_period ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
              />
              <ErrorMessage message={errors.warranty_period} />
            </div>
          </div>
        </div>

        {/* Product Status */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Product Status</h2>
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleInputChange('is_active', checked)}
            />
            <Label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">Product is Active</Label>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-3 flex-1">
            <Button type="button" variant="outline" onClick={() => window.history.back()} className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4" />
                  Create Product
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCreationForm;