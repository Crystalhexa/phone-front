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
  TrendingDown,
  AlertTriangle,
  Plus
} from 'lucide-react';
import { useBrandData } from '@/components/table/BrandTable/useBrandData';
import { useCategoryData } from '@/components/table/CategoryTable/useCategoryData';
import { SearchableDropdown } from '@/components/form/SearchableDropdown';
import { PurchaseCart } from '@/components/pos/PurchaseCart';

// Updated types to match backend response structure
interface Brand {
  id: string;
  name: string;
  code: string;
  logo_url?: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface Subcategory {
  id: string;
  name: string;
  category: Category;
}

interface Stock {
  total_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  low_stock_threshold: number;
  reorder_quantity: number;
  last_restock_date?: string;
  last_sale_date?: string;
  is_low_stock: boolean;
  batches?: any[];
}

interface Pricing {
  id: string;
  unit_price: number;
  currency: string;
  is_active: boolean;
  effective_from: string;
  effective_to?: string;
}

interface ProductResponse {
  id: string;
  name: string;
  model?: string;
  description: string;
  sku?: string;
  warranty_period?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  brand: Brand | null;
  subcategory: Subcategory | null;
  specifications: any[];
  barcodes: any[];
  stock: Stock | null;
  pricing: Pricing | null;
}

interface ApiResponse {
  success: boolean;
  data: {
    products: ProductResponse[];
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
  include_stock: boolean;
  low_stock_only: boolean;
}

interface CartItem {
  id: string;
  product: {
    id: string;
    name: string;
    model?: string;
    sku?: string;
    brand?: {
      name: string;
      code: string;
    };
  };
  quantity: number;
  cost_price: number;
  wholesale_price?: number;
  retail_price: number;
  line_total: number;
  batch_number?: string;
  expiry_date?: string;
}

const ProductsTable: React.FC = () => {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
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
    include_stock: true,
    low_stock_only: false
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        include_stock: filters.include_stock.toString(),
        stock_filter: filters.stock_filter,
        low_stock_only: filters.low_stock_only.toString(),
        branch_id: 'cmd7qdjga000fhjeu18ubhpnf',
        ...(filters.search && { search: filters.search }),
        ...(filters.category_id && { category_id: filters.category_id }),
        ...(filters.subcategory_id && { subcategory_id: filters.subcategory_id }),
        ...(filters.brand_id && { brand_id: filters.brand_id }),
      });

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

  const getStockStatus = (product: ProductResponse): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' => {
    if (!product.stock) return 'OUT_OF_STOCK';
    if (product.stock.available_quantity === 0) return 'OUT_OF_STOCK';
    if (product.stock.is_low_stock) return 'LOW_STOCK';
    return 'IN_STOCK';
  };

  const getStockBadge = (product: ProductResponse) => {
    const status = getStockStatus(product);
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

  const addToCart = (product: ProductResponse) => {
    const existingItem = cartItems.find(item => item.product.id === product.id);
    
    if (existingItem) {
      // Update quantity if item already exists
      setCartItems(prev => prev.map(item => 
        item.product.id === product.id 
          ? { 
              ...item, 
              quantity: item.quantity + 1,
              line_total: (item.quantity + 1) * item.cost_price
            }
          : item
      ));
    } else {
      // Add new item to cart
      const newItem: CartItem = {
        id: `${product.id}-${Date.now()}`,
        product: {
          id: product.id,
          name: product.name,
          model: product.model,
          sku: product.sku,
          brand: product.brand ? {
            name: product.brand.name,
            code: product.brand.code
          } : undefined
        },
        quantity: 1,
        cost_price: product.pricing?.unit_price || 0,
        wholesale_price: undefined,
        retail_price: product.pricing?.unit_price || 0,
        line_total: product.pricing?.unit_price || 0,
        batch_number: undefined,
        expiry_date: undefined
      };
      
      setCartItems(prev => [...prev, newItem]);
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
      include_stock: true,
      low_stock_only: false
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

  const categoryOptions = categories
    .filter((cat) => typeof cat.id === 'string' && typeof cat.name === 'string')
    .map(cat => ({
      id: cat.id as string,
      name: cat.name as string,
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
          <PurchaseCart 
            onAddToCart={addToCart}
            cartItems={cartItems}
            setCartItems={setCartItems}
          />
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

            {/* Category Filter */}
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

            {/* Subcategory Filter */}
            <SearchableDropdown
              value={filters.subcategory_id}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, subcategory_id: value }))}
              placeholder="Select Subcategory"
              searchPlaceholder="Search subcategories..."
              options={subcategoryOptions}
              disabled={!filters.category_id}
              emptyMessage="No subcategories found"
            />

            {/* Brand Filter */}
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

            {/* Low Stock Only Toggle */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="low_stock_only"
                checked={filters.low_stock_only}
                onChange={(e) => setFilters((prev) => ({ ...prev, low_stock_only: e.target.checked }))}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="low_stock_only" className="text-sm font-medium text-gray-700">
                Show only low stock items
              </label>
            </div>
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
                <TableHead>Price</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div>
                      <div className="font-medium">{product.name}</div>
                      {product.model && (
                        <div className="text-sm text-gray-500">Model: {product.model}</div>
                      )}
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {product.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {product.brand?.logo_url && (
                        <img src={product.brand.logo_url} alt={product.brand.name} className="w-6 h-6 rounded" />
                      )}
                      <div>
                        <div className="font-medium">{product.brand?.name || 'No Brand'}</div>
                        <div className="text-xs text-gray-500">{product.brand?.code || ''}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{product.subcategory?.category?.name || 'No Category'}</div>
                      <div className="text-sm text-gray-500">{product.subcategory?.name || 'No Subcategory'}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      {getStockBadge(product)}
                      {product.stock && (
                        <div className="text-xs text-gray-500">
                          Available: {product.stock.available_quantity} / {product.stock.total_quantity}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {product.pricing ? (
                      <div className="space-y-1">
                        <div className="font-medium">
                          {formatPrice(product.pricing.unit_price)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {product.pricing.currency}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">No pricing</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-mono">
                      {product.sku || 'No SKU'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.is_active ? "default" : "secondary"}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => addToCart(product)}
                        disabled={product.pricing}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add to Cart
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => router.push('/dashboard/products/all/view/' + product.id)}>
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