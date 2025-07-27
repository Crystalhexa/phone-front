export interface BatchInfo {
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

export interface AllocatedBatch {
  batch_id: string
  batch_number: string
  allocated_quantity: number
  available_quantity: number
  expiry_date?: string
}

export const allocateBatchesFIFO = (
  availableBatches: BatchInfo[],
  requestedQuantity: number
): { allocatedBatches: AllocatedBatch[]; totalAllocated: number; isFullyAllocated: boolean } => {
  // Sort batches according to FIFO rules
  const sortedBatches = [...availableBatches]
    .filter(batch => batch.quantity > 0) // Only available batches
    .sort((a, b) => {
      // Primary sort: FIFO sequence (if available)
      if (a.fifo_sequence !== undefined && b.fifo_sequence !== undefined) {
        if (a.fifo_sequence !== b.fifo_sequence) {
          return a.fifo_sequence - b.fifo_sequence
        }
      }
      
      // Secondary sort: FIFO order (if available)
      if (a.fifo_order !== undefined && b.fifo_order !== undefined) {
        if (a.fifo_order !== b.fifo_order) {
          return a.fifo_order - b.fifo_order
        }
      }
      
      // Tertiary sort: Received date (earliest first)
      if (a.received_date && b.received_date) {
        const dateA = new Date(a.received_date).getTime()
        const dateB = new Date(b.received_date).getTime()
        if (dateA !== dateB) {
          return dateA - dateB
        }
      }
      
      // Quaternary sort: Expiry date (earliest expiry first, null last)
      if (a.expiry_date && b.expiry_date) {
        const expiryA = new Date(a.expiry_date).getTime()
        const expiryB = new Date(b.expiry_date).getTime()
        return expiryA - expiryB
      } else if (a.expiry_date && !b.expiry_date) {
        return -1 // a has expiry, b doesn't - a comes first
      } else if (!a.expiry_date && b.expiry_date) {
        return 1 // b has expiry, a doesn't - b comes first
      }
      
      // Final sort: batch_id for consistency
      return a.batch_id.localeCompare(b.batch_id)
    })

  const allocatedBatches: AllocatedBatch[] = []
  let remainingQuantity = requestedQuantity
  let totalAllocated = 0

  for (const batch of sortedBatches) {
    if (remainingQuantity <= 0) break

    const allocateFromThisBatch = Math.min(remainingQuantity, batch.quantity)
    
    if (allocateFromThisBatch > 0) {
      allocatedBatches.push({
        batch_id: batch.batch_id,
        batch_number: batch.batch_number,
        allocated_quantity: allocateFromThisBatch,
        available_quantity: batch.quantity,
        expiry_date: batch.expiry_date
      })

      totalAllocated += allocateFromThisBatch
      remainingQuantity -= allocateFromThisBatch
    }
  }

  return {
    allocatedBatches,
    totalAllocated,
    isFullyAllocated: remainingQuantity === 0
  }
}