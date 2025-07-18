"use client"
import React, { useState, useEffect, useCallback } from 'react'
import { Search, ShoppingCart, Plus, Minus, X, Package, AlertTriangle, Barcode, Filter, Grid, List, EyeOff, Eye, TableProperties, Table2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useBrandData } from '@/components/table/BrandTable/useBrandData'
import { useCategoryData } from '@/components/table/CategoryTable/useCategoryData'
import { CategoriesListResponse, Subcategory } from '@/types/category'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// ========== Types ==========
interface Product {
  id: string
  name: string
  model: string
  description: string | null
  sku: string
  warranty_period: number | null
  is_active: boolean
  created_at: string
  updated_at: string

  brand: {
    id: string
    name: string
    code: string
    logo_url: string | null
  } | null

  subcategory: {
    id: string
    name: string
    category: {
      id: string
      name: string
      description: string | null
    }
  } | null

  specifications: {
    id: string
    spec_name: string
    spec_value: string
    spec_unit: string | null
  }[]

  barcodes: {
    id: string
    code: string
    type: string
    is_active: boolean
  }[]

  stock: {
    total_quantity: number
    reserved_quantity: number
    available_quantity: number
    low_stock_threshold: number
    reorder_quantity: number
    last_restock_date: string | null
    last_sale_date: string | null
    is_low_stock: boolean
    batches: {
      id: string
      batch_number: string
      quantity: number
      cost_price: number
      wholesale_price: number | null
      retail_price: number
      expiry_date: string | null
      received_date: string
      supplier_name: string
    }[]
  } | null

  pricing: {
    cost_price: number
    wholesale_price: number | null
    retail_price: number
    currency: string
  } | null
}

interface CartItem {
  product: Product
  quantity: number
  selected_price: number
  price_type: 'retail' | 'wholesale'
  subtotal: number
}

interface ApiResponse {
  success: boolean
  data: {
    products: Product[]
    pagination: {
      page: number
      limit: number
      total: number
      total_pages: number
      has_next: boolean
      has_prev: boolean
    }
  }
  message: string
  timestamp: string
}

// ========== Main POS Component ==========
const POSSystem: React.FC = () => {
  // State Management
  const [isCartVisible, setIsCartVisible] = useState(true);
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('grid')
  const [showLowStock, setShowLowStock] = useState(false);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 8,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false
  })
  const [availableSubcategories, setAvailableSubcategories] = useState<Subcategory[]>([]);
  useEffect(() => {
    if (selectedCategory) {
      const selectedCategoryData = categories?.data.categories.find(cat => cat.id === selectedCategory);
      if (selectedCategoryData) {
        setAvailableSubcategories(selectedCategoryData.subcategories);
      }
    } else {
      setAvailableSubcategories([]);
    }

    // Reset subcategory selection when category changes

  }, [selectedCategory]);
  // Mock branch ID (in real app, get from auth context)
  const branchId = 'cmd7qdjga000fhjeu18ubhpnf'

  // ========== API Functions ==========
  const fetchProducts = useCallback(async (params: Record<string, string> = {}) => {
    setLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams({
        branch_id: branchId,
        page: currentPage.toString(),
        limit: '8',
        ...params
      })

      const response = await fetch(`/api/products/all?${queryParams}`)
      const data: ApiResponse = await response.json()

      if (data.success) {
        setProducts(data.data.products)
        setPagination(data.data.pagination)
      } else {
        setError(data.message || 'Failed to fetch products')
      }
    } catch (err) {
      setError('Network error occurred')
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [branchId, currentPage])

  const searchProducts = useCallback(async () => {
    const params: Record<string, string> = {}

    if (searchQuery.trim()) {
      params.search = searchQuery.trim()
    }
    if (selectedSubCategory) {
      params.subcategory_id = selectedSubCategory;
    }

    if (selectedCategory) {
      params.category_id = selectedCategory
    }

    if (selectedBrand) {
      params.brand_id = selectedBrand
    }

    if (showLowStock) {
      params.low_stock_only = 'true'
    }

    await fetchProducts(params)
  }, [searchQuery, selectedCategory, selectedBrand, showLowStock, fetchProducts, selectedSubCategory])

  const scanBarcode = useCallback(async (barcode: string) => {
    if (!barcode.trim()) return

    const params = { barcode: barcode.trim() }
    await fetchProducts(params)
    setBarcodeInput('')
  }, [fetchProducts])

  // ========== Cart Functions ==========
  const addToCart = (product: Product, priceType: 'retail' | 'wholesale' = 'retail') => {
    if (!product.pricing || !product.stock) {
      setError('Product pricing or stock information not available')
      return
    }

    if (product.stock.available_quantity <= 0) {
      setError('Product is out of stock')
      return
    }

    const selectedPrice = priceType === 'wholesale' && product.pricing.wholesale_price
      ? product.pricing.wholesale_price
      : product.pricing.retail_price

    const existingItem = cart.find(item =>
      item.product.id === product.id && item.price_type === priceType
    )

    if (existingItem) {
      const newQuantity = existingItem.quantity + 1
      if (newQuantity > product.stock.available_quantity) {
        setError(`Only ${product.stock.available_quantity} items available`)
        return
      }

      setCart(cart.map(item =>
        item.product.id === product.id && item.price_type === priceType
          ? { ...item, quantity: newQuantity, subtotal: newQuantity * selectedPrice }
          : item
      ))
    } else {
      const newItem: CartItem = {
        product,
        quantity: 1,
        selected_price: selectedPrice,
        price_type: priceType,
        subtotal: selectedPrice
      }
      setCart([...cart, newItem])
    }
  }

  const updateCartQuantity = (productId: string, priceType: 'retail' | 'wholesale', quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, priceType)
      return
    }

    const product = products.find(p => p.id === productId)
    if (product && product.stock && quantity > product.stock.available_quantity) {
      setError(`Only ${product.stock.available_quantity} items available`)
      return
    }

    setCart(cart.map(item =>
      item.product.id === productId && item.price_type === priceType
        ? { ...item, quantity, subtotal: quantity * item.selected_price }
        : item
    ))
  }

  const removeFromCart = (productId: string, priceType: 'retail' | 'wholesale') => {
    setCart(cart.filter(item =>
      !(item.product.id === productId && item.price_type === priceType)
    ))
  }

  const clearCart = () => {
    setCart([])
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.subtotal, 0)
  }

  const getCartItemCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0)
  }

  // ========== Effects ==========
  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery || selectedCategory || selectedBrand || showLowStock) {
        searchProducts()
      } else {
        fetchProducts()
      }
    }, 300)
  }, [searchQuery, selectedCategory, selectedBrand, showLowStock, searchProducts, fetchProducts]);

  const [categories, setCategories] = useState<CategoriesListResponse>();
  const {
    data: category,
    handleSearch: handleCategorySearch,
    searchTerm: categorySearchTerm,
  } = useCategoryData();

  const {
    data: brands,
    handleSearch: handleBrandSearch,
    searchTerm: brandSearchTerm,
  } = useBrandData();
  useEffect(() => {
    if (category) {
      setCategories(category);
    }
  }, [category]);
  // ========== Render Components ==========
  const renderProductCard = (product: Product) => (
    <Card key={product.id} className="h-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2">{product.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{product.model}</p>
            <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
          </div>
          {product.brand && (
            <Badge variant="secondary" className="ml-2">
              {product.brand.name}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Category and Specifications */}
        {product.subcategory && (
          <div className="text-sm">
            <span className="font-medium">{product.subcategory.category.name}</span>
            <span className="text-muted-foreground"> → {product.subcategory.name}</span>
          </div>
        )}

        {/* Stock Information */}
        {product.stock && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Available:</span>
              <span className={product.stock.is_low_stock ? 'text-red-600 font-medium' : 'text-green-600'}>
                {product.stock.available_quantity} units
              </span>
            </div>

            {product.stock.is_low_stock && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Low stock! Reorder threshold: {product.stock.low_stock_threshold}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Pricing */}
        {product.pricing && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Retail Price:</span>
              <span className="font-bold text-lg">
                {product.pricing.currency} {product.pricing.retail_price.toFixed(2)}
              </span>
            </div>

            {product.pricing.wholesale_price && (
              <div className="flex justify-between">
                <span className="text-sm font-medium">Wholesale:</span>
                <span className="text-sm">
                  {product.pricing.currency} {product.pricing.wholesale_price.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => addToCart(product, 'retail')}
            disabled={!product.stock || product.stock.available_quantity <= 0}
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add to Cart
          </Button>

          {product.pricing?.wholesale_price && (
            <Button
              onClick={() => addToCart(product, 'wholesale')}
              disabled={!product.stock || product.stock.available_quantity <= 0}
              variant="outline"
              size="sm"
            >
              Wholesale
            </Button>
          )}
        </div>

        {/* Specifications */}
        {product.specifications.length > 0 && (
          <div className="pt-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full">
                  <Package className="h-4 w-4 mr-1" />
                  View Specs
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{product.name} - Specifications</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  {product.specifications.map(spec => (
                    <div key={spec.id} className="flex justify-between">
                      <span className="font-medium">{spec.spec_name}:</span>
                      <span>{spec.spec_value} {spec.spec_unit}</span>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const renderProductTable = () => (
    
  <div className="rounded-md border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[250px]">Product</TableHead>
          <TableHead className="w-[100px]">Brand</TableHead>
          <TableHead className="w-[150px]">Category</TableHead>
          <TableHead className="w-[100px]">Stock</TableHead>
          <TableHead className="w-[120px]">Pricing</TableHead>
          <TableHead className="w-[150px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.id}>
            <TableCell className="font-medium">
              <div className="space-y-1">
                <div className="font-medium text-sm">{product.name}</div>
                <div className="text-xs text-muted-foreground">{product.model}</div>
                <div className="text-xs text-muted-foreground">SKU: {product.sku}</div>
              </div>
            </TableCell>
            
            <TableCell>
              {product.brand && (
                <Badge variant="secondary" className="text-xs">
                  {product.brand.name}
                </Badge>
              )}
            </TableCell>
            
            <TableCell>
              {product.subcategory && (
                <div className="space-y-1">
                  <div className="text-xs font-medium">{product.subcategory.category.name}</div>
                  <div className="text-xs text-muted-foreground">{product.subcategory.name}</div>
                </div>
              )}
            </TableCell>
            
            <TableCell>
              {product.stock && (
                <div className="space-y-1">
                  <div className={`text-xs font-medium ${
                    product.stock.is_low_stock ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {product.stock.available_quantity}
                  </div>
                  {product.stock.is_low_stock && (
                    <Badge variant="destructive" className="text-xs">
                      Low
                    </Badge>
                  )}
                </div>
              )}
            </TableCell>
            
            <TableCell>
              {product.pricing && (
                <div className="space-y-1">
                  <div className="text-xs font-medium">
                    {product.pricing.currency} {product.pricing.retail_price.toFixed(2)}
                  </div>
                  {product.pricing.wholesale_price && (
                    <div className="text-xs text-muted-foreground">
                      W: {product.pricing.currency} {product.pricing.wholesale_price.toFixed(2)}
                    </div>
                  )}
                </div>
              )}
            </TableCell>
            
            <TableCell>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  onClick={() => addToCart(product, 'retail')}
                  disabled={!product.stock || product.stock.available_quantity <= 0}
                  className="h-8 px-2 text-xs"
                >
                  <Plus className="h-3 w-3" />
                </Button>
                
                {product.pricing?.wholesale_price && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addToCart(product, 'wholesale')}
                    disabled={!product.stock || product.stock.available_quantity <= 0}
                    className="h-8 px-2 text-xs"
                  >
                    W
                  </Button>
                )}
                
                {product.specifications.length > 0 && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 px-2">
                        <Package className="h-3 w-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{product.name} - Specifications</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-2">
                        {product.specifications.map(spec => (
                          <div key={spec.id} className="flex justify-between text-sm">
                            <span className="font-medium">{spec.spec_name}:</span>
                            <span>{spec.spec_value} {spec.spec_unit}</span>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
)

  const renderCartItem = (item: CartItem) => (
    <div key={`${item.product.id}-${item.price_type}`} className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex-1">
        <h4 className="font-medium">{item.product.name}</h4>
        <p className="text-sm text-muted-foreground">{item.product.model}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant={item.price_type === 'wholesale' ? 'default' : 'secondary'}>
            {item.price_type}
          </Badge>
          <span className="text-sm font-medium">
            {item.product.pricing?.currency} {item.selected_price.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => updateCartQuantity(item.product.id, item.price_type, item.quantity - 1)}
        >
          <Minus className="h-3 w-3" />
        </Button>

        <span className="w-8 text-center">{item.quantity}</span>

        <Button
          size="sm"
          variant="outline"
          onClick={() => updateCartQuantity(item.product.id, item.price_type, item.quantity + 1)}
        >
          <Plus className="h-3 w-3" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => removeFromCart(item.product.id, item.price_type)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      <div className="ml-4 text-right">
        <div className="font-medium">
          {item.product.pricing?.currency} {item.subtotal.toFixed(2)}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      <div className="flex">
        {/* Main Product Area */}
        <div className={`flex-1 p-6 transition-all duration-300 ${isCartVisible ? 'mr-96' : 'mr-0'}`}>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold">POS System</h1>

              {/* Cart Toggle Button */}
              <button
                onClick={() => setIsCartVisible(!isCartVisible)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                {isCartVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {isCartVisible ? 'Hide Cart' : 'Show Cart'}
                <ShoppingCart className="h-4 w-4" />
                {cart.length > 0 && (
                  <span className="bg-red-500 text-white rounded-full px-2 py-1 text-xs">
                    {getCartItemCount()}
                  </span>
                )}
              </button>
            </div>

            {/* Search and Filters */}
            {/* Search and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Search by product name */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Barcode Scanner Input */}
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Scan barcode..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && scanBarcode(barcodeInput)}
                  className="pl-10"
                />
              </div>

              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                  {categories?.data?.categories.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id}
                      className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Subcategory Filter */}
              <Select
                value={selectedSubCategory}
                onValueChange={setSelectedSubCategory}
                disabled={!selectedCategory}
              >
                <SelectTrigger className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                  <SelectValue placeholder="Select a subcategory" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                  {availableSubcategories.map((subcategory) => (
                    <SelectItem
                      key={subcategory.subcategory_id}
                      value={subcategory.subcategory_id}
                      className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {subcategory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Brand Filter */}
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                  <SelectValue placeholder="Select a brand" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                  {brands?.data?.brands.map((brand) => (
                    <SelectItem
                      key={brand.id}
                      value={brand.id}
                      className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {brand.name} ({brand.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* View Options */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  <List className="h-4 w-4" />
                  Table
                </Button>
                <Button
                  variant={showLowStock ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowLowStock(!showLowStock)}
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Low Stock
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                {pagination.total} products found
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Products Grid - Updated responsive classes */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {viewMode === 'table' ? (
                renderProductTable()
              ) : (
                <div className={`${viewMode === 'grid'
                  ? `grid gap-6 ${isCartVisible
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  }`
                  : 'space-y-4'
                  }`}>
                  {products.map(renderProductCard)}
                </div>
              )}
            </>
          )}

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <Button
                variant="outline"
                disabled={!pagination.has_prev}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </Button>

              <span className="text-sm">
                Page {pagination.page} of {pagination.total_pages}
              </span>

              <Button
                variant="outline"
                disabled={!pagination.has_next}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Cart Sidebar - Updated with conditional rendering */}
        <div className={`w-96 border-l shadow-lg transition-all duration-300 ${isCartVisible ? 'translate-x-0' : 'translate-x-full'
          } fixed right-0 top-0 h-full  z-10`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Cart ({getCartItemCount()})
              </h2>
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearCart}>
                    Clear All
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCartVisible(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="h-96">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Your cart is empty</p>
                  <p className="text-sm">Add products to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map(renderCartItem)}
                </div>
              )}
            </ScrollArea>

            {cart.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-2xl font-bold">
                    LKR {getCartTotal().toFixed(2)}
                  </span>
                </div>

                <div className="space-y-2">
                  <Button className="w-full" size="lg">
                    Proceed to Checkout
                  </Button>
                  <Button variant="outline" className="w-full">
                    Hold Transaction
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default POSSystem