"use client"
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
} from 'lucide-react';
import { toast } from 'sonner';

// Stock Logs Types
interface StockLogEntry {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  branch_id: string;
  branch_name: string;
  batch_id?: string;
  batch_number?: string;
  quantity: number;
  entry_type: 'PURCHASE' | 'SALE' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGED' | 'INITIAL_STOCK';
  reference_type?: string;
  reference_id?: string;
  cost_price?: number;
  reference_number	:string;
  selling_price?: number;
  notes?: string;
  created_at: string;
  created_by?: string;
  employee_name?: string;
}

interface StockLogsFilters {
  search?: string;
  entry_type?: string;
  branch_id?: string;
  date_from?: string;
  date_to?: string;
  product_id?: string;
}

const stockLogsFilterSchema = z.object({
  search: z.string().optional(),
  entry_type: z.string().optional(),
  branch_id: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  product_id: z.string().optional(),
});

const StockLogsComponent: React.FC = () => {
  const [stockLogs, setStockLogs] = useState<StockLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [selectedLog, setSelectedLog] = useState<StockLogEntry | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filterForm = useForm<StockLogsFilters>({
    resolver: zodResolver(stockLogsFilterSchema),
    defaultValues: {
      search: '',
      entry_type: '',
      branch_id: '',
      date_from: '',
      date_to: '',
      product_id: '',
    },
  });

  const entryTypeOptions = [
    { value: 'PURCHASE', label: 'Purchase' },
    { value: 'SALE', label: 'Sale' },
    { value: 'TRANSFER_IN', label: 'Transfer In' },
    { value: 'TRANSFER_OUT', label: 'Transfer Out' },
    { value: 'ADJUSTMENT', label: 'Adjustment' },
    { value: 'RETURN', label: 'Return' },
    { value: 'DAMAGED', label: 'Damaged' },
    { value: 'INITIAL_STOCK', label: 'Initial Stock' },
  ];

  const fetchStockLogs = async (filters?: StockLogsFilters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(filters?.search && { search: filters.search }),
        ...(filters?.entry_type && { entry_type: filters.entry_type }),
        ...(filters?.branch_id && { branch_id: filters.branch_id }),
        ...(filters?.date_from && { date_from: filters.date_from }),
        ...(filters?.date_to && { date_to: filters.date_to }),
        ...(filters?.product_id && { product_id: filters.product_id }),
      });

      const response = await fetch(`/api/inventory/stock-logs?${params}`);
      const result = await response.json();

      if (result.success) {
        setStockLogs(result.data);
        setTotalPages(result.metadata?.pagination?.total_pages || 1);
        setTotalEntries(result.metadata?.pagination?.total_items || 0);
      } else {
        toast.error('Failed to fetch stock logs');
      }
    } catch (error) {
      console.error('Error fetching stock logs:', error);
      toast.error('Error loading stock logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockLogs();
  }, [currentPage]);

  const handleFilterSubmit = (filters: StockLogsFilters) => {
    setCurrentPage(1);
    fetchStockLogs(filters);
    setFiltersOpen(false);
  };

  const getEntryTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      PURCHASE: 'bg-green-100 text-green-800',
      SALE: 'bg-blue-100 text-blue-800',
      TRANSFER_IN: 'bg-purple-100 text-purple-800',
      TRANSFER_OUT: 'bg-orange-100 text-orange-800',
      ADJUSTMENT: 'bg-yellow-100 text-yellow-800',
      RETURN: 'bg-red-100 text-red-800',
      DAMAGED: 'bg-red-100 text-red-800',
      INITIAL_STOCK: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR'
    }).format(amount);
  };

  const exportStockLogs = async () => {
    try {
      const filters = filterForm.getValues();
      const params = new URLSearchParams({
        export: 'true',
        ...(filters.search && { search: filters.search }),
        ...(filters.entry_type && { entry_type: filters.entry_type }),
        ...(filters.branch_id && { branch_id: filters.branch_id }),
        ...(filters.date_from && { date_from: filters.date_from }),
        ...(filters.date_to && { date_to: filters.date_to }),
      });

      const response = await fetch(`/api/inventory/stock-logs?${params}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stock-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      
      toast.success('Stock logs exported successfully');
    } catch (error) {
      toast.error('Failed to export stock logs');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Logs</h1>
          <p className="text-muted-foreground">
            Track all inventory movements and transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportStockLogs}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={() => setFiltersOpen(true)}>
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button onClick={() => fetchStockLogs()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEntries.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock In Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stockLogs.filter(log => 
                log.entry_type === 'PURCHASE' && 
                new Date(log.created_at).toDateString() === new Date().toDateString()
              ).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Out Today</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stockLogs.filter(log => 
                log.entry_type === 'SALE' && 
                new Date(log.created_at).toDateString() === new Date().toDateString()
              ).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adjustments Today</CardTitle>
            <Package className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stockLogs.filter(log => 
                log.entry_type === 'ADJUSTMENT' && 
                new Date(log.created_at).toDateString() === new Date().toDateString()
              ).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Movement History</CardTitle>
          <CardDescription>
            Complete log of all inventory transactions and movements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Loading stock logs...
                    </TableCell>
                  </TableRow>
                ) : stockLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      No stock logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  stockLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(log.created_at).toLocaleDateString()}</div>
                          <div className="text-muted-foreground">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{log.product_name}</div>
                          <div className="text-muted-foreground">{log.product_sku}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{log.branch_name}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getEntryTypeColor(log.entry_type)}>
                          {log.entry_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${log.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {log.quantity > 0 ? '+' : ''}{log.quantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {log.batch_number || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {log.cost_price && (
                            <div>Cost: {formatCurrency(log.cost_price * Math.abs(log.quantity))}</div>
                          )}
                          {log.selling_price && (
                            <div>Sale: {formatCurrency(log.selling_price * Math.abs(log.quantity))}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {log.reference_type && log.reference_id && (
                            <span>{log.reference_type}: {log.reference_number	}</span>
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
                            <DropdownMenuItem onClick={() => setSelectedLog(log)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
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
              Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalEntries)} of {totalEntries} entries
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters Dialog */}
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Filter Stock Logs</DialogTitle>
            <DialogDescription>
              Filter stock logs by various criteria
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={filterForm.handleSubmit(handleFilterSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="search">Search Products</Label>
              <Input
                id="search"
                placeholder="Product name or SKU..."
                {...filterForm.register('search')}
              />
            </div>
            
            <div>
              <Label htmlFor="entry_type">Entry Type</Label>
              <Select 
                value={filterForm.watch('entry_type')} 
                onValueChange={(value) => filterForm.setValue('entry_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select entry type" />
                </SelectTrigger>
                <SelectContent>
                  {entryTypeOptions?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="date_from">From Date</Label>
                <Input
                  id="date_from"
                  type="date"
                  {...filterForm.register('date_from')}
                />
              </div>
              <div>
                <Label htmlFor="date_to">To Date</Label>
                <Input
                  id="date_to"
                  type="date"
                  {...filterForm.register('date_to')}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setFiltersOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Apply Filters
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Stock Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Product</Label>
                  <p className="text-sm">{selectedLog.product_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedLog.product_sku}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Branch</Label>
                  <p className="text-sm">{selectedLog.branch_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Entry Type</Label>
                  <Badge className={getEntryTypeColor(selectedLog.entry_type)}>
                    {selectedLog.entry_type.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Quantity</Label>
                  <p className={`text-sm font-medium ${selectedLog.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedLog.quantity > 0 ? '+' : ''}{selectedLog.quantity}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Batch</Label>
                  <p className="text-sm">{selectedLog.batch_number || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Date/Time</Label>
                  <p className="text-sm">{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>
                {selectedLog.cost_price && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Cost Price</Label>
                    <p className="text-sm">{formatCurrency(selectedLog.cost_price)}</p>
                  </div>
                )}
                {selectedLog.selling_price && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Selling Price</Label>
                    <p className="text-sm">{formatCurrency(selectedLog.selling_price)}</p>
                  </div>
                )}
                {selectedLog.employee_name && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created By</Label>
                    <p className="text-sm">{selectedLog.employee_name}</p>
                  </div>
                )}
                {selectedLog.reference_type && selectedLog.reference_id && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Reference</Label>
                    <p className="text-sm">{selectedLog.reference_type}: {selectedLog.reference_id}</p>
                  </div>
                )}
              </div>
              {selectedLog.notes && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                  <p className="text-sm">{selectedLog.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};



export default StockLogsComponent;