-- ================== STORED PROCEDURES ==================

-- 1. FIFO Stock Allocation for Sales
CREATE OR REPLACE FUNCTION allocate_stock_fifo(
    p_branch_id TEXT,
    p_product_id TEXT,
    p_quantity_needed INTEGER,
    p_sales_order_item_id TEXT
) RETURNS TABLE(
    batch_id TEXT,
    allocated_quantity INTEGER,
    cost_price DECIMAL,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_remaining_qty INTEGER := p_quantity_needed;
    v_batch_record RECORD;
    v_allocated_qty INTEGER;
BEGIN
    -- Get available batches in FIFO order
    FOR v_batch_record IN 
        SELECT bii.id, bii.purchase_batch_id, 
               (bii.quantity - bii.reserved_quantity) as available_qty,
               bii.cost_price, bii.retail_price
        FROM branch_inventory_items bii
        JOIN branch_inventory bi ON bii.branch_inventory_id = bi.id
        WHERE bi.branch_id = p_branch_id 
            AND bi.product_id = p_product_id
            AND (bii.quantity - bii.reserved_quantity) > 0
            AND bii.is_active = true
        ORDER BY bii.received_date ASC, bii.fifo_order ASC
    LOOP
        IF v_remaining_qty <= 0 THEN
            EXIT;
        END IF;
        
        -- Calculate allocation for this batch
        v_allocated_qty := LEAST(v_remaining_qty, v_batch_record.available_qty);
        
        -- Create allocation record
        INSERT INTO sales_batch_allocations (
            sales_order_item_id, batch_id, quantity_allocated, 
            cost_price_at_sale, selling_price
        ) VALUES (
            p_sales_order_item_id, v_batch_record.purchase_batch_id, 
            v_allocated_qty, v_batch_record.cost_price, v_batch_record.retail_price
        );
        
        -- Update reserved quantity
        UPDATE branch_inventory_items 
        SET reserved_quantity = reserved_quantity + v_allocated_qty
        WHERE id = v_batch_record.id;
        
        -- Return allocation info
        batch_id := v_batch_record.purchase_batch_id;
        allocated_quantity := v_allocated_qty;
        cost_price := v_batch_record.cost_price;
        success := true;
        message := 'Allocated successfully';
        
        RETURN NEXT;
        
        v_remaining_qty := v_remaining_qty - v_allocated_qty;
    END LOOP;
    
    -- Check if we allocated everything
    IF v_remaining_qty > 0 THEN
        batch_id := NULL;
        allocated_quantity := 0;
        cost_price := 0;
        success := false;
        message := 'Insufficient stock - remaining: ' || v_remaining_qty;
        RETURN NEXT;
    END IF;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- 2. Price History Management
CREATE OR REPLACE FUNCTION update_product_prices(
    p_product_id TEXT,
    p_cost_price DECIMAL,
    p_wholesale_price DECIMAL DEFAULT NULL,
    p_retail_price DECIMAL,
    p_effective_date TIMESTAMP DEFAULT NOW(),
    p_created_by TEXT,
    p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    -- Deactivate current active price
    UPDATE product_price_history 
    SET is_active = false 
    WHERE product_id = p_product_id AND is_active = true;
    
    -- Insert new price record
    INSERT INTO product_price_history (
        product_id, effective_date, cost_price, wholesale_price, 
        retail_price, is_active, created_by, reason
    ) VALUES (
        p_product_id, p_effective_date, p_cost_price, p_wholesale_price,
        p_retail_price, true, p_created_by, p_reason
    );
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql;

-- 3. Stock Transfer Processing
CREATE OR REPLACE FUNCTION process_stock_transfer(
    p_transfer_request_id TEXT,
    p_processed_by TEXT
) RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    items_processed INTEGER
) AS $$
DECLARE
    v_transfer_record RECORD;
    v_item_record RECORD;
    v_items_count INTEGER := 0;
BEGIN
    -- Get transfer request details
    SELECT * INTO v_transfer_record 
    FROM stock_transfer_requests 
    WHERE id = p_transfer_request_id AND status = 'APPROVED';
    
    IF NOT FOUND THEN
        success := false;
        message := 'Transfer request not found or not approved';
        items_processed := 0;
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Process each item
    FOR v_item_record IN 
        SELECT * FROM stock_transfer_items 
        WHERE transfer_request_id = p_transfer_request_id
    LOOP
        -- Remove from source branch
        UPDATE branch_inventory_items 
        SET quantity = quantity - v_item_record.quantity_approved
        WHERE branch_inventory_id IN (
            SELECT id FROM branch_inventory 
            WHERE branch_id = v_transfer_record.from_branch_id 
                AND product_id = v_item_record.product_id
        );
        
        -- Add to destination branch
        INSERT INTO branch_inventory_items (
            branch_inventory_id, purchase_batch_id, quantity,
            cost_price, wholesale_price, retail_price, received_date
        )
        SELECT bi.id, v_item_record.batch_id, v_item_record.quantity_approved,
               v_item_record.unit_cost_price, v_item_record.unit_wholesale_price,
               v_item_record.unit_retail_price, NOW()
        FROM branch_inventory bi
        WHERE bi.branch_id = v_transfer_record.to_branch_id 
            AND bi.product_id = v_item_record.product_id;
        
        v_items_count := v_items_count + 1;
    END LOOP;
    
    -- Update transfer request status
    UPDATE stock_transfer_requests 
    SET status = 'COMPLETED', completed_at = NOW()
    WHERE id = p_transfer_request_id;
    
    success := true;
    message := 'Transfer completed successfully';
    items_processed := v_items_count;
    RETURN NEXT;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- 4. Low Stock Alert Generator
CREATE OR REPLACE FUNCTION generate_low_stock_alerts()
RETURNS TABLE(
    alerts_generated INTEGER,
    message TEXT
) AS $$
DECLARE
    v_alert_count INTEGER := 0;
    v_inventory_record RECORD;
BEGIN
    -- Clear existing active alerts that are no longer valid
    UPDATE low_stock_alerts 
    SET status = 'RESOLVED', resolved_at = NOW()
    WHERE status = 'ACTIVE' 
        AND (branch_id, product_id) IN (
            SELECT bi.branch_id, bi.product_id
            FROM branch_inventory bi
            WHERE (bi.total_quantity - bi.reserved_quantity) > bi.low_stock_threshold
        );
    
    -- Generate new alerts for low stock items
    FOR v_inventory_record IN
        SELECT bi.branch_id, bi.product_id, 
               (bi.total_quantity - bi.reserved_quantity) as available_qty,
               bi.low_stock_threshold
        FROM branch_inventory bi
        WHERE (bi.total_quantity - bi.reserved_quantity) <= bi.low_stock_threshold
            AND NOT EXISTS (
                SELECT 1 FROM low_stock_alerts lsa
                WHERE lsa.branch_id = bi.branch_id 
                    AND lsa.product_id = bi.product_id
                    AND lsa.status = 'ACTIVE'
            )
    LOOP
        INSERT INTO low_stock_alerts (
            branch_id, product_id, current_stock, threshold_level,
            alert_type, status
        ) VALUES (
            v_inventory_record.branch_id,
            v_inventory_record.product_id,
            v_inventory_record.available_qty,
            v_inventory_record.low_stock_threshold,
            CASE 
                WHEN v_inventory_record.available_qty <= 0 THEN 'OUT_OF_STOCK'
                WHEN v_inventory_record.available_qty <= (v_inventory_record.low_stock_threshold * 0.5) THEN 'CRITICAL_STOCK'
                ELSE 'LOW_STOCK'
            END,
            'ACTIVE'
        );
        
        v_alert_count := v_alert_count + 1;
    END LOOP;
    
    alerts_generated := v_alert_count;
    message := 'Generated ' || v_alert_count || ' new alerts';
    RETURN NEXT;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;
