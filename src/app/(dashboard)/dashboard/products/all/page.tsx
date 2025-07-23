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
  DollarSign
} from 'lucide-react';
import { useBrandData } from '@/components/table/BrandTable/useBrandData';
import { useCategoryData } from '@/components/table/CategoryTable/useCategoryData';
import { SearchableDropdown } from '@/components/form/SearchableDropdown';
import { OrderFormData, PurchaseCart } from '@/components/pos/PurchaseCart';
import { AddToCartModal } from '@/components/pos/AddToCartModal';
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
  brand: Brand | null;
  subcategory: Subcategory | null;
  current_prices: CurrentPrices | null;
  branch_stock: BranchStock[];
  total_system_stock: number;
  total_available_stock: number;
  overall_stock_status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NOT_STOCKED';
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


// Stock Details Popup Component
const StockDetailsPopup: React.FC<{ product: ProductResponse }> = ({ product }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="p-1 h-auto">
          <Info className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-2xl sm:max-w-3xl rounded-2xl p-0">
        <div className="max-h-[85vh] overflow-y-auto px-6 py-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Warehouse className="w-5 h-5" />
              Stock Details - {product.name}
            </DialogTitle>
            <DialogDescription>
              View detailed stock information across all branches
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Overall Stock Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">Total Stock</span>
                  </div>
                  <p className="text-2xl font-bold">{product.total_system_stock}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">Available</span>
                  </div>
                  <p className="text-2xl font-bold">{product.total_available_stock}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium">Reserved</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {product.total_system_stock - product.total_available_stock}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium">Status</span>
                  </div>
                  <Badge variant={
                    product.overall_stock_status === 'IN_STOCK' ? 'default' :
                    product.overall_stock_status === 'LOW_STOCK' ? 'destructive' : 'secondary'
                  }>
                    {product.overall_stock_status.replace('_', ' ')}
                  </Badge>
                </CardContent>
              </Card>
            </div>

            {/* Branch Stock Details */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Branch Stock Details
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Branch</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Reserved</TableHead>
                      <TableHead>Threshold</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Avg Cost</TableHead>
                      <TableHead>Last Restock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.branch_stock.map((stock) => (
                      <TableRow key={stock.branch_id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{stock.branch_name}</div>
                            <div className="text-sm text-muted-foreground">{stock.branch_code}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{stock.total_quantity}</TableCell>
                        <TableCell className="font-mono">{stock.available_quantity}</TableCell>
                        <TableCell className="font-mono">{stock.reserved_quantity}</TableCell>
                        <TableCell className="font-mono">{stock.low_stock_threshold}</TableCell>
                        <TableCell>
                          <Badge variant={
                            stock.stock_status === 'IN_STOCK' ? 'default' :
                            stock.stock_status === 'LOW_STOCK' ? 'destructive' : 'secondary'
                          }>
                            {stock.stock_status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {stock.average_cost_price ? `$${stock.average_cost_price.toFixed(2)}` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {stock.last_restock_date ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span className="text-sm">
                                {new Date(stock.last_restock_date).toLocaleDateString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Never</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
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

            {/* Pricing Information */}
            {product.current_prices && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Pricing Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Cost Price</label>
                      <p className="text-lg font-bold text-green-600">
                        ${product.current_prices.cost_price.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Wholesale Price</label>
                      <p className="text-lg font-bold text-blue-600">
                        {product.current_prices.wholesale_price ? 
                          `$${product.current_prices.wholesale_price.toFixed(2)}` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Retail Price</label>
                      <p className="text-lg font-bold text-purple-600">
                        ${product.current_prices.retail_price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                    <p className="text-sm flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(product.current_prices.last_updated).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

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

  const getStockBadge = (product: ProductResponse) => {
    switch (product.overall_stock_status) {
      case 'IN_STOCK':
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <Package className="w-3 h-3 mr-1" />
            In Stock
          </Badge>
        );
      case 'LOW_STOCK':
        return (
          <Badge variant="destructive" className="bg-yellow-500 hover:bg-yellow-600">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Low Stock
          </Badge>
        );
      case 'OUT_OF_STOCK':
        return (
          <Badge variant="secondary" className="bg-red-500 hover:bg-red-600 text-white">
            <TrendingDown className="w-3 h-3 mr-1" />
            Out of Stock
          </Badge>
        );
      case 'NOT_STOCKED':
        return (
          <Badge variant="outline">
            Not Stocked
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
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
            name: product.brand.name,
            code: product.brand.code
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Products Management</h1>
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
          <Button onClick={() => router.push('/dashboard/products/all/register')} className="bg-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
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

              {/* Stock Range Filters */}
              <div className="flex gap-2">
                <Input
                  placeholder="Min Stock"
                  value={filters.min_stock}
                  onChange={(e) => setFilters((prev) => ({ ...prev, min_stock: e.target.value }))}
                  type="number"
                  min="0"
                />
                <Input
                  placeholder="Max Stock"
                  value={filters.max_stock}
                  onChange={(e) => setFilters((prev) => ({ ...prev, max_stock: e.target.value }))}
                  type="number"
                  min="0"
                />
              </div>
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
                      </div>
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
                      <div className="space-y-2">
                        {getStockBadge(product)}
                        <div className="text-xs text-muted-foreground">
                          <div>Available: {product.total_available_stock}</div>
                          <div>Total: {product.total_system_stock}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.current_prices ? (
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="text-green-600 font-medium">Cost: {formatPrice(product.current_prices.cost_price)}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-purple-600">Retail: {formatPrice(product.current_prices.retail_price)}</span>
                          </div>
                          {product.current_prices.wholesale_price && (
                            <div className="text-xs text-blue-600">
                              Wholesale: {formatPrice(product.current_prices.wholesale_price)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No pricing</span>
                      )}
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
                        <StockDetailsPopup product={product} />
                        <ProductDetailsPopup product={product} />
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