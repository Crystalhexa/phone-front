"use client"
import React, { useState } from 'react';
import { useProductsData } from '@/components/table/PosTable/usePosData';
import { PosFilters } from '@/components/table/PosTable/PosFilters';
import { PosTableContent } from '@/components/table/PosTable/PosTableContent';
import { PosPagination } from '@/components/table/PosTable/PosPagination';
import { useBrandDropdown } from '@/hooks/useBrandDropdown';
import { useCategoryDrodown } from '@/hooks/useCategoryDrodown';

const ProductsTable: React.FC = () => {
  const {
    products,
    loading,
    pagination,
    setPagination,
    filters,
    setFilters,
    resetFilters,
    handleRefresh
  } = useProductsData();

  const [filtersExpanded, setFiltersExpanded] = useState(true);

  // Brand and category data hooks
  const {
    data: brand,
    handleSearch: handleBrandSearch,
    searchTerm: brandSearchTerm,
  } = useBrandDropdown();

  const {
    data: category,
    handleSearch: handleCategorySearch,
    searchTerm: categorySearchTerm,
  } = useCategoryDrodown();

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
  }));


  return (
    <div >
      {/* Main Content Area */}
        <div className="container mx-auto p-6 space-y-3 h-full overflow-y-auto">
       

          {/* Filters Section */}
          <PosFilters
            filters={filters}
            setFilters={setFilters}
            filtersExpanded={filtersExpanded}
            setFiltersExpanded={setFiltersExpanded}
            pagination={pagination}
            setPagination={setPagination}
            onRefresh={handleRefresh}
            onResetFilters={resetFilters}
            categoryOptions={categoryOptions}
            subcategoryOptions={subcategoryOptions}
            brandOptions={brandOptions}
            onCategorySearch={handleCategorySearch}
            onBrandSearch={handleBrandSearch}
            categorySearchTerm={categorySearchTerm}
            brandSearchTerm={brandSearchTerm}
          />

          {/* Products Table */}
          <PosTableContent
            products={products}
            loading={loading}
            pagination={pagination}
          />

          {/* Pagination */}
          <PosPagination
            pagination={pagination}
            setPagination={setPagination}
            loading={loading}
          />
        </div>
      </div>

  );
};

export default ProductsTable;