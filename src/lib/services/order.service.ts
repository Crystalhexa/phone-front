// services/order.service.ts
import { PoolClient } from 'pg'
import { PlaceOrderRequest, OrderSummary, CartItem, BatchInfo, ProcessResult } from '@/types/sales.back'
import { generateCuid } from '@/utils/calculations'
import { InventoryService } from './inventory.service'
import { StockLedgerService } from './stock-ledger.service'

export class OrderService {
  static async createSalesOrder(
    client: PoolClient,
    orderData: PlaceOrderRequest,
    customerId: string | null,
    branchId: string,
    soldBy: string,
    totals: OrderSummary
  ): Promise<{ order_id: string, order_number: string }> {
    const salesOrderId = generateCuid()

    const query = `
      INSERT INTO sales_orders (
        id, customer_id, branch_id, sold_by,
        order_date, status, 
        subtotal, discount, balance_due,total_amount, total_cost, profit_amount, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,$13)
      RETURNING id,order_number
    `

    const values = [
      salesOrderId,
      customerId,
      branchId,
      soldBy,
      new Date().toISOString().split('T')[0], // order_date as DATE
      'COMPLETED', // Immediately mark as completed for paid orders
      totals.subtotal,
      totals.discount,
      totals.total_amount,
      totals.total_amount,
      0, // Will be calculated after items
      0, // Will be calculated after items
      orderData.notes || null
    ]

    const result = await client.query(query, values);
    const order_id = result.rows[0].id;
    const order_number = result.rows[0].order_number;
    return { order_id, order_number };
  }

  static async createSalesOrderItems(
    client: PoolClient,
    salesOrderId: string,
    items: CartItem[],
    branchId: string
  ): Promise<{ totalCost: number; totalProfit: number }> {
    let totalCost = 0
    let totalProfit = 0

    for (const item of items) {
      if (item.type === 'BATCH' && item.batches) {
        console.log(item.type)
        // Process each batch separately
        for (const batch of item.batches) {
          const result = await this.processBatchSaleItem(client, salesOrderId, item, batch, branchId)
          totalCost += result.lineCost
          totalProfit += result.lineProfit
        }
      } else if (item.type === 'INDIVIDUAL' && item.item_barcodes) {
        //Process each individual item separately  
        for (const barcode of item.item_barcodes) {
          const result = await this.processIndividualSaleItem(client, salesOrderId, item, barcode.barcode_id)
          totalCost += result.lineCost
          totalProfit += result.lineProfit
        }
      }
    }

    return { totalCost, totalProfit }
  }

  static async processBatchSaleItem(
    client: PoolClient,
    salesOrderId: string,
    item: CartItem,
    batch: BatchInfo,
    branchId: string
  ): Promise<ProcessResult> {
    const salesOrderItemId = generateCuid()
    let discount = 0;
    if (item?.discount_amount_per_item !== undefined) {
      discount = item.discount_amount_per_item * batch.quantity;
    }
    const lineTotal = (item.unit_price * batch.quantity) - discount;

    // Get batch cost and details
    const batchResult = await client.query(`
      SELECT 
        pb.cost_price, 
        pb.retail_price,
        bii.branch_inventory_id
      FROM purchase_batches pb
      JOIN branch_inventory_items bii ON pb.id = bii.purchase_batch_id
      JOIN branch_inventory bi ON bii.branch_inventory_id = bi.id
      JOIN products p ON bi.product_id = p.id
      WHERE pb.id = $1 AND bi.product_id = $2 AND bi.branch_id = $3
    `, [batch.batch_id, item.product_id, branchId])

    const batchInfo = batchResult.rows[0]
    const costPrice = parseFloat(batchInfo.cost_price)
    const lineCost = costPrice * batch.quantity
    const lineProfit = lineTotal - lineCost

    // Insert sales order item
    await client.query(`
      INSERT INTO sales_order_items (
        id, sales_order_id, product_id, quantity, unit_price,
        discount, line_total, line_cost, line_profit
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      salesOrderItemId,
      salesOrderId,
      item.product_id,
      batch.quantity,
      item.unit_price,
      discount || 0,
      lineTotal,
      lineCost,
      lineProfit
    ])

    // Create sales batch allocation (FIFO tracking)
    const allocationId = generateCuid()
    await client.query(`
      INSERT INTO sales_batch_allocations (
        id, sales_order_item_id, batch_id, quantity_allocated,
        cost_price_at_sale, selling_price
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      allocationId,
      salesOrderItemId,
      batch.batch_id,
      batch.quantity,
      costPrice,
      item.unit_price
    ])

    // Update inventory
    await InventoryService.updateBatchInventory(client, batch.batch_id, item.product_id, batch.quantity, branchId)

    // Create stock ledger entry
    await StockLedgerService.createStockLedgerEntry(
      client,
      item.product_id,
      batchInfo.branch_inventory_id,
      batch.batch_id,
      -batch.quantity,
      'SALE',
      salesOrderId,
      costPrice,
      item.unit_price
    )

    return { lineCost, lineProfit }
  }

  static async processIndividualSaleItem(
    client: PoolClient,
    salesOrderId: string,
    item: CartItem,
    itemBarcodeId: string
  ): Promise<ProcessResult> {
    const salesOrderItemId = generateCuid()
    const lineTotal = item.unit_price - (item.discount_amount_per_item || 0)


    // Get item details
    const itemResult = await client.query(`
      SELECT 
        ib.purchase_batch_id, 
        ib.location_branch, 
        ib.purchase_cost,
        p.warranty_period
      FROM item_barcodes ib
      JOIN products p ON ib.product_id = p.id
      WHERE ib.id = $1
    `, [itemBarcodeId])

    const itemInfo = itemResult.rows[0]
    const costPrice = parseFloat(itemInfo.purchase_cost)
    const lineCost = costPrice
    const lineProfit = lineTotal - lineCost
    // Insert sales order item
    await client.query(`
      INSERT INTO sales_order_items (
        id, sales_order_id, product_id, quantity,is_wholesale_price, unit_price,
        discount, line_total, line_cost, line_profit
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      salesOrderItemId,
      salesOrderId,
      item.product_id,
      1,
      item.wholesale_applied || false,
      item.unit_price,
      item.discount_amount_per_item || 0,
      lineTotal,
      lineCost,
      lineProfit
    ])

    const warrantyPeriod = itemInfo.warranty_period || 0;
    const purchaseDate = new Date();
    let warrantyExpiryDate = null;
    if (warrantyPeriod > 0) {
      warrantyExpiryDate = new Date(purchaseDate);
      warrantyExpiryDate.setMonth(warrantyExpiryDate.getMonth() + warrantyPeriod);
    }

    // Update item barcode status
    await client.query(`
      UPDATE item_barcodes 
      SET status = 'SOLD',
          sales_order_item_id = $1,
          sold_at = NOW(),
          sold_price = $2,
          warranty_expiry = $4,
          updated_at = NOW()
      WHERE id = $3
    `, [salesOrderItemId, item.unit_price, itemBarcodeId, warrantyExpiryDate])

    // Update inventory
    await InventoryService.updateIndividualItemInventory(client, itemBarcodeId, item.product_id)

    // Create item movement history
    const movementId = generateCuid()
    await client.query(`
      INSERT INTO item_movement_history (
        id, item_id, from_branch, movement_type,
        reference_id, reason
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      movementId,
      itemBarcodeId,
      itemInfo.location_branch,
      'SALE_DISPATCHED',
      salesOrderItemId,
      'Item sold to customer'
    ])

    // Create stock ledger entry
    await StockLedgerService.createStockLedgerEntry(
      client,
      item.product_id,
      null, // Will get branch from inventory
      itemInfo.purchase_batch_id,
      -1,
      'SALE',
      salesOrderId,
      costPrice,
      item.unit_price
    )

    return { lineCost, lineProfit }
  }

  static async updateOrderTotals(
    client: PoolClient,
    salesOrderId: string,
    totalCost: number,
    totalProfit: number,
    total_amount: number,
        previousBalance?: number | undefined,
  ): Promise<void> {

    console.log(previousBalance,'previousBalance')
    if (previousBalance !== undefined && previousBalance < 0) {

      const balance_due = total_amount+previousBalance;      
      await client.query(`
      UPDATE sales_orders 
      SET total_cost = $1,
          profit_amount = $2,
          balance_due=$4,
          updated_at = NOW()
      WHERE id = $3
    `, [totalCost, totalProfit, salesOrderId,balance_due])
    } else {
      await client.query(`
      UPDATE sales_orders 
      SET total_cost = $1,
          profit_amount = $2,
          updated_at = NOW()
      WHERE id = $3
    `, [totalCost, totalProfit, salesOrderId])
    }

  }
}
