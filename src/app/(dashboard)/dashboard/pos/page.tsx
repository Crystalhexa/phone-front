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
import { Separator } from '@/components/ui/separator';
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
  TrendingDown,
  AlertTriangle,
  Plus,
  Filter,
  RefreshCw,
  Eye,
  ShoppingCart,
  Info,
  Warehouse,
  Building2,
  Calendar,
  Barcode,
  FileText,
  DollarSign,
  Settings,
  Hash,
  Layers
} from 'lucide-react';
import { useBrandData } from '@/components/table/BrandTable/useBrandData';
import { useCategoryData } from '@/components/table/CategoryTable/useCategoryData';
import { SearchableDropdown } from '@/components/form/SearchableDropdown';
import { OrderFormData, PurchaseCart } from '@/components/pos/PurchaseCart';
import { AddToCartModal } from '@/components/pos/AddToCartModal';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import ProductBatchDetailsPopover from '@/components/pos/ProductDetailsPopover';
import { useAuth } from '@/hooks/useAuth';
import SalesCart from '@/components/pos/SalesCart';

interface CurrentPrices {
  cost_price: number;
  wholesale_price: number | null;
  retail_price: number;
  last_updated: string;
}

interface BranchStock {
  branch_id: string;
  branch_name: string;
  branch_code: string;
  total_quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number;
  stock_status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NOT_STOCKED';
  average_cost_price: number | null;
  last_restock_date: string | null;
  last_sale_date: string | null;
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
  sku: string;
  warranty_period: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  current_prices: CurrentPrices | null;
  branch_stock: BranchStock[];
  total_system_stock: number;
  total_available_stock: number;
  overall_stock_status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NOT_STOCKED';
  barcodes: Barcode[];
  specifications: Specification[];
  availableQuantity: number;
  reservedQuantity: number;
  category: string;
  subcategory: string;
  brand?: string;
  code: string;
  costPrice: number;
  retailPrice: number;
  wholesalePrice: number;
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
  low_stock_only: boolean;
  has_stock: boolean;
  min_stock: string;
  max_stock: string;
  branch_id: string;
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

const QuickInfoPopover = ({ product }: any) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="ghost" size="sm" className="p-1 h-auto">
        <Info className="w-4 h-4" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-80" side="left" align="start">
      <div className="space-y-4">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Info className="w-4 h-4" />
          Quick Info
        </h4>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium min-w-0">Created:</span>
            <span className="text-muted-foreground">
              {new Date(product.created_at).toLocaleDateString()}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium min-w-0">Updated:</span>
            <span className="text-muted-foreground">
              {new Date(product.updated_at).toLocaleDateString()}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Settings className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium min-w-0">Warranty:</span>
            <span className="text-muted-foreground">
              {product.warrantyPeriod ? `${product.warrantyPeriod} months` : 'None'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Barcode className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium min-w-0">Barcodes:</span>
            <span className="text-muted-foreground">
              {product.barcodes?.length || 0}
            </span>
          </div>

          <div className="flex items-start gap-2 text-sm">
            <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="font-medium block">SKU:</span>
              <span className="text-xs font-mono bg-muted px-2 py-1 rounded mt-1 block break-all">
                {product.sku}
              </span>
            </div>
          </div>
        </div>
      </div>
    </PopoverContent>
  </Popover>
);
// Main Products Table Component
const ProductsTable: React.FC = () => {
  const { user, logout } = useAuth();

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
  const [filters, setFilters] = useState<Filters>({
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
    branch_id: '' // Default branch
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
        low_stock_only: filters.low_stock_only.toString(),
        branch_id: filters.branch_id,
        ...(filters.search && { search: filters.search }),
        ...(filters.category_id && { category_id: filters.category_id }),
        ...(filters.subcategory_id && { subcategory_id: filters.subcategory_id }),
        ...(filters.brand_id && { brand_id: filters.brand_id }),
        ...(filters.stock_status !== 'ALL' && { stock_status: filters.stock_status }),
        ...(filters.has_stock && { has_stock: 'true' }),
        ...(filters.min_stock && { min_stock: filters.min_stock }),
        ...(filters.max_stock && { max_stock: filters.max_stock }),
      });
      const response = await fetch(`/api/products/branch?${params}&branchId=${user?.branch_id}&includeBatches=true`)
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

  const getStockBadge = (product: any) => {
    const available = product.availableQuantity || 0;

    if (available === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (available <= 5) {
      return <Badge variant="secondary">Low Stock</Badge>;
    } else {
      return <Badge variant="default">In Stock</Badge>;
    }
  };

  const handleAddToCart = (product: ProductResponse) => {
    if (!orderFormData.supplier_id) {
      toast.error("🚫 Please create a purchase order first!", {
        position: "top-right",
        description: "You need to create a purchase order before adding products to cart."
      });
      return;
    }

    if (product.overall_stock_status === 'OUT_OF_STOCK') {
      toast.warning("⚠️ This product is out of stock!", {
        position: "top-right",
        description: "Consider checking stock levels before ordering."
      });
    }

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
            name: product.brand,
            code: product.brand
          } : undefined
        },
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
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
      branch_id: 'cmd7qdjga000fhjeu18ubhpnf'
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
    name: brand.name,
    code: brand.code,
  }));

  const router = useRouter();

  // Calculate cart summary
  const cartSummary = {
    itemCount: cartItems.length,
    totalQuantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    totalValue: cartItems.reduce((sum, item) => sum + item.line_total, 0)
  };

  return (
    <div className="container mx-auto p-6 space-y-3">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="mb-0 space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-amber-50">
            Point of Sale
          </h1>
          <p className="text-lg text-muted-foreground">
            Welcome to <span className="font-semibold">Kandy Radio Engineering</span>
          </p>
          <p className="text-base text-muted-foreground">
            Branch: <span className="font-medium">{user?.branch_name ?? "—"}</span>
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <SalesCart
            onAddToCart={handleConfirmAddToCart}
            cartItems={cartItems}
            setCartItems={setCartItems}
            orderFormData={orderFormData}
            setOrderFormData={setOrderFormData}
          />
          
        </div>
      </div>

      {/* Cart Summary Bar */}
      {cartItems.length > 0 && (
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <ShoppingCart className="w-5 h-5 text-blue-500" />
                <div className="flex gap-6 text-sm">
                  <span className="font-medium">
                    {cartSummary.itemCount} item{cartSummary.itemCount !== 1 ? 's' : ''} in cart
                  </span>
                  <span className="text-muted-foreground">
                    Total Qty: {cartSummary.totalQuantity}
                  </span>
                  <span className="text-muted-foreground">
                    Total Value: {formatPrice(cartSummary.totalValue)}
                  </span>
                </div>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                Order Status: {orderFormData.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

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
            </div>

            {/* Filter Checkboxes */}


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
                        <div className="text-sm text-muted-foreground truncate">
                          {product.description || 'No description'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{product?.brand || 'No Brand'}</div>
                          <div className="text-xs text-muted-foreground">{product?.code || ''}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.category || 'No Category'}</div>
                        <div className="text-sm text-muted-foreground">{product.subcategory || 'No Subcategory'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        {getStockBadge(product)}
                        <div className="text-xs text-gray-500">
                          <div>Available: {product.availableQuantity || 0}</div>
                          <div>Reserved: {product.reservedQuantity || 0}</div>
                          <div>Total: {(product.availableQuantity || 0) + (product.reservedQuantity || 0)}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.costPrice || product.retailPrice ? (
                        <div className="space-y-1">
                          
                          <div className="text-sm">
                            <span className="text-purple-600">Retail: {formatPrice(product.retailPrice)}</span>
                          </div>
                          {product.wholesalePrice && (
                            <div className="text-xs text-green-600">
                              Wholesale: {formatPrice(product.wholesalePrice)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">No pricing</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <QuickInfoPopover product={product} />
                        <ProductBatchDetailsPopover product={product} />
                      </div>
                    </TableCell>
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

      {/* Add to Cart Modal */}
      {/* {selectedProduct && (
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
      )} */}
    </div>
  );
};

export default ProductsTable;