"use client"
import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Plus,
  Minus,
  ShoppingCart,
  Trash2,
  Package,
  AlertTriangle,
  DollarSign,
  ChevronDown,
  CreditCard,
  Receipt,
  User,
  Grid,
  List
} from 'lucide-react';

// Types
interface Product {
  id: string;
  name: string;
  description: string;
  subcategory_id: string;
  brand_id: string;
  subcategory_name: string;
  category_id: string;
  category_name: string;
  brand_name: string;
  brand_code: string;
  brand_logo: string;
  variations?: ProductVariation[];
  stock_info?: StockInfo;
}

interface ProductVariation {
  id: string;
  product_id: string;
  sku: string;
  stock_quantity: number;
  low_stock_threshold: number;
  retail_price: number;
  wholesale_price: number;
  images: ProductImage[];
  barcodes: Barcode[];
}

interface ProductImage {
  id: string;
  image_url: string;
  alt_text: string;
  is_primary: boolean;
}

interface Barcode {
  id: string;
  code: string;
  type: string;
  is_active: boolean;
}

interface StockInfo {
  total_stock: number;
  min_variation_stock: number;
  max_variation_stock: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  variation_count: number;
  out_of_stock_variations: number;
  low_stock_variations: number;
  stock_status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

interface CartItem {
  product: Product;
  variation: ProductVariation;
  quantity: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface Filters {
  search: string;
  category_id: string;
  brand_id: string;
  stock_filter: 'all' | 'in_stock' | 'low_stock';
}

// Mock data for demonstration
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'iPhone 15 Pro',
    description: 'Latest Apple iPhone with Pro features',
    subcategory_id: '1',
    brand_id: '1',
    subcategory_name: 'Smartphones',
    category_id: '1',
    category_name: 'Electronics',
    brand_name: 'Apple',
    brand_code: 'APPL',
    brand_logo: 'https://via.placeholder.com/32x32/007acc/ffffff?text=A',
    variations: [
      {
        id: '1',
        product_id: '1',
        sku: 'IPH15P-128-BLK',
        stock_quantity: 15,
        low_stock_threshold: 5,
        retail_price: 999.99,
        wholesale_price: 750.00,
        images: [{ id: '1', image_url: 'https://via.placeholder.com/200x200/333/fff?text=iPhone', alt_text: 'iPhone 15 Pro', is_primary: true }],
        barcodes: [{ id: '1', code: '123456789012', type: 'UPC', is_active: true }]
      }
    ],
    stock_info: {
      total_stock: 15,
      min_variation_stock: 15,
      max_variation_stock: 15,
      avg_price: 999.99,
      min_price: 999.99,
      max_price: 999.99,
      variation_count: 1,
      out_of_stock_variations: 0,
      low_stock_variations: 0,
      stock_status: 'IN_STOCK'
    }
  },
  {
    id: '2',
    name: 'Samsung Galaxy S24',
    description: 'Premium Android smartphone',
    subcategory_id: '1',
    brand_id: '2',
    subcategory_name: 'Smartphones',
    category_id: '1',
    category_name: 'Electronics',
    brand_name: 'Samsung',
    brand_code: 'SMSNG',
    brand_logo: 'https://via.placeholder.com/32x32/1f77b4/ffffff?text=S',
    variations: [
      {
        id: '2',
        product_id: '2',
        sku: 'GS24-256-WHT',
        stock_quantity: 3,
        low_stock_threshold: 5,
        retail_price: 849.99,
        wholesale_price: 650.00,
        images: [{ id: '2', image_url: 'https://via.placeholder.com/200x200/666/fff?text=Galaxy', alt_text: 'Galaxy S24', is_primary: true }],
        barcodes: [{ id: '2', code: '123456789013', type: 'UPC', is_active: true }]
      }
    ],
    stock_info: {
      total_stock: 3,
      min_variation_stock: 3,
      max_variation_stock: 3,
      avg_price: 849.99,
      min_price: 849.99,
      max_price: 849.99,
      variation_count: 1,
      out_of_stock_variations: 0,
      low_stock_variations: 1,
      stock_status: 'LOW_STOCK'
    }
  },
  {
    id: '3',
    name: 'MacBook Air M3',
    description: 'Ultra-thin laptop with M3 chip',
    subcategory_id: '2',
    brand_id: '1',
    subcategory_name: 'Laptops',
    category_id: '1',
    category_name: 'Electronics',
    brand_name: 'Apple',
    brand_code: 'APPL',
    brand_logo: 'https://via.placeholder.com/32x32/007acc/ffffff?text=A',
    variations: [
      {
        id: '3',
        product_id: '3',
        sku: 'MBA-M3-512-SLV',
        stock_quantity: 8,
        low_stock_threshold: 3,
        retail_price: 1299.99,
        wholesale_price: 1000.00,
        images: [{ id: '3', image_url: 'https://via.placeholder.com/200x200/999/fff?text=MacBook', alt_text: 'MacBook Air', is_primary: true }],
        barcodes: [{ id: '3', code: '123456789014', type: 'UPC', is_active: true }]
      }
    ],
    stock_info: {
      total_stock: 8,
      min_variation_stock: 8,
      max_variation_stock: 8,
      avg_price: 1299.99,
      min_price: 1299.99,
      max_price: 1299.99,
      variation_count: 1,
      out_of_stock_variations: 0,
      low_stock_variations: 0,
      stock_status: 'IN_STOCK'
    }
  }
];

const mockCategories = [
  { id: '1', name: 'Electronics', description: 'Electronic devices and accessories' },
  { id: '2', name: 'Clothing', description: 'Apparel and fashion items' },
  { id: '3', name: 'Home & Garden', description: 'Home improvement and garden supplies' }
];

const mockBrands = [
  { id: '1', name: 'Apple', code: 'APPL' },
  { id: '2', name: 'Samsung', code: 'SMSNG' },
  { id: '3', name: 'Nike', code: 'NIKE' }
];

const POSSystem: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  
  const [filters, setFilters] = useState<Filters>({
    search: '',
    category_id: '',
    brand_id: '',
    stock_filter: 'in_stock'
  });

  // Filter products based on current filters
  const filteredProducts = products.filter(product => {
    const matchesSearch = !filters.search || 
      product.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      product.brand_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      product.category_name.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesCategory = !filters.category_id || product.category_id === filters.category_id;
    const matchesBrand = !filters.brand_id || product.brand_id === filters.brand_id;
    
    const matchesStock = filters.stock_filter === 'all' || 
      (filters.stock_filter === 'in_stock' && product.stock_info?.stock_status === 'IN_STOCK') ||
      (filters.stock_filter === 'low_stock' && product.stock_info?.stock_status === 'LOW_STOCK');

    return matchesSearch && matchesCategory && matchesBrand && matchesStock;
  });

  // Add item to cart
  const addToCart = (product: Product, variation: ProductVariation, quantity: number = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => 
        item.product.id === product.id && item.variation.id === variation.id
      );

      if (existingItem) {
        const maxQuantity = variation.stock_quantity;
        const newQuantity = Math.min(existingItem.quantity + quantity, maxQuantity);
        
        return prevCart.map(item =>
          item.product.id === product.id && item.variation.id === variation.id
            ? { ...item, quantity: newQuantity }
            : item
        );
      } else {
        return [...prevCart, { product, variation, quantity }];
      }
    });
  };

  // Remove item from cart
  const removeFromCart = (productId: string, variationId: string) => {
    setCart(prevCart => prevCart.filter(item => 
      !(item.product.id === productId && item.variation.id === variationId)
    ));
  };

  // Update cart item quantity
  const updateCartQuantity = (productId: string, variationId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, variationId);
      return;
    }

    setCart(prevCart => prevCart.map(item => {
      if (item.product.id === productId && item.variation.id === variationId) {
        const maxQuantity = item.variation.stock_quantity;
        return { ...item, quantity: Math.min(quantity, maxQuantity) };
      }
      return item;
    }));
  };

  // Calculate cart totals
  const cartSubtotal = cart.reduce((total, item) => total + (item.variation.retail_price * item.quantity), 0);
  const cartTax = cartSubtotal * 0.08; // 8% tax
  const cartTotal = cartSubtotal + cartTax;
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  // Get stock badge
  const getStockBadge = (status: string) => {
    switch (status) {
      case 'IN_STOCK':
        return <Badge variant="default" className="bg-green-500 text-white"><Package className="w-3 h-3 mr-1" />In Stock</Badge>;
      case 'LOW_STOCK':
        return <Badge variant="destructive" className="bg-yellow-500 text-white"><AlertTriangle className="w-3 h-3 mr-1" />Low Stock</Badge>;
      case 'OUT_OF_STOCK':
        return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" />Out of Stock</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
  };

  // Process payment
  const processPayment = () => {
    setShowPayment(true);
    // Simulate payment processing
    setTimeout(() => {
      alert('Payment processed successfully!');
      clearCart();
      setShowPayment(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Point of Sale</h1>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setCustomer(null)}>
              <User className="w-4 h-4 mr-2" />
              {customer ? customer.name : 'Walk-in Customer'}
            </Button>
            <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Search */}
                  <div className="md:col-span-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search products..."
                        className="pl-10"
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Category Filter */}
                  <Select
                    value={filters.category_id}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, category_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                    
                    </SelectContent>
                  </Select>

                  {/* Brand Filter */}
                  <Select
                    value={filters.brand_id}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, brand_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Brands" />
                    </SelectTrigger>
                    <SelectContent>
                     
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Products Grid/List */}
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' 
              : 'space-y-4'
            }>
              {filteredProducts.map(product => (
                <Card key={product.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className={viewMode === 'grid' ? 'p-4' : 'p-4 flex items-center gap-4'}>
                    {/* Product Image */}
                    <div className={viewMode === 'grid' ? 'mb-4' : 'flex-shrink-0'}>
                      <img
                        src={product.variations?.[0]?.images?.[0]?.image_url || 'https://via.placeholder.com/150x150/ccc/fff?text=No+Image'}
                        alt={product.name}
                        className={viewMode === 'grid' ? 'w-full h-48 object-cover rounded' : 'w-16 h-16 object-cover rounded'}
                      />
                    </div>

                    {/* Product Info */}
                    <div className={viewMode === 'grid' ? '' : 'flex-grow'}>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{product.name}</h3>
                        {product.stock_info && getStockBadge(product.stock_info.stock_status)}
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {product.description}
                      </p>

                      <div className="flex items-center gap-2 mb-3">
                        {product.brand_logo && (
                          <img src={product.brand_logo} alt={product.brand_name} className="w-5 h-5 rounded" />
                        )}
                        <span className="text-sm text-gray-500">{product.brand_name}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-sm text-gray-500">{product.category_name}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-2xl font-bold text-green-600">
                            {product.variations?.[0] ? formatPrice(product.variations[0].retail_price) : 'N/A'}
                          </span>
                          {product.stock_info && (
                            <div className="text-xs text-gray-500">
                              Stock: {product.stock_info.total_stock}
                            </div>
                          )}
                        </div>

                        <Button
                          onClick={() => {
                            if (product.variations?.[0]) {
                              addToCart(product, product.variations[0]);
                            }
                          }}
                          disabled={!product.variations?.[0] || product.stock_info?.stock_status === 'OUT_OF_STOCK'}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add to Cart
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No products found matching your criteria</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Cart Section */}
          <div className="space-y-6">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Cart ({cartItemCount})
                  </span>
                  {cart.length > 0 && (
                    <Button variant="outline" size="sm" onClick={clearCart}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Your cart is empty</p>
                  </div>
                ) : (
                  <>
                    {/* Cart Items */}
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {cart.map(item => (
                        <div key={`${item.product.id}-${item.variation.id}`} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <img
                            src={item.variation.images?.[0]?.image_url || 'https://via.placeholder.com/50x50/ccc/fff?text=No+Image'}
                            alt={item.product.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="flex-grow min-w-0">
                            <h4 className="font-medium text-sm truncate">{item.product.name}</h4>
                            <p className="text-xs text-gray-500">{formatPrice(item.variation.retail_price)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateCartQuantity(item.product.id, item.variation.id, item.quantity - 1)}
                              className="w-8 h-8 p-0"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateCartQuantity(item.product.id, item.variation.id, item.quantity + 1)}
                              disabled={item.quantity >= item.variation.stock_quantity}
                              className="w-8 h-8 p-0"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Cart Summary */}
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>{formatPrice(cartSubtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Tax (8%):</span>
                        <span>{formatPrice(cartTax)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Total:</span>
                        <span>{formatPrice(cartTotal)}</span>
                      </div>
                    </div>

                    {/* Checkout Button */}
                    <Button
                      onClick={processPayment}
                      disabled={showPayment}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      size="lg"
                    >
                      {showPayment ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Checkout {formatPrice(cartTotal)}
                        </>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSSystem;