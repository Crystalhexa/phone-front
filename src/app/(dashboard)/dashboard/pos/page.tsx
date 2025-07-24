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
import { SalesCart } from '@/components/pos/SalesCart';
import { POSScanner } from '@/components/pos/POSScanner';

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
  
  // Add cart panel state
  const [cartPanelOpen, setCartPanelOpen] = useState(false);

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
    console.log('Adding product to cart:', product);
    setSelectedProduct(product);
    setModalOpen(true);
  };

  // Handle scanner-based product addition
  const handleScannerAddToCart = (formData: {
    quantity: number;
    cost_price?: number;
    wholesale_price?: number;
    retail_price?: number;
    batch_number?: string;
    expiry_date?: string;
  }, product: any) => {

    console.log( product.barcode, "Scanned product barcode");
    const existingItem = cartItems.find(item => item.product.barcode === product.barcode);
    console.log(existingItem, "Existing item in cart");
    if (existingItem) {
      toast.error("Product not found or invalid barcode");
      return;
    }
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

      toast.success(`Updated ${product.name} quantity in cart (Scanned)`, {
        icon: "📱",
      });
    } else {
      const newItem: CartItem = {
        id: `${product.id}-${Date.now()}`,
        product: {
          id: product.id,
          name: product.name,
          model: product.model,
          sku: product.sku,
          barcode: product.barcode,
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
      toast.success(`Added ${product.name} to cart (Scanned)`, {
        icon: "📱",
      });
    }
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
          barcode: product.barcodes.length > 0 ? product.barcodes[0].barcode : '',
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
    <div className="flex h-screen overflow-hidden">
      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 ease-in-out ${cartPanelOpen ? 'mr-[600px]' : 'mr-0'}`}>
        <div className="container mx-auto p-6 space-y-3 h-full overflow-y-auto">
          {/* Header */}
          <PosHeader
            cartItems={cartItems}
            setCartItems={setCartItems}
            orderFormData={orderFormData}
            setOrderFormData={setOrderFormData}
            onAddToCart={handleConfirmAddToCart}
            cartPanelOpen={cartPanelOpen}
            setCartPanelOpen={setCartPanelOpen}
          />

          {/* POS Scanner - Only show when cart is not open or in compact mode */}
          <div className={`transition-all duration-300 ${cartPanelOpen ? 'opacity-75' : 'opacity-100'}`}>
            <POSScanner
              onProductScanned={handleScannerAddToCart}
              isCartOpen={cartPanelOpen}
              compact={cartPanelOpen}
              className={cartPanelOpen ? "bg-muted/30" : ""}
            />
          </div>

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
      </div>

      {/* Cart Panel - Fixed on the right */}
      <div className={`
        fixed top-0 right-0 h-full bg-background border-l shadow-2xl z-50 
        transition-transform duration-300 ease-in-out
        ${cartPanelOpen ? 'translate-x-0' : 'translate-x-full'}
        w-[600px]
      `}>
        <SalesCart
          onAddToCart={handleConfirmAddToCart}
          cartItems={cartItems}
          setCartItems={setCartItems}
          orderFormData={orderFormData}
          setOrderFormData={setOrderFormData}
          cartPanelOpen={cartPanelOpen}
          setCartPanelOpen={setCartPanelOpen}
        />
      </div>
    </div>
  );
};

export default ProductsTable;