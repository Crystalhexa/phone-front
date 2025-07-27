'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Package, 
  Trash2, 
  Calendar,
  Hash,
  BarChart3
} from 'lucide-react'
import { TransferItem } from '@/types/transfer'

interface TransferSummaryProps {
  items: TransferItem[]
  onRemoveItem: (index: number) => void
}

export const TransferSummary: React.FC<TransferSummaryProps> = ({ 
  items, 
  onRemoveItem 
}) => {
  const totalProducts = items.length
  const totalQuantity = items.reduce((sum, item) => sum + item.total_quantity, 0)
  const batchTransfers = items.filter(item => item.transfer_type === 'BATCH').length
  const individualTransfers = items.filter(item => item.transfer_type === 'INDIVIDUAL').length

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Transfer Summary
          </CardTitle>
          <CardDescription>
            No items added to transfer yet
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Transfer Summary
        </CardTitle>
        <CardDescription>
          {totalProducts} products, {totalQuantity} total items
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-blue-600">{totalProducts}</div>
            <div className="text-xs text-muted-foreground">Products</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-green-600">{batchTransfers}</div>
            <div className="text-xs text-muted-foreground">Batch Transfers</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-purple-600">{individualTransfers}</div>
            <div className="text-xs text-muted-foreground">Individual Items</div>
          </div>
        </div>

        <Separator />

        {/* Items List */}
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="font-medium">{item.product_name}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.transfer_type === 'BATCH' ? 'default' : 'secondary'}>
                      {item.transfer_type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Qty: {item.total_quantity}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveItem(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Batch Details */}
              {item.transfer_type === 'BATCH' && item.batches && (
                <div className="space-y-1">
                  {item.batches.map((batch, batchIndex) => (
                    <div key={batchIndex} className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {batch.batch_number}
                        </span>
                        <span>Qty: {batch.quantity}</span>
                      </div>
                      {batch.expiry_date && (
                        <div className="flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          Expires: {new Date(batch.expiry_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Individual Items */}
              {item.transfer_type === 'INDIVIDUAL' && item.individual_items && (
                <div className="space-y-1">
                  {item.individual_items.map((individualItem, itemIndex) => (
                    <div key={itemIndex} className="text-sm text-muted-foreground bg-blue-50 p-2 rounded">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <BarChart3 className="h-3 w-3" />
                          {individualItem.item_code}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {individualItem.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}