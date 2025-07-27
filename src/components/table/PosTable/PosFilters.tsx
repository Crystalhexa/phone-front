import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, Search, RefreshCw } from 'lucide-react';
import { SearchableDropdown } from '@/components/form/SearchableDropdown';
import { Filters } from '@/types/pos';

interface PosFiltersProps {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  filtersExpanded: boolean;
  setFiltersExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  pagination: any;
  setPagination: React.Dispatch<React.SetStateAction<any>>;
  onRefresh: () => void;
  onResetFilters: () => void;
  categoryOptions: Array<{ id: string; name: string; description?: string }>;
  subcategoryOptions: Array<{ id: string; name: string }>;
  brandOptions: Array<{ id: string; name: string; code: string }>;
  onCategorySearch: (value: string) => void;
  onBrandSearch: (value: string) => void;
  categorySearchTerm: string;
  brandSearchTerm: string;
}

export const PosFilters: React.FC<PosFiltersProps> = ({
  filters,
  setFilters,
  filtersExpanded,
  setFiltersExpanded,
  pagination,
  onRefresh,
  onResetFilters,
  categoryOptions,
  subcategoryOptions,
  brandOptions,
  onCategorySearch,
  onBrandSearch,
  categorySearchTerm,
  brandSearchTerm
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filter Products
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Search Input */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search..."
                className="pl-10 w-full"
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Category */}
          <SearchableDropdown
            value={filters.category_id}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, category_id: value, subcategory_id: '' }))
            }
            placeholder="Category"
            searchPlaceholder="Search categories..."
            options={categoryOptions}
            emptyMessage="No categories"
            onSearch={onCategorySearch}
            searchTerm={categorySearchTerm}
          />

          {/* Subcategory */}
          <SearchableDropdown
            value={filters.subcategory_id}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, subcategory_id: value }))
            }
            placeholder="Subcategory"
            searchPlaceholder="Search subcategories..."
            options={subcategoryOptions}
            disabled={!filters.category_id}
            emptyMessage="No subcategories"
          />

          {/* Brand */}
          <SearchableDropdown
            value={filters.brand_id}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, brand_id: value }))
            }
            placeholder="Brand"
            searchPlaceholder="Search brands..."
            options={brandOptions}
            emptyMessage="No brands"
            onSearch={onBrandSearch}
            searchTerm={brandSearchTerm}
          />

          {/* Sort By */}
          <Select
            value={filters.sort}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, sort: value as Filters['sort'] }))
            }
          >
            <SelectTrigger className="w-full">
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

        <Separator className="my-4" />

        {/* Actions & Result Count */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {pagination.total} product{pagination.total !== 1 ? 's' : ''} found
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onResetFilters}>
              Reset
            </Button>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
};