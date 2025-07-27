'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Package2, 
  ShoppingCart, 
  AlertTriangle, 
  Calendar,
  Hash,
  Barcode,
  Info,
  Clock
} from 'lucide-react'
import { ScannedProduct, TransferItem } from '@/types/transfer'
import { allocateBatchesFIFO, BatchInfo } from '@/lib/utils/fifoAllocation'

interface ProductCardProps {
  product: ScannedProduct
  onAddToTransfer: (item: TransferItem) => void
  onCancel: () => void
}

export const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onAddToTransfer, 
  onCancel 
}) => {
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [allocationPreview, setAllocationPreview] = useState<{
    allocatedBatches: any[]
    totalAllocated: number
    isFullyAllocated: boolean
  } | null>(null)

  // Calculate FIFO allocation preview when quantity changes
  useEffect(() => {
    if (product.scan_type === 'PRODUCT_LEVEL' && product.batch_info && quantity > 0) {
      const batchesInfo: BatchInfo[] = product.batch_info.map((batch: any) => ({
        batch_id: batch.batch_id,
        batch_number: batch.batch_number,
        quantity: batch.quantity || 0,
        cost_price: batch.cost_price || 0,
        wholesale_price: batch.wholesale_price,
        retail_price: batch.retail_price || 0,
        expiry_date: batch.expiry_date,
        received_date: batch.received_date,
        fifo_sequence: batch.fifo_sequence,
        fifo_order: batch.fifo_order,
        is_next_to_sell: batch.is_next_to_sell
      }))

      const allocation = allocateBatchesFIFO(batchesInfo, quantity)
      setAllocationPreview(allocation)

      // Set error if cannot fully allocate
      if (!allocation.isFullyAllocated) {
        setError(`Cannot allocate ${quantity} items. Only ${allocation.totalAllocated} available across all batches.`)
      } else {
        setError(null)
      }
    }
  }, [quantity, product])

  const handleAdd = () => {
    setError(null)

    try {
      if (product.scan_type === 'INDIVIDUAL_ITEM') {
        // Individual item transfer
        const transferItem: TransferItem = {
          product_id: product.product_id,
          product_name: product.name,
          transfer_type: 'INDIVIDUAL',
          individual_items: [{
            item_barcode_id: product.barcode_id!,
            item_code: product.barcode,
            status: product.item_details?.status || 'AVAILABLE'
          }],
          total_quantity: 1
        }
        onAddToTransfer(transferItem)
      } else {
        // FIFO Batch transfer
        if (quantity <= 0 || quantity > (product.max_quantity || 0)) {
          setError(`Quantity must be between 1 and ${product.max_quantity}`)
          return
        }

        if (!allocationPreview || !allocationPreview.isFullyAllocated) {
          setError('Cannot allocate the requested quantity from available batches')
          return
        }

        const transferItem: TransferItem = {
          product_id: product.product_id,
          product_name: product.name,
          transfer_type: 'BATCH',
          batches: allocationPreview.allocatedBatches.map(batch => ({
            batch_id: batch.batch_id,
            batch_number: batch.batch_number,
            quantity: batch.allocated_quantity,
            available_quantity: batch.available_quantity,
            expiry_date: batch.expiry_date
          })),
          total_quantity: quantity
        }
        onAddToTransfer(transferItem)
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package2 className="h-5 w-5" />
            {product.name}
          </div>
          <Badge variant={product.inventory.is_low_stock ? "destructive" : "secondary"}>
            {product.inventory.is_low_stock ? "Low Stock" : "Available"}
          </Badge>
        </CardTitle>
        <CardDescription>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Hash className="h-3 w-3" />
              SKU: {product.sku}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Barcode className="h-3 w-3" />
              Barcode: {product.barcode}
            </div>
            {product.brand && (
              <div className="text-sm">Brand: {product.brand.name}</div>
            )}
          </div>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Product Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <Label className="text-xs text-muted-foreground">Available Quantity</Label>
            <div className="font-medium">{product.inventory.available_quantity}</div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Retail Price</Label>
            <div className="font-medium">${product.pricing.retail_price.toFixed(2)}</div>
          </div>
        </div>

        {product.scan_type === 'INDIVIDUAL_ITEM' ? (
          /* Individual Item Display */
          <div className="space-y-2">
            <Alert>
              <Package2 className="h-4 w-4" />
              <AlertDescription>
                This is an individual item. It will be transferred as a single unit.
              </AlertDescription>
            </Alert>
            
            {product.item_details && (
              <div className="text-sm space-y-1">
                <div>Status: <Badge variant="outline">{product.item_details.status}</Badge></div>
                <div>Condition: <Badge variant="outline">{product.item_details.condition}</Badge></div>
                {product.item_details.warranty_expiry && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Warranty expires: {new Date(product.item_details.warranty_expiry).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* FIFO Batch Transfer */
          <div className="space-y-4">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>FIFO Allocation:</strong> Items will be automatically allocated from the oldest batches first.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="quantity">Transfer Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={product.max_quantity}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                placeholder="Enter quantity..."
              />
              <div className="text-sm text-muted-foreground">
                Maximum available: {product.max_quantity}
              </div>
            </div>

            {/* FIFO Allocation Preview */}
            {allocationPreview && allocationPreview.allocatedBatches.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  FIFO Allocation Preview
                </Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {allocationPreview.allocatedBatches.map((batch, index) => (
                    <div key={batch.batch_id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
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
                
                <div className="text-sm font-medium text-green-700 bg-green-50 p-2 rounded">
                  Total allocated: {allocationPreview.totalAllocated} / {quantity} requested
                  {allocationPreview.isFullyAllocated ? (
                    <span className="text-green-600 ml-2">✓ Fully allocated</span>
                  ) : (
                    <span className="text-red-600 ml-2">⚠ Insufficient stock</span>
                  )}
                </div>
              </div>
            )}

            {/* Available Batches Info */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Available Batches (FIFO Order)</Label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {product.batch_info?.map((batch: any, index: number) => (
                  <div key={batch.batch_id} className="text-xs bg-gray-50 p-2 rounded flex items-center justify-between">
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
                      <div className="font-medium">Qty: {batch.quantity}</div>
                      <div className="text-muted-foreground">${batch.retail_price}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 pt-4">
          <Button 
            onClick={handleAdd} 
            className="flex-1"
            disabled={product.scan_type === 'PRODUCT_LEVEL' && (!allocationPreview || !allocationPreview.isFullyAllocated)}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Transfer
            {product.scan_type === 'PRODUCT_LEVEL' && (
              <span className="ml-1">({quantity} items)</span>
            )}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
