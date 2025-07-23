import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PosPaginationProps {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  setPagination: React.Dispatch<React.SetStateAction<any>>;
  loading: boolean;
}

export const PosPagination: React.FC<PosPaginationProps> = ({
  pagination,
  setPagination,
  loading
}) => {
  if (pagination.totalPages <= 1) return null;

  const hasNext = pagination.page < pagination.totalPages;
  const hasPrev = pagination.page > 1;

  return (
    <div className="flex justify-between items-center">
      <div className="text-sm text-muted-foreground">
        Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} to{' '}
        {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} products
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPagination((prev: any) => ({ ...prev, page: prev.page - 1 }))}
          disabled={!hasPrev || loading}
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        <span className="text-sm px-3 py-1 bg-muted rounded">
          Page {pagination.page} of {pagination.totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setPagination((prev: any) => ({ ...prev, page: prev.page + 1 }))}
          disabled={!hasNext || loading}
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};