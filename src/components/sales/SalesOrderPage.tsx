'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  ShoppingCart, 
  Scan, 
  User, 
  CreditCard, 
  Package, 
  Settings,
  Receipt,
  Trash2,
  Edit,
  Plus,
  History,
  Search
} from 'lucide-react'
import { toast } from 'sonner'

// Import our custom components
import { BarcodeInput } from '@/components/sales/BarcodeInput'
import { QuantitySelector } from '@/components/sales/QuantitySelector'
import { PaymentMethodSelector } from '@/components/sales/PaymentMethodSelector'
import { CustomerForm } from '@/components/sales/CustomerForm'
import { DiscountCalculator } from '@/components/sales/DiscountCalculator'

// Import utilities
import { useSalesOrder } from '@/hooks/useSalesOrder'
import { 
  calculateOrderTotals, 
  formatCurrency, 
  transformCartToAPIFormat,
  type CartItem,
  type OrderTotals
} from '@/lib/utils/salesCalculations'
import { 
  saveCartToStorage, 
  loadCartFromStorage, 
  clearCartFromStorage,
  saveCustomerToStorage,
  loadCustomerFromStorage
} from '@/lib/utils/localStorage'
import { printReceipt, type ReceiptData } from '@/lib/utils/print'

// Types
interface ScannedProduct {
  barcode_id?: string
  barcode: string
  scan_type: 'INDIVIDUAL_ITEM' | 'PRODUCT_LEVEL'
  product_id: string
  name: string
  model: string
  sku: string
  wholesale_quantity?: number
  brand?: {
    name: string
    code: string
  }
  category?: {
    category: string
    subcategory: string
  }
  pricing: {
    cost_price: number
    wholesale_price?: number
    retail_price: number
    selling_price: number
  }
  inventory: {
    available_quantity: number
    is_low_stock: boolean
    total_batches?: number
    fifo_next_batch?: {
      batch_id: string
      batch_number: string
      available_quantity: number
      expiry_date?: string
    }
  }
  item_details?: {
    item_id: string
    status: string
    condition: string
    warranty_expiry?: string
    location_branch: string
    purchased_at: string
    supplier_name?: string
  }
  batch_info?: any
  requires_quantity_input: boolean
  max_quantity?: number
  warranty_period?: number
}

interface Customer {
  customer_id?: string
  name?: string
  email?: string
  phone?: string
  nic?: string
  customer_type?: 'RETAIL' | 'WHOLESALE' | 'CORPORATE' | 'DISTRIBUTOR' | 'VIP'
}

export default function SalesOrderPage({user}:any) {
  // State management

  const [cart, setCart] = useState<CartItem[]>([])
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [quantityInput, setQuantityInput] = useState(1)
  const [customer, setCustomer] = useState<Customer>({})
  const [orderDiscount, setOrderDiscount] = useState(0)
  const [orderNotes, setOrderNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [paymentStatus, setPaymentStatus] = useState('PAID')
  
  // Dialog states
  const [showCustomerDialog, setShowCustomerDialog] = useState(false)
  const [showDiscountDialog, setShowDiscountDialog] = useState(false)
  const [showSettingsSheet, setShowSettingsSheet] = useState(false)
  
  // Hooks
  const { scanProduct, placeOrder, isLoading } = useSalesOrder()

  // Load persisted data on mount
  useEffect(() => {
    const savedCart = loadCartFromStorage()
    const savedCustomer = loadCustomerFromStorage()
    
    if (savedCart.length > 0) {
      setCart(savedCart)
      toast.info(`Restored ${savedCart.length} items from previous session`)
    }
    
    if (savedCustomer && Object.keys(savedCustomer).length > 0) {
      setCustomer(savedCustomer)
    }
  }, [])

  // Auto-save cart and customer
  useEffect(() => {
    saveCartToStorage(cart)
  }, [cart])

  useEffect(() => {
    saveCustomerToStorage(customer)
  }, [customer])

  // Handle barcode scanning
  const handleScanProduct = useCallback(async () => {
    if (!barcodeInput.trim()) {
      toast.error('Please enter a barcode')
      return
    }

    try {
      const product = await scanProduct(barcodeInput.trim())
      setScannedProduct(product)
      setBarcodeInput('')
      setQuantityInput(1)
      
      toast.success(`Product scanned: ${product.name}`)
      
      // Auto-add individual items to cart
      if (!product.requires_quantity_input) {
        handleAddToCart(product, 1)
      }
    } catch (error: any) {
      toast.error(error.message || 'Product not found')
      setScannedProduct(null)
    }
  }, [barcodeInput, scanProduct])

  // Add product to cart
  const handleAddToCart = useCallback((product: ScannedProduct | null = scannedProduct, quantity: number = quantityInput) => {
    if (!product) return

    const existingItemIndex = cart.findIndex(item => 
      item.product_id === product.product_id && 
      item.type === (product.scan_type === 'INDIVIDUAL_ITEM' ? 'INDIVIDUAL' : 'BATCH')
    )

    if (product.scan_type === 'INDIVIDUAL_ITEM') {
      // Individual item
      const cartItem: CartItem = {
        type: 'INDIVIDUAL',
        product_id: product.product_id,
        product_name: product.name,
        sku: product.sku,
        model: product.model,
        brand: product.brand?.name,
        unit_price: product.pricing.selling_price,
        discount: 0,
        item_barcodes: [product.barcode_id!],
        item_details: [{
          item_id: product.item_details!.item_id,
          barcode: product.barcode,
          condition: product.item_details!.condition
        }],
        total_quantity: 1,
        line_total: product.pricing.selling_price
      }

      if (existingItemIndex >= 0) {
        // Add to existing individual item group
        const updatedCart = [...cart]
        updatedCart[existingItemIndex].item_barcodes!.push(product.barcode_id!)
        updatedCart[existingItemIndex].item_details!.push({
          item_id: product.item_details!.item_id,
          barcode: product.barcode,
          condition: product.item_details!.condition
        })
        updatedCart[existingItemIndex].total_quantity += 1
        updatedCart[existingItemIndex].line_total = 
          (updatedCart[existingItemIndex].unit_price * updatedCart[existingItemIndex].total_quantity) - 
          updatedCart[existingItemIndex].discount
        setCart(updatedCart)
      } else {
        setCart([...cart, cartItem])
      }
    } else {
      // Batch item
      if (quantity <= 0 || quantity > (product.max_quantity || 0)) {
        toast.error(`Please enter a valid quantity (1-${product.max_quantity})`)
        return
      }

      const cartItem: CartItem = {
        type: 'BATCH',
        product_id: product.product_id,
        product_name: product.name,
        sku: product.sku,
        model: product.model,
        brand: product.brand?.name,
        unit_price: product.pricing.selling_price,
        discount: 0,
        batches: [{
          batch_id: product.inventory.fifo_next_batch!.batch_id,
          quantity: quantity,
          batch_number: product.inventory.fifo_next_batch!.batch_number,
          expiry_date: product.inventory.fifo_next_batch!.expiry_date
        }],
        total_quantity: quantity,
        line_total: product.pricing.selling_price * quantity,
        max_quantity: product.max_quantity
      }

      if (existingItemIndex >= 0) {
        // Update existing batch item
        const updatedCart = [...cart]
        const existingItem = updatedCart[existingItemIndex]
        const existingBatch = existingItem.batches?.find(b => 
          b.batch_id === product.inventory.fifo_next_batch!.batch_id
        )

        if (existingBatch) {
          existingBatch.quantity += quantity
        } else {
          existingItem.batches!.push(cartItem.batches![0])
        }

        existingItem.total_quantity += quantity
        existingItem.line_total = 
          (existingItem.unit_price * existingItem.total_quantity) - existingItem.discount
        setCart(updatedCart)
      } else {
        setCart([...cart, cartItem])
      }
    }

    setScannedProduct(null)
    setQuantityInput(1)
    toast.success('Item added to cart')
  }, [cart, quantityInput, scannedProduct])

  // Remove item from cart
  const handleRemoveFromCart = useCallback((index: number) => {
    const updatedCart = cart.filter((_, i) => i !== index)
    setCart(updatedCart)
    toast.success('Item removed from cart')
  }, [cart])

  // Update item discount
  const handleUpdateItemDiscount = useCallback((itemIndex: number, discount: number) => {
    const updatedCart = [...cart]
    const maxDiscount = updatedCart[itemIndex].unit_price * updatedCart[itemIndex].total_quantity
    
    updatedCart[itemIndex].discount = Math.min(Math.max(0, discount), maxDiscount)
    updatedCart[itemIndex].line_total = 
      (updatedCart[itemIndex].unit_price * updatedCart[itemIndex].total_quantity) - 
      updatedCart[itemIndex].discount
    
    setCart(updatedCart)
  }, [cart])

  // Calculate totals
  const totals: OrderTotals = calculateOrderTotals(cart, orderDiscount)

  // Place order
  const handlePlaceOrder = useCallback(async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty')
      return
    }

    if (totals.total <= 0) {
      toast.error('Order total must be greater than 0')
      return
    }

    // Validate order data
    const orderData = {
      customer: Object.keys(customer).length > 0 ? customer : undefined,
      items: transformCartToAPIFormat(cart),
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      discount: orderDiscount,
      notes: orderNotes.trim() || undefined
    }
    try {
      const order = await placeOrder(orderData)
      
      toast.success('Order placed successfully!')
      
      // Generate receipt data
      const receiptData: ReceiptData = {
        orderNumber: order.order_number || 'N/A',
        date: new Date().toLocaleDateString(),
        customerName: customer.name,
        items: cart.map(item => ({
          name: item.product_name,
          quantity: item.total_quantity,
          unitPrice: item.unit_price,
          total: item.line_total
        })),
        subtotal: totals.subtotal,
        discount: totals.itemDiscounts + totals.orderDiscount,
        total: totals.total,
        paymentMethod: paymentMethod,
        cashier: 'Current User' // You can get this from auth context
      }
      
      // Print receipt
        printReceipt(receiptData, user)
      
      
      // Reset form
      setCart([])
      setCustomer({})
      setOrderDiscount(0)
      setOrderNotes('')
      setScannedProduct(null)
      clearCartFromStorage()
      
      // Could redirect to order details page
      console.log('Order created:', order)
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order')
    }
  }, [cart, customer, orderDiscount, orderNotes, paymentMethod, paymentStatus, totals, placeOrder])

  return (
    <div className="min-h-screen ">
      {/* Header */}
      <div className=" border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2  rounded-lg">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Sales Order</h1>
              <p className="text-sm text-muted-foreground">Scan products and create orders</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-sm">
              Items: {cart.length} | Qty: {totals.totalQuantity}
            </Badge>
            
            <Sheet open={showSettingsSheet} onOpenChange={setShowSettingsSheet}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Sales Settings</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 mt-6">
                  <PaymentMethodSelector
                    value={paymentMethod}
                    onChange={setPaymentMethod}
                  />
                  <div className="space-y-2">
                    <Label>Default Payment Status</Label>
                    <select 
                      value={paymentStatus} 
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="w-full p-2 border rounded"
                    >
                      <option value="PAID">Paid</option>
                      <option value="PENDING">Pending</option>
                      <option value="PARTIAL">Partial</option>
                    </select>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Scanner & Cart */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Scanner */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scan className="w-5 h-5" />
                  Product Scanner
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <BarcodeInput
                  value={barcodeInput}
                  onChange={setBarcodeInput}
                  onScan={handleScanProduct}
                  isScanning={isLoading}
                />

              {/* Scanned Product Display */}
                {scannedProduct && (
                  <Card className="border-green-200 bg-background/50 dark:bg-background/80 ">
                    <CardContent className="pt-4">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <h3 className="font-semibold text-green-800 dark:text-green-200">
                              {scannedProduct.name}
                            </h3>
                            <p className="text-sm text-green-600 dark:text-green-400">
                              {scannedProduct.sku} • {scannedProduct.model}
                              {scannedProduct.brand && ` • ${scannedProduct.brand.name}`}
                            </p>
                            {scannedProduct.category && (
                              <p className="text-xs text-green-500 dark:text-green-400">
                                {scannedProduct.category.category} → {scannedProduct.category.subcategory}
                              </p>
                            )}
                          </div>
                          <div className="text-right space-y-1">
                            <Badge variant={scannedProduct.scan_type === 'INDIVIDUAL_ITEM' ? 'default' : 'secondary'}>
                              {scannedProduct.scan_type === 'INDIVIDUAL_ITEM' ? 'Individual' : 'Batch'}
                            </Badge>
                            {scannedProduct.inventory.is_low_stock && (
                              <Badge variant="destructive" className="text-xs block">
                                Low Stock
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Price:</span>
                            <div className="font-bold text-lg text-foreground">{formatCurrency(scannedProduct.pricing.selling_price)}</div>
                            {scannedProduct.pricing.retail_price !== scannedProduct.pricing.selling_price && (
                              <div className="text-xs text-muted-foreground line-through">
                                {formatCurrency(scannedProduct.pricing.retail_price)}
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Available:</span>
                            <div className="font-bold text-lg text-foreground">{scannedProduct.inventory.available_quantity}</div>
                            {scannedProduct.inventory.total_batches && (
                              <div className="text-xs text-muted-foreground">
                                {scannedProduct.inventory.total_batches} batches
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Batch Information */}
                        {scannedProduct.inventory.fifo_next_batch && (
                          <div className="bg-background/50 dark:bg-background/80 rounded p-3 text-sm space-y-2 border border-border">
                            <div className="font-medium text-foreground">Next Batch (FIFO):</div>
                            <div className="flex justify-between text-foreground">
                              <span>Batch: {scannedProduct.inventory.fifo_next_batch.batch_number}</span>
                              <span>Qty: {scannedProduct.inventory.fifo_next_batch.available_quantity}</span>
                            </div>
                            {scannedProduct.inventory.fifo_next_batch.expiry_date && (
                              <div className="text-orange-600 dark:text-orange-400">
                                Expires: {new Date(scannedProduct.inventory.fifo_next_batch.expiry_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Individual Item Information */}
                        {scannedProduct.item_details && (
                          <div className="bg-background dark:bg-background/50 rounded p-3 text-sm space-y-2 border border-border">
                            <div className="font-medium text-foreground">Item Details:</div>
                            <div className="grid grid-cols-2 gap-2">
                              <span className="text-foreground">Condition: <Badge variant="outline" className="text-xs">{scannedProduct.item_details.condition}</Badge></span>
                              <span className="text-foreground">Status: <Badge variant="outline" className="text-xs">{scannedProduct.item_details.status}</Badge></span>
                            </div>
                            {scannedProduct.item_details.warranty_expiry && (
                              <div className="text-blue-600 dark:text-blue-400">
                                Warranty until: {new Date(scannedProduct.item_details.warranty_expiry).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Quantity Input for Batch Items */}
                        {scannedProduct.requires_quantity_input && (
                          <QuantitySelector
                            value={quantityInput}
                            onChange={setQuantityInput}
                            max={scannedProduct.max_quantity || 999}
                            label="Quantity"
                          />
                        )}

                        <Button onClick={() => handleAddToCart()} className="w-full" size="lg">
                          <Plus className="w-4 h-4 mr-2" />
                          Add to Cart
                          {scannedProduct.requires_quantity_input && quantityInput > 1 && ` (${quantityInput} items)`}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            {/* Cart Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Cart Items ({cart.length})</span>
                  {cart.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCart([])
                        toast.success('Cart cleared')
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Clear All
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">No items in cart</p>
                    <p className="text-sm">Scan products to add them to your cart</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {cart.map((item, index) => (
                        <Card key={`${item.product_id}_${index}`} className="border-l-4 border-l-blue-500">
                          <CardContent className="pt-4">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1 flex-1">
                                  <h4 className="font-medium">{item.product_name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {item.sku} • {item.model}
                                    {item.brand && ` • ${item.brand}`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={item.type === 'INDIVIDUAL' ? 'default' : 'secondary'}>
                                    {item.type === 'INDIVIDUAL' ? 'Individual' : 'Batch'}
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRemoveFromCart(index)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div className="space-y-1">
                                  <span className="text-muted-foreground">Quantity</span>
                                  <div className="font-bold">{item.total_quantity}</div>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-muted-foreground">Unit Price</span>
                                  <div className="font-bold">{formatCurrency(item.unit_price)}</div>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-muted-foreground">Discount</span>
                                  <div className="font-bold text-orange-600">{formatCurrency(item.discount)}</div>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-muted-foreground">Line Total</span>
                                  <div className="font-bold text-lg">{formatCurrency(item.line_total)}</div>
                                </div>
                              </div>

                              {/* Discount Input */}
                              <div className="flex items-center gap-2 pt-2 border-t">
                                <Label className="text-sm">Item Discount:</Label>
                                <div className="flex items-center gap-1">
                                  <span className="text-sm">Rs.</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    max={item.unit_price * item.total_quantity}
                                    value={item.discount}
                                    onChange={(e) => handleUpdateItemDiscount(index, parseFloat(e.target.value) || 0)}
                                    className="w-24 h-8 text-sm border rounded px-2"
                                    placeholder="0.00"
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  Max: {formatCurrency(item.unit_price * item.total_quantity)}
                                </span>
                              </div>

                              {/* Item Details Expandable */}
                              {(item.item_details || item.batches) && (
                                <details className="text-xs">
                                  <summary className="cursor-pointer font-medium text-blue-600 hover:text-blue-700">
                                    {item.type === 'INDIVIDUAL' 
                                      ? `Individual Items (${item.item_details?.length})` 
                                      : `Batches (${item.batches?.length})`
                                    }
                                  </summary>
                                  <div className="mt-2 space-y-2">
                                    {item.type === 'INDIVIDUAL' && item.item_details?.map((detail, i) => (
                                      <div key={i} className="flex justify-between items-center  p-2 rounded">
                                        <span className="font-mono">{detail.barcode}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {detail.condition}
                                        </Badge>
                                      </div>
                                    ))}
                                    
                                    {item.type === 'BATCH' && item.batches?.map((batch, i) => (
                                      <div key={i} className=" p-2 rounded space-y-1">
                                        <div className="flex justify-between">
                                          <span className="font-medium">{batch.batch_number}</span>
                                          <span>Qty: {batch.quantity}</span>
                                        </div>
                                        {batch.expiry_date && (
                                          <div className="text-orange-600">
                                            Expires: {new Date(batch.expiry_date).toLocaleDateString()}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Summary & Actions */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                  </div>
                  {totals.itemDiscounts > 0 && (
                    <div className="flex justify-between text-orange-600">
                      <span>Item Discounts:</span>
                      <span className="font-medium">-{formatCurrency(totals.itemDiscounts)}</span>
                    </div>
                  )}
                  {totals.orderDiscount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Order Discount:</span>
                      <span className="font-medium">-{formatCurrency(totals.orderDiscount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span className="text-green-600">{formatCurrency(totals.total)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    Total Items: {totals.totalQuantity}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Dialog open={showDiscountDialog} onOpenChange={setShowDiscountDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Edit className="w-4 h-4 mr-2" />
                        Order Discount: {formatCurrency(orderDiscount)}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Order Discount</DialogTitle>
                      </DialogHeader>
                      <DiscountCalculator
                        originalAmount={totals.subtotal - totals.itemDiscounts}
                        currentDiscount={orderDiscount}
                        onDiscountChange={setOrderDiscount}
                      />
                      <Button 
                        onClick={() => setShowDiscountDialog(false)}
                        className="w-full mt-4"
                      >
                        Apply Discount
                      </Button>
                    </DialogContent>
                  </Dialog>

                  <PaymentMethodSelector
                    value={paymentMethod}
                    onChange={setPaymentMethod}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Customer
                  </span>
                  <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Customer Information</DialogTitle>
                      </DialogHeader>
                      <CustomerForm
                        customer={customer}
                        onChange={setCustomer}
                        onSave={() => setShowCustomerDialog(false)}
                      />
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {customer.name || customer.phone ? (
                  <div className="space-y-2 text-sm">
                    {customer.name && <div><strong>Name:</strong> {customer.name}</div>}
                    {customer.phone && <div><strong>Phone:</strong> {customer.phone}</div>}
                    {customer.email && <div><strong>Email:</strong> {customer.email}</div>}
                    <Badge variant="outline">{customer.customer_type || 'RETAIL'}</Badge>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Walk-in customer</p>
                )}
              </CardContent>
            </Card>

            {/* Order Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Order Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Add any notes for this order..."
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Place Order Button */}
            <Button 
              onClick={handlePlaceOrder}
              disabled={cart.length === 0 || isLoading}
              className="w-full h-14 text-lg"
              size="lg"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing Order...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Place Order - {formatCurrency(totals.total)}
                </div>
              )}
            </Button>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" disabled>
                <History className="w-4 h-4 mr-1" />
                Order History
              </Button>
              <Button variant="outline" size="sm" disabled>
                <Search className="w-4 h-4 mr-1" />
                Product Search
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}