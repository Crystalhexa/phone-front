'use client'
import React, { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CreditCard,
  Package,
  Receipt,
  Trash2,
  Edit,
  Plus,
  X,
  Percent,
  DollarSign,
  Clock,
  Info,
  AlertTriangle,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { useSalesOrder } from '@/hooks/useSalesOrder'
import { BarcodeInput } from '@/components/sales/BarcodeInput'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ProductPrice } from '@/components/pos/ProductPrice'
import { useAuth } from '@/hooks/useAuth'
import {
  STORAGE_KEYS,
  saveToStorage,
  loadFromStorage
} from '@/lib/utils/SalesOrderStorage'
import { CartItem, FIFOAllocationResult, ScannedProduct } from '@/types/sales'
import { FIFOAllocationPreview } from '@/components/sales/FIFOAllocationPreview'
import CustomerSelector from '@/components/pos/customer/CustomerSelector'
import { Customer } from '@/types/customer'
import { formatCurrency } from '@/lib/utils/formatCurrency'

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

export default function EnhancedSalesOrderPage() {

  const { user } = useAuth();
  const route = useRouter()
  const [cart, setCart] = useState<CartItem[]>([])
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [quantityInput, setQuantityInput] = useState(1)
  const [orderDiscount, setOrderDiscount] = useState(0)
  const [orderNotes, setOrderNotes] = useState('')
  const [scannedBarcodes, setScannedBarcodes] = useState<Set<string>>(new Set())
  const [currentAllocation, setCurrentAllocation] = useState<FIFOAllocationResult | null>(null)
  const [allocationError, setAllocationError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  // Hooks
  
  const { scanProduct, placeOrder, isLoading } = useSalesOrder()

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedCart = loadFromStorage(STORAGE_KEYS.CART, [])
    const savedCustomer = loadFromStorage(STORAGE_KEYS.CUSTOMER)
    const savedOrderDiscount = loadFromStorage(STORAGE_KEYS.ORDER_DISCOUNT, 0)
    const savedOrderNotes = loadFromStorage(STORAGE_KEYS.ORDER_NOTES, '')
    const savedScannedBarcodes = loadFromStorage(STORAGE_KEYS.SCANNED_BARCODES, [])
    if (savedCart.length > 0) {
      setCart(savedCart)
      toast.success(`Restored ${savedCart.length} items from previous session`)    }

    if (savedCustomer) {
      setSelectedCustomer(savedCustomer)
    }
    if (savedOrderDiscount > 0) {
      setOrderDiscount(savedOrderDiscount)
    }
    if (savedOrderNotes) {
      setOrderNotes(savedOrderNotes)
    }
    if (savedScannedBarcodes.length > 0) {
      setScannedBarcodes(new Set(savedScannedBarcodes))
    }
  }, [])
  // Auto-save cart changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CART, cart)
  }, [cart])

  // Auto-save customer changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CUSTOMER, selectedCustomer)
  }, [selectedCustomer])

  // Auto-save order discount changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ORDER_DISCOUNT, orderDiscount)
  }, [orderDiscount])

  // Auto-save order notes changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ORDER_NOTES, orderNotes)
  }, [orderNotes])

  // Auto-save scanned barcodes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SCANNED_BARCODES, Array.from(scannedBarcodes))
  }, [scannedBarcodes])

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
      setAllocationError(null)

      toast.success(`Product scanned: ${product.name}`)

      // Auto-add individual items to cart
      if (!product.requires_quantity_input) {
        handleAddToCart(product, 1)
        setScannedProduct(null)
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

  // Handle FIFO allocation change
  const handleAllocationChange = useCallback((allocation: FIFOAllocationResult) => {
    setCurrentAllocation(allocation)

    if (!allocation.isFullyAllocated && allocation.shortfall > 0) {
      setAllocationError(`Cannot allocate ${quantityInput} items. Only ${allocation.totalAllocated} available across all batches.`)
    } else {
      setAllocationError(null)
    }
  }, [quantityInput])

  // Enhanced add to cart with FIFO allocation
  const handleAddToCart = useCallback((product: ScannedProduct | null = scannedProduct, quantity: number = quantityInput) => {
    if (!product) return

    // Add barcode to scanned set
    setScannedBarcodes(prev => new Set(prev).add(product.barcode))

    const existingItemIndex = cart.findIndex(item =>
      item.product_id === product.product_id &&
      item.type === (product.scan_type === 'INDIVIDUAL_ITEM' ? 'INDIVIDUAL' : 'BATCH')
    )

    if (product.scan_type === 'INDIVIDUAL_ITEM') {
      // Individual item logic remains the same
      const cartItem: CartItem = {
        type: 'INDIVIDUAL',
        product_id: product.product_id,
        product_name: product.name,
        sku: product.sku,
        unit_price: product.pricing.retail_price,
        discount_percentage: 0,
        discount_amount: 0,
        discount_amount_per_item: 0,
        wholesale_quantity: product.wholesale_quantity,
        item_barcodes: [{
          batch_number: product.batch_info.batch_number,
          barcode_id: product.barcode_id!,
          barcode: product.barcode,
          cost_price: product.pricing.cost_price,
          retail_price: product.pricing.retail_price,
          wholesale_price: product.pricing.wholesale_price
        }],
        total_quantity: 1,
        line_total: product.pricing.retail_price
      }
      if (existingItemIndex >= 0) {
        const updatedCart = [...cart]
        updatedCart[existingItemIndex].item_barcodes!.push({
          batch_number: product.batch_info.batch_number,
          barcode_id: product.barcode_id!,
          barcode: product.barcode,
          cost_price: product.pricing.cost_price,
          retail_price: product.pricing.retail_price,
          wholesale_price: product.pricing.wholesale_price
        })
        updatedCart[existingItemIndex].total_quantity += 1

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
      // Enhanced FIFO batch allocation
      if (quantity <= 0 || quantity > (product.max_quantity || 0)) {
        toast.error(`Please enter a valid quantity (1-${product.max_quantity})`)
        return
      }

      // Check if we have a valid FIFO allocation
      if (!currentAllocation || !currentAllocation.isFullyAllocated) {
        toast.error('Cannot allocate the requested quantity from available batches')
        return
      }

      const cartItem: CartItem = {
        type: 'BATCH',
        product_id: product.product_id,
        product_name: product.name,
        product_barcode: product.barcode,
        sku: product.sku,
        unit_price: product.pricing.selling_price,
        discount_percentage: 0,
        discount_amount: 0,
        discount_amount_per_item: 0,
        wholesale_quantity: product.wholesale_quantity,
        batches: currentAllocation.allocatedBatches.map(batch => ({
          batch_id: batch.batch_id,
          batch_number: batch.batch_number,
          quantity: batch.allocated_quantity,
          cost_price: batch.cost_price,
          retail_price: batch.retail_price,
          wholesale_price: batch.wholesale_price
        })),
        total_quantity: currentAllocation.totalAllocated,
        line_total: product.pricing.selling_price * currentAllocation.totalAllocated,
        max_quantity: product.max_quantity,
        fifo_allocation: currentAllocation
      }

      if (existingItemIndex >= 0) {
        // Merge with existing batch item
        const updatedCart = [...cart]
        const existingItem = updatedCart[existingItemIndex]

        // Merge allocated batches
        for (const newBatch of currentAllocation.allocatedBatches) {
          const existingBatch = existingItem.batches?.find(b => b.batch_id === newBatch.batch_id)
          if (existingBatch) {
            existingBatch.quantity += newBatch.allocated_quantity
          } else {
            existingItem.batches!.push({
              batch_id: newBatch.batch_id,
              batch_number: newBatch.batch_number,
              quantity: newBatch.allocated_quantity,
              cost_price: newBatch.cost_price,
              retail_price: newBatch.retail_price,
              wholesale_price: newBatch.wholesale_price
            })
          }
        }

        existingItem.total_quantity += currentAllocation.totalAllocated

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
    setCurrentAllocation(null)
    setAllocationError(null)
    toast.success(`${currentAllocation?.totalAllocated || quantity} item(s) added to cart`)
  }, [cart, quantityInput, scannedProduct, currentAllocation])

  const handleDeleteBarcode = (cartIndex: number, barcodeId: string, barcode: string) => {
    const newScannedBarcodes = new Set(scannedBarcodes)
    newScannedBarcodes.delete(barcode)
    setScannedBarcodes(newScannedBarcodes)
    setCart(prev => prev.map((item, idx) => {
      if (idx === cartIndex && item.item_barcodes) {
        const updatedBarcodes = item.item_barcodes.filter(b => b.barcode_id !== barcodeId);
        return {
          ...item,
          item_barcodes: updatedBarcodes,
          total_quantity: updatedBarcodes.length,
          line_total: item.unit_price * updatedBarcodes.length
        };
      }
      return item;
    }));
  };
  // Remove item from cart and remove its barcodes from scanned set
  const handleRemoveFromCart = useCallback((index: number) => {
    const item = cart[index]
    if (item.type === "INDIVIDUAL") {
      // Remove barcodes from scanned set
      if (item.item_barcodes) {
        const newScannedBarcodes = new Set(scannedBarcodes)
        item.item_barcodes.forEach(barcode => {
          newScannedBarcodes.delete(barcode.barcode)
        })
        setScannedBarcodes(newScannedBarcodes)
      }
    } else {
      if (item.product_barcode) {
        const newScannedBarcodes = new Set(scannedBarcodes)
        newScannedBarcodes.delete(item.product_barcode)
        setScannedBarcodes(newScannedBarcodes)
      }
    }

    const updatedCart = cart.filter((_, i) => i !== index)
    setCart(updatedCart)
    toast.success('Item removed from cart')
  }, [cart, scannedBarcodes])

  // Update item discount percentage
  const handleUpdateItemDiscountPercentage = useCallback((itemIndex: number, discountPercentage: number) => {
    const updatedCart = [...cart]
    const item = updatedCart[itemIndex]

    const validDiscountPercentage = Math.min(Math.max(0, discountPercentage), user?.role_discount || 0)
    const discountAmount = calculateDiscountAmount(item.unit_price, item.total_quantity, validDiscountPercentage)

    updatedCart[itemIndex].discount_percentage = validDiscountPercentage
    updatedCart[itemIndex].discount_amount = discountAmount
    updatedCart[itemIndex].discount_amount_per_item = discountAmount / item.total_quantity
    updatedCart[itemIndex].line_total = (item.unit_price * item.total_quantity) - discountAmount

    setCart(updatedCart)
  }, [cart])

  // Update item custom pricing
  const handleUpdateItemPricing = useCallback((itemIndex: number, newUnitPrice: number, discountPercentage: number, wholesaleApplied?: boolean) => {
    const updatedCart = [...cart]
    const item = updatedCart[itemIndex]

    updatedCart[itemIndex].unit_price = newUnitPrice
    updatedCart[itemIndex].has_custom_pricing = true
    updatedCart[itemIndex].wholesale_applied = wholesaleApplied;

    const discountAmount = calculateDiscountAmount(newUnitPrice, item.total_quantity, discountPercentage)
    updatedCart[itemIndex].discount_percentage = discountPercentage
    updatedCart[itemIndex].discount_amount = discountAmount
    updatedCart[itemIndex].discount_amount_per_item = discountAmount / item.total_quantity
    updatedCart[itemIndex].line_total = (newUnitPrice * item.total_quantity) - discountAmount

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
      customer_id: selectedCustomer ? selectedCustomer.id : undefined,
      items: cart,
      discount: orderDiscount,
      notes: orderNotes.trim() || undefined
    }

    try {
      const order = await placeOrder(orderData)
      toast.success('Order placed successfully!')

      // Reset form
      setCart([])
      setSelectedCustomer(null)
      setOrderDiscount(0)
      setOrderNotes('')
      setScannedProduct(null)
      setScannedBarcodes(new Set())
      setCurrentAllocation(null)
      setAllocationError(null)

      console.log('Order created:', order)
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order')
    }
  }, [cart, selectedCustomer, orderDiscount, totals, placeOrder])


  const handleCustomerSelect = (customer: Customer | null) => {
    setSelectedCustomer(customer)
    console.log('Selected customer:', customer)

    // Here you can apply customer-specific pricing, discounts, etc.
    if (customer) {
      // Apply customer discount if available
      if (customer.discount_percentage) {
        console.log(`Applying ${customer.discount_percentage}% discount for ${customer.name}`)
        // Update cart totals with discount
      }

      // Check credit limit for wholesale customers
      if (customer.customer_type === 'WHOLESALE' && customer.credit_limit) {
        const totalWithOutstanding =  customer.running_balance
        if (totalWithOutstanding > customer.credit_limit) {
          console.warn('Customer credit limit exceeded!')
        }
      }
    }
  }


  return (
    <div className="min-h-screen">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Scanner & Cart */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Scanner */}
            <Card>
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

                {/* Enhanced Scanned Product Display with FIFO Preview */}
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

                        {/* FIFO Allocation Preview */}
                        {scannedProduct.requires_quantity_input && scannedProduct.batch_info && (
                          <FIFOAllocationPreview
                            product={scannedProduct}
                            quantity={quantityInput}
                            onAllocationChange={handleAllocationChange}
                          />
                        )}

                        {/* Available Batches Info */}
                        {scannedProduct.batch_info && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Available Batches (FIFO Order)</Label>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {scannedProduct.batch_info?.slice(0, 5).map((batch: any, index: number) => (
                                <div key={batch.batch_id} className="text-xs bg-muted p-2 rounded flex items-center justify-between">
                                  <div className="space-y-1">
                                    <div className="font-medium">
                                      #{index + 1} {batch.batch_number}
                                      {batch.is_next_to_sell && (
                                        <Badge variant="default" className="ml-2 text-xs">FIFO Next</Badge>
                                      )}
                                    </div>
                                    {batch.expiry_date && (
                                      <div className="text-muted-foreground">
                                        Exp: {new Date(batch.expiry_date).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <div className="font-medium">Qty: {batch.quantity || batch.available_quantity}</div>
                                    <div className="text-muted-foreground">${batch.retail_price}</div>
                                  </div>
                                </div>
                              ))}
                              {scannedProduct.batch_info.length > 5 && (
                                <p className="text-xs text-muted-foreground">+{scannedProduct.batch_info.length - 5} more batches</p>
                              )}
                            </div>
                          </div>
                        )}

                        {allocationError && (
                          <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{allocationError}</AlertDescription>
                          </Alert>
                        )}

                        <Button
                          onClick={() => handleAddToCart()}
                          className="w-full"
                          size="lg"
                          disabled={scannedProduct.requires_quantity_input && (!currentAllocation || !currentAllocation.isFullyAllocated)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add to Cart
                          {scannedProduct.requires_quantity_input && currentAllocation?.totalAllocated && (
                            <span className="ml-1">({currentAllocation.totalAllocated} items)</span>
                          )}
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
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      {cart.map((item, index) => (
                        <Card key={`${item.product_id}_${index}`} className="border-l-4">
                          <CardContent className="pt-4">
                            <div className="space-y-3">
                              {/* Header - Always Visible */}
                              <div className="flex items-start justify-between">
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{item.product_name}</h4>
                                    {item.has_custom_pricing && (
                                      <Badge variant="outline" className="text-xs">
                                        <DollarSign className="w-3 h-3 mr-1" />
                                        Custom Price
                                      </Badge>
                                    )}
                                  </div>
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
                                  <ProductPrice
                                    product={item}
                                    index={index}
                                    onUpdateDiscount={handleUpdateItemDiscountPercentage}
                                    onUpdatePricing={handleUpdateItemPricing}
                                    onDeleteBarcode={handleDeleteBarcode}
                                    onDeleteEntireItem={handleRemoveFromCart}
                                  />
                                </div>
                              </div>

                              {/* Compact Summary - Always Visible */}
                              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                                <div className="flex items-center gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Qty:</span>
                                    <span className="font-bold ml-1">{item.total_quantity}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">@</span>
                                    <span className="font-bold ml-1">{formatCurrency(item.unit_price)}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Total:</span>
                                    <span className="font-bold text-lg ml-1">{formatCurrency(item.line_total)}</span>
                                  </div>
                                  {item.discount_percentage > 0 && (
                                    <div>
                                      <span className="text-orange-600 font-bold">-{item.discount_percentage.toFixed(1)}%</span>
                                    </div>
                                  )}
                                </div>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setIsExpanded(!isExpanded)}
                                  className="p-1 h-8 w-8"
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                              </div>

                              {/* Expandable Details */}
                              {isExpanded && (
                                <div className="space-y-3 border-t pt-3">
                                  {/* Detailed Grid */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
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
                                      <div className="font-bold text-orange-600">{formatCurrency(item.discount_amount || 0)}</div>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-muted-foreground">Line Total</span>
                                      <div className="font-bold text-lg">{formatCurrency(item.line_total)}</div>
                                    </div>
                                  </div>

                                  {/* FIFO Batch Allocation Display */}
                                  {item.type === 'BATCH' && item.batches && item.batches.length > 0 && (
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        FIFO Batch Allocation
                                      </Label>
                                      <div className="space-y-1 max-h-32 overflow-y-auto">
                                        {item.batches.map((batch, batchIndex) => (
                                          <div key={batch.batch_id} className="text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded flex items-center justify-between">
                                            <div className="space-y-1">
                                              <div className="font-medium">
                                                #{batchIndex + 1} - {batch.batch_number}
                                              </div>
                                              <div className="text-muted-foreground">
                                                Allocated: {batch.quantity} units
                                              </div>
                                            </div>
                                            <div className="text-right">
                                              <div className="font-medium">{formatCurrency(batch.retail_price || 0)}</div>
                                              <div className="text-muted-foreground text-xs">per unit</div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                      {item.batches.length > 1 && (
                                        <div className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                                          Multi-batch FIFO allocation: {item.batches.length} batches used
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Discount Percentage Input */}
                                  <div className="flex items-center gap-2 pt-2 border-t">
                                    <Label className="text-sm">Discount %:</Label>
                                    <div className="flex items-center gap-1">
                                      <Input
                                        type="number"
                                        min="0"
                                        max={user?.role_discount}
                                        step="0.1"
                                        value={item.discount_percentage}
                                        onChange={(e) => handleUpdateItemDiscountPercentage(index, parseFloat(e.target.value) || 0)}
                                        className="w-20 h-8 text-sm"
                                        placeholder="0"
                                      />

                                      <Percent className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      Per item: {formatCurrency(((item.discount_amount || 0) / item.total_quantity) || 0)}
                                    </span>
                                  </div>
                                </div>
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
                  <Button variant="outline" className="w-full">
                    <Edit className="w-4 h-4 mr-2" />
                    Order Discount: {formatCurrency(orderDiscount)}
                  </Button>
                </div>
              </CardContent>
            </Card>
            <CustomerSelector
              onCustomerSelect={handleCustomerSelect}
              selectedCustomer={selectedCustomer}
            />
            {/* FIFO Summary Card */}
            {cart.some(item => item.type === 'BATCH' && item.fifo_allocation) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    FIFO Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Items are allocated using First-In-First-Out (FIFO) methodology to ensure optimal inventory rotation.
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-1">
                      {cart.filter(item => item.type === 'BATCH').map((item, index) => (
                        <div key={index} className="flex justify-between text-xs">
                          <span>{item.product_name}:</span>
                          <span>{item.batches?.length || 0} batch(es) allocated</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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