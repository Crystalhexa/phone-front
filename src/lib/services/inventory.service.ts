// services/inventory.service.ts
import { PoolClient } from 'pg'

export class InventoryService {
  static async updateBatchInventory(
    client: PoolClient,
    batchId: string,
    productId: string,
    quantity: number,
    branchId: string
  ): Promise<void> {
    // First, update branch inventory and get the branch_inventory_id
    const branchInventoryResult = await client.query(`
      UPDATE branch_inventory
      SET total_quantity = total_quantity - $1,
          last_sale_date = NOW(),
          updated_at = NOW()
      WHERE product_id = $2
        AND branch_id = $3
      RETURNING id
    `, [quantity, productId, branchId]);

    if (branchInventoryResult.rows.length === 0) {
      throw new Error(`Branch inventory not found for productId: ${productId}, branchId: ${branchId}`);
    }

    const branchInventoryId = branchInventoryResult.rows[0].id;

    // Then, update branch inventory items using the returned branch_inventory_id
    await client.query(`
      UPDATE branch_inventory_items
      SET quantity = quantity - $1,
          updated_at = NOW()
      WHERE branch_inventory_id = $2
        AND purchase_batch_id = $3
    `, [quantity, branchInventoryId, batchId]);
  }

  static async updateIndividualItemInventory(
    client: PoolClient,
    itemBarcodeId: string,
    productId: string
  ): Promise<void> {
    // Get item location and batch info
    const itemResult = await client.query(`
      SELECT purchase_batch_id, location_branch 
      FROM item_barcodes 
      WHERE id = $1
    `, [itemBarcodeId])

    const { purchase_batch_id, location_branch } = itemResult.rows[0]

    // Update branch inventory items  
    await client.query(`
      UPDATE branch_inventory_items 
      SET quantity = quantity - 1,
          updated_at = NOW()
      WHERE purchase_batch_id = $1 
        AND branch_inventory_id = (
          SELECT id FROM branch_inventory 
          WHERE product_id = $2 AND branch_id = $3
        )
    `, [purchase_batch_id, productId, location_branch])

    // Update main branch inventory
    await client.query(`
      UPDATE branch_inventory 
      SET total_quantity = total_quantity - 1,
          last_sale_date = NOW(),
          updated_at = NOW()
      WHERE product_id = $1 AND branch_id = $2
    `, [productId, location_branch])
  }
}