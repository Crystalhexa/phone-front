import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Filter, RefreshCw } from 'lucide-react';

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

interface PurchaseOrderFiltersProps {
  filters: Filters;
  updateFilters: (newFilters: Partial<Filters>) => void;
  resetFilters: () => void;
  handleRefresh: () => void;
  total: number;
}

export const PurchaseOrderFilters: React.FC<PurchaseOrderFiltersProps> = ({
  filters,
  updateFilters,
  resetFilters,
  handleRefresh,
  total,
}) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="w-4 h-4" />
            Filter Purchase Orders
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Status */}
          <Select
            value={filters.status || 'ALL'}
            onValueChange={(value) =>
              updateFilters({ status: value === 'ALL' ? '' : (value as Filters['status']) })
            }
          >
            <SelectTrigger className="w-[130px] h-8 text-sm">
              <SelectValue placeholder="Status" />
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
            onValueChange={(value) => updateFilters({ sortBy: value as Filters['sortBy'] })}
          >
            <SelectTrigger className="w-[140px] h-8 text-sm">
              <SelectValue placeholder="Sort by" />
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
            onValueChange={(value) => updateFilters({ sortOrder: value as Filters['sortOrder'] })}
          >
            <SelectTrigger className="w-[110px] h-8 text-sm">
              <SelectValue placeholder="Order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Descending</SelectItem>
              <SelectItem value="asc">Ascending</SelectItem>
            </SelectContent>
          </Select>

          {/* Supplier */}
          <Select
            value={filters.supplier_id || 'ALL'}
            onValueChange={(value) =>
              updateFilters({ supplier_id: value === 'ALL' ? '' : value })
            }
          >
            <SelectTrigger className="w-[140px] h-8 text-sm">
              <SelectValue placeholder="Supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All suppliers</SelectItem>
              {/* Add dynamic supplier list here */}
            </SelectContent>
          </Select>

          {/* Actions */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={resetFilters}
          >
            Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs flex items-center"
            onClick={handleRefresh}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
