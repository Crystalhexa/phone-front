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
  Barcode,
  Calendar,
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

// Enhanced FIFO Allocation utility
interface BatchInfo {
  batch_id: string
  batch_number: string
  quantity: number
  cost_price: number
  wholesale_price?: number
  retail_price: number
  expiry_date?: string
  received_date?: string
  fifo_sequence?: number
  fifo_order?: number
  is_next_to_sell?: boolean
}

interface FIFOAllocationResult {
  allocatedBatches: Array<{
    batch_id: string
    batch_number: string
    allocated_quantity: number
    available_quantity: number
    cost_price: number
    retail_price: number
    wholesale_price?: number
    expiry_date?: string
  }>
  totalAllocated: number
  isFullyAllocated: boolean
  shortfall: number
}

const allocateBatchesFIFO = (batchesInfo: BatchInfo[], requestedQuantity: number): FIFOAllocationResult => {
  const allocatedBatches: any[] = []
  let remainingQuantity = requestedQuantity

  // Sort batches by FIFO order (earliest first)
  const sortedBatches = [...batchesInfo].sort((a, b) => {
    // Primary sort: FIFO sequence (if available)
    if (a.fifo_sequence !== undefined && b.fifo_sequence !== undefined) {
      return a.fifo_sequence - b.fifo_sequence
    }

    // Secondary sort: is_next_to_sell flag
    if (a.is_next_to_sell && !b.is_next_to_sell) return -1
    if (!a.is_next_to_sell && b.is_next_to_sell) return 1

    // Tertiary sort: expiry date (earliest first)
    if (a.expiry_date && b.expiry_date) {
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
    }
    if (a.expiry_date && !b.expiry_date) return -1
    if (!a.expiry_date && b.expiry_date) return 1

    // Quaternary sort: received date (earliest first)
    if (a.received_date && b.received_date) {
      return new Date(a.received_date).getTime() - new Date(b.received_date).getTime()
    }
    return 0
  })

  for (const batch of sortedBatches) {
    if (remainingQuantity <= 0) break
    if (batch.quantity <= 0) continue

    const quantityFromThisBatch = Math.min(remainingQuantity, batch.quantity)

    allocatedBatches.push({
      batch_id: batch.batch_id,
      batch_number: batch.batch_number,
      allocated_quantity: quantityFromThisBatch,
      available_quantity: batch.quantity,
      cost_price: batch.cost_price,
      retail_price: batch.retail_price,
      wholesale_price: batch.wholesale_price,
      expiry_date: batch.expiry_date
    })

    remainingQuantity -= quantityFromThisBatch
  }

  return {
    allocatedBatches,
    totalAllocated: requestedQuantity - remainingQuantity,
    isFullyAllocated: remainingQuantity === 0,
    shortfall: remainingQuantity
  }
}

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

// Enhanced FIFO Allocation Preview Component
const FIFOAllocationPreview = ({
  product,
  quantity,
  onAllocationChange
}: {
  product: ScannedProduct,
  quantity: number,
  onAllocationChange: (allocation: FIFOAllocationResult) => void
}) => {
  const [allocation, setAllocation] = useState<FIFOAllocationResult | null>(null)

  useEffect(() => {
    if (product.scan_type === 'PRODUCT_LEVEL' && product.batch_info && quantity > 0) {
      const batchesInfo: BatchInfo[] = product.batch_info.map((batch: any) => ({
        batch_id: batch.batch_id,
        batch_number: batch.batch_number,
        quantity: batch.quantity || batch.available_quantity || 0,
        cost_price: batch.cost_price || 0,
        wholesale_price: batch.wholesale_price,
        retail_price: batch.retail_price || 0,
        expiry_date: batch.expiry_date,
        received_date: batch.received_date,
        fifo_sequence: batch.fifo_sequence,
        fifo_order: batch.fifo_order,
        is_next_to_sell: batch.is_next_to_sell
      }))

      const allocationResult = allocateBatchesFIFO(batchesInfo, quantity)
      setAllocation(allocationResult)
      onAllocationChange(allocationResult)
    }
  }, [quantity, product, onAllocationChange])

  if (!allocation || allocation.allocatedBatches.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription>
          <strong>FIFO Allocation:</strong> Items will be automatically allocated from the oldest batches first.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Info className="h-4 w-4" />
          FIFO Allocation Preview
        </Label>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {allocation.allocatedBatches.map((batch, index) => (
            <div key={batch.batch_id} className="bg-secondary border border-muted rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-medium text-sm">
                    #{index + 1} - {batch.batch_number}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Allocating: {batch.allocated_quantity} / {batch.available_quantity} available
                  </div>
                  {batch.expiry_date && (
                    <div className="flex items-center gap-1 text-xs text-orange-600">
                      <Calendar className="h-3 w-3" />
                      Expires: {new Date(batch.expiry_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">
                  Qty: {batch.allocated_quantity}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        <div className={`text-sm font-medium p-2 rounded ${allocation.isFullyAllocated
            ? 'text-green-700 bg-green-50'
            : 'text-red-700 bg-red-50'
          }`}>
          Total allocated: {allocation.totalAllocated} / {quantity} requested
          {allocation.isFullyAllocated ? (
            <span className="text-green-600 ml-2">✓ Fully allocated</span>
          ) : (
            <span className="text-red-600 ml-2">⚠ Insufficient stock ({allocation.shortfall} short)</span>
          )}
        </div>
      </div>
    </div>
  )
}

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
    available_batches?: Array<{
      batch_id: string
      batch_number: string
      available_quantity: number
      expiry_date?: string
      cost_price?: number
      wholesale_price?: number
      retail_price?: number
    }>
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

interface Barcodes {
  batch_number?: string
  barcode_id: string
  barcode: string
  cost_price: number
  wholesale_price?: number
  retail_price?: number
  custom_price?: number
}

interface Batches {
  batch_id: string
  quantity: number
  cost_price?: number
  retail_price?: number
  wholesale_price?: number
  batch_number: string
  custom_price?: number
}

interface CartItem {
  type: 'INDIVIDUAL' | 'BATCH'
  product_id: string
  product_name: string
  sku: string
  wholesale_quantity?: number
  unit_price: number
  discount_percentage: number
  discount_amount?: number
  discount_amount_per_item?: number
  item_barcodes?: Barcodes[]
  batches?: Batches[]
  total_quantity: number
  line_total: number
  max_quantity?: number
  has_custom_pricing?: boolean
  fifo_allocation?: FIFOAllocationResult // Store FIFO allocation info
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

export default function EnhancedSalesOrderPage() {

  const { user } = useAuth();
  console.log(user);

  const route = useRouter()
  const [cart, setCart] = useState<CartItem[]>([])
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [quantityInput, setQuantityInput] = useState(1)
  const [customer, setCustomer] = useState<Customer>({})
  const [orderDiscount, setOrderDiscount] = useState(0)
  const [orderNotes, setOrderNotes] = useState('')
  const [scannedBarcodes, setScannedBarcodes] = useState<Set<string>>(new Set())
  const [currentAllocation, setCurrentAllocation] = useState<FIFOAllocationResult | null>(null)
  const [allocationError, setAllocationError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false);
  // Hooks
  const { scanProduct, placeOrder, isLoading } = useSalesOrder()

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
        wholesale_quantity:product.wholesale_quantity,
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
        sku: product.sku,
        unit_price: product.pricing.selling_price,
        discount_percentage: 0,
        discount_amount: 0,
        discount_amount_per_item: 0,
        wholesale_quantity:product.wholesale_quantity,
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

  // Remove item from cart and remove its barcodes from scanned set
  const handleRemoveFromCart = useCallback((index: number) => {
    const item = cart[index]

    // Remove barcodes from scanned set
    if (item.item_barcodes) {
      const newScannedBarcodes = new Set(scannedBarcodes)
      item.item_barcodes.forEach(barcode => {
        newScannedBarcodes.delete(barcode.barcode)
      })
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

    const validDiscountPercentage = Math.min(Math.max(0, discountPercentage), user?.role_discount || 0)
    const discountAmount = calculateDiscountAmount(item.unit_price, item.total_quantity, validDiscountPercentage)

    updatedCart[itemIndex].discount_percentage = validDiscountPercentage
    updatedCart[itemIndex].discount_amount = discountAmount
    updatedCart[itemIndex].discount_amount_per_item = discountAmount / item.total_quantity
    updatedCart[itemIndex].line_total = (item.unit_price * item.total_quantity) - discountAmount

    setCart(updatedCart)
  }, [cart])

  // Update item custom pricing
  const handleUpdateItemPricing = useCallback((itemIndex: number, newUnitPrice: number, discountPercentage: number) => {
    const updatedCart = [...cart]
    const item = updatedCart[itemIndex]

    updatedCart[itemIndex].unit_price = newUnitPrice
    updatedCart[itemIndex].has_custom_pricing = true

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
      customer: Object.keys(customer).length > 0 ? customer : undefined,
      items: cart,
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
      setScannedBarcodes(new Set())
      setCurrentAllocation(null)
      setAllocationError(null)

      console.log('Order created:', order)
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order')
    }
  }, [cart, customer, orderDiscount, totals, placeOrder])

  return (
    <div className="min-h-screen">
      <Button variant="ghost" size="sm" onClick={() => { route.back() }}>
        <X className="w-4 h-4" />
      </Button>

      <div className="container mx-auto py-6">
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