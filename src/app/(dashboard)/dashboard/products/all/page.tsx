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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Package,
  Plus,
  Filter,
  RefreshCw,
  Eye,
  Info,
  Barcode,
  FileText,
} from 'lucide-react';
import { useBrandData } from '@/components/table/BrandTable/useBrandData';
import { useCategoryData } from '@/components/table/CategoryTable/useCategoryData';
import { SearchableDropdown } from '@/components/form/SearchableDropdown';
import { toast } from 'sonner';

// Updated types to match API response structure
interface Brand {
  id: string;
  name: string;
  code: string;
  logo_url: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface Subcategory {
  id: string;
  name: string;
  category: Category;
}

interface Barcode {
  code: string;
  type: string;
  is_active: boolean;
}

interface Specification {
  spec_name: string;
  spec_value: string;
  spec_unit: string | null;
}

export interface ProductResponse {
  id: string;
  name: string;
  model: string;
  description: string | null;
  product_code: string| null;
  sku: string;
  warranty_period: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  brand: Brand | null;
  subcategory: Subcategory | null;
  barcodes: Barcode[];
  specifications: Specification[];
}

interface ApiResponse {
  success: boolean;
  data: {
    products: ProductResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
    summary: {
      returned_count: number;
      total_count: number;
      filters_applied: any;
    };
  };
  message?: string;
  timestamp: string;
}

interface Filters {
  search: string;
  sort: 'name' | 'created_at' | 'stock' | 'brand' | 'category';
  order: 'asc' | 'desc';
  category_id: string;
  subcategory_id: string;
  brand_id: string;
  stock_status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NOT_STOCKED' | 'ALL';
  include_inactive: boolean;
}

// Product Details Popup Component
const ProductDetailsPopup: React.FC<{ product: ProductResponse }> = ({ product }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="p-1 h-auto">
          <FileText className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-2xl sm:max-w-3xl rounded-2xl p-0">
        <div className="max-h-[85vh] overflow-y-auto px-6 py-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Package className="w-5 h-5" />
              Product Details - {product.name}
            </DialogTitle>
            <DialogDescription>
              View complete product information and specifications
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="font-medium">{product.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Model</label>
                    <p className="font-medium">{product.model || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">SKU</label>
                    <p className="font-mono text-sm">{product.sku}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-sm">{product.description || 'No description available'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Warranty Period</label>
                    <p className="text-sm">{product.warranty_period ? `${product.warranty_period} months` : 'No warranty'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Brand & Category</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Brand</label>
                    <div className="flex items-center gap-2">
                      {product.brand?.logo_url && (
                        <img
                          src={product.brand.logo_url}
                          alt={product.brand.name}
                          className="w-6 h-6 rounded object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium">{product.brand?.name || 'No Brand'}</p>
                        <p className="text-sm text-muted-foreground">{product.brand?.code || ''}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Category</label>
                    <p className="font-medium">{product.subcategory?.category?.name || 'No Category'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Subcategory</label>
                    <p className="font-medium">{product.subcategory?.name || 'No Subcategory'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <Badge variant={product.is_active ? "default" : "secondary"}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Barcodes */}
            {product.barcodes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Barcode className="w-5 h-5" />
                    Barcodes ({product.barcodes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {product.barcodes.map((barcode, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="font-mono text-sm">{barcode.code}</p>
                          <p className="text-xs text-muted-foreground">{barcode.type}</p>
                        </div>
                        <Badge variant={barcode.is_active ? "default" : "secondary"}>
                          {barcode.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Specifications */}
            {product.specifications.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Specifications ({product.specifications.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {product.specifications.map((spec, index) => (
                      <div key={index} className="p-2 border rounded">
                        <p className="font-medium text-sm">{spec.spec_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {spec.spec_value} {spec.spec_unit && `(${spec.spec_unit})`}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main Products Table Component
const ProductsTable: React.FC = () => {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false
  });
  const [filters, setFilters] = useState<Filters>({
    search: '',
    sort: 'name',
    order: 'asc',
    category_id: '',
    subcategory_id: '',
    brand_id: '',
    stock_status: 'ALL',
    include_inactive: false
  });

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Debounced search effect
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      if (filters.search) {
        setPagination(prev => ({ ...prev, page: 1 }));
      }
      fetchProducts();
    }, 500);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [filters.search]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sort: filters.sort,
        order: filters.order,
        include_inactive: filters.include_inactive.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.category_id && { category_id: filters.category_id }),
        ...(filters.subcategory_id && { subcategory_id: filters.subcategory_id }),
        ...(filters.brand_id && { brand_id: filters.brand_id }),
        ...(filters.stock_status !== 'ALL' && { stock_status: filters.stock_status })
      });

      const response = await fetch(`/api/products/all/?${params}`);
      const data: ApiResponse = await response.json();

      if (data.success) {
        setProducts(data.data.products);
        setPagination(prev => ({
          ...prev,
          total: data.data.pagination.total,
          total_pages: data.data.pagination.total_pages,
          has_next: data.data.pagination.has_next,
          has_prev: data.data.pagination.has_prev
        }));
      } else {
        toast.error('Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error fetching products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch products when pagination or non-search filters change
  useEffect(() => {
    fetchProducts();
  }, [
    pagination.page,
    pagination.limit,
    filters.sort,
    filters.order,
    filters.category_id,
    filters.subcategory_id,
    filters.brand_id
  ]);

  const resetFilters = () => {
    setFilters({
      search: '',
      sort: 'name',
      order: 'asc',
      category_id: '',
      subcategory_id: '',
      brand_id: '',
      stock_status: 'ALL',
      include_inactive: false
    });
    setPagination(prev => ({ ...prev, page: 1 }));
    toast.success('Filters reset');
  };

  const handleRefresh = () => {
    fetchProducts();
    toast.success('Products refreshed');
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
  }));

  const router = useRouter();
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Products Management</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => router.push('/dashboard/products/all/register')} className="bg-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="w-4 h-4" />
              Filters
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {pagination.total} items
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className="h-7 px-2"
              >
                {filtersExpanded ? 'Hide' : 'Show'}
              </Button>
            </div>
          </div>
        </CardHeader>

        {filtersExpanded && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Compact Search */}
              <div className="col-span-2 md:col-span-3 lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-3 w-3 text-gray-400" />
                  <Input
                    placeholder="Search products..."
                    className="pl-7 h-8 text-sm"
                    value={filters.search}
                    onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  />
                </div>
              </div>

              {/* Compact Dropdowns */}
              <SearchableDropdown
                value={filters.category_id}
                onValueChange={(value) => {
                  setFilters((prev) => ({ ...prev, category_id: value, subcategory_id: '' }));
                }}
                placeholder="Category"
                searchPlaceholder="Search..."
                options={categoryOptions}
                emptyMessage="No categories"
                onSearch={handleCategorySearch}
                searchTerm={categorySearchTerm}
              />

              <SearchableDropdown
                value={filters.subcategory_id}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, subcategory_id: value }))}
                placeholder="Subcategory"
                searchPlaceholder="Search..."
                options={subcategoryOptions}
                disabled={!filters.category_id}
                emptyMessage="No subcategories"
              />

              <SearchableDropdown
                value={filters.brand_id}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, brand_id: value }))}
                placeholder="Brand"
                searchPlaceholder="Search..."
                options={brandOptions}
                emptyMessage="No brands"
                onSearch={handleBrandSearch}
                searchTerm={brandSearchTerm}
              />
            </div>

            {/* Compact Actions Row */}
            <div className="flex justify-between items-center mt-3 pt-3 border-t">
              <Select
                value={filters.order}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, order: value as Filters['order'] }))}
              >
                <SelectTrigger className="w-24 h-7 text-xs">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">A-Z</SelectItem>
                  <SelectItem value="desc">Z-A</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-1">
                <Button variant="outline" onClick={resetFilters} size="sm" className="h-7 px-2 text-xs">
                  Reset
                </Button>
                <Button onClick={handleRefresh} variant="outline" size="sm" className="h-7 px-2 text-xs">
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Products ({pagination.total})</span>
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                Loading...
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="max-w-xs">
                        <div className="font-medium truncate">{product.name}</div>
                        {product.model && (
                          <div className="text-sm text-muted-foreground">Model: {product.model}</div>
                        )}
                         {product.sku && (
                          <div className="text-sm text-muted-foreground">SKU: {product.sku}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                          <div className="font-medium">{product?.product_code}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {product.brand?.logo_url && (
                          <img
                            src={product.brand.logo_url}
                            alt={product.brand.name}
                            className="w-6 h-6 rounded object-cover"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="font-medium truncate">{product.brand?.name || 'No Brand'}</div>
                          <div className="text-xs text-muted-foreground">{product.brand?.code || ''}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.subcategory?.category?.name || 'No Category'}</div>
                        <div className="text-sm text-muted-foreground">{product.subcategory?.name || 'No Subcategory'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_active ? "default" : "secondary"}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="p-1 h-auto">
                              <Info className="w-4 h-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-2">
                              <h4 className="font-semibold">Quick Info</h4>
                              <div className="text-sm space-y-1">
                                <p><span className="font-medium">Created:</span> {new Date(product.created_at).toLocaleDateString()}</p>
                                <p><span className="font-medium">Updated:</span> {new Date(product.updated_at).toLocaleDateString()}</p>
                                <p><span className="font-medium">Warranty:</span> {product.warranty_period ? `${product.warranty_period} months` : 'None'}</p>
                                <p><span className="font-medium">Barcodes:</span> {product.barcodes.length}</p>
                                <p><span className="font-medium">Specifications:</span> {product.specifications.length}</p>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <ProductDetailsPopup product={product} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push('/dashboard/products/all/view/' + product.id)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {products.length === 0 && !loading && (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium">No products found</p>
              <p className="text-sm">Try adjusting your filters or search terms.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} products
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={!pagination.has_prev || loading}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            <span className="text-sm px-3 py-1 bg-muted rounded">
              Page {pagination.page} of {pagination.total_pages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={!pagination.has_next || loading}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsTable;