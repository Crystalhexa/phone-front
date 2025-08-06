"use client"
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Trash2,
  Plus,
  Package,
  Tag,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Save,
  RefreshCw,
  Eye,
  Edit3,
  Clock
} from 'lucide-react';
import { z } from 'zod';
import { CategoriesListResponse, Subcategory } from '@/types/category';
import { ApiResponse } from '@/types/customer';
import { toast } from "sonner";
import { SearchableDropdown } from '../SearchableDropdown';
import { useBrandDropdown } from '@/hooks/useBrandDropdown';
import { useCategoryDrodown } from '@/hooks/useCategoryDrodown';
import { set } from 'date-fns';
import { id } from 'date-fns/locale';

// Zod schemas
const ProductSpecificationSchema = z.object({
  id: z.string(),
  spec_name: z.string().min(1, 'Specification name is required').max(100, 'Specification name too long'),
  spec_value: z.string().min(1, 'Specification value is required').max(200, 'Specification value too long')
});
const ProductBarcodeSchema = z.object({
  id: z.string(),
  code: z.string().min(1, 'Barcode is required').max(100, 'Barcode too long')
});

const ProductFormSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200, 'Product name too long'),
  model: z.string().max(100, 'Model too long').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  subcategory_id: z.string().min(1, 'Subcategory is required'),
  brand_id: z.string().optional(),
  sku: z.string().min(1, 'SKU is required').max(500, 'SKU too long'),
  warranty_period: z.number().min(0, 'Warranty period must be positive').max(120, 'Warranty period too long'),
  is_active: z.boolean(),
  is_unique: z.boolean(),
  wholesale_quantity: z.number().min(1, 'Wholesale quantity must be at least 1').max(10000, 'Wholesale quantity too high').optional(),
  low_stock_threshold: z.number().min(0, 'Low stock threshold must be at least 0').max(10000, 'Low stock threshold too high').optional(),
  specifications: z.array(ProductSpecificationSchema).default([]),
  barcodes: z.array(ProductBarcodeSchema).default([]),
});

const NewSpecSchema = z.object({
  spec_name: z.string().min(1, 'Specification name is required').max(100, 'Specification name too long').optional(),
  spec_value: z.string().min(1, 'Specification value is required').max(200, 'Specification value too long').optional()
});

const NewBarcodeSchema = z.object({
  code: z.string().min(1, 'Barcode is required').max(100, 'Barcode too long')
});

type ProductSpecification = z.infer<typeof ProductSpecificationSchema>;
type ProductFormData = z.infer<typeof ProductFormSchema>;
type ProductBarcode = z.infer<typeof ProductBarcodeSchema>;
interface ProductDetails extends ProductFormData {
  id: string;
  category_id: string;
  category_name?: string;
  brand_name?: string;
  subcategory_name?: string;
  created_at?: string;
  updated_at?: string;
}

const ProductForm: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;
  const isEditMode = Boolean(productId);

  // Loading and data states
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Category and brand data
  const [categories, setCategories] = useState<CategoriesListResponse>();
  const {
    data: category,
    handleSearch: handleCategorySearch,
    searchTerm: categorySearchTerm,
  } = useCategoryDrodown();

  const {
    data: brands,
    handleSearch: handleBrandSearch,
    searchTerm: brandSearchTerm,
    isSearching
  } = useBrandDropdown();

  useEffect(() => {
    if (category) {
      setCategories(category);
    }
  }, [category]);

  // Form state
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
    is_unique: true,
    wholesale_quantity: 0,
    low_stock_threshold: 5,
    specifications: [],
    barcodes: []
  });

  const [originalFormData, setOriginalFormData] = useState<ProductFormData | null>(null);
  const [newSpec, setNewSpec] = useState({
    spec_name: '',
    spec_value: ''
  });

  const [newBarcode, setNewBarcode] = useState({
    code: ''
  });
  // Validation states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [specErrors, setSpecErrors] = useState<Record<string, string>>({});
  const [barcodeErrors, setBarcodeErrors] = useState<Record<string, string>>({});

  // Fetch product details for edit mode
  const fetchProductDetails = async () => {
    if (!isEditMode) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/products/${productId}`);
      const result: ApiResponse<ProductDetails> = await response.json();

      if (result.success && result.data) {
        const product = result.data;
        setProductDetails(product);

        // Populate form with existing data
        const formValues: ProductFormData = {
          name: product.name,
          model: product.model || '',
          description: product.description || '',
          subcategory_id: product.subcategory_id,
          brand_id: product.brand_id,
          sku: product.sku,
          warranty_period: product.warranty_period,
          is_active: product.is_active,
          is_unique: product.is_unique || true,
          wholesale_quantity: product.wholesale_quantity || 0,
          low_stock_threshold: product.low_stock_threshold || 5,
          specifications: product.specifications || [],
          barcodes: product.barcodes || []
        };

        setFormData(formValues);
        setOriginalFormData(formValues);
        setSelectedCategory(product.category_id);

        toast.success("✅ Product loaded successfully");
      } else {
        toast.error("❌ Failed to load product details");
        router.push('/dashboard/products');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error("❌ Error loading product");
      router.push('/dashboard/products');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchProductDetails();
  }, [productId]);

  // Check for unsaved changes
  useEffect(() => {
    if (originalFormData) {
      const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalFormData);
      setHasUnsavedChanges(hasChanges);
    }
  }, [formData, originalFormData]);

  // Transform data for SearchableDropdown
  const categoryOptions = categories?.data.categories?.map(cat => ({
    id: cat.id,
    name: cat.name,
    code: cat.name,
    description: `${cat.subcategories.length} subcategories`
  })) || [];

  const subcategoryOptions = availableSubcategories.map(sub => ({
    id: sub.subcategory_id,
    name: sub.name,
    description: `ID: ${sub.subcategory_id}`
  }));

  const brandOptions = brands?.data?.brands?.map(brand => ({
    id: brand.id,
    name: brand.name,
    description: brand.description,
    logo: brand.logo_url, // Map logo_url to logo for dropdown
    code: brand.id // You can use ID as code or add a brand code field
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

    // Only reset subcategory if not in edit mode or if category actually changed
    if (!isEditMode || (originalFormData && selectedCategory !== productDetails?.category_id)) {
      setFormData(prev => ({ ...prev, subcategory_id: '' }));
    }
  }, [selectedCategory, categories, isEditMode, originalFormData, productDetails]);

  // Helper function to get current subcategory
  const getCurrentSubcategory = () => {
    return availableSubcategories.find(sub => sub.subcategory_id === formData.subcategory_id);
  };

  // Auto-generate product name (only for create mode or when manually triggered)
  useEffect(() => {
    // Skip auto-generation in edit mode unless explicitly requested
    if (isEditMode && originalFormData) return;

    const generateProductName = () => {
      const subcategory = getCurrentSubcategory();
      const brand = brands?.data.brands?.find(b => b.id === formData.brand_id);

      if (brand && subcategory) {
        const parts = [brand.name];
        if (formData.model) parts.push(formData.model);
        parts.push(subcategory.name);

        const name = parts.join(' ');
        setFormData(prev => ({ ...prev, name }));
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
    availableSubcategories,
    isEditMode,
    originalFormData
  ]);

  // Auto-generate SKU (only for create mode or when manually triggered)
  useEffect(() => {
    // Skip auto-generation in edit mode unless explicitly requested
    if (isEditMode && originalFormData) return;

    const generateSKU = () => {
      const subcategory = getCurrentSubcategory();
      const brand = brands?.data.brands.find(b => b.id === formData.brand_id);

      if (subcategory) {
        let sku = `${subcategory?.name.replace(/\s+/g, '')}`;

        if (brand) {
          sku = `${brand.name}-${sku}`;
        }
        if (formData.model) {
          sku += `-${formData.model.replace(/\s+/g, '')}`;
        }

        formData.specifications?.forEach(spec => {
          const specValue = spec.spec_value?.replace(/\s+/g, '');
          if (specValue && specValue.length <= 10) {
            sku += `-${specValue}`;
          }
        });

        setFormData(prev => ({ ...prev, sku }));
        setErrors(prev => ({ ...prev, sku: '' }));
      }
    };

    generateSKU();
  }, [
    formData.subcategory_id,
    formData.brand_id,
    formData.model,
    formData.specifications,
    brands,
    availableSubcategories,
    isEditMode,
    originalFormData
  ]);

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

  // Handle input changes with validation
  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Validate field on change (except for auto-generated fields in create mode)
    if (isEditMode || (field !== 'name' && field !== 'sku')) {
      validateField(field, value);
    }
  };

  // Handle category selection
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
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

  const addBarcode = () => {
    if (newBarcode.code.trim() === '') {
      toast.error("❌ Barcode cannot be empty");
      return;
    }
    const barcodes: ProductBarcode = {
      id: generateCUID(),
      ...newBarcode,
    }
    setFormData(prev => ({
      ...prev,
      barcode: [...prev.barcodes, barcodes],
    }));
    setNewBarcode({ code: '' })
    setBarcodeErrors({});
  }

  // Remove specification
  const removeBarcode = (id: string) => {
    setFormData(prev => ({
      ...prev,
      barcode: prev.barcodes.filter(bar => bar.id !== id),
    }));
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

      setNewSpec({ spec_name: '', spec_value: '' });
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

  // Handle form submission (create or update)
  const handleSubmit = async () => {
    setIsSubmitting(true);

    if (validateForm()) {
      try {
        const selectedCategoryData = categories?.data.categories.find(
          (cat) => cat.id === selectedCategory
        );

        const finalFormData = {
          ...formData,
          category_id: selectedCategory,
          category_name: selectedCategoryData?.name,
          category_code: selectedCategoryData?.name,
        };

        const url = isEditMode ? `/api/products/${productId}` : "/api/products/all";
        const method = isEditMode ? "PUT" : "POST";

        const response = await fetch(url, {
          method,
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
            toast.error(`❌ ${result.message || `Product ${isEditMode ? 'update' : 'creation'} failed`}`);
          }
        } else {
          toast.success(`✅ Product ${isEditMode ? 'Updated' : 'Created'} Successfully`, {
            description: `The product "${finalFormData.name}" was ${isEditMode ? 'updated' : 'added'}.`,
          });

          if (isEditMode) {
            // Refresh product data and reset unsaved changes flag
            await fetchProductDetails();
            setHasUnsavedChanges(false);
          } else {
            // Reset form for create mode
            resetForm();
          }
        }
      } catch (error: any) {
        console.error(`Error ${isEditMode ? 'updating' : 'creating'} product:`, error);
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
      is_unique: true,
      wholesale_quantity: 0,
      low_stock_threshold: 5,
      specifications: [],
      barcodes: []
    });

    setSelectedCategory('');
    setAvailableSubcategories([]);
    setNewSpec({
      spec_name: '',
      spec_value: ''
    });
    setNewBarcode({
      code: ''
    });
    setErrors({});
    setSpecErrors({});
    setHasUnsavedChanges(false);
  };

  // Reset form to original values (edit mode)
  const resetToOriginal = () => {
    if (originalFormData && productDetails) {
      setFormData(originalFormData);
      setSelectedCategory(productDetails.category_id);
      setHasUnsavedChanges(false);
      toast.info("🔄 Form reset to original values");
    }
  };

  // Auto-generate name and SKU (for edit mode)
  const regenerateAutoFields = () => {
    const subcategory = getCurrentSubcategory();
    const brand = brands?.data.brands?.find(b => b.id === formData.brand_id);

    if (brand && subcategory) {
      // Generate name
      const parts = [brand.name];
      if (formData.model) parts.push(formData.model);
      parts.push(subcategory.name);
      const name = parts.join(' ');

      // Generate SKU
      let sku = `${brand.name.replace(/\s+/g, '').toUpperCase()}-${subcategory.name.replace(/\s+/g, '').toUpperCase()}`;
      if (formData.model) {
        sku += `-${formData.model.toUpperCase().replace(/\s+/g, '')}`;
      }
      formData.specifications.forEach(spec => {
        const specValue = spec.spec_value.replace(/\s+/g, '').toUpperCase();
        if (specValue.length <= 10) {
          sku += `-${specValue}`;
        }
      });

      setFormData(prev => ({ ...prev, name, sku }));
      setErrors(prev => ({ ...prev, name: '', sku: '' }));
      toast.info("🔄 Name and SKU regenerated");
    }
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading product details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-screen-xl mx-auto">
      {/* Header with navigation */}
      <div className="mb-6">
        <button
          onClick={() => {
            if (hasUnsavedChanges) {
              const proceed = confirm("You have unsaved changes. Are you sure you want to leave?");
              if (!proceed) return;
            }
            router.back();
          }}
          type="button"
          className="text-blue-500 flex items-center text-lg hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="mr-2" />
          Back
        </button>
      </div>

      <div className="space-y-6">
        {/* Enhanced Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                {isEditMode ? <Edit3 className="h-6 w-6" /> : <Package className="h-6 w-6" />}
                {isEditMode ? 'Edit Product' : 'Create New Product'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {isEditMode
                  ? `Update product details for ${productDetails?.name || 'this product'}`
                  : 'Fill in the details to create a new product'
                }
              </p>
              {hasUnsavedChanges && (
                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">You have unsaved changes</span>
                </div>
              )}
            </div>

            {isEditMode && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetToOriginal}
                  disabled={!hasUnsavedChanges}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={regenerateAutoFields}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Product Metadata (Edit Mode Only) */}
        {isEditMode && productDetails && (
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-blue-800 dark:text-blue-200">
                <Eye className="h-5 w-5" />
                Product Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Product ID:</span>
                  <p className="text-gray-600 dark:text-gray-400 font-mono">{productDetails.id}</p>
                </div>
                {productDetails.created_at && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Created:</span>
                      <p className="text-gray-600 dark:text-gray-400">
                        {new Date(productDetails.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
                {productDetails.updated_at && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Updated:</span>
                      <p className="text-gray-600 dark:text-gray-400">
                        {new Date(productDetails.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Basic Information Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-800 dark:text-white">
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Category */}
              <div className="space-y-2 w-full max-w-xs">
                <Label htmlFor="category" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Category *
                </Label>
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

              {/* Subcategory */}
              <div className="space-y-2 w-full max-w-xs">
                <Label htmlFor="subcategory" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Subcategory *
                </Label>
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

              {/* Brand */}
              <div className="space-y-2 w-full max-w-xs">
                <Label htmlFor="brand" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Brand *
                </Label>
                <SearchableDropdown
                  value={formData.brand_id || ''}
                  onValueChange={(value) => handleInputChange('brand_id', value)}
                  placeholder="Select a brand"
                  searchPlaceholder="Search brands..."
                  options={brandOptions}
                  emptyMessage="No brands found"
                  onSearch={handleBrandSearch}
                  searchTerm={brandSearchTerm}
                  isSearching={isSearching}
                  size="md"
                />
                <ErrorMessage message={errors.brand_id} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Details Section */}
 <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-800 dark:text-white">
            Product Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Product Name - Full width at top for better hierarchy */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                Product Name {!isEditMode && '(Auto-generated)'} *
                {isEditMode && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={regenerateAutoFields}
                    className="h-6 px-2 text-xs"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                )}
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder={isEditMode ? "Enter product name" : "Product name will be generated automatically"}
                className={`${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} ${!isEditMode ? 'bg-gray-50 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'} text-gray-900 dark:text-gray-100`}
              />
              <ErrorMessage message={errors.name} />
            </div>

            {/* Two-column layout for other fields */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="model" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Model
                  </Label>
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
                  <Label htmlFor="wholesale_quantity" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Wholesale Quantity
                  </Label>
                  <Input
                    id="wholesale_quantity"
                    type="number"
                    value={formData.wholesale_quantity}
                    onChange={(e) => handleInputChange('wholesale_quantity', parseInt(e.target.value) || 0)}
                    placeholder="Enter wholesale quantity"
                    className={`${errors.wholesale_quantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
                  />
                  <ErrorMessage message={errors.wholesale_quantity} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="low_stock_threshold" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Low Stock Threshold
                  </Label>
                  <Input
                    id="low_stock_threshold"
                    type="number"
                    value={formData.low_stock_threshold}
                    onChange={(e) => handleInputChange('low_stock_threshold', parseInt(e.target.value) || 0)}
                    placeholder="Enter low stock threshold quantity"
                    className={`${errors.low_stock_threshold ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
                  />
                  <ErrorMessage message={errors.low_stock_threshold} />
                </div>

              </div>
            </div>

            {/* Description - Full width at bottom */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </Label>
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
        </CardContent>
      </Card>

        {/* Specifications Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Product Specifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
                <Button
                  type="button"
                  onClick={addSpecification}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4" />
                  Add Spec
                </Button>
              </div>

              {/* Display Specifications */}
              {formData.specifications.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Added Specifications ({formData.specifications.length}):
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.specifications.map(spec => (
                      <Badge
                        key={spec.id}
                        variant="secondary"
                        className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-1"
                      >
                        <span className="font-medium">{spec.spec_name}:</span>
                        <span>{spec.spec_value}</span>
                        <button
                          type="button"
                          onClick={() => removeSpecification(spec.id)}
                          className="text-red-500 hover:text-red-700 ml-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        {/* barcode Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Product Barcode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Add New barcode */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" data-spec-section>
                <div className="space-y-1">
                  <Input
                    placeholder="barcode name *"
                    value={newBarcode.code}
                    onChange={(e) => setNewBarcode(prev => ({ ...prev, barcode: e.target.value }))}
                    className={`${barcodeErrors.barcode ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
                  />
                  <ErrorMessage message={barcodeErrors.barcode} />
                </div>
                <Button
                  type="button"
                  onClick={addBarcode}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4" />
                  Add barcode
                </Button>
              </div>

              {/* Display barcode */}
              {formData.barcodes.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Added barcode ({formData.barcodes.length}):
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.barcodes.map(bar => (
                      <Badge
                        key={bar.id}
                        variant="secondary"
                        className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-1"
                      >
                        <span className="font-medium">{bar.code}:</span>
                        <button
                          type="button"
                          onClick={() => removeBarcode(bar.id)}
                          className="text-red-500 hover:text-red-700 ml-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        {/* SKU and Warranty Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-800 dark:text-white">
              SKU and Warranty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="sku" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  SKU {!isEditMode && '(Auto-generated)'} *
                  {isEditMode && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={regenerateAutoFields}
                      className="h-6 px-2 text-xs"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  )}
                </Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  placeholder={isEditMode ? "Enter SKU" : "SKU will be generated automatically"}
                  className={`${errors.sku ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} ${!isEditMode ? 'bg-gray-50 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'} text-gray-900 dark:text-gray-100`}
                />
                <ErrorMessage message={errors.sku} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="warranty" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Warranty Period (months) *
                </Label>
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
          </CardContent>
        </Card>

        {/* Product Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-800 dark:text-white">
              Product Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleInputChange('is_active', checked)}
              />
              <Label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Product is Active
              </Label>
              <Badge variant={formData.is_active ? "default" : "secondary"} className="ml-2">
                {formData.is_active ? "Active" : "Inactive"}
              </Badge>
              <Switch
                id="is_unique"
                checked={formData.is_unique}
                onCheckedChange={(checked) => handleInputChange('is_unique', checked)}
              />
              <Label htmlFor="is_unique" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Product is Unique
              </Label>
              <Badge variant={formData.is_active ? "default" : "secondary"} className="ml-2">
                {formData.is_unique ? "Unique" : "not Unique"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-3 flex-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (hasUnsavedChanges) {
                      const proceed = confirm("You have unsaved changes. Are you sure you want to cancel?");
                      if (!proceed) return;
                    }
                    router.back();
                  }}
                  className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </Button>

                {isEditMode && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetToOriginal}
                    disabled={!hasUnsavedChanges}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reset Changes
                  </Button>
                )}

                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || (isEditMode && !hasUnsavedChanges)}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isEditMode ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      {isEditMode ? <Save className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                      {isEditMode ? 'Update Product' : 'Create Product'}
                    </>
                  )}
                </Button>
              </div>

              {/* Additional Actions for Edit Mode */}
              {isEditMode && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/dashboard/products/all/view/${productId}`)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </Button>
                </div>
              )}
            </div>

            {/* Status Messages */}
            <div className="mt-4 space-y-2">
              {isEditMode && !hasUnsavedChanges && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  All changes saved
                </div>
              )}

              {hasUnsavedChanges && (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                  Unsaved changes detected
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProductForm;