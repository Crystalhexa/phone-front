import React, { JSX } from 'react';
import { Plus, Download, Search } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';

interface PurchaseOrderTableHeaderProps {
  searchTerm: string;
  handleSearch: (value: string) => void;
  searchLoading: boolean;
  total: number;
}

export function PurchaseOrderTableHeader({ 
  searchTerm, 
  handleSearch, 
  searchLoading, 
  total 
}: PurchaseOrderTableHeaderProps): JSX.Element {
  const router = useRouter();

  return (
    <div className="space-y-4">
      {/* Title Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track your purchase orders
          </p>
        </div>
      </div>

      {/* Actions Section - Buttons and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left side - Action buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          
          <Button onClick={() => router.push('/dashboard/orders/purchase/all/add')}>
            <Plus className="mr-2 h-4 w-4" />
            New Purchase Order
          </Button>
        </div>

        {/* Right side - Search */}
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">
            {total} order{total !== 1 ? 's' : ''} found
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            {searchLoading && (
              <div className="absolute right-3 top-3">
                <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            )}
            <Input
              placeholder="Search by order number, supplier, invoice..."
              className="pl-10 pr-10 sm:w-80 w-full"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}