import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { DialogDescription, DialogTrigger } from "@radix-ui/react-dialog";
import { Button } from "../ui/button";
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Barcode, DollarSign, FileText, Package, Percent } from "lucide-react";
import { formatCurrency } from "@/lib/utils/salesCalculations";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { Separator } from "@radix-ui/react-select";
import { Label } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Input } from "../ui/input";
interface CartItem {
  type: 'INDIVIDUAL' | 'BATCH'
  product_id: string
  product_name: string
  sku: string
  wholesale_quantity?: number
  unit_price: number
  discount_percentage: number
  discount_amount?: number
  item_barcodes?: Barcode[]
  batches?: Batches[]
  total_quantity: number
  line_total: number
  max_quantity?: number
  has_custom_pricing?: boolean // Track if custom pricing is applied
}

interface Barcode {
  barcode_id: string
  barcode: string
  cost_price: number
  wholesale_price?: number
  retail_price?: number
  custom_price?: number // Add custom price support
}

interface Batches {
  batch_id: string
  quantity: number
  cost_price?: number
  retail_price?: number
  wholesale_price?: number
  batch_number: string
  custom_price?: number // Add custom price support
}

// Enhanced ProductPrice Component with Custom Pricing
export const ProductPrice: React.FC<{
  product: CartItem;
  index: number;
  onUpdateDiscount: (index: number, discountPercentage: number) => void;
  onUpdatePricing: (index: number, newUnitPrice: number, discountPercentage: number) => void;
}> = ({ product, index, onUpdateDiscount, onUpdatePricing }) => {
  const [tempDiscount, setTempDiscount] = useState(product.discount_percentage)
  const [tempUnitPrice, setTempUnitPrice] = useState(product.unit_price)
  const [showCustomPricing, setShowCustomPricing] = useState(false)

  const handleDiscountChange = (value: number) => {
    const validDiscount = Math.min(Math.max(0, value), 100)
    setTempDiscount(validDiscount)
    onUpdateDiscount(index, validDiscount)
  }

  const handleUnitPriceChange = (value: number) => {
    if (value <= 0) return
    setTempUnitPrice(value)
  }

  const handleApplyCustomPricing = () => {
    onUpdatePricing(index, tempUnitPrice, tempDiscount)
    toast.success('Custom pricing applied')
  }

  const calculateDiscountAmount = (unitPrice: number, quantity: number, discountPercentage: number) => {
    const subtotal = unitPrice * quantity
    return (subtotal * discountPercentage) / 100
  }

  const discountAmount = calculateDiscountAmount(tempUnitPrice, product.total_quantity, tempDiscount)
  const finalPrice = (tempUnitPrice * product.total_quantity) - discountAmount

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
                  >
                    {showCustomPricing ? 'Hide' : 'Show'} Custom Pricing
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Pricing Display */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Current Unit Price</label>
                    <p className="text-xl font-bold text-blue-600">
                      {formatCurrency(product.unit_price)}
                    </p>
                    {product.has_custom_pricing && (
                      <Badge variant="outline" className="text-xs mt-1">Custom Price</Badge>
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
                {showCustomPricing && (
                  <>
                    <Separator />
                    <div className="space-y-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Custom Pricing</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Custom Unit Price</Label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Rs.</span>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={tempUnitPrice}
                              onChange={(e) => handleUnitPriceChange(parseFloat(e.target.value) || 0)}
                              className="flex-1"
                              placeholder="0.00"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Original price: {formatCurrency(product.unit_price)}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>Preview Subtotal</Label>
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-xl font-bold text-blue-600">
                              {formatCurrency(tempUnitPrice * product.total_quantity)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {tempUnitPrice !== product.unit_price && (
                                <span className="text-orange-600">
                                  {tempUnitPrice > product.unit_price ? 'Increase' : 'Decrease'}: {formatCurrency(Math.abs((tempUnitPrice - product.unit_price) * product.total_quantity))}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {tempUnitPrice !== product.unit_price && (
                        <Button onClick={handleApplyCustomPricing} className="w-full">
                          <DollarSign className="w-4 h-4 mr-2" />
                          Apply Custom Pricing
                        </Button>
                      )}
                    </div>
                  </>
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
                          max="100"
                          step="0.1"
                          value={tempDiscount}
                          onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0)}
                          className="flex-1"
                          placeholder="0.0"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Maximum discount: 100%
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
                    <div className="space-y-2 pr-4"> {/* Added pr-4 for scrollbar spacing */}
                      {product.item_barcodes.map((item, idx) => (
                        <div
                          key={item.barcode_id || idx}
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <div className="flex-1 min-w-0"> {/* Added flex-1 min-w-0 for text truncation */}
                            <p className="font-mono text-sm truncate">{item.barcode}</p>
                            <p className="text-xs text-muted-foreground">
                              Cost: {formatCurrency(item.cost_price)} |
                              Retail: {formatCurrency(item.retail_price || 0)}
                              {item.wholesale_price && ` | Wholesale: ${formatCurrency(item.wholesale_price)}`}
                              {item.custom_price && ` | Custom: ${formatCurrency(item.custom_price)}`}
                            </p>
                          </div>
                          <Badge variant="outline" className="ml-2 shrink-0">
                            Item {idx + 1}
                          </Badge>
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
                          <Badge variant="secondary">Qty: {batch.quantity}</Badge>
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
                              <p>{formatCurrency(batch.retail_price)}</p>
                            </div>
                          )}
                          {batch.wholesale_price && (
                            <div>
                              <span className="text-muted-foreground">Wholesale:</span>
                              <p>{formatCurrency(batch.wholesale_price)}</p>
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
                    {product.has_custom_pricing && <p>• Custom pricing enabled</p>}
                    {product.type === 'BATCH' && product.batches && product.batches.length > 1 &&
                      <p>• Multi-batch allocation ({product.batches.length} batches)</p>
                    }
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