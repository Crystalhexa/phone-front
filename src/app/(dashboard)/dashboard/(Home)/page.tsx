"use client"
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useRef } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  ChevronDown,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Calculator,
  CreditCard,
  Receipt,
  User,
  Tag,
  Barcode as BarcodeIcon
} from 'lucide-react';
import { useBrandData } from '@/components/table/BrandTable/useBrandData';
import { useCategoryData } from '@/components/table/CategoryTable/useCategoryData';
import { BarcodeScanner } from '@/poscomponents/BarcodeScanner';

// Types based on your API response
interface Product {
  id: string;
  name: string;
  description: string;
  subcategory_id: string;
  brand_id: string;
  created_at: string;
  updated_at: string;
  subcategory_name: string;
  category_id: string;
  category_name: string;
  brand_name: string;
  brand_code: string;
  brand_logo: string;
  variations?: ProductVariation[];
  attributes?: ProductAttribute[];
  stock_info?: StockInfo;
}

interface ProductVariation {
  id: string;
  product_id: string;
  sku: string;
  stock_quantity: number;
  low_stock_threshold: number;
  retail_price: number;
  wholesale_price: number;
  images: ProductImage[];
  barcodes: Barcode[];
}

interface ProductImage {
  id: string;
  image_url: string;
  alt_text: string;
  is_primary: boolean;
}

interface Barcode {
  id: string;
  code: string;
  type: string;
  is_active: boolean;
}

interface ProductAttribute {
  id: string;
  name: string;
  description: string;
}

interface StockInfo {
  total_stock: number;
  min_variation_stock: number;
  max_variation_stock: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  variation_count: number;
  out_of_stock_variations: number;
  low_stock_variations: number;
  stock_status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

interface ApiResponse {
  success: boolean;
  data: {
    products: Product[];
    total: number;
    limit: number;
    page: number;
    totalPages: number;
  };
}

interface Filters {
  search: string;
  sortBy: 'name' | 'id' | 'sku' | 'price' | 'stock';
  sortOrder: 'asc' | 'desc';
  category_id: string;
  subcategory_id: string;
  brand_id: string;
  stock_filter: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  price_min: string;
  price_max: string;
  include_variations: boolean;
  include_attributes: boolean;
  include_stock: boolean;
}

interface CartItem {
  id: string;
  product: Product;
  variation: ProductVariation;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Customer {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
}

// Flattened variation with product info
interface VariationWithProduct extends ProductVariation {
  product_name: string;
  product_description: string;
  brand_name: string;
  brand_logo: string;
  brand_code: string;
  category_name: string;
  subcategory_name: string;
  product: Product;
}

// Searchable Dropdown Component (same as original)
interface SearchableDropdownProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  options: Array<{ id: string; name: string; description?: string; logo?: string; code?: string }>;
  disabled?: boolean;
  emptyMessage?: string;
  onSearch?: (term: string) => void;
  searchTerm?: string;
  isSearching?: boolean;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  options,
  disabled = false,
  emptyMessage = "No options available",
  onSearch,
  searchTerm = '',
  isSearching = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(option => option.id === value);

  const currentSearchTerm = onSearch ? searchTerm : localSearchTerm;

  const filteredOptions = onSearch
    ? options
    : options.filter(option =>
      option.name.toLowerCase().includes(localSearchTerm.toLowerCase())
    );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setLocalSearchTerm('');
        if (onSearch) {
          onSearch('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onSearch]);

  const handleSearchChange = (term: string) => {
    if (onSearch) {
      onSearch(term);
    } else {
      setLocalSearchTerm(term);
    }
  };

  const handleSelect = (optionId: string) => {
    onValueChange(optionId);
    setIsOpen(false);
    setLocalSearchTerm('');
    if (onSearch) {
      onSearch('');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 text-left bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedOption?.logo && (
              <img src={selectedOption.logo} alt={selectedOption.name} className="w-4 h-4 rounded" />
            )}
            <span className={selectedOption ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}>
              {selectedOption ? selectedOption.name : placeholder}
            </span>
            {selectedOption?.code && (
              <span className="text-xs text-gray-400">({selectedOption.code})</span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-gray-600">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
              {isSearching && (
                <div className="absolute right-2 top-2 animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              )}
              <input
                type="text"
                value={currentSearchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-8 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            <button
              type="button"
              onClick={() => handleSelect('')}
              className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700"
            >
              <span className="text-gray-500">All {placeholder.toLowerCase()}</span>
            </button>

            {filteredOptions.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option.id)}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
              >
                <div className="flex items-center gap-2">
                  {option.logo && (
                    <img src={option.logo} alt={option.name} className="w-4 h-4 rounded" />
                  )}
                  <div>
                    <div className="font-medium">{option.name}</div>
                    {option.code && (
                      <div className="text-xs text-gray-500">Code: {option.code}</div>
                    )}
                    {option.description && (
                      <div className="text-xs text-gray-500 truncate max-w-xs">{option.description}</div>
                    )}
                  </div>
                </div>
              </button>
            ))}

            {filteredOptions.length === 0 && !isSearching && (
              <div className="px-3 py-2 text-gray-500 text-center">
                {currentSearchTerm ? `No results found for "${currentSearchTerm}"` : emptyMessage}
              </div>
            )}

            {isSearching && (
              <div className="px-3 py-2 text-gray-500 text-center flex items-center justify-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                Searching...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const POSSystem: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [variations, setVariations] = useState<VariationWithProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<Customer>({ name: 'Walk-in Customer' });
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(8.5);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'digital'>('cash');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // F2 key to open barcode scanner
      if (event.key === 'F2') {
        event.preventDefault();
        setShowBarcodeScanner(true);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  // 8. Advanced barcode processing:
  const processBarcode = async (barcode: string) => {
    // Clean the barcode (remove any extra characters)
    const cleanBarcode = barcode.trim().replace(/[^\w\d]/g, '');

    // Try to find in local variations first
    let product = findProductByBarcode(cleanBarcode);

    if (!product) {
      // If not found locally, search in API
      try {
        const response = await fetch(`/api/products/barcode/${cleanBarcode}`);
        const data = await response.json();

        if (data.success && data.data) {
          // Add the found product to variations and cart
          const foundProduct = data.data;
          addToCart(foundProduct);
          return;
        }
      } catch (error) {
        console.error('Error searching barcode:', error);
      }

      // Still not found - show error
      alert(`Product with barcode ${cleanBarcode} not found`);
    } else {
      addToCart(product);
    }
  };
  const findProductByBarcode = (barcode: string): VariationWithProduct | null => {
    return variations.find(variation =>
      variation.barcodes?.some(b => b.code === barcode && b.is_active)
    ) || null;
  };

  // Handle barcode scan:
  const handleBarcodeScan = (barcode: string) => {
    const product = findProductByBarcode(barcode);
    if (product) {
      addToCart(product);
      // Optional: Show success message
      console.log(`Added ${product.product_name} to cart`);
    } else {
      // Product not found - could show error or search
      alert(`Product with barcode ${barcode} not found`);
    }
  };
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  const [filters, setFilters] = useState<Filters>({
    search: '',
    sortBy: 'name',
    sortOrder: 'asc',
    category_id: '',
    subcategory_id: '',
    brand_id: '',
    stock_filter: 'in_stock',
    price_min: '',
    price_max: '',
    include_variations: true,
    include_attributes: true,
    include_stock: true
  });

  // Function to flatten products into variations
  const flattenProductsToVariations = (products: Product[]): VariationWithProduct[] => {
    const allVariations: VariationWithProduct[] = [];

    products.forEach(product => {
      if (product.variations && product.variations.length > 0) {
        product.variations.forEach(variation => {
          allVariations.push({
            ...variation,
            product_name: product.name,
            product_description: product.description,
            brand_name: product.brand_name,
            brand_logo: product.brand_logo,
            brand_code: product.brand_code,
            category_name: product.category_name,
            subcategory_name: product.subcategory_name,
            product: product
          });
        });
      }
    });

    return allVariations;
  };

  // API call to fetch products and flatten to variations
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        include_variations: filters.include_variations.toString(),
        include_attributes: filters.include_attributes.toString(),
        include_stock: filters.include_stock.toString(),
        stock_filter: filters.stock_filter,
        ...(filters.search && { search: filters.search }),
        ...(filters.category_id && { category_id: filters.category_id }),
        ...(filters.subcategory_id && { subcategory_id: filters.subcategory_id }),
        ...(filters.brand_id && { brand_id: filters.brand_id }),
        ...(filters.price_min && { price_min: filters.price_min }),
        ...(filters.price_max && { price_max: filters.price_max }),
      });

      const response = await fetch(`/api/products/all?${params}`);
      const data: ApiResponse = await response.json();

      if (data.success) {
        setProducts(data.data.products);
        const flattenedVariations = flattenProductsToVariations(data.data.products);

        // Apply local filtering and sorting to variations
        let filteredVariations = flattenedVariations;

        // Filter by search term (SKU, product name, brand)
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          filteredVariations = filteredVariations.filter(variation =>
            variation.sku.toLowerCase().includes(searchTerm) ||
            variation.product_name.toLowerCase().includes(searchTerm) ||
            variation.brand_name.toLowerCase().includes(searchTerm)
          );
        }

        // Filter by stock
        if (filters.stock_filter !== 'all') {
          filteredVariations = filteredVariations.filter(variation => {
            switch (filters.stock_filter) {
              case 'in_stock':
                return variation.stock_quantity > variation.low_stock_threshold;
              case 'low_stock':
                return variation.stock_quantity > 0 && variation.stock_quantity <= variation.low_stock_threshold;
              case 'out_of_stock':
                return variation.stock_quantity === 0;
              default:
                return true;
            }
          });
        }

        // Filter by price range
        if (filters.price_min) {
          filteredVariations = filteredVariations.filter(variation =>
            variation.retail_price >= parseFloat(filters.price_min)
          );
        }
        if (filters.price_max) {
          filteredVariations = filteredVariations.filter(variation =>
            variation.retail_price <= parseFloat(filters.price_max)
          );
        }

        // Sort variations
        filteredVariations.sort((a, b) => {
          let comparison = 0;
          switch (filters.sortBy) {
            case 'name':
              comparison = a.product_name.localeCompare(b.product_name);
              break;
            case 'sku':
              comparison = a.sku.localeCompare(b.sku);
              break;
            case 'price':
              comparison = a.retail_price - b.retail_price;
              break;
            case 'stock':
              comparison = a.stock_quantity - b.stock_quantity;
              break;
            default:
              comparison = a.product_name.localeCompare(b.product_name);
          }
          return filters.sortOrder === 'desc' ? -comparison : comparison;
        });

        setVariations(filteredVariations);
        setPagination(prev => ({
          ...prev,
          total: filteredVariations.length,
          totalPages: Math.ceil(filteredVariations.length / prev.limit)
        }));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [pagination.page, pagination.limit, filters]);

  // Get current page variations
  const getCurrentPageVariations = () => {
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    return variations.slice(startIndex, endIndex);
  };

  // Cart functions
  const addToCart = (variation: VariationWithProduct) => {
    const existingItem = cart.find(item =>
      item.product.id === variation.product.id && item.variation.id === variation.id
    );

    if (existingItem) {
      if (existingItem.quantity < variation.stock_quantity) {
        updateCartQuantity(existingItem.id, existingItem.quantity + 1);
      }
    } else {
      const newItem: CartItem = {
        id: `${variation.product.id}-${variation.id}-${Date.now()}`,
        product: variation.product,
        variation: variation,
        quantity: 1,
        unitPrice: variation.retail_price,
        totalPrice: variation.retail_price
      };
      setCart(prev => [...prev, newItem]);
    }
  };

  const updateCartQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        const maxQuantity = item.variation.stock_quantity;
        const quantity = Math.min(newQuantity, maxQuantity);
        return {
          ...item,
          quantity,
          totalPrice: quantity * item.unitPrice
        };
      }
      return item;
    }));
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomer({ name: 'Walk-in Customer' });
    setDiscountPercent(0);
    setShowCheckout(false);
  };

  // Helper function to get stock status
  const getVariationStockStatus = (variation: VariationWithProduct): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' => {
    if (variation.stock_quantity === 0) return 'OUT_OF_STOCK';
    if (variation.stock_quantity <= variation.low_stock_threshold) return 'LOW_STOCK';
    return 'IN_STOCK';
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * taxPercent) / 100;
  const total = taxableAmount + taxAmount;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const getStockBadge = (status: string) => {
    switch (status) {
      case 'IN_STOCK':
        return <Badge variant="default" className="bg-green-500"><Package className="w-3 h-3 mr-1" />In Stock</Badge>;
      case 'LOW_STOCK':
        return <Badge variant="destructive" className="bg-yellow-500"><AlertTriangle className="w-3 h-3 mr-1" />Low Stock</Badge>;
      case 'OUT_OF_STOCK':
        return <Badge variant="secondary"><TrendingDown className="w-3 h-3 mr-1" />Out of Stock</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const processPayment = async () => {
    try {
      const orderData = {
        customer,
        items: cart,
        subtotal,
        discount: discountAmount,
        tax: taxAmount,
        total,
        paymentMethod,
        timestamp: new Date().toISOString()
      };

      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        alert('Payment processed successfully!');
        clearCart();
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      alert('Payment failed. Please try again.');
    }
  };

  const {
    data: brand,
    handleSearch: handleBrandSearch,
    searchTerm: brandSearchTerm,
  } = useBrandData();

  const {
    data: category,
    handleSearch: handleCategorySearch,
    searchTerm: categorySearchTerm,
  } = useCategoryData();

  const categories = category?.data?.categories || [];
  const brands = brand?.data?.brands || [];

  const selectedCategory = categories.find((c) => c.id === filters.category_id);
  const subcategories = selectedCategory?.subcategories?.map((sub: any) => ({
    id: sub.subcategory_id,
    name: sub.name,
  })) || [];

  const categoryOptions = categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    description: cat.description
  }));

  const subcategoryOptions = subcategories.map(sub => ({
    id: sub.id,
    name: sub.name
  }));

  const brandOptions = brands.map(brand => ({
    id: brand.id,
    name: brand.name,
    code: brand.code,
  }));

  const router = useRouter();

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Panel - Variations */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white shadow-sm p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calculator className="w-6 h-6" />
              POS System - Variations View
            </h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowBarcodeScanner(true)}
                className="flex items-center gap-2"
              >
                <BarcodeIcon className="w-4 h-4" />
                Scan Barcode
              </Button>
              <BarcodeScanner
                isOpen={showBarcodeScanner}
                onScan={handleBarcodeScan}
                onClose={() => setShowBarcodeScanner(false)}
              />
            </div>
          </div>

          {/* Quick Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search SKU, product, brand..."
                className="pl-10"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              />
            </div>

            <SearchableDropdown
              value={filters.category_id}
              onValueChange={(value) => {
                setFilters((prev) => ({ ...prev, category_id: value, subcategory_id: '' }));
              }}
              placeholder="All Categories"
              searchPlaceholder="Search categories..."
              options={categoryOptions}
              onSearch={handleCategorySearch}
              searchTerm={categorySearchTerm}
            />

            <SearchableDropdown
              value={filters.brand_id}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, brand_id: value }))}
              placeholder="All Brands"
              searchPlaceholder="Search brands..."
              options={brandOptions}
              onSearch={handleBrandSearch}
              searchTerm={brandSearchTerm}
            />

            <Select
              value={filters.stock_filter}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, stock_filter: value as Filters['stock_filter'] }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.sortBy}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, sortBy: value as Filters['sortBy'] }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Product Name</SelectItem>
                <SelectItem value="sku">SKU</SelectItem>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="stock">Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Variations Grid */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {getCurrentPageVariations().map((variation) => {
              const stockStatus = getVariationStockStatus(variation);
              const primaryImage = variation.images?.find(img => img.is_primary) || variation.images?.[0];

              return (
                <Card key={variation.id} className="hover:shadow-md cursor-pointer transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Product Image */}
                      {primaryImage && (
                        <div className="aspect-square w-full bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={primaryImage.image_url}
                            alt={primaryImage.alt_text || variation.product_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Product Info */}
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          {variation.brand_logo && (
                            <img src={variation.brand_logo} alt={variation.brand_name} className="w-6 h-6 rounded flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm leading-tight">{variation.product_name}</h3>
                            <p className="text-xs text-gray-500">{variation.brand_name}</p>
                          </div>
                        </div>

                        {/* SKU and Barcode */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Package className="w-3 h-3" />
                            <span className="font-mono">{variation.sku}</span>
                          </div>
                          {variation.barcodes && variation.barcodes.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <BarcodeIcon className="w-3 h-3" />
                              <span className="font-mono">{variation.barcodes[0].code}</span>
                            </div>
                          )}
                        </div>

                        {/* Stock Status */}
                        <div className="flex justify-between items-center">
                          {getStockBadge(stockStatus)}
                          <span className="text-xs text-gray-500">
                            Stock: {variation.stock_quantity}
                          </span>
                        </div>

                        {/* Price and Add Button */}
                        <div className="flex justify-between items-center pt-2">
                          <div className="space-y-1">
                            <div className="text-lg font-bold">
                              {formatPrice(variation.retail_price)}
                            </div>
                            {variation.wholesale_price !== variation.retail_price && (
                              <div className="text-xs text-gray-500">
                                Wholesale: {formatPrice(variation.wholesale_price)}
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => addToCart(variation)}
                            disabled={variation.stock_quantity === 0} className="flex items-center gap-1"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          )}

          {/* Empty State */}
          {!loading && variations.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No products found matching your criteria.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="bg-white border-t p-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {Math.min((pagination.page - 1) * pagination.limit + 1, variations.length)} to{' '}
            {Math.min(pagination.page * pagination.limit, variations.length)} of {variations.length} variations
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-96 bg-white border-l flex flex-col">
        {/* Cart Header */}
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Cart ({cart.length})
            </h2>
            {cart.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearCart}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Customer Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              Customer
            </div>
            <Input
              placeholder="Customer name"
              value={customer.name}
              onChange={(e) => setCustomer(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Cart is empty</p>
              <p className="text-sm">Add products to start a sale</p>
            </div>
          ) : (
            cart.map((item) => (
              <Card key={item.id} className="p-3">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm leading-tight">{item.product.name}</h4>
                      <p className="text-xs text-gray-500">{item.variation.sku}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromCart(item.id)}
                      className="p-1 h-6 w-6"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                        className="h-6 w-6 p-0"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.variation.stock_quantity}
                        className="h-6 w-6 p-0"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatPrice(item.totalPrice)}</div>
                      <div className="text-xs text-gray-500">
                        {formatPrice(item.unitPrice)} each
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Cart Summary */}
        {cart.length > 0 && (
          <div className="border-t p-4 space-y-4">
            {/* Discount */}
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              <Input
                type="number"
                placeholder="Discount %"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Math.max(0, Math.min(100, Number(e.target.value))))}
                className="flex-1"
                min="0"
                max="100"
              />
            </div>

            {/* Tax */}
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              <Input
                type="number"
                placeholder="Tax %"
                value={taxPercent}
                onChange={(e) => setTaxPercent(Math.max(0, Number(e.target.value)))}
                className="flex-1"
                min="0"
                step="0.1"
              />
            </div>

            {/* Payment Method */}
            <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Cash
                  </div>
                </SelectItem>
                <SelectItem value="card">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Card
                  </div>
                </SelectItem>
                <SelectItem value="digital">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4" />
                    Digital Wallet
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Totals */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount ({discountPercent}%):</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Tax ({taxPercent}%):</span>
                <span>{formatPrice(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total:</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <Button
              className="w-full"
              onClick={() => setShowCheckout(true)}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Checkout - {formatPrice(total)}
            </Button>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96 max-h-[80vh] overflow-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Confirm Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Order Summary */}
              <div className="space-y-2">
                <h3 className="font-medium">Order Summary</h3>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span>{customer.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Items:</span>
                    <span>{cart.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment:</span>
                    <span className="capitalize">{paymentMethod}</span>
                  </div>
                </div>
              </div>

              {/* Total Breakdown */}
              <div className="space-y-2 p-3 bg-gray-50 rounded">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discountPercent > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount:</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span>{formatPrice(taxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCheckout(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={processPayment}
                  className="flex-1"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Process Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default POSSystem;