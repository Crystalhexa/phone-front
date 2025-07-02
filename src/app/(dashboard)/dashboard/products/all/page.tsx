"use client"
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  ChevronDown
} from 'lucide-react';
import { useBrandData } from '@/components/table/BrandTable/useBrandData';
import { useCategoryData } from '@/components/table/CategoryTable/useCategoryData';

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
  sortBy: 'name' | 'id' | 'created_at' | 'updated_at';
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

// Searchable Dropdown Component
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
  
  // Use external search term if provided, otherwise use local search
  const currentSearchTerm = onSearch ? searchTerm : localSearchTerm;
  
  // Filter options based on search term
  const filteredOptions = onSearch 
    ? options // If using external search, options are already filtered from the API
    : options.filter(option =>
        option.name.toLowerCase().includes(localSearchTerm.toLowerCase())
      );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setLocalSearchTerm('');
        // Reset external search when closing
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
    // Reset external search when selecting
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
        className={`w-full px-3 py-2 text-left bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
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

const ProductsTable: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
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
    stock_filter: 'all',
    price_min: '',
    price_max: '',
    include_variations: true,
    include_attributes: true,
    include_stock: true
  });

  // Simulated API call - replace with your actual API endpoint
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

      // Replace with your actual API endpoint
      const response = await fetch(`/api/products/all?${params}`);
      const data: ApiResponse = await response.json();

      if (data.success) {
        setProducts(data.data.products);
        setPagination(prev => ({
          ...prev,
          total: data.data.total,
          totalPages: data.data.totalPages
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      sortBy: 'name',
      sortOrder: 'asc',
      category_id: '',
      subcategory_id: '',
      brand_id: '',
      stock_filter: 'all',
      price_min: '',
      price_max: '',
      include_variations: true,
      include_attributes: true,
      include_stock: true
    });
    setPagination(prev => ({ ...prev, page: 1 }));
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

  // Transform data for searchable dropdowns
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
    <div className="container mx-auto p-6 space-y-6">
     <div className="flex justify-between items-center">
      <h1 className="text-3xl font-bold">Products Management</h1>
      <div className="flex gap-2">
        <Button onClick={resetFilters} variant="outline">
          Reset Filters
        </Button>
        <Button onClick={() => fetchProducts()}>
          Refresh
        </Button>
        <Button onClick={() => router.push('/dashboard/products/all/register')}>
          Add New Product
        </Button>
      </div>
    </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="col-span-1 md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, brand, or category..."
                  className="pl-10"
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                />
              </div>
            </div>

            {/* Category Filter - Searchable with Dynamic Search */}
            <SearchableDropdown
              value={filters.category_id}
              onValueChange={(value) => {
                setFilters((prev) => ({ ...prev, category_id: value, subcategory_id: '' }));
              }}
              placeholder="Select Category"
              searchPlaceholder="Search categories..."
              options={categoryOptions}
              emptyMessage="No categories found"
              onSearch={handleCategorySearch}
              searchTerm={categorySearchTerm}
              
            />

            {/* Subcategory Filter - Searchable */}
            <SearchableDropdown
              value={filters.subcategory_id}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, subcategory_id: value }))}
              placeholder="Select Subcategory"
              searchPlaceholder="Search subcategories..."
              options={subcategoryOptions}
              disabled={!filters.category_id}
              emptyMessage="No subcategories found"
            />

            {/* Brand Filter - Searchable with Dynamic Search */}
            <SearchableDropdown
              value={filters.brand_id}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, brand_id: value }))}
              placeholder="Select Brand"
              searchPlaceholder="Search brands..."
              options={brandOptions}
              emptyMessage="No brands found"
              onSearch={handleBrandSearch}
              searchTerm={brandSearchTerm}
              
            />

            {/* Sort By */}
            <Select
              value={filters.sortBy}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, sortBy: value as Filters['sortBy'] }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="created_at">Created Date</SelectItem>
                <SelectItem value="updated_at">Updated Date</SelectItem>
                <SelectItem value="id">ID</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Order */}
            <Select
              value={filters.sortOrder}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, sortOrder: value as Filters['sortOrder'] }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>

            {/* Stock Filter */}
            <Select
              value={filters.stock_filter}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, stock_filter: value as Filters['stock_filter'] }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            {/* Price Min */}
            <Input
              type="number"
              placeholder="Min Price"
              value={filters.price_min}
              onChange={(e) => setFilters((prev) => ({ ...prev, price_min: e.target.value }))}
            />

            {/* Price Max */}
            <Input
              type="number"
              placeholder="Max Price"
              value={filters.price_max}
              onChange={(e) => setFilters((prev) => ({ ...prev, price_max: e.target.value }))}
            />
          </div>

          {/* Filter Actions */}
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={resetFilters}>
              Reset Filters
            </Button>
            <Button onClick={() => fetchProducts()}>
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Products ({pagination.total})
            {loading && <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock Status</TableHead>
                <TableHead>Price Range</TableHead>
                <TableHead>Variations</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} className="hover:bg-gray-900">
                  <TableCell>
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {product.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {product.brand_logo && (
                        <img src={product.brand_logo} alt={product.brand_name} className="w-6 h-6 rounded" />
                      )}
                      <div>
                        <div className="font-medium">{product.brand_name}</div>
                        <div className="text-xs text-gray-500">{product.brand_code}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{product.category_name}</div>
                      <div className="text-sm text-gray-500">{product.subcategory_name}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {product.stock_info ? (
                      <div className="space-y-1">
                        {getStockBadge(product.stock_info.stock_status)}
                        <div className="text-xs text-gray-500">
                          Total: {product.stock_info.total_stock}
                        </div>
                      </div>
                    ) : (
                      <Badge variant="outline">No stock info</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.stock_info ? (
                      <div className="space-y-1">
                        <div className="font-medium">
                          {formatPrice(product.stock_info.min_price)} - {formatPrice(product.stock_info.max_price)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Avg: {formatPrice(product.stock_info.avg_price)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">No pricing</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {product.variations?.length || 0} variations
                      </Badge>
                      {product.stock_info && product.stock_info.out_of_stock_variations > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {product.stock_info.out_of_stock_variations} out
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex">
                      <Button size="sm" variant="outline"  onClick={() => router.push('/dashboard/products/all/view/' + product.id)}>
                        View Details
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {products.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              No products found. Try adjusting your filters.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} to{' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} products
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1 || loading}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <span className="text-sm px-3 py-1 bg-gray-100 rounded">
            Page {pagination.page} of {pagination.totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === pagination.totalPages || loading}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductsTable;