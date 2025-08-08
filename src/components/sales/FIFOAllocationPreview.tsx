"use client"
import { BatchInfo, FIFOAllocationResult, ScannedProduct } from "@/types/sales"
import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "../ui/alert"
import { Clock, Info } from "lucide-react"
import { Label } from "../ui/label"
import { Calendar } from "../ui/calendar"
import { Badge } from "../ui/badge"
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

export const FIFOAllocationPreview = ({
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