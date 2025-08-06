import React from 'react';
import { Search, Plus, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';

interface SalesOrderTableHeaderProps {
  searchTerm: string;
  handleSearch: (term: string) => void;
  searchLoading: boolean;
  total: number;
}

export const SalesOrderTableHeader: React.FC<SalesOrderTableHeaderProps> = ({
  searchTerm,
  handleSearch,
  searchLoading,
  total,
}) => {
  const router = useRouter();

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Sales Orders</h1>
        <p className="text-muted-foreground">
          Manage and track all sales orders ({total.toLocaleString()} total)
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search orders, customers, employees..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 w-full sm:w-80"
            disabled={searchLoading}
          />
          {searchLoading && (
            <RefreshCw className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              // Implement export functionality
              console.log('Export sales orders');
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button
            onClick={() => router.push('/dashboard/orders/sales/new')}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Sale
          </Button>
        </div>
      </div>
    </div>
  );
};
