// services/stock-ledger.service.ts
import { PoolClient } from 'pg'
import { generateCuid } from '@/utils/calculations'

export class StockLedgerService {
  static async createStockLedgerEntry(
    client: PoolClient,
    productId: string,
    branchInventoryId: string | null,
    batchId: string,
    quantity: number,
    entryType: string,
    referenceId: string,
    costPrice: number,
    sellingPrice: number
  ): Promise<void> {
    const ledgerId = generateCuid()

    // Get branch ID if not provided
    let branchId = null
    if (branchInventoryId) {
      const branchResult = await client.query(`
        SELECT branch_id FROM branch_inventory WHERE id = $1
      `, [branchInventoryId])
      branchId = branchResult.rows[0]?.branch_id
    } else {
      // Get branch from batch
      const batchResult = await client.query(`
        SELECT bi.branch_id 
        FROM branch_inventory bi
        JOIN branch_inventory_items bii ON bi.id = bii.branch_inventory_id
        WHERE bii.purchase_batch_id = $1
        LIMIT 1
      `, [batchId])
      branchId = batchResult.rows[0]?.branch_id
    }

    await client.query(`
      INSERT INTO product_stock_ledgers (
        id, product_id, branch_id, batch_id, quantity, entry_type,
        reference_type, reference_id, cost_price, selling_price, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      ledgerId,
      productId,
      branchId,
      batchId,
      quantity,
      entryType,
      'sales_order',
      referenceId,
      costPrice,
      sellingPrice,
      `${entryType} - Quantity: ${Math.abs(quantity)}`
    ])
  }
}