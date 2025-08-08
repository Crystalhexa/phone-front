// utils/calculations.ts
import { CartItem, OrderSummary } from '@/types/sales.back'
import { createId } from '@paralleldrive/cuid2'

export function generateCuid(): string {
  return createId()
}

export function calculateOrderTotals(items: CartItem[], orderDiscount: number = 0): OrderSummary {
  let subtotal = 0
  let totalQuantity = 0
  let batchProducts = 0
  let individualProducts = 0

  items.forEach(item => {
    if (item.type === 'BATCH' && item.batches) {
      batchProducts++
      const batchTotal = item.batches.reduce((batchSum, batch) => {
        totalQuantity += batch.quantity
        return batchSum + (item.unit_price * batch.quantity)
      }, 0)
      let itemDiscount = 0;
      if (item?.discount_amount_per_item !== undefined) {
        itemDiscount = item.discount_amount_per_item * item.total_quantity;
      }
      subtotal += (batchTotal - itemDiscount)
    } else if (item.type === 'INDIVIDUAL' && item.item_barcodes) {
      individualProducts++;
      totalQuantity += item.item_barcodes.length
      const individualTotal = item.unit_price * item.item_barcodes.length
      let itemDiscount = 0;
      if(item?.discount_amount_per_item != undefined){
        itemDiscount = item.discount_amount_per_item * item.total_quantity;
      }
      subtotal += (individualTotal - itemDiscount)
    }
  })

  const totalAmount = Number((subtotal - orderDiscount).toFixed(2))

  return {
    total_products: items.length,
    batch_products: batchProducts,
    individual_products: individualProducts,
    total_quantity: totalQuantity,
    subtotal: Number(subtotal.toFixed(2)),
    discount: orderDiscount,
    total_amount: totalAmount
  }
}