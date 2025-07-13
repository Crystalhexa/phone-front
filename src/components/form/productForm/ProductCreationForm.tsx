
"use client"
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

// Zod schemas
const ProductSpecificationSchema = z.object({
  id: z.string(),
  spec_name: z.string().min(1, 'Specification name is required').max(100, 'Specification name too long'),
  spec_value: z.string().min(1, 'Specification value is required').max(200, 'Specification value too long'),
  spec_unit: z.string().max(20, 'Unit too long').optional(),
});

const ProductBarcodeSchema = z.object({
  id: z.string(),
  code: z.string().min(1, 'Barcode is required').max(50, 'Barcode too long'),
  type: z.enum(['INTERNAL', 'EXTERNAL']),
  is_active: z.boolean(),
});

const ProductFormSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200, 'Product name too long'),
  model: z.string().min(1, 'Model is required').max(100, 'Model too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  subcategory_id: z.string().min(1, 'Subcategory is required'),
  brand_id: z.string().min(1, 'Brand is required'),
  sku: z.string().min(1, 'SKU is required').max(50, 'SKU too long'),
  warranty_period: z.number().min(0, 'Warranty period must be positive').max(120, 'Warranty period too long'),
  is_active: z.boolean(),
  specifications: z.array(ProductSpecificationSchema).default([]),
  barcodes: z.array(ProductBarcodeSchema).min(1, 'At least one barcode is required'),
});

// New spec schema for adding specifications
const NewSpecSchema = z.object({
  spec_name: z.string().min(1, 'Specification name is required').max(100, 'Specification name too long'),
  spec_value: z.string().min(1, 'Specification value is required').max(200, 'Specification value too long'),
  spec_unit: z.string().max(20, 'Unit too long').optional(),
});

// Barcode input validation
const BarcodeInputSchema = z.string().min(1, 'Barcode cannot be empty').max(50, 'Barcode too long');

type ProductSpecification = z.infer<typeof ProductSpecificationSchema>;
type ProductBarcode = z.infer<typeof ProductBarcodeSchema>;
type ProductFormData = z.infer<typeof ProductFormSchema>;
type NewSpec = z.infer<typeof NewSpecSchema>;



interface Category {
  id: string;
  name: string;
  code: string;
  description: string;
  subcategories: Subcategory[];
}

interface Brand {
  id: string;
  name: string;
  code: string;
}

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
    specifications: [],
    barcodes: [],
  });

  const [newSpec, setNewSpec] = useState({
    spec_name: '',
    spec_value: '',
    spec_unit: '',
  });

  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [labelQuantity, setLabelQuantity] = useState(1);
  const [showBarcodePreview, setShowBarcodePreview] = useState(false);

  // Validation states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [specErrors, setSpecErrors] = useState<Record<string, string>>({});
  const [barcodeError, setBarcodeError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Generate product name automatically
  useEffect(() => {
    const generateProductName = () => {
      const subcategory = getCurrentSubcategory();
      const brand = brands?.data.brands?.find(b => b.id === formData.brand_id);

      if (brand && formData.model && subcategory) {
        const name = `${brand.name} ${formData.model} ${subcategory.name}`;
        setFormData(prev => ({ ...prev, name }));
        // Clear name error when auto-generated
        setErrors(prev => ({ ...prev, name: '' }));
      }
    };

    generateProductName();
  }, [selectedCategory, formData.subcategory_id, formData.brand_id, formData.model, categories, brands, availableSubcategories]);

  // Generate SKU automatically
  useEffect(() => {
    const generateSKU = () => {
      const category = categories?.data.categories.find(c => c.id === selectedCategory);
      const brand = brands?.data.brands.find(b => b.id === formData.brand_id);

      if (category && brand && formData.model) {
        let sku = `${category.name}-${brand.code}-${formData.model.toUpperCase().replace(/\s+/g, '')}`;

        // Add specification codes to SKU
        formData.specifications.forEach(spec => {
          const specCode = `${spec.spec_value.replace(/\s+/g, '').toUpperCase()}`;
          sku += `-${specCode}`;
        });

        setFormData(prev => ({ ...prev, sku }));
        // Clear SKU error when auto-generated
        setErrors(prev => ({ ...prev, sku: '' }));
      }
    };

    generateSKU();
  }, [selectedCategory, formData.brand_id, formData.model, formData.specifications, categories, brands]);

  // Generate CUID-like ID
  const generateCUID = () => {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8);
    return `${timestamp}${randomPart}`;
  };

  // Generate internal barcode
  const generateInternalBarcode = () => {
    const cuid = generateCUID();
    return `KRS${cuid}`;
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

  // Validate barcode input
  const validateBarcodeInput = () => {
    try {
      BarcodeInputSchema.parse(barcodeInput.trim());
      setBarcodeError('');
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setBarcodeError(error.errors[0].message);
      }
      return false;
    }
  };

  // Add barcode (scanned or generated)
  const addBarcode = (code: string, type: 'INTERNAL' | 'EXTERNAL') => {
    // Check for duplicate barcodes
    const isDuplicate = formData.barcodes.some(barcode => barcode.code === code);
    if (isDuplicate) {
      setBarcodeError('This barcode already exists');
      return;
    }

    const newBarcode: ProductBarcode = {
      id: generateCUID(),
      code,
      type,
      is_active: true,
    };

    setFormData(prev => ({
      ...prev,
      barcodes: [...prev.barcodes, newBarcode],
    }));

    setBarcodeError('');
    // Clear barcode validation error
    setErrors(prev => ({ ...prev, barcodes: '' }));
  };

  // Handle barcode input
  const handleBarcodeInput = () => {
    if (validateBarcodeInput()) {
      addBarcode(barcodeInput.trim(), 'INTERNAL');
      setBarcodeInput('');
    }
  };

  // Generate internal barcode
  const handleGenerateBarcode = () => {
    const generatedCode = generateInternalBarcode();
    addBarcode(generatedCode, 'INTERNAL');
  };

  // Remove barcode
  const removeBarcode = (id: string) => {
    setFormData(prev => ({
      ...prev,
      barcodes: prev.barcodes.filter(barcode => barcode.id !== id),
    }));
  };

  // Simulate barcode scanning
  const handleScanBarcode = () => {
    setIsScanning(true);
    setBarcodeError('');

    // Simulate scanning delay
    setTimeout(() => {
      const mockScannedCode = Math.random().toString().substring(2, 15);
      addBarcode(mockScannedCode, 'EXTERNAL');
      setIsScanning(false);
    }, 2000);
  };

  // Generate barcode SVG
  const generateBarcodeLines = (code: string) => {
    const lines = [];
    const codeArray = code.split('');

    for (let i = 0; i < codeArray.length; i++) {
      const width = (parseInt(codeArray[i]) % 3) + 1;
      const x = i * 8;
      lines.push(
        <rect
          key={i}
          x={x}
          y="0"
          width={width}
          height="40"
          fill="#000000"
        />
      );
    }

    return lines;
  };

  // Print barcode labels
  const printBarcodeLabels = () => {
    const printWindow = window.open('', '_blank');
    const barcode = formData.barcodes[0]; // Use first barcode

    if (!printWindow || !barcode) return;

    let labelsHtml = '';
    for (let i = 0; i < labelQuantity; i++) {
      labelsHtml += `
        <div style="
          width: 2.5in;
          height: 1in;
          border: 1px solid #ccc;
          margin: 0.1in;
          padding: 0.1in;
          display: inline-block;
          page-break-inside: avoid;
          font-family: Arial, sans-serif;
        ">
          <div style="font-size: 10px; font-weight: bold; margin-bottom: 2px;">
            ${formData.name}
          </div>
          <div style="text-align: center; margin: 4px 0;">
            <svg width="120" height="40" viewBox="0 0 120 40">
              ${generateBarcodeLines(barcode.code).map(line => line.props ?
        `<rect x="${line.props.x}" y="${line.props.y}" width="${line.props.width}" height="${line.props.height}" fill="${line.props.fill}"/>` : ''
      ).join('')}
            </svg>
          </div>
          <div style="font-size: 8px; text-align: center;">
            ${barcode.code}
          </div>
          <div style="font-size: 8px; text-align: center; margin-top: 2px;">
            SKU: ${formData.sku}
          </div>
        </div>
      `;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Barcode Labels</title>
          <style>
            @page { margin: 0.5in; }
            body { margin: 0; }
          </style>
        </head>
        <body>
          ${labelsHtml}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
    {/* Category */}
    <div className="space-y-2 w-full max-w-xs">
      <Label htmlFor="category" className="text-sm font-medium text-gray-700 dark:text-gray-300">Category *</Label>
      <Select value={selectedCategory} onValueChange={handleCategoryChange}>
        <SelectTrigger className={`${errors.category ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}>
          <SelectValue placeholder="Select a category" />
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
          {categories?.data.categories.map(category => (
            <SelectItem key={category.id} value={category.id} className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
              {category.name} ({category.name})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ErrorMessage message={errors.category} />
    </div>

    {/* Subcategory */}
    <div className="space-y-2 w-full max-w-xs">
      <Label htmlFor="subcategory" className="text-sm font-medium text-gray-700 dark:text-gray-300">Subcategory *</Label>
      <Select
        value={formData.subcategory_id}
        onValueChange={(value) => handleInputChange('subcategory_id', value)}
        disabled={!selectedCategory}
      >
        <SelectTrigger className={`${errors.subcategory_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}>
          <SelectValue placeholder="Select a subcategory" />
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
          {availableSubcategories.map(subcategory => (
            <SelectItem key={subcategory.subcategory_id} value={subcategory.subcategory_id} className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
              {subcategory.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ErrorMessage message={errors.subcategory_id} />
    </div>

    {/* Brand */}
    <div className="space-y-2 w-full max-w-xs">
      <Label htmlFor="brand" className="text-sm font-medium text-gray-700 dark:text-gray-300">Brand *</Label>
      <Select
        value={formData.brand_id}
        onValueChange={(value) => handleInputChange('brand_id', value)}
      >
        <SelectTrigger className={`${errors.brand_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}>
          <SelectValue placeholder="Select a brand" />
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
          {brands?.data.brands.map(brand => (
            <SelectItem key={brand.id} value={brand.id} className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
              {brand.name} ({brand.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ErrorMessage message={errors.brand_id} />
    </div>
  </div>
</div>


        {/* Product Details Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Product Details</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
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
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
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

        {/* Barcode Management Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Barcode className="h-4 w-4" />
            Barcode Management *
          </h2>
          
          {/* Barcode Input/Scanning */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Enter or scan barcode"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleBarcodeInput()}
                  className={`${barcodeError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
                />
                <ErrorMessage message={barcodeError} />
              </div>
              <Button
                type="button"
                onClick={handleBarcodeInput}
                disabled={!barcodeInput.trim()}
                variant="outline"
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Add
              </Button>
              <Button
                type="button"
                onClick={handleScanBarcode}
                disabled={isScanning}
                variant="outline"
                className="flex items-center gap-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {isScanning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Scanning...
                  </>
                ) : (
                  <>
                    <Scan className="h-4 w-4" />
                    Scan
                  </>
                )}
              </Button>
            </div>

            <div className="flex justify-center">
              <Button
                type="button"
                onClick={handleGenerateBarcode}
                variant="outline"
                className="flex items-center gap-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <QrCode className="h-4 w-4" />
                Generate Custom Barcode (KRS + CUID)
              </Button>
            </div>
          </div>

          {/* Display Barcodes */}
          {formData.barcodes.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Added Barcodes:</Label>
              <div className="space-y-2">
                {formData.barcodes.map(barcode => (
                  <div key={barcode.id} className="flex items-center justify-between p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                      <Badge variant={barcode.type === 'INTERNAL' ? 'default' : 'secondary'} className={barcode.type === 'INTERNAL' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}>
                        {barcode.type}
                      </Badge>
                      <span className="font-mono text-sm text-gray-900 dark:text-gray-100">{barcode.code}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBarcode(barcode.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <ErrorMessage message={errors.barcodes} />

          {/* Barcode Printing Section */}
          {formData.barcodes.length > 0 && (
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Print Barcode Labels</Label>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="labelQuantity" className="text-sm font-medium text-gray-700 dark:text-gray-300">Quantity:</Label>
                  <Input
                    id="labelQuantity"
                    type="number"
                    min="1"
                    max="100"
                    value={labelQuantity}
                    onChange={(e) => setLabelQuantity(parseInt(e.target.value) || 1)}
                    className="w-20 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <Dialog open={showBarcodePreview} onOpenChange={setShowBarcodePreview}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                    <DialogHeader>
                      <DialogTitle className="text-gray-900 dark:text-gray-100">Barcode Label Preview</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        {Array.from({ length: Math.min(labelQuantity, 6) }, (_, i) => (
                          <div key={i} className="border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-700" style={{ width: '180px', height: '72px' }}>
                            <div className="text-xs font-bold mb-1 truncate text-gray-900 dark:text-gray-100">
                              {formData.name}
                            </div>
                            <div className="text-center mb-1">
                              <svg width="100" height="20" viewBox="0 0 100 20">
                                {generateBarcodeLines(formData.barcodes[0]?.code || '')}
                              </svg>
                            </div>
                            <div className="text-xs text-center text-gray-900 dark:text-gray-100">
                              {formData.barcodes[0]?.code}
                            </div>
                            <div className="text-xs text-center mt-1 text-gray-900 dark:text-gray-100">
                              SKU: {formData.sku}
                            </div>
                          </div>
                        ))}
                      </div>
                      {labelQuantity > 6 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                          ... and {labelQuantity - 6} more labels
                        </p>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  type="button"
                  onClick={printBarcodeLabels}
                  disabled={!formData.name || !formData.sku}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Printer className="h-4 w-4" />
                  Print Labels
                </Button>
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