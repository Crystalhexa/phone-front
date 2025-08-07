import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { DialogDescription, DialogTrigger } from "@radix-ui/react-dialog";
import { Button } from "../ui/button";
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Barcode, DollarSign, FileText, Package, Percent, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils/salesCalculations";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { Separator } from "@radix-ui/react-select";
import { Label } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useAuth } from "@/hooks/useAuth";

interface CartItem {
  type: 'INDIVIDUAL' | 'BATCH'
  product_id: string
  product_name: string
  sku: string
  wholesale_quantity?: number
  unit_price: number
  discount_percentage: number
  discount_amount?: number
  item_barcodes?: Barcodes[]
  batches?: Batches[]
  total_quantity: number
  line_total: number
  max_quantity?: number
  has_custom_pricing?: boolean
  wholesale_applied?: boolean // Track if wholesale pricing is applied
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

// Enhanced ProductPrice Component with Custom Pricing Logic
export const ProductPrice: React.FC<{
  product: CartItem;
  index: number;
  onUpdateDiscount: (index: number, discountPercentage: number) => void;
  onUpdatePricing: (index: number, newUnitPrice: number, discountPercentage: number, wholesaleApplied?: boolean) => void;
}> = ({ product, index, onUpdateDiscount, onUpdatePricing }) => {

  const { user } = useAuth();
  
  const [tempDiscount, setTempDiscount] = useState(product.discount_percentage)
  const [tempUnitPrice, setTempUnitPrice] = useState(product.unit_price)
  const [showCustomPricing, setShowCustomPricing] = useState(false)
  const [selectedCustomPrice, setSelectedCustomPrice] = useState<string>("")
  const [isWholesaleSelected, setIsWholesaleSelected] = useState(false)

  // Helper function to get available custom pricing options
 const getCustomPricingOptions = () => {
  const options: { value: string; label: string; price: number; isWholesale: boolean; batchNumber?: string }[] = []
  const addedBatchNumbers = new Set<string>()

  if (product.type === 'INDIVIDUAL' && product.item_barcodes) {
    product.item_barcodes.forEach((barcode, idx) => {
      const batchNumber = barcode.batch_number

      if (!batchNumber) return // Skip if batch number is missing

      if (addedBatchNumbers.has(batchNumber)) {
        // Skip if we've already added an option for this batch number
        return
      }

      let added = false

      // Add retail price option
      if (barcode.retail_price && barcode.retail_price > 0) {
        options.push({
          value: `retail_${idx}`,
          label: `Barcode ${idx + 1} - Retail Price`,
          price: barcode.retail_price,
          isWholesale: false,
          batchNumber
        })
        added = true
      }

      // Add wholesale price option if quantity meets requirement
      if (
        barcode.wholesale_price &&
        barcode.wholesale_price > 0 &&
        product.wholesale_quantity &&
        product.total_quantity >= product.wholesale_quantity
      ) {
        options.push({
          value: `wholesale_${idx}`,
          label: `Barcode ${idx + 1} - Wholesale Price`,
          price: barcode.wholesale_price,
          isWholesale: true,
          batchNumber
        })
        added = true
      }

      if (added) {
        addedBatchNumbers.add(batchNumber)
      }
    })
  } else if (product.type === 'BATCH' && product.batches) {
    product.batches.forEach((batch, idx) => {
      // Add retail price option
      if (batch.retail_price && batch.retail_price > 0) {
        options.push({
          value: `batch_retail_${idx}`,
          label: `Batch ${batch.batch_number} - Retail Price`,
          price: batch.retail_price,
          isWholesale: false
        })
      }

      // Add wholesale option if quantity meets requirement
      if (
        batch.wholesale_price &&
        batch.wholesale_price > 0 &&
        product.wholesale_quantity &&
        product.total_quantity >= product.wholesale_quantity
      ) {
        options.push({
          value: `batch_wholesale_${idx}`,
          label: `Batch ${batch.batch_number} - Wholesale Price`,
          price: batch.wholesale_price,
          isWholesale: true
        })
      }
    })
  }

  return options
}


  const customPricingOptions = getCustomPricingOptions()

  const handleDiscountChange = (value: number) => {
    const validDiscount = Math.min(Math.max(0, value), user?.role_discount || 0)
    setTempDiscount(validDiscount)
    onUpdateDiscount(index, validDiscount)
  }

  const handleCustomPriceSelect = (value: string) => {
    setSelectedCustomPrice(value)
    const selectedOption = customPricingOptions.find(opt => opt.value === value)
    if (selectedOption) {
      setTempUnitPrice(selectedOption.price)
      setIsWholesaleSelected(selectedOption.isWholesale)
    }
  }

  const handleApplyCustomPricing = () => {
    if (!selectedCustomPrice) {
      toast.error('Please select a custom price option')
      return
    }
    onUpdatePricing(index, tempUnitPrice, tempDiscount, isWholesaleSelected)
    toast.success(`${isWholesaleSelected ? 'Wholesale' : 'Custom'} pricing applied`)
  }

  const calculateDiscountAmount = (unitPrice: number, quantity: number, discountPercentage: number) => {
    const subtotal = unitPrice * quantity
    return (subtotal * discountPercentage) / 100
  }

  const discountAmount = calculateDiscountAmount(tempUnitPrice, product.total_quantity, tempDiscount)
  const finalPrice = (tempUnitPrice * product.total_quantity) - discountAmount

  // Check if wholesale pricing is available
  const canUseWholesale = product.wholesale_quantity && 
                         product.total_quantity >= product.wholesale_quantity
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="p-1 h-auto">
          <FileText className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-2xl sm:max-w-3xl rounded-2xl p-0">
        <div className="max-h-[85vh] overflow-y-auto px-6 py-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Package className="w-5 h-5" />
              Cart Item Details - {product.product_name}
            </DialogTitle>
            <DialogDescription>
              View and modify pricing details for this cart item
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Custom Pricing Toggle */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Pricing Control
                  </span>
                  <Button
                    variant={showCustomPricing ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowCustomPricing(!showCustomPricing)}
                    disabled={customPricingOptions.length === 0}
                  >
                    {showCustomPricing ? 'Hide' : 'Show'} Custom Pricing
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Wholesale Quantity Info */}
                {product.wholesale_quantity && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Wholesale Information
                      </span>
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-300 space-y-1">
                      <p>Minimum wholesale quantity: {product.wholesale_quantity}</p>
                      <p>Current quantity: {product.total_quantity}</p>
                      <p className={canUseWholesale ? "text-green-600 font-medium" : "text-orange-600"}>
                        {canUseWholesale ? "✓ Eligible for wholesale pricing" : "✗ Not eligible for wholesale pricing"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Current Pricing Display */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Current Unit Price</label>
                    <p className="text-xl font-bold text-blue-600">
                      {formatCurrency(product.unit_price)}
                    </p>
                    {product.has_custom_pricing && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {product.wholesale_applied ? 'Wholesale Price' : 'Custom Price'}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Quantity</label>
                    <p className="text-xl font-bold">
                      {product.total_quantity}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Subtotal</label>
                    <p className="text-xl font-bold text-gray-600">
                      {formatCurrency(product.unit_price * product.total_quantity)}
                    </p>
                  </div>
                </div>

                {/* Custom Pricing Section */}
                {showCustomPricing && customPricingOptions.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Custom Pricing Options</h4>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Select Price Option</Label>
                          <Select value={selectedCustomPrice} onValueChange={handleCustomPriceSelect}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a pricing option..." />
                            </SelectTrigger>
                            <SelectContent>
                              {customPricingOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  <div className="flex items-center gap-2">
                                    {option.label} - {formatCurrency(option.price)}
                                    {option.isWholesale && (
                                      <Badge variant="secondary" className="text-xs">Wholesale</Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedCustomPrice && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Selected Price</Label>
                              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <p className="text-xl font-bold text-blue-600">
                                  {formatCurrency(tempUnitPrice)}
                                </p>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs text-muted-foreground">
                                    {customPricingOptions.find(opt => opt.value === selectedCustomPrice)?.label}
                                  </p>
                                  {isWholesaleSelected && (
                                    <Badge variant="secondary" className="text-xs">Wholesale</Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Preview Subtotal</Label>
                              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <p className="text-xl font-bold text-green-600">
                                  {formatCurrency(tempUnitPrice * product.total_quantity)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {tempUnitPrice !== product.unit_price && (
                                    <span className={tempUnitPrice > product.unit_price ? "text-red-600" : "text-green-600"}>
                                      {tempUnitPrice > product.unit_price ? 'Increase' : 'Decrease'}: {formatCurrency(Math.abs((tempUnitPrice - product.unit_price) * product.total_quantity))}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedCustomPrice && tempUnitPrice !== product.unit_price && (
                          <Button onClick={handleApplyCustomPricing} className="w-full">
                            <DollarSign className="w-4 h-4 mr-2" />
                            Apply {isWholesaleSelected ? 'Wholesale' : 'Custom'} Pricing
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* No Custom Pricing Available Message */}
                {showCustomPricing && customPricingOptions.length === 0 && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Info className="w-5 h-5 text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        No custom pricing options available for this item
                      </span>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Discount Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Percent className="w-5 h-5 text-orange-500" />
                    <h4 className="font-semibold">Apply Discount</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Discount Percentage</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max={user?.role_discount}
                          step="1"
                          value={tempDiscount}
                          onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0)}
                          className="flex-1"
                          placeholder="0.0"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Maximum discount: {user?.role_discount}%
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Discount Amount</Label>
                      <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <p className="text-xl font-bold text-orange-600">
                          -{formatCurrency(discountAmount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Per item: {formatCurrency(discountAmount / product.total_quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <Separator />
              </CardContent>
            </Card>

            {/* Item Details (Individual Items or Batches) */}
            {product.type === 'INDIVIDUAL' && product.item_barcodes && product.item_barcodes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Barcode className="w-5 h-5" />
                    Individual Items ({product.item_barcodes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-48 w-full">
                    <div className="space-y-2 pr-4">
                      {product.item_barcodes.map((item, idx) => (
                        <div
                          key={item.barcode_id || idx}
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-sm truncate">{item.barcode}</p>
                            <p className="text-xs text-muted-foreground">
                              Cost: {formatCurrency(item.cost_price)} |
                              Retail: {formatCurrency(item.retail_price || 0)}
                              {item.wholesale_price && ` | Wholesale: ${formatCurrency(item.wholesale_price)}`}
                              {item.custom_price && ` | Custom: ${formatCurrency(item.custom_price)}`}
                            </p>
                          </div>
                          <div className="ml-2 shrink-0 space-x-1">
                            <Badge variant="outline">Item {idx + 1}</Badge>
                            {item.retail_price && (
                              <Badge variant="secondary" className="text-xs">
                                Retail Available
                              </Badge>
                            )}
                            {item.wholesale_price && canUseWholesale && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                Wholesale Available
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {product.type === 'BATCH' && product.batches && product.batches.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Batch Allocation ({product.batches.length} batch{product.batches.length !== 1 ? 'es' : ''})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {product.batches.map((batch, idx) => (
                      <div key={batch.batch_id || idx} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">Batch #{batch.batch_number}</h4>
                          <div className="flex gap-2">
                            <Badge variant="secondary">Qty: {batch.quantity}</Badge>
                            {batch.retail_price && (
                              <Badge variant="outline" className="text-xs">
                                Retail Available
                              </Badge>
                            )}
                            {batch.wholesale_price && canUseWholesale && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                Wholesale Available
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Batch ID:</span>
                            <p className="font-mono">{batch.batch_id}</p>
                          </div>
                          {batch.cost_price && (
                            <div>
                              <span className="text-muted-foreground">Cost:</span>
                              <p>{formatCurrency(batch.cost_price)}</p>
                            </div>
                          )}
                          {batch.retail_price && (
                            <div>
                              <span className="text-muted-foreground">Retail:</span>
                              <p className="text-blue-600 font-medium">{formatCurrency(batch.retail_price)}</p>
                            </div>
                          )}
                          {batch.wholesale_price && (
                            <div>
                              <span className="text-muted-foreground">Wholesale:</span>
                              <p className={canUseWholesale ? "text-green-600 font-medium" : "text-gray-400"}>
                                {formatCurrency(batch.wholesale_price)}
                              </p>
                            </div>
                          )}
                          {batch.custom_price && (
                            <div>
                              <span className="text-muted-foreground">Custom:</span>
                              <p className="text-orange-600 font-medium">{formatCurrency(batch.custom_price)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Batch Allocation Summary */}
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h5 className="font-medium mb-2">Allocation Summary</h5>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Total Batches:</span>
                          <span className="font-medium ml-2">{product.batches.length}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Quantity:</span>
                          <span className="font-medium ml-2">{product.total_quantity}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg per Batch:</span>
                          <span className="font-medium ml-2">{(product.total_quantity / product.batches.length).toFixed(1)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Allocation:</span>
                          <span className="font-medium ml-2 text-green-600">FIFO</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary Section */}
            <Card className="border-2 border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle className="text-lg text-green-700 dark:text-green-300">
                  Line Item Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-medium">{formatCurrency(tempUnitPrice * product.total_quantity)}</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>Discount ({tempDiscount.toFixed(1)}%):</span>
                      <span className="font-medium">-{formatCurrency(discountAmount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg text-green-600">
                      <span>Line Total:</span>
                      <span>{formatCurrency(finalPrice)}</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>• {product.total_quantity} item{product.total_quantity !== 1 ? 's' : ''} at {formatCurrency(tempUnitPrice)} each</p>
                    <p>• {tempDiscount > 0 ? `${tempDiscount.toFixed(1)}% discount applied` : 'No discount applied'}</p>
                    <p>• Final price per item: {formatCurrency(finalPrice / product.total_quantity)}</p>
                    {product.has_custom_pricing && (
                      <p>• {product.wholesale_applied ? 'Wholesale pricing applied' : 'Custom pricing enabled'}</p>
                    )}
                    {product.type === 'BATCH' && product.batches && product.batches.length > 1 &&
                      <p>• Multi-batch allocation ({product.batches.length} batches)</p>
                    }
                    {canUseWholesale && <p>• Wholesale pricing eligible</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}