import { query } from '@/lib/database/connection'
// ========== Types ==========
export interface ScannedProduct {
    barcode_id?: string
    barcode: string
    scan_type: 'INDIVIDUAL_ITEM' | 'PRODUCT_LEVEL'
    product_id: string
    name: string
    model: string
    sku: string
    wholesale_quantity?: number
    pricing: {
        cost_price: number
        wholesale_price?: number
        retail_price: number
        selling_price: number
    }
    inventory: {
        available_quantity: number
        is_low_stock: boolean
        total_batches?: number
        fifo_next_batch?: {
            batch_id: string
            batch_number: string
            available_quantity: number
        }
    }
    item_details?: {
        item_id: string
        status: string
        condition: string
        warranty_expiry?: string
        location_branch: string
        purchased_at: string
        supplier_name?: string
    }
    batch_info?: {
        batch_id: string
        batch_number: string
        branch_quantity?: number
        branch_available?: number
    }
    requires_quantity_input: boolean
    max_quantity?: number
    warranty_period?: number
}

export class CartService {
    static async handleIndividualItemScan(
        barcode: string,
        branchId: string
    ): Promise<ScannedProduct> {

        const itemQuery = `
            SELECT 
            ib.id as item_id,
            ib.code as barcode,
            ib.status,
            ib.location_branch,
            ib.purchased_at,
            ib.purchase_cost,
            pb.id as batch_id,
            pb.batch_number,
            pb.cost_price,
            pb.wholesale_price,
            pb.retail_price,
            ib.product_id,
            p.name as product_name,
            p.model,
            p.sku,
            p.warranty_period,
            p.wholesale_quantity,
            -- Branch inventory details
            bi.total_quantity,
            bi.reserved_quantity,
            (bi.total_quantity - bi.reserved_quantity) as available_quantity,
            bi.low_stock_threshold,
            -- Batch availability in this branch
            bii.quantity as batch_quantity_in_branch,
            bii.reserved_quantity as batch_reserved_quantity,
            (bii.quantity - bii.reserved_quantity) as batch_available_quantity
            FROM item_barcodes ib
            JOIN purchase_batches pb ON ib.purchase_batch_id = pb.id
            JOIN products p ON ib.product_id = p.id
            LEFT JOIN product_current_prices pcp ON p.id = pcp.product_id
            -- Branch inventory check
            LEFT JOIN branch_inventory bi ON p.id = bi.product_id AND bi.branch_id = $2
            -- Batch availability in this branch
            LEFT JOIN branch_inventory_items bii ON pb.id = bii.purchase_batch_id 
                                                AND bii.branch_inventory_id = bi.id
                                                AND bii.is_active = true
            WHERE ib.code = $1 AND ib.is_active = true AND ib.location_branch = $2 AND ib.status = 'AVAILABLE'`

        const result = await query(itemQuery, [barcode, branchId])

        if (result.rows.length === 0) {
            throw new Error(`Individual item barcode '${barcode}' not found in system`)
        }

        const item = result.rows[0]

        // Check if item barcode is available for sale
        if (item.status !== 'AVAILABLE') {
            throw new Error(`Item is ${item.status.toLowerCase()} and cannot be sold`)
        }

        // Check if item condition is sellable
        if (['DAMAGED', 'EXPIRED', 'DEFECTIVE'].includes(item.condition)) {
            throw new Error(`Item condition is ${item.condition.toLowerCase()} and cannot be sold`)
        }

        // Check if item is in the correct branch
        if (item.location_branch !== branchId) {
            throw new Error(`Item is located in a different branch. Current location: ${item.location_branch}`)
        }

        // Check if product exists in this branch inventory
        if (item.total_quantity === null || item.total_quantity === undefined) {
            throw new Error(`Product '${item.product_name}' is not available in this branch`)
        }

        // Check if overall product has stock in this branch
        if (!item.available_quantity || item.available_quantity <= 0) {
            throw new Error(`Product '${item.product_name}' is out of stock in this branch`)
        }

        // Check if the specific batch exists in this branch
        if (item.batch_quantity_in_branch === null || item.batch_quantity_in_branch === undefined) {
            throw new Error(`This specific item batch is not located in this branch`)
        }

        // Check if the batch has available quantity in this branch
        if (!item.batch_available_quantity || item.batch_available_quantity <= 0) {
            throw new Error(`This item's batch is out of stock in this branch`)
        }

        // Use current pricing if available, otherwise fall back to batch pricing
        const costPrice = item.current_cost_price || item.cost_price || item.purchase_cost
        const wholesalePrice = item.current_wholesale_price || item.wholesale_price
        const retailPrice = item.current_retail_price || item.retail_price
        console.log(item.wholesale_quantity)
        return {
            barcode_id: item.item_id,
            barcode: item.barcode,
            scan_type: 'INDIVIDUAL_ITEM',
            product_id: item.product_id,
            name: item.product_name,
            model: item.model,
            sku: item.sku,
            wholesale_quantity: item.wholesale_quantity,
            pricing: {
                cost_price: parseFloat(costPrice || '0'),
                wholesale_price: wholesalePrice ? parseFloat(wholesalePrice) : undefined,
                retail_price: parseFloat(retailPrice || '0'),
                selling_price: parseFloat(retailPrice || '0')
            },
            inventory: {
                available_quantity: item.available_quantity,
                is_low_stock: item.available_quantity <= (item.low_stock_threshold || 0)
            },
            item_details: {
                item_id: item.item_id,
                status: item.status,
                condition: item.condition,
                warranty_expiry: item.warranty_expiry,
                location_branch: item.location_branch,
                purchased_at: item.purchased_at,
                supplier_name: item.supplier_name
            },
            batch_info: {
                batch_id: item.batch_id,
                batch_number: item.batch_number,
                branch_quantity: item.batch_quantity_in_branch,
                branch_available: item.batch_available_quantity
            },
            requires_quantity_input: false, // Always 1 for individual items
            warranty_period: item.warranty_period
        }
    }
    // ========== Updated Product Level Scan Handler ==========
    static async handleProductLevelScan(
        barcode: string,
        branchId: string
    ): Promise<ScannedProduct> {

        const productQuery = `
    SELECT 
      bc.id as barcode_id,
      bc.code as barcode,
      p.id as product_id,
      p.name as product_name,
      p.model,
      p.sku,
      p.warranty_period,
      p.wholesale_quantity,
      -- Branch-specific inventory
      bi.total_quantity,
      bi.reserved_quantity,
      (bi.total_quantity - bi.reserved_quantity) as available_quantity,
      bi.low_stock_threshold,
      json_agg(
        json_build_object(
          'batch_id', pb.id,
          'batch_number', pb.batch_number,
          'quantity', (bii.quantity - bii.reserved_quantity),
          'cost_price', pb.cost_price,
          'wholesale_price', pb.wholesale_price,
          'retail_price', pb.retail_price,
          'received_date', pb.received_date,
          'fifo_sequence', pb.fifo_sequence,
          'fifo_order', bii.fifo_order
        ) ORDER BY 
          COALESCE(pb.fifo_sequence, 999999) ASC,
          COALESCE(bii.fifo_order, 999999) ASC,
          pb.received_date ASC NULLS LAST,
          pb.created_at ASC
      ) FILTER (
        WHERE bii.quantity > bii.reserved_quantity 
          AND bii.is_active = true 
          AND pb.is_active = true
      ) as batches
    FROM barcodes bc
    JOIN products p ON bc.product_id = p.id
    LEFT JOIN branch_inventory bi ON p.id = bi.product_id AND bi.branch_id = $2
    LEFT JOIN branch_inventory_items bii ON bi.id = bii.branch_inventory_id 
                                          AND bii.is_active = true
    LEFT JOIN purchase_batches pb ON bii.purchase_batch_id = pb.id
                                   AND pb.is_active = true
    WHERE bc.code = $1
    GROUP BY bc.id, bc.code,  p.id, p.name, p.model, p.sku, p.warranty_period,
              bi.total_quantity, bi.reserved_quantity, 
             bi.low_stock_threshold
  `

        const result = await query(productQuery, [barcode, branchId])

        if (result.rows.length === 0) {
            throw new Error(`Product barcode '${barcode}' not found in system`)
        }

        const product = result.rows[0]

        // Check if product exists in this branch
        if (product.total_quantity === null || product.total_quantity === undefined) {
            throw new Error(`Product '${product.product_name}' is not available in this branch`)
        }

        // Check if product has stock in this branch
        if (!product.available_quantity || product.available_quantity <= 0) {
            throw new Error(`Product '${product.product_name}' is out of stock in this branch`)
        }

        // Get batches (already ordered by FIFO)
        const batches = product.batches || []

        // Check if there are available batches
        if (batches.length === 0) {
            throw new Error(`No available batches for product '${product.product_name}' in this branch`)
        }

        // Calculate FIFO-based pricing from first available batch
        const firstBatch = batches[0]
        const fifoBasedPricing = {
            cost_price: parseFloat(firstBatch.cost_price || '0'),
            wholesale_price: firstBatch.wholesale_price ? parseFloat(firstBatch.wholesale_price) : undefined,
            retail_price: parseFloat(firstBatch.retail_price || '0'),
            selling_price: parseFloat(firstBatch.retail_price || '0')
        }

        // Use average cost price as fallback for cost pricing
        const fallbackCostPrice = product.average_cost_price ? parseFloat(product.average_cost_price) : 0

        return {
            barcode: product.barcode,
            scan_type: 'PRODUCT_LEVEL',
            product_id: product.product_id,
            name: product.product_name,
            model: product.model,
            sku: product.sku,
            wholesale_quantity: product.wholesale_quantity,
            pricing: {
                // Primary pricing based on FIFO (first batch out)

                // Fallback pricing (for backward compatibility)
                cost_price: fifoBasedPricing.cost_price || fallbackCostPrice,
                wholesale_price: fifoBasedPricing.wholesale_price,
                retail_price: fifoBasedPricing.retail_price,
                selling_price: fifoBasedPricing.selling_price,

            },
            inventory: {
                available_quantity: product.available_quantity || 0,
                is_low_stock: (product.available_quantity || 0) <= (product.low_stock_threshold || 0),
                total_batches: batches.length,
                fifo_next_batch: firstBatch ? {
                    batch_id: firstBatch.batch_id,
                    batch_number: firstBatch.batch_number,
                    available_quantity: firstBatch.quantity,
                } : undefined
            },
            batch_info: batches.map((batch: any) => ({
                batch_id: batch.batch_id,
                batch_number: batch.batch_number,
                quantity: batch.quantity,
                cost_price: parseFloat(batch.cost_price || '0'),
                wholesale_price: batch.wholesale_price ? parseFloat(batch.wholesale_price) : undefined,
                retail_price: parseFloat(batch.retail_price || '0'),
                received_date: batch.received_date,
                fifo_sequence: batch.fifo_sequence,
                fifo_order: batch.fifo_order,
                is_next_to_sell: batch === firstBatch // Flag the FIFO batch
            })),
            requires_quantity_input: true,
            max_quantity: product.available_quantity || 0,
            warranty_period: product.warranty_period
        }
    }
    // ========== Price Override Check ==========
    static async checkPriceOverrides(
        productId: string,
        branchId: string,
        basePrice: number
    ): Promise<number> {

        const overrideQuery = `
    SELECT override_price
    FROM price_overrides
    WHERE product_id = $1 
      AND branch_id = $2
      AND is_active = true
      AND valid_from <= NOW()
      AND (valid_until IS NULL OR valid_until >= NOW())
    ORDER BY valid_from DESC
    LIMIT 1
  `

        const result = await query(overrideQuery, [productId, branchId])

        if (result.rows.length > 0) {
            return parseFloat(result.rows[0].override_price)
        }

        return basePrice
    }
}