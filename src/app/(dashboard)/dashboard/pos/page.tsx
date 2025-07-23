"use client"
import React, { useState } from 'react';
import { toast } from 'sonner';
import { useBrandData } from '@/components/table/BrandTable/useBrandData';
import { useCategoryData } from '@/components/table/CategoryTable/useCategoryData';
import { OrderFormData } from '@/components/pos/PurchaseCart';
import { useProductsData } from '@/components/table/PosTable/usePosData';
import { CartItem, ProductResponse } from '@/types/pos';
import { PosHeader } from '@/components/table/PosTable/PosHeader';
import { CartSummaryBar } from '@/components/table/PosTable/CartSummaryBar';
import { PosFilters } from '@/components/table/PosTable/PosFilters';
import { PosTableContent } from '@/components/table/PosTable/PosTableContent';
import { PosPagination } from '@/components/table/PosTable/PosPagination';


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

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<ProductResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [orderFormData, setOrderFormData] = useState<OrderFormData>({
    supplier_id: '',
    order_date: new Date(),
    expected_date: undefined,
    status: 'PENDING',
    notes: ''
  });

  // Brand and category data hooks
  const {
    data: brand,
    handleSearch: handleBrandSearch,
    searchTerm: brandSearchTerm,
  } = useBrandData();

  const {
    data: category,
    handleSearch: handleCategorySearch,
    searchTerm: categorySearchTerm,
  } = useCategoryData();

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
    code: brand.code,
  }));

  const handleAddToCart = (product: ProductResponse) => {
    if (!orderFormData.supplier_id) {
      toast.error("🚫 Please create a purchase order first!", {
        position: "top-right",
        description: "You need to create a purchase order before adding products to cart."
      });
      return;
    }

    if (product.overall_stock_status === 'OUT_OF_STOCK') {
      toast.warning("⚠️ This product is out of stock!", {
        position: "top-right",
        description: "Consider checking stock levels before ordering."
      });
    }

    setSelectedProduct(product);
    setModalOpen(true);
  };

  const handleConfirmAddToCart = (formData: {
    quantity: number;
    cost_price?: number;
    wholesale_price?: number;
    retail_price?: number;
    batch_number?: string;
    expiry_date?: string;
  }) => {
    const product = selectedProduct;
    if (!product) return;

    const existingItem = cartItems.find(item => item.product.id === product.id);

    if (existingItem) {
      setCartItems(prev => prev.map(item =>
        item.product.id === product.id
          ? {
            ...item,
            quantity: item.quantity + formData.quantity,
            cost_price: formData.cost_price ?? item.cost_price,
            wholesale_price: formData.wholesale_price ?? item.wholesale_price,
            retail_price: formData.retail_price ?? item.retail_price,
            batch_number: formData.batch_number ?? item.batch_number,
            expiry_date: formData.expiry_date ?? item.expiry_date,
            line_total: (item.quantity + formData.quantity) * (formData.cost_price ?? item.cost_price),
          }
          : item
      ));

      toast.success(`Updated ${product.name} quantity in cart`);
    } else {
      const newItem: CartItem = {
        id: `${product.id}-${Date.now()}`,
        product: {
          id: product.id,
          name: product.name,
          model: product.model,
          sku: product.sku,
          brand: product.brand ? {
            name: product.brand,
            code: product.brand
          } : undefined
        },
        quantity: formData.quantity,
        cost_price: formData.cost_price ?? product.current_prices?.cost_price ?? 0,
        wholesale_price: formData.wholesale_price ?? product.current_prices?.wholesale_price ?? undefined,
        retail_price: formData.retail_price ?? product.current_prices?.retail_price ?? 0,
        batch_number: formData.batch_number,
        expiry_date: formData.expiry_date,
        line_total: formData.quantity * (formData.cost_price ?? product.current_prices?.cost_price ?? 0),
      };

      setCartItems(prev => [...prev, newItem]);
      toast.success(`Added ${product.name} to cart`);
    }

    setModalOpen(false);
    setSelectedProduct(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-3">
      {/* Header */}
      <PosHeader
        cartItems={cartItems}
        setCartItems={setCartItems}
        orderFormData={orderFormData}
        setOrderFormData={setOrderFormData}
        onAddToCart={handleConfirmAddToCart}
      />

      {/* Cart Summary Bar */}
      <CartSummaryBar
        cartItems={cartItems}
        orderFormData={orderFormData}
      />

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
        orderFormData={orderFormData}
        onAddToCart={handleAddToCart}
      />

      {/* Pagination */}
      <PosPagination
        pagination={pagination}
        setPagination={setPagination}
        loading={loading}
      />
    </div>
  );
};

export default ProductsTable;