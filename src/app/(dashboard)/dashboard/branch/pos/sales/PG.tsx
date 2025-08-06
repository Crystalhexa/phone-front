'use client'
import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import {
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
  Search,
  X,
  Percent
} from 'lucide-react'
import { useSalesOrder } from '@/hooks/useSalesOrder'
import { BarcodeInput } from '@/components/sales/BarcodeInput'
import { toast } from 'sonner'
import { CustomerForm } from '@/components/sales/CustomerForm'
import { useRouter } from 'next/navigation'

const QuantitySelector = ({ value, onChange, max, label }: any) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <Input
      type="number"
      min="1"
      max={max}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value) || 1)}
    />
  </div>
)


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

interface Barcode {
  barcode_id: string
  barcode: string
  cost_price: number
  wholesale_price?: number
  retail_price?: number
}

interface Batches {
    batch_id: string
    quantity: number
    cost_price?: number
    retial_price?: number
    wholesale_price?: number
    batch_number: string
}
interface CartItem {
  type: 'INDIVIDUAL' | 'BATCH'
  product_id: string
  product_name: string
  sku: string
  wholesale_quantity?: number
  unit_price: number
  discount_percentage: number // Changed from discount to discount_percentage
  discount_amount?: number // New field for calculated discount amount
  item_barcodes?: Barcode[]
  batches?: Batches[]
  total_quantity: number
  line_total: number
  max_quantity?: number
}

interface Customer {
  customer_id?: string
  name?: string
  email?: string
  phone?: string
  nic?: string
  customer_type?: 'RETAIL' | 'WHOLESALE' | 'CORPORATE' | 'DISTRIBUTOR' | 'VIP'
}

// Utility functions
const formatCurrency = (amount: number) => `Rs. ${amount.toFixed(2)}`

const calculateOrderTotals = (cart: CartItem[], orderDiscount: number = 0) => {
  const subtotal = cart.reduce((sum, item) => sum + (item.unit_price * item.total_quantity), 0)
  const itemDiscounts = cart.reduce((sum, item) => sum + (item.discount_amount || 0), 0)
  const total = subtotal - itemDiscounts - orderDiscount
  const totalQuantity = cart.reduce((sum, item) => sum + item.total_quantity, 0)
  
  return {
    subtotal,
    itemDiscounts,
    orderDiscount,
    total: Math.max(0, total),
    totalQuantity
  }
}

export default function SalesOrderPage({ user }: any) {

  const route = useRouter();
  const [cart, setCart] = useState<CartItem[]>([])
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [quantityInput, setQuantityInput] = useState(1)
  const [customer, setCustomer] = useState<Customer>({})
  const [orderDiscount, setOrderDiscount] = useState(0)
  const [orderNotes, setOrderNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [paymentStatus, setPaymentStatus] = useState('PAID')
  const [scannedBarcodes, setScannedBarcodes] = useState<Set<string>>(new Set()) // Track scanned barcodes

  console.log("ds",cart)
  console.log("scannedBarcodes", scannedBarcodes) 
  // Dialog states
  const [showCustomerDialog, setShowCustomerDialog] = useState(false)

  // Hooks
  const { scanProduct, placeOrder, isLoading } = useSalesOrder()

  // Handle barcode scanning with duplicate check
  const handleScanProduct = useCallback(async () => {
    if (!barcodeInput.trim()) {
      toast.error('Please enter a barcode')
      return
    }

    const barcode = barcodeInput.trim()
    
    // Check if barcode already scanned
    if (scannedBarcodes.has(barcode)) {
      toast.error('This barcode has already been scanned!')
      setBarcodeInput('')
      return
    }

    try {
      const product = await scanProduct(barcode)
      setScannedProduct(product)
      setBarcodeInput('')
      setQuantityInput(1)

      toast.success(`Product scanned: ${product.name}`)

      // Auto-add individual items to cart
      if (!product.requires_quantity_input) {
        handleAddToCart(product, 1)
        setScannedProduct(null) // Reset scanned product after adding to cart
        
      }
    } catch (error: any) {
      toast.error(error.message || 'Product not found')
      setScannedProduct(null)
    }
  }, [barcodeInput, scanProduct, scannedBarcodes])

  // Calculate discount amount from percentage
  const calculateDiscountAmount = (unitPrice: number, quantity: number, discountPercentage: number) => {
    const subtotal = unitPrice * quantity
    return (subtotal * discountPercentage) / 100
  }

  // Add product to cart
  const handleAddToCart = useCallback((product: ScannedProduct | null = scannedProduct, quantity: number = quantityInput) => {
    console.log(product, quantity)
    if (!product) return

    // Add barcode to scanned set
    setScannedBarcodes(prev => new Set(prev).add(product.barcode))

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
        unit_price: product.pricing.retail_price,
        discount_percentage: 0,
        discount_amount: 0,
        item_barcodes: [{barcode_id:product.barcode_id!, barcode: product.barcode, cost_price: product.pricing.cost_price, retail_price: product.pricing.retail_price,wholesale_price:product.pricing.wholesale_price}],
        total_quantity: 1,
        line_total: product.pricing.retail_price
      }

      if (existingItemIndex >= 0) {
        const updatedCart = [...cart]
        updatedCart[existingItemIndex].item_barcodes!.push({ barcode_id: product.barcode_id!,barcode: product.barcode, cost_price: product.pricing.cost_price, retail_price: product.pricing.retail_price, wholesale_price: product.pricing.wholesale_price})
        updatedCart[existingItemIndex].total_quantity += 1
        
        // Recalculate discount and line total
        const discountAmount = calculateDiscountAmount(
          updatedCart[existingItemIndex].unit_price,
          updatedCart[existingItemIndex].total_quantity,
          updatedCart[existingItemIndex].discount_percentage
        )
        updatedCart[existingItemIndex].discount_amount = discountAmount
        updatedCart[existingItemIndex].line_total =
          (updatedCart[existingItemIndex].unit_price * updatedCart[existingItemIndex].total_quantity) - discountAmount
        
        setCart(updatedCart)
      } else {
        setCart([...cart, cartItem])
      }
    } else {
      if (quantity <= 0 || quantity > (product.max_quantity || 0)) {
        toast.error(`Please enter a valid quantity (1-${product.max_quantity})`)
        return
      }

      const cartItem: CartItem = {
        type: 'BATCH',
        product_id: product.product_id,
        product_name: product.name,
        sku: product.sku,
        unit_price: product.pricing.selling_price,
        discount_percentage: 0,
        discount_amount: 0,
        batches: [{
          batch_id: product.inventory.fifo_next_batch!.batch_id,
          quantity: quantity,
          batch_number: product.inventory.fifo_next_batch!.batch_number
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
        
        // Recalculate discount and line total
        const discountAmount = calculateDiscountAmount(
          existingItem.unit_price,
          existingItem.total_quantity,
          existingItem.discount_percentage
        )
        existingItem.discount_amount = discountAmount
        existingItem.line_total = (existingItem.unit_price * existingItem.total_quantity) - discountAmount
        
        setCart(updatedCart)
      } else {
        setCart([...cart, cartItem])
      }
    }

    setScannedProduct(null)
    setQuantityInput(1)
    toast.success('Item added to cart')
  }, [cart, quantityInput, scannedProduct])

  // Remove item from cart and remove its barcodes from scanned set
  const handleRemoveFromCart = useCallback((index: number) => {
    const item = cart[index]
    console.log('Removing item:', index)
    // Remove barcodes from scanned set
    if (item.item_barcodes) {
      const newScannedBarcodes = new Set(scannedBarcodes)
      setScannedBarcodes(newScannedBarcodes)
    }
    const updatedCart = cart.filter((_, i) => i !== index)
    setCart(updatedCart)
    toast.success('Item removed from cart')
  }, [cart, scannedBarcodes])

  // Update item discount percentage
  const handleUpdateItemDiscountPercentage = useCallback((itemIndex: number, discountPercentage: number) => {
    const updatedCart = [...cart]
    const item = updatedCart[itemIndex]
    
    // Ensure discount percentage is between 0 and 100
    const validDiscountPercentage = Math.min(Math.max(0, discountPercentage), 100)
    
    // Calculate discount amount
    const discountAmount = calculateDiscountAmount(item.unit_price, item.total_quantity, validDiscountPercentage)
    
    updatedCart[itemIndex].discount_percentage = validDiscountPercentage
    updatedCart[itemIndex].discount_amount = discountAmount
    updatedCart[itemIndex].line_total = (item.unit_price * item.total_quantity) - discountAmount

    setCart(updatedCart)
  }, [cart])

  // Calculate totals
  const totals = calculateOrderTotals(cart, orderDiscount)

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

    const orderData = {
      customer: Object.keys(customer).length > 0 ? customer : undefined,
      items: cart,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      discount: orderDiscount,
      notes: orderNotes.trim() || undefined
    }
    
    try {
      const order = await placeOrder(orderData)
      toast.success('Order placed successfully!')

      // Reset form
      setCart([])
      setCustomer({})
      setOrderDiscount(0)
      setOrderNotes('')
      setScannedProduct(null)
      setScannedBarcodes(new Set()) // Reset scanned barcodes

      console.log('Order created:', order)
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order')
    }
  }, [cart, customer, orderDiscount, orderNotes, paymentMethod, paymentStatus, totals, placeOrder])

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg">
              <Button variant="ghost" size="sm" onClick={()=>{route.back()}}>
                <X className="w-4 h-4" />
              </Button>
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
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
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
                  autoScan={true}
                  autoScanDelay={300}
                  minBarcodeLength={8}
                />

                {/* Scanned Product Display */}
                {scannedProduct && (
                  <Card className="border-green-200 bg-background/50 dark:bg-background/80">
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
                          </div>
                          <div className="text-right space-y-1">
                            <Badge variant={scannedProduct.scan_type === 'INDIVIDUAL_ITEM' ? 'default' : 'secondary'}>
                              {scannedProduct.scan_type === 'INDIVIDUAL_ITEM' ? 'Individual' : 'Batch'}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Price:</span>
                            <div className="font-bold text-lg text-foreground">{formatCurrency(scannedProduct.pricing.selling_price)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Available:</span>
                            <div className="font-bold text-lg text-foreground">{scannedProduct.inventory.available_quantity}</div>
                          </div>
                        </div>

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
                        setScannedBarcodes(new Set())
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
                                    {item.sku}
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

                              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                                <div className="space-y-1">
                                  <span className="text-muted-foreground">Quantity</span>
                                  <div className="font-bold">{item.total_quantity}</div>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-muted-foreground">Unit Price</span>
                                  <div className="font-bold">{formatCurrency(item.unit_price)}</div>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-muted-foreground">Discount %</span>
                                  <div className="font-bold text-orange-600">{item.discount_percentage.toFixed(1)}%</div>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-muted-foreground">Discount Amount</span>
                                  {/* <div className="font-bold text-orange-600">{formatCurrency(item.discount_amount)}</div> */}
                                </div>
                                <div className="space-y-1">
                                  <span className="text-muted-foreground">Line Total</span>
                                  <div className="font-bold text-lg">{formatCurrency(item.line_total)}</div>
                                </div>
                              </div>

                              {/* Discount Percentage Input */}
                              <div className="flex items-center gap-2 pt-2 border-t">
                                <Label className="text-sm">Discount %:</Label>
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={item.discount_percentage}
                                    onChange={(e) => handleUpdateItemDiscountPercentage(index, parseFloat(e.target.value) || 0)}
                                    className="w-20 h-8 text-sm"
                                    placeholder="0"
                                  />
                                  <Percent className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {/* Per item: {formatCurrency((item.discount_amount / item.total_quantity) || 0)} */}
                                </span>
                              </div>
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
                  <Button variant="outline" className="w-full">
                    <Edit className="w-4 h-4 mr-2" />
                    Order Discount: {formatCurrency(orderDiscount)}
                  </Button>

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
          </div>
        </div>
      </div>
    </div>
  )
}