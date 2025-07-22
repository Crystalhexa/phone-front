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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Search,
  Eye,
  Download,
  Plus,
  Calendar,
  RefreshCw,
  FileText,
  DollarSign,
  Package,
  Building2,
  User,
  Info,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Printer
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import GRNGenerator from '@/components/GRNGenerator';

// Types
interface PurchaseOrder {
  id: string;
  order_number: string;
  invoice_number?: string;
  supplier_id: string;
  supplier_name: string;
  supplier_code: string;
  purchased_by?: string;
  purchaser_name?: string;
  branch_id?: string;
  branch_name?: string;
  order_date: string;
  expected_date?: string;
  received_date?: string;
  status: 'PENDING' | 'COMPLETED' | 'RECEIVED' | 'CANCELLED';
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items_count: number;
  items?: any[];
  
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface DashboardStats {
  pending_count: number;
  completed_count: number;
  received_count: number;
  cancelled_count: number;
  total_orders: number;
  total_amount: string;
  pending_amount: string;
  received_amount: string;
}

interface ApiResponse {
  success: boolean;
  data: {
    orders: PurchaseOrder[];
    pagination: PaginationMeta;
    stats?: DashboardStats;
  };
  message: string;
  timestamp: string;
}

interface Filters {
  search: string;
  sortBy: 'order_date' | 'order_number' | 'total_amount' | 'status' | 'created_at';
  sortOrder: 'asc' | 'desc';
  status: 'PENDING' | 'COMPLETED' | 'RECEIVED' | 'CANCELLED' | '';
  supplier_id: string;
  branch_id: string;
  purchased_by: string;
  date_from: string;
  date_to: string;
  include_items: boolean;
  include_stats: boolean;
}

// Status Badge Component with Icons
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING':
        return {
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
          icon: Clock,
          label: 'Pending'
        };
      case 'COMPLETED':
        return {
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
          icon: CheckCircle,
          label: 'Completed'
        };
      case 'RECEIVED':
        return {
          variant: 'secondary' as const,
          className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
          icon: Package,
          label: 'Received'
        };
      case 'CANCELLED':
        return {
          variant: 'secondary' as const,
          className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
          icon: XCircle,
          label: 'Cancelled'
        };
      default:
        return {
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-800',
          icon: AlertCircle,
          label: status
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
};

// Stats Cards Component
const StatsCards = ({ stats }: { stats: DashboardStats }) => {
  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  const statsConfig = [
    {
      title: 'Total Orders',
      value: stats.total_orders,
      subtitle: `Total value: ${formatCurrency(stats.total_amount)}`,
      icon: FileText,
      color: 'text-blue-600'
    },
    {
      title: 'Pending',
      value: stats.pending_count,
      subtitle: `Value: ${formatCurrency(stats.pending_amount)}`,
      icon: Clock,
      color: 'text-yellow-600'
    },
    {
      title: 'COMPLETED',
      value: stats.completed_count,
      subtitle: 'Awaiting delivery',
      icon: CheckCircle,
      color: 'text-blue-600'
    },
    {
      title: 'Received',
      value: stats.received_count,
      subtitle: `Value: ${formatCurrency(stats.received_amount)}`,
      icon: Package,
      color: 'text-green-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statsConfig.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Icon className={`w-4 h-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.subtitle}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// Order Details Popup Component
const OrderDetailsPopup: React.FC<{ order: PurchaseOrder }> = ({ order }) => {
  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'PPP');
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Info className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-2xl sm:max-w-3xl rounded-2xl p-0">
        <div className="max-h-[85vh] overflow-y-auto px-6 py-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Purchase Order Details - {order.order_number}
            </DialogTitle>
            <DialogDescription>
              Complete information about this purchase order
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Order Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Order Number</label>
                    <p className="font-mono text-sm">{order.order_number}</p>
                  </div>
                  {order.invoice_number && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Invoice Number</label>
                      <p className="font-mono text-sm">{order.invoice_number}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Items Count</label>
                    <p className="font-medium">{order.items_count} items</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Supplier & Branch
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Supplier</label>
                    <div>
                      <p className="font-medium">{order.supplier_name}</p>
                      <p className="text-sm text-muted-foreground">{order.supplier_code}</p>
                    </div>
                  </div>
                  {order.branch_name && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Branch</label>
                      <p className="font-medium">{order.branch_name}</p>
                    </div>
                  )}
                  {order.purchaser_name && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Purchased By</label>
                      <p className="font-medium">{order.purchaser_name}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Important Dates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Order Date</label>
                    <p className="font-medium">{formatDate(order.order_date)}</p>
                  </div>
                  {order.expected_date && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Expected Date</label>
                      <p className="font-medium">{formatDate(order.expected_date)}</p>
                    </div>
                  )}
                  {order.received_date && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Received Date</label>
                      <p className="font-medium">{formatDate(order.received_date)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Subtotal</label>
                    <p className="text-lg font-bold text-blue-600">
                      {formatCurrency(order.subtotal)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tax Amount</label>
                    <p className="text-lg font-bold text-orange-600">
                      {formatCurrency(order.tax_amount)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Total Amount</label>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(order.total_amount)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {order.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Timestamps */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Record Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created At</label>
                  <p className="text-sm">{format(new Date(order.created_at), 'PPpp')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                  <p className="text-sm">{format(new Date(order.updated_at), 'PPpp')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main Component
const PurchaseOrdersTable = () => {
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
   // Add GRN state
  const [selectedOrderForGRN, setSelectedOrderForGRN] = useState<PurchaseOrder | null>(null);
  const [showGRN, setShowGRN] = useState(false);

  const fetchOrderWithItems=async(id:string)=>{
    return selectedOrderForGRN;
  }
   // Handle GRN generation
  const handleGenerateGRN = async (order: PurchaseOrder) => {
    // Check if order already has items, if not fetch them
    if (!order.items || order.items.length === 0) {
      const orderWithItems = await fetchOrderWithItems(order.id);
      if (orderWithItems) {
        setSelectedOrderForGRN(orderWithItems);
      } else {
        return; // Failed to fetch items
      }
    } else {
      setSelectedOrderForGRN(order);
    }
    
    setShowGRN(true);
  };
   const handleBackFromGRN = () => {
    setShowGRN(false);
    setSelectedOrderForGRN(null);
  };
// If showing GRN, render it instead of the table
  if (showGRN && selectedOrderForGRN) {
    return (
      <div className="container mx-auto p-6">
        {/* Back button */}
        <div className="mb-4">
          <Button 
            variant="outline" 
            onClick={handleBackFromGRN}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Purchase Orders
          </Button>
        </div>
        
        {/* GRN Component */}
        {/* <GRNGenerator purchaseOrder={selectedOrderForGRN} /> */}
      </div>
    );
  }
  
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false,
  });

  const [filters, setFilters] = useState<Filters>({
    search: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
    status: '',
    supplier_id: '',
    branch_id: '',
    purchased_by: '',
    date_from: '',
    date_to: '',
    include_items: false,
    include_stats: false,
  });

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Debounced search effect - exactly like products table
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      if (filters.search) {
        setPagination(prev => ({ ...prev, page: 1 }));
      }
      fetchOrders(true); // Pass true to indicate this is a search
    }, 500);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [filters.search]);

  console.log(orders)
  // Fetch orders function
  const fetchOrders = async (isSearch = false) => {
    if (isSearch) {
      setSearchLoading(true);
    } else {
      setLoading(true);
    }
    
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        include_items: filters.include_items.toString(),
        include_stats: filters.include_stats.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.supplier_id && { supplier_id: filters.supplier_id }),
        ...(filters.branch_id && { branch_id: filters.branch_id }),
        ...(filters.purchased_by && { purchased_by: filters.purchased_by }),
        ...(filters.date_from && { date_from: filters.date_from }),
        ...(filters.date_to && { date_to: filters.date_to }),
      });

      const response = await fetch(`/api/purchase-orders/list?${params}`);
      const data: ApiResponse = await response.json();

      if (data.success) {
        setOrders(data.data.orders);
        setPagination(prev => ({
          ...prev,
          total: data.data.pagination.total,
          total_pages: data.data.pagination.total_pages,
          has_next: data.data.pagination.has_next,
          has_prev: data.data.pagination.has_prev,
        }));
        if (data.data.stats) {
          setStats(data.data.stats);
        }
      } else {
        toast.error('Failed to fetch purchase orders');
      }
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      toast.error('Error fetching purchase orders. Please try again.');
    } finally {
      if (isSearch) {
        setSearchLoading(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Fetch orders when pagination or non-search filters change - exactly like products table
  useEffect(() => {
    fetchOrders();
  }, [
    pagination.page,
    pagination.limit,
    filters.sortBy,
    filters.sortOrder,
    filters.status,
    filters.supplier_id,
    filters.branch_id,
    filters.purchased_by,
    filters.date_from,
    filters.date_to,
    filters.include_items,
  ]);

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      sortBy: 'created_at',
      sortOrder: 'desc',
      status: '',
      supplier_id: '',
      branch_id: '',
      purchased_by: '',
      date_from: '',
      date_to: '',
      include_items: false,
      include_stats: false,
    });
    setPagination(prev => ({ ...prev, page: 1 }));
    toast.success('Filters reset');
  };

  const handleRefresh = () => {
    fetchOrders();
    toast.success('Purchase orders refreshed');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Stats Cards */}
      {stats && <StatsCards stats={stats} />}

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track your purchase orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => router.push('/dashboard/orders/purchase/all/add')}>
            <Plus className="h-4 w-4 mr-2" />
            New Purchese order
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter Purchase Orders
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
                  {searchLoading && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                    </div>
                  )}
                  <Input
                    placeholder="Search by order number, supplier, invoice..."
                    className="pl-10 pr-10"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  />
                </div>
              </div>

              {/* Status Filter */}
              <Select
                value={filters.status || "ALL"}
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  status: value === "ALL" ? "" : value as Filters['status']
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="RECEIVED">Received</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort By */}
              <Select
                value={filters.sortBy}
                onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value as Filters['sortBy'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Created Date</SelectItem>
                  <SelectItem value="order_date">Order Date</SelectItem>
                  <SelectItem value="order_number">Order Number</SelectItem>
                  <SelectItem value="total_amount">Total Amount</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort Order */}
              <Select
                value={filters.sortOrder}
                onValueChange={(value) => setFilters(prev => ({ ...prev, sortOrder: value as Filters['sortOrder'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator className="my-4" />

            {/* Filter Actions */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {pagination.total} purchase order{pagination.total !== 1 ? 's' : ''} found
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

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Purchase Orders ({pagination.total})</span>
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
                  <TableHead>Order Details</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-12 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-12 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-12 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="text-center text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-lg font-medium">
                          {searchLoading ? 'Searching...' : 'No purchase orders found'}
                        </p>
                        <p className="text-sm">
                          {searchLoading ? 'Please wait while we search for orders.' : 'Try adjusting your filters or search terms.'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium font-mono text-sm">{order.order_number}</div>
                          {order.invoice_number && (
                            <div className="text-xs text-muted-foreground">
                              Invoice: {order.invoice_number}
                            </div>
                          )}
                          {order.branch_name && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {order.branch_name}
                            </div>
                          )}
                          {order.purchaser_name && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {order.purchaser_name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{order.supplier_name}</div>
                          <div className="text-sm text-muted-foreground">{order.supplier_code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="font-medium">Order:</span> {formatDate(order.order_date)}
                          </div>
                          {order.expected_date && (
                            <div className="text-xs text-muted-foreground">
                              Expected: {formatDate(order.expected_date)}
                            </div>
                          )}
                          {order.received_date && (
                            <div className="text-xs text-green-600">
                              Received: {formatDate(order.received_date)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="font-medium">{order.items_count}</div>
                          <div className="text-xs text-muted-foreground">items</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-1">
                          <div className="font-medium text-lg">
                            {formatCurrency(order.total_amount)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Subtotal: {formatCurrency(order.subtotal)}
                          </div>
                          {parseFloat(order.tax_amount) > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Tax: {formatCurrency(order.tax_amount)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
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
                                  <p><span className="font-medium">Created:</span> {formatDate(order.created_at)}</p>
                                  <p><span className="font-medium">Updated:</span> {formatDate(order.updated_at)}</p>
                                  <p><span className="font-medium">Items:</span> {order.items_count}</p>
                                  {order.notes && (
                                    <p><span className="font-medium">Notes:</span> {order.notes.substring(0, 100)}{order.notes.length > 100 ? '...' : ''}</p>
                                  )}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <OrderDetailsPopup order={order} />
                          {/* Add GRN Generation Button */}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleGenerateGRN(order)}
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            title="Generate Goods Received Note"
                          >
                            <Printer className="w-3 h-3 mr-1" />
                            GRN
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => router.push(`/dashboard/purchase-orders/${order.id}`)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="text-sm text-muted-foreground">
              Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
            </div>
            <Select
              value={pagination.limit.toString()}
              onValueChange={(value) => {
                setPagination(prev => ({ ...prev, limit: parseInt(value), page: 1 }));
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
              disabled={!pagination.has_prev || loading}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={!pagination.has_prev || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-3 py-1 bg-muted rounded">
              Page {pagination.page} of {pagination.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={!pagination.has_next || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: pagination.total_pages }))}
              disabled={!pagination.has_next || loading}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrdersTable;