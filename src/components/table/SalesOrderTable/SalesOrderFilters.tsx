import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Filter, X, RefreshCw } from 'lucide-react';
import { SalesOrderFilters as Filters } from './useSalesOrderData';

interface SalesOrderFiltersProps {
  filters: Filters;
  updateFilters: (filters: Partial<Filters>) => void;
  resetFilters: () => void;
  handleRefresh: () => void;
  total: number;
}

export const SalesOrderFilters: React.FC<SalesOrderFiltersProps> = ({
  filters,
  updateFilters,
  resetFilters,
  handleRefresh,
  total,
}) => {
  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'sort_by' || key === 'sort_order') return false;
    return value !== undefined && value !== '';
  }).length;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="font-medium">Filters</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">{activeFiltersCount} active</Badge>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {/* Branch Filter */}
          <div className="space-y-2">
            <Label htmlFor="branch_id">Branch</Label>
            <Select
              value={filters.branch_id || ''}
              onValueChange={(value) => updateFilters({ branch_id: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {/* Add your branches here - you might want to fetch from API */}
                <SelectItem value="branch_1">Main Branch</SelectItem>
                <SelectItem value="branch_2">Store 1</SelectItem>
                <SelectItem value="branch_3">Store 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Employee Filter */}
          <div className="space-y-2">
            <Label htmlFor="employee_id">Sales Person</Label>
            <Select
              value={filters.employee_id || ''}
              onValueChange={(value) => updateFilters({ employee_id: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="al">All employees</SelectItem>
                {/* Add your employees here - you might want to fetch from API */}
                <SelectItem value="emp_1">John Doe</SelectItem>
                <SelectItem value="emp_2">Jane Smith</SelectItem>
                <SelectItem value="emp_3">Mike Johnson</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Customer Filter */}
          <div className="space-y-2">
            <Label htmlFor="customer_id">Customer</Label>
            <Select
              value={filters.customer_id || ''}
              onValueChange={(value) => updateFilters({ customer_id: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cus">All customers</SelectItem>
                {/* Add your customers here - you might want to fetch from API */}
                <SelectItem value="cust_1">Walk-in Customer</SelectItem>
                <SelectItem value="cust_2">Regular Customer</SelectItem>
                <SelectItem value="cust_3">VIP Customer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label htmlFor="status">Order Status</Label>
            <Select
              value={filters.status || ''}
              onValueChange={(value) => updateFilters({ status: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sta">All statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="SHIPPED">Shipped</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Status Filter */}
          <div className="space-y-2">
            <Label htmlFor="payment_status">Payment Status</Label>
            <Select
              value={filters.payment_status || ''}
              onValueChange={(value) => updateFilters({ payment_status: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All payments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pa">All payments</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Options */}
          <div className="space-y-2">
            <Label htmlFor="sort_by">Sort By</Label>
            <Select
              value={filters.sort_by || 'order_date'}
              onValueChange={(value) => updateFilters({ sort_by: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="order_date">Order Date</SelectItem>
                <SelectItem value="total_amount">Total Amount</SelectItem>
                <SelectItem value="order_number">Order Number</SelectItem>
                <SelectItem value="customer_name">Customer Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Date Range Filters */}
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="order_date_from">Order Date From</Label>
              <Input
                type="date"
                id="order_date_from"
                value={filters.order_date_from || ''}
                onChange={(e) => updateFilters({ order_date_from: e.target.value || undefined })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="order_date_to">Order Date To</Label>
              <Input
                type="date"
                id="order_date_to"
                value={filters.order_date_to || ''}
                onChange={(e) => updateFilters({ order_date_to: e.target.value || undefined })}
              />
            </div>
          </div>
        </div>

        {/* Sort Order Toggle */}
        <div className="mt-4 flex items-center gap-2">
          <Label htmlFor="sort_order">Sort Order:</Label>
          <Button
            variant={filters.sort_order === 'desc' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateFilters({ sort_order: 'desc' })}
          >
            Newest First
          </Button>
          <Button
            variant={filters.sort_order === 'asc' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateFilters({ sort_order: 'asc' })}
          >
            Oldest First
          </Button>
        </div>

        {/* Results Summary */}
        <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
          Showing {total.toLocaleString()} sales order{total !== 1 ? 's' : ''}
          {activeFiltersCount > 0 && ` with ${activeFiltersCount} filter${activeFiltersCount !== 1 ? 's' : ''} applied`}
        </div>
      </CardContent>
    </Card>
  );
};