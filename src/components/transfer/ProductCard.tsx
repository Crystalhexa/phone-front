'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Package2, 
  ShoppingCart, 
  AlertTriangle, 
  Calendar,
  Hash,
  Barcode
} from 'lucide-react'
import { ScannedProduct, TransferItem } from '@/types/transfer'

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
  const [transferType, setTransferType] = useState<'BATCH' | 'INDIVIDUAL'>(
    product.scan_type === 'INDIVIDUAL_ITEM' ? 'INDIVIDUAL' : 'BATCH'
  )
  const [quantity, setQuantity] = useState(1)
  const [selectedBatch, setSelectedBatch] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

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
        // Batch transfer
        if (transferType === 'BATCH') {
          if (!selectedBatch) {
            setError('Please select a batch')
            return
          }

          if (quantity <= 0 || quantity > (product.max_quantity || 0)) {
            setError(`Quantity must be between 1 and ${product.max_quantity}`)
            return
          }

          const batch = product.batch_info?.find((b: any) => b.batch_id === selectedBatch)
          if (!batch) {
            setError('Selected batch not found')
            return
          }

          const transferItem: TransferItem = {
            product_id: product.product_id,
            product_name: product.name,
            transfer_type: 'BATCH',
            batches: [{
              batch_id: batch.batch_id,
              batch_number: batch.batch_number,
              quantity,
              available_quantity: batch.quantity,
              expiry_date: batch.expiry_date
            }],
            total_quantity: quantity
          }
          onAddToTransfer(transferItem)
        }
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
          /* Batch Transfer Options */
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="batch">Select Batch</Label>
              <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a batch..." />
                </SelectTrigger>
                <SelectContent>
                  {product.batch_info?.map((batch: any) => (
                    <SelectItem key={batch.batch_id} value={batch.batch_id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{batch.batch_number}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          Qty: {batch.quantity}
                          {batch.expiry_date && (
                            <span className="ml-1">
                              | Exp: {new Date(batch.expiry_date).toLocaleDateString()}
                            </span>
                          )}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedBatch && (
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
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
            )}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 pt-4">
          <Button onClick={handleAdd} className="flex-1">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Transfer
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
