"use client"
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
import { Separator } from '@/components/ui/separator';
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
  Info,
  Barcode
} from 'lucide-react';
import { useBrandData } from '@/components/table/BrandTable/useBrandData';
import { useCategoryData } from '@/components/table/CategoryTable/useCategoryData';
import { SearchableDropdown } from '@/components/form/SearchableDropdown';
import { OrderFormData, PurchaseCart } from '@/components/pos/PurchaseCart';
import { AddToCartModal } from '@/components/pos/AddToCartModal';
import { toast } from 'sonner';
import { getStockBadge, ProductDetailsPopup, StockDetailsPopup } from '@/components/pos/ProductDetailsPopup';
import { ProductResponse,CartItem, Filters, ApiResponse } from '@/types/inventory';
import { formatCurrency } from '@/lib/utils/formatCurrency';

// Extended Filters interface to include barcode
interface ExtendedFilters extends Filters {
  barcode?: string;
}

const ProductsTable: React.FC = () => {
          const [popoverOpen, setPopoverOpen] = useState(false);

  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false
  });
  const [filters, setFilters] = useState<ExtendedFilters>({
    search: '',
    sort: 'name',
    order: 'asc',
    category_id: '',
    subcategory_id: '',
    brand_id: '',
    stock_status: 'ALL',
    include_inactive: false,
    low_stock_only: false,
    has_stock: false,
    min_stock: '',
    max_stock: '',
    branch_id: '', // Default branch
    barcode: '' // New barcode filter
  });

  const [selectedProduct, setSelectedProduct] = useState<ProductResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  const [orderFormData, setOrderFormData] = useState<OrderFormData>({
    supplier_id: '',
    order_date: new Date(),
    expected_date: undefined,
    status: 'PENDING',
    notes: ''
  });

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const barcodeDebounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Debounced search effect for general search
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

  // Debounced search effect for barcode
  useEffect(() => {
    if (barcodeDebounceTimeout.current) {
      clearTimeout(barcodeDebounceTimeout.current);
    }

    barcodeDebounceTimeout.current = setTimeout(() => {
      if (filters.barcode) {
        setPagination(prev => ({ ...prev, page: 1 }));
      }
      fetchProducts();
    }, 500);

    return () => {
      if (barcodeDebounceTimeout.current) {
        clearTimeout(barcodeDebounceTimeout.current);
      }
    };
  }, [filters.barcode]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sort: filters.sort,
        order: filters.order,
        include_inactive: filters.include_inactive.toString(),
        low_stock_only: filters.low_stock_only.toString(),
        branch_id: filters.branch_id,
        ...(filters.search && { search: filters.search }),
        ...(filters.barcode && { barcode: filters.barcode }),
        ...(filters.category_id && { category_id: filters.category_id }),
        ...(filters.subcategory_id && { subcategory_id: filters.subcategory_id }),
        ...(filters.brand_id && { brand_id: filters.brand_id }),
        ...(filters.stock_status !== 'ALL' && { stock_status: filters.stock_status }),
        ...(filters.has_stock && { has_stock: 'true' }),
        ...(filters.min_stock && { min_stock: filters.min_stock }),
        ...(filters.max_stock && { max_stock: filters.max_stock }),
      });

      const response = await fetch(`/api/products?${params}`);
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
    filters.brand_id,
    filters.stock_status,
    filters.low_stock_only,
    filters.has_stock,
    filters.min_stock,
    filters.max_stock
  ]);

  const handleAddToCart = (product: ProductResponse) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const handleConfirmAddToCart = (formData: { 
    quantity: number; 
    cost_price?: number; 
    wholesale_price?: number;
    retail_price?: number;
    batch_number?: string;
    expiry_date?: string;
    is_unique?: boolean;
  }) => {
    const product = selectedProduct;
    if (!product) return;

    const existingItem = cartItems.find(item => item.product.id === product.id);

    if (existingItem) {
      setCartItems(prev => prev.map(item =>
        item.product.id === product.id
          ? {
            ...item,
            quantity: item.quantity + formData.quantity,
            cost_price: formData.cost_price ?? item.cost_price,
            wholesale_price: formData.wholesale_price ?? item.wholesale_price,
            retail_price: formData.retail_price ?? item.retail_price,
            batch_number: formData.batch_number ?? item.batch_number,
            expiry_date: formData.expiry_date ?? item.expiry_date,
            is_unique: formData.is_unique?? item.is_unique,
            line_total: (item.quantity + formData.quantity) * (formData.cost_price ?? item.cost_price),
          }
          : item
      ));
      
      toast.success(`Updated ${product.name} quantity in cart`);
    } else {
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
        is_unique:formData.is_unique??product.current_prices?.is_unique,
        quantity: formData.quantity,
        cost_price: formData.cost_price ?? product.current_prices?.cost_price ?? 0,
        wholesale_price: formData.wholesale_price ?? product.current_prices?.wholesale_price ?? undefined,
        retail_price: formData.retail_price ?? product.current_prices?.retail_price ?? 0,
        batch_number: formData.batch_number,
        expiry_date: formData.expiry_date,
        line_total: formData.quantity * (formData.cost_price ?? product.current_prices?.cost_price ?? 0),
      };

      setCartItems(prev => [...prev, newItem]);
      toast.success(`Added ${product.name} to cart`);
    }

    setModalOpen(false);
    setSelectedProduct(null);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      sort: 'name',
      order: 'asc',
      category_id: '',
      subcategory_id: '',
      brand_id: '',
      stock_status: 'ALL',
      include_inactive: false,
      low_stock_only: false,
      has_stock: false,
      min_stock: '',
      max_stock: '',
      branch_id: '',
      barcode: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
    toast.success('Filters reset');
  };

  const handleRefresh = () => {
    fetchProducts();
    toast.success('Products refreshed');
  };

  // Brand and category data hooks
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
    name: brand.name
  }));

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Purchasing Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your product inventory and create purchase orders
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <PurchaseCart
            onAddToCart={handleConfirmAddToCart}
            cartItems={cartItems}
            setCartItems={setCartItems}
            orderFormData={orderFormData}
            setOrderFormData={setOrderFormData}
          />
        </div>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter Products
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
            >
              {filtersExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </CardHeader>
        {filtersExpanded && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search Input */}
              <div className="col-span-1 md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, model, or SKU..."
                    className="pl-10"
                    value={filters.search}
                    onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  />
                </div>
              </div>

              {/* Barcode Filter */}
              <div className="col-span-1 md:col-span-2">
                <div className="relative">
                  <Barcode className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by barcode..."
                    className="pl-10"
                    value={filters.barcode}
                    onChange={(e) => setFilters((prev) => ({ ...prev, barcode: e.target.value }))}
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
                value={filters.sort}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, sort: value as Filters['sort'] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="created_at">Created Date</SelectItem>
                  <SelectItem value="stock">Stock Level</SelectItem>
                  <SelectItem value="brand">Brand</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort Order */}
              <Select
                value={filters.order}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, order: value as Filters['order'] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>

              {/* Stock Status Filter */}
              <Select
                value={filters.stock_status}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, stock_status: value as Filters['stock_status'] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Stock Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Stock</SelectItem>
                  <SelectItem value="IN_STOCK">In Stock</SelectItem>
                  <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
                  <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                  <SelectItem value="NOT_STOCKED">Not Stocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator className="my-4" />

            {/* Filter Actions */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {pagination.total} product{pagination.total !== 1 ? 's' : ''} found
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetFilters} size="sm">
                  Reset Filters
                </Button>
                <Button onClick={handleRefresh} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
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
                  <TableHead>Brand</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock Status</TableHead>
                  <TableHead>Pricing</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
  {loading
    ? Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={`skeleton-${i}`} className="hover:bg-muted/50">
          {/* ... same skeleton structure as before */}
        </TableRow>
      ))
    : products.map((product) => {

        return (
          <TableRow key={product.id} className="hover:bg-muted/50">
            {/* Product Info */}
            <TableCell>
              <div className="max-w-xs">
                <div className="font-medium truncate">{product.name}</div>
                <div className="text-sm text-muted-foreground min-h-[1rem]">
                  {product.model ? `Model: ${product.model}` : ''}
                </div>
                <div className="text-sm text-muted-foreground truncate min-h-[1rem]">
                  {product.sku || 'No slug available'}
                </div>
              </div>
            </TableCell>

            {/* Brand */}
            <TableCell>
              <div className="flex items-center gap-2">
                {product.brand?.logo_url ? (
                  <img
                    src={product.brand.logo_url}
                    alt={product.brand.name}
                    width={24}
                    height={24}
                    className="w-6 h-6 rounded object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    —
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-medium truncate min-h-[1rem]">
                    {product.brand?.name || 'No Brand'}
                  </div>
                  <div className="text-xs text-muted-foreground min-h-[0.75rem]">
                    {product.brand?.code || ''}
                  </div>
                </div>
              </div>
            </TableCell>

            {/* Category */}
            <TableCell>
              <div>
                <div className="font-medium min-h-[1rem]">
                  {product.subcategory?.category?.name || 'No Category'}
                </div>
                <div className="text-sm text-muted-foreground min-h-[1rem]">
                  {product.subcategory?.name || 'No Subcategory'}
                </div>
              </div>
            </TableCell>

            {/* Stock */}
            <TableCell>
              <div className="space-y-2 min-h-[4rem]">
                {getStockBadge(product)}
                <div className="text-xs text-muted-foreground">
                  <div>Available: {product.total_available_stock}</div>
                  <div>Total: {product.total_system_stock}</div>
                </div>
              </div>
            </TableCell>

            {/* Pricing */}
            <TableCell>
              <div className="space-y-1 min-h-[4rem]">
                {product.latest_batch_pricing ? (
                  <>
                    <div className="text-sm">
                      <span className="text-green-600 font-medium">
                        Cost: {formatCurrency(product.latest_batch_pricing.cost_price)}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-purple-600">
                        Retail: {formatCurrency(product.latest_batch_pricing.retail_price)}
                      </span>
                    </div>
                    <div className="text-xs text-blue-600 min-h-[0.75rem]">
                      {product.latest_batch_pricing.wholesale_price
                        ? `Wholesale: ${formatCurrency(product.latest_batch_pricing.wholesale_price)}`
                        : ''}
                    </div>
                  </>
                ) : (
                  <span className="text-muted-foreground">No pricing</span>
                )}
              </div>
            </TableCell>

            {/* Status */}
            <TableCell>
              <Badge variant={product.is_active ? 'default' : 'secondary'}>
                {product.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>

            {/* Actions */}
            <TableCell>
              <div className="flex gap-1">
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-1 h-auto">
                      <Info className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  {popoverOpen && (
                    <PopoverContent className="w-80">
                      <div className="space-y-2">
                        <h4 className="font-semibold">Quick Info</h4>
                        <div className="text-sm space-y-1">
                          <p>
                            <span className="font-medium">Created:</span>{' '}
                            {new Date(product.created_at).toLocaleDateString()}
                          </p>
                          <p>
                            <span className="font-medium">Updated:</span>{' '}
                            {new Date(product.updated_at).toLocaleDateString()}
                          </p>
                          <p>
                            <span className="font-medium">Warranty:</span>{' '}
                            {product.warranty_period
                              ? `${product.warranty_period} months`
                              : 'None'}
                          </p>
                          <p>
                            <span className="font-medium">Barcodes:</span>{' '}
                            {product.barcodes.length}
                          </p>
                          <p>
                            <span className="font-medium">Specifications:</span>{' '}
                            {product.specifications.length}
                          </p>
                        </div>
                      </div>
                    </PopoverContent>
                  )}
                </Popover>

                <StockDetailsPopup product={product} />
                <ProductDetailsPopup product={product} />
              </div>
            </TableCell>

            {/* Add to Cart */}
            <TableCell>
              <div className="flex gap-2">
                {orderFormData.supplier_id ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddToCart(product)}
                    disabled={!product.is_active}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled
                    title="Create a purchase order first"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        );
      })}
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

      {/* Add to Cart Modal */}
      {selectedProduct && (
        <AddToCartModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedProduct(null);
          }}
          product={selectedProduct}
          orderStatus={orderFormData.status}
          onConfirm={handleConfirmAddToCart}
        />
      )}
    </div>
  );
};

export default ProductsTable;