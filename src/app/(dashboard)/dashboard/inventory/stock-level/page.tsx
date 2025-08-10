"use client"
import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  History,
  Filter,
  Download,
  Search,
  Calendar,
  Package,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  Eye,
  FileText,
  RefreshCw,
  Edit,
} from 'lucide-react';
import { toast } from 'sonner';
import { SearchableDropdown } from '@/components/form/SearchableDropdown';
import { useBranchData } from '@/components/table/BranchTable/useBranchData';
import { useCategoryData } from '@/components/table/CategoryTable/useCategoryData';

interface StockLevel {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  branch_id: string;
  branch_name: string;
  total_quantity: string | number; // API might return string
  reserved_quantity: string | number; // API might return string
  available_quantity: string | number; // API might return string
  low_stock_threshold: string | number; // API might return string
  reorder_quantity: string | number; // API might return string
  average_cost_price: string | number; // API might return string
  last_restock_date?: string;
  last_sale_date?: string;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
  stock_status: 'GOOD' | 'LOW' | 'OUT' | 'CRITICAL';
  brand_name?: string;
  category_name?: string;
  batches_count?: string | number; // API miht return string
  expiring_batches_count?: string | number; // API might return string
}

interface StockLevelsFilters {
  search: string;
  branch_id: string;
  stock_status: string;
  category: string;
  low_stock_only: boolean;
}

const StockLevelsComponent: React.FC = () => {
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<StockLevel | null>(null);
  const [adjustmentDialog, setAdjustmentDialog] = useState<{
    open: boolean;
    product?: StockLevel;
  }>({ open: false });
  const [error, setError] = useState<string | null>(null);

  const {
    data: branchOptions,
    isLoading: isSearching,
    handleSearch: handleBranchSearch,
    searchTerm,
    handlePageSizeChange,
  } = useBranchData();
  const {
    data: category,
    handleSearch: handleCategorySearch,
    searchTerm: categorySearchTerm,
  } = useCategoryData();

  const categories = category?.data?.categories || [];
  const categoryOptions = categories
    .filter((cat) => typeof cat.id === 'string' && typeof cat.name === 'string')
    .map(cat => ({
      id: cat.id as string,
      name: cat.name as string,
      description: cat.description
    }));
  const [filters, setFilters] = useState<StockLevelsFilters>({
    search: '',
    branch_id: '',
    stock_status: '',
    category: '',
    low_stock_only: false,
  });

  const fetchStockLevels = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
      });

      // Only add non-empty filter values
      if (filters.search && filters.search.trim()) {
        params.append('search', filters.search.trim());
      }
      if (filters.branch_id && filters.branch_id.trim()) {
        params.append('branch_id', filters.branch_id.trim());
      }
      if (filters.stock_status && filters.stock_status.trim()) {
        params.append('stock_status', filters.stock_status.trim());
      }
      if (filters.category && filters.category.trim()) {
        params.append('category', filters.category.trim());
      }
      if (filters.low_stock_only) {
        params.append('low_stock_only', 'true');
      }

      console.log('Fetching stock levels with params:', params.toString());

      const response = await fetch(`/api/inventory/stock-levels?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('API Response:', result);

      if (result.success) {
        // Ensure we always have an array
        const stockData = Array.isArray(result.data) ? result.data : [];
        console.log('Stock Data:', result.data);
        setStockLevels(stockData);

        // Set pagination info
        if (result.metadata?.pagination) {
          setTotalPages(result.metadata.pagination.total_pages || 1);
          setTotalItems(result.metadata.pagination.total_items || 0);
        } else {
          setTotalPages(1);
          setTotalItems(stockData.length);
        }
      } else {
        console.error('API returned error:', result);
        setError(result.message || 'Failed to fetch stock levels');
        setStockLevels([]);
        toast.error(result.message || 'Failed to fetch stock levels');
      }
    } catch (error: any) {
      console.error('Error fetching stock levels:', error);
      setError(error.message || 'Error loading stock levels');
      setStockLevels([]);
      toast.error('Error loading stock levels: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockLevels();
  }, [currentPage]); // Only trigger on page change

  // Separate effect for filters to debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage === 1) {
        fetchStockLevels();
      } else {
        setCurrentPage(1); // This will trigger the above effect
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [filters]);

  const getStockStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      GOOD: 'bg-green-100 text-green-800',
      LOW: 'bg-yellow-100 text-yellow-800',
      CRITICAL: 'bg-orange-100 text-orange-800',
      OUT: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (typeof numAmount !== 'number' || isNaN(numAmount)) {
      return 'LKR 0.00';
    }
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR'
    }).format(numAmount);
  };

  const formatNumber = (value: string | number) => {
    const num = typeof value === 'string' ? parseInt(value) : value;
    return isNaN(num) ? 0 : num.toLocaleString();
  };

  const parseNumber = (value: string | number): number => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? 0 : num;
  };

  // Ensure stockLevels is always an array for calculations
  const stockArray = Array.isArray(stockLevels) ? stockLevels : [];

  const stockSummary = {
    total_products: stockArray.length,
    low_stock: stockArray.filter(item => item?.is_low_stock).length,
    out_of_stock: stockArray.filter(item => item?.is_out_of_stock).length,
    total_value: stockArray.reduce((sum, item) => {
      if (!item) return sum;
      const qty = parseNumber(item.total_quantity);
      const cost = parseNumber(item.average_cost_price);
      return sum + (qty * cost);
    }, 0),
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        export: 'true',
        ...(filters.search && { search: filters.search }),
        ...(filters.branch_id && { branch_id: filters.branch_id }),
        ...(filters.stock_status && { stock_status: filters.stock_status }),
        ...(filters.category && { category: filters.category }),
        ...(filters.low_stock_only && { low_stock_only: 'true' }),
      });

      const response = await fetch(`/api/inventory/stock-levels?${params}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stock-levels-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Stock levels exported successfully');
      } else {
        toast.error('Failed to export stock levels');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Error exporting stock levels');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Levels</h1>
          <p className="text-muted-foreground">
            Monitor current inventory levels across all branches
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={fetchStockLevels} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <TrendingDown className="w-4 h-4" />
              <span className="font-medium">Error loading stock levels:</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stockSummary.total_products}</div>
            <p className="text-xs text-muted-foreground">
              {totalItems > stockSummary.total_products && `${totalItems} total across all pages`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <TrendingDown className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stockSummary.low_stock}</div>
            <p className="text-xs text-muted-foreground">
              On current page
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stockSummary.out_of_stock}</div>
            <p className="text-xs text-muted-foreground">
              On current page
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Inventory Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stockSummary.total_value)}
            </div>
            <p className="text-xs text-muted-foreground">
              Current page total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search">Search Products</Label>
              <Input
                id="search"
                placeholder="Product name or SKU..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="stock_status">Stock Status</Label>
              <Select
                value={filters.stock_status}
                onValueChange={(value) => setFilters(prev => ({ ...prev, stock_status: value === 'ALL' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="GOOD">Good Stock</SelectItem>
                  <SelectItem value="LOW">Low Stock</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="OUT">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>

              <SearchableDropdown
                value={filters.branch_id}
                onValueChange={(value) => setFilters(prev => ({ ...prev, branch_id: value === 'ALL' ? '' : value }))}
                placeholder="Select Branch"
                searchPlaceholder="Search branches..."
                options={branchOptions?.data?.branches || []} // array of branches: { id, name, ... }
                disabled={false}
                emptyMessage="No branches found"
                onSearch={handleBranchSearch} // optional, for remote search
                searchTerm={searchTerm}
                isSearching={isSearching}
              />
            </div>

            <div>
            </div>

            <div className="flex items-end">
              <Button
                variant={filters.low_stock_only ? "default" : "outline"}
                onClick={() => setFilters(prev => ({ ...prev, low_stock_only: !prev.low_stock_only }))}
                className="w-full"
              >
                {filters.low_stock_only ? "Show All" : "Low Stock Only"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Levels Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Stock Levels</CardTitle>
          <CardDescription>
            Real-time inventory levels across all locations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Reserved</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        Loading stock levels...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="text-red-600">
                        Error loading data. Please try refreshing.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : stockArray.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      No stock data found
                    </TableCell>
                  </TableRow>
                ) : (
                  stockArray.map((stock) => (
                    <TableRow key={stock.id}>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{stock.product_name || 'Unknown Product'}</div>
                          <div className="text-muted-foreground">{stock.product_sku || 'No SKU'}</div>
                          {stock.brand_name && (
                            <div className="text-xs text-muted-foreground">{stock.brand_name}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{stock.branch_name || 'Unknown Branch'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{formatNumber(stock.available_quantity)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{formatNumber(stock.reserved_quantity)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{formatNumber(stock.total_quantity)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStockStatusColor(stock.stock_status)}>
                          {stock.stock_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{formatNumber(stock.low_stock_threshold)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatCurrency(parseNumber(stock.total_quantity) * parseNumber(stock.average_cost_price))}</div>
                          <div className="text-xs text-muted-foreground">
                            @ {formatCurrency(stock.average_cost_price)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          {stock.last_sale_date && (
                            <div>Sale: {new Date(stock.last_sale_date).toLocaleDateString()}</div>
                          )}
                          {stock.last_restock_date && (
                            <div>Restock: {new Date(stock.last_restock_date).toLocaleDateString()}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedProduct(stock)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setAdjustmentDialog({ open: true, product: stock })}>
                              <Edit className="mr-2 h-4 w-4" />
                              Adjust Stock
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="text-sm text-muted-foreground">
              Showing {stockArray.length > 0 ? ((currentPage - 1) * 50) + 1 : 0} to {Math.min(currentPage * 50, totalItems)} of {totalItems} items
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || loading}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Details Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Stock Details - {selectedProduct?.product_name}</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Available Quantity</Label>
                  <p className="text-2xl font-bold text-green-600">{formatNumber(selectedProduct.available_quantity)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Reserved Quantity</Label>
                  <p className="text-2xl font-bold text-orange-600">{formatNumber(selectedProduct.reserved_quantity)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Total Quantity</Label>
                  <p className="text-2xl font-bold">{formatNumber(selectedProduct.total_quantity)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Stock Status</Label>
                  <Badge className={getStockStatusColor(selectedProduct.stock_status)}>
                    {selectedProduct.stock_status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Low Stock Threshold</Label>
                  <p className="text-sm">{formatNumber(selectedProduct.low_stock_threshold)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Reorder Quantity</Label>
                  <p className="text-sm">{formatNumber(selectedProduct.reorder_quantity)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Average Cost</Label>
                  <p className="text-sm">{formatCurrency(selectedProduct.average_cost_price)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Batches Count</Label>
                  <p className="text-sm">{formatNumber(selectedProduct.batches_count || 0)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Expiring Batches</Label>
                  <p className="text-sm text-red-600">{formatNumber(selectedProduct.expiring_batches_count || 0)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Total Value</Label>
                  <p className="text-sm font-medium">{formatCurrency(parseNumber(selectedProduct.total_quantity) * parseNumber(selectedProduct.average_cost_price))}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockLevelsComponent;