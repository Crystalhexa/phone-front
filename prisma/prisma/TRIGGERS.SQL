-- ================== CORRECTED TRIGGERS FOR YOUR SCHEMA ==================

-- 1. FIXED: Auto-update FIFO sequence on batch creation
CREATE OR REPLACE FUNCTION update_fifo_sequence()
RETURNS TRIGGER AS $$
BEGIN
    -- Set FIFO sequence based on received date and creation order
    NEW.fifo_sequence := COALESCE(
        (SELECT MAX(fifo_sequence) + 1 
         FROM purchase_batches 
         WHERE purchase_order_item_id IN (
             SELECT id FROM purchase_order_items WHERE product_id = (
                 SELECT product_id FROM purchase_order_items WHERE id = NEW.purchase_order_item_id
             )
         )), 
        1
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_fifo_sequence
    BEFORE INSERT ON purchase_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_fifo_sequence();

-- 2. FIXED: Auto-update inventory items FIFO order
CREATE OR REPLACE FUNCTION update_inventory_fifo_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Set FIFO order based on received date within the same product
    NEW.fifo_order := COALESCE(
        (SELECT MAX(fifo_order) + 1 
         FROM branch_inventory_items bii
         JOIN branch_inventory bi ON bii.branch_inventory_id = bi.id
         WHERE bi.product_id = (
             SELECT bi2.product_id 
             FROM branch_inventory bi2 
             WHERE bi2.id = NEW.branch_inventory_id
         )), 
        1
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_inventory_fifo_order
    BEFORE INSERT ON branch_inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_fifo_order();

-- 3. FIXED: Auto-update current prices (corrected column references)
CREATE OR REPLACE FUNCTION update_current_prices()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert current prices using correct column names
    INSERT INTO product_current_prices (product_id, cost_price, wholesale_price, retail_price, last_updated)
    VALUES (NEW.product_id, NEW.cost_price, NEW.wholesale_price, NEW.retail_price, NEW.created_at)
    ON CONFLICT (product_id) 
    DO UPDATE SET 
        cost_price = NEW.cost_price,
        wholesale_price = NEW.wholesale_price,
        retail_price = NEW.retail_price,
        last_updated = NEW.created_at
    WHERE product_current_prices.last_updated < NEW.created_at;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_current_prices
    AFTER INSERT ON product_price_history
    FOR EACH ROW
    EXECUTE FUNCTION update_current_prices();

-- 4. FIXED: Stock ledger trigger (corrected to use your schema)
CREATE OR REPLACE FUNCTION update_stock_ledger()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert stock ledger entry for inventory changes
    INSERT INTO product_stock_ledgers (
        product_id, branch_id, batch_id, quantity, entry_type, 
        reference_id, reference_type, cost_price, selling_price, created_at
    ) VALUES (
        (SELECT product_id FROM branch_inventory WHERE id = NEW.branch_inventory_id),
        (SELECT branch_id FROM branch_inventory WHERE id = NEW.branch_inventory_id),
        NEW.purchase_batch_id,
        NEW.quantity - COALESCE(OLD.quantity, 0),
        CASE WHEN TG_OP = 'INSERT' THEN 'PURCHASE'::stock_entry_type ELSE 'ADJUSTMENT'::stock_entry_type END,
        NEW.id::TEXT,
        'branch_inventory_items',
        NEW.cost_price,
        NEW.retail_price,
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_stock_ledger
    AFTER INSERT OR UPDATE ON branch_inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_ledger();

-- 5. FIXED: Auto-update branch inventory totals (using correct columns)
CREATE OR REPLACE FUNCTION update_branch_inventory_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update total quantities in branch_inventory using your schema columns
    UPDATE branch_inventory 
    SET 
        total_quantity = (
            SELECT COALESCE(SUM(quantity), 0) 
            FROM branch_inventory_items 
            WHERE branch_inventory_id = COALESCE(NEW.branch_inventory_id, OLD.branch_inventory_id)
        ),
        average_cost_price = (
            SELECT CASE 
                WHEN SUM(quantity) > 0 THEN SUM(quantity * cost_price) / SUM(quantity)
                ELSE 0 
            END
            FROM branch_inventory_items 
            WHERE branch_inventory_id = COALESCE(NEW.branch_inventory_id, OLD.branch_inventory_id)
                AND quantity > 0
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.branch_inventory_id, OLD.branch_inventory_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_branch_inventory_totals
    AFTER INSERT OR UPDATE OR DELETE ON branch_inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION update_branch_inventory_totals();

-- ================== ADDITIONAL HELPFUL TRIGGERS ==================

-- 6. NEW: Auto-update sales order totals when items change
CREATE OR REPLACE FUNCTION update_sales_order_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sales_orders 
    SET 
        subtotal = (
            SELECT COALESCE(SUM(line_total), 0) 
            FROM sales_order_items 
            WHERE sales_order_id = COALESCE(NEW.sales_order_id, OLD.sales_order_id)
        ),
        total_cost = (
            SELECT COALESCE(SUM(line_cost), 0) 
            FROM sales_order_items 
            WHERE sales_order_id = COALESCE(NEW.sales_order_id, OLD.sales_order_id)
        ),
        profit_amount = (
            SELECT COALESCE(SUM(line_profit), 0) 
            FROM sales_order_items 
            WHERE sales_order_id = COALESCE(NEW.sales_order_id, OLD.sales_order_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.sales_order_id, OLD.sales_order_id);
    
    -- Update total_amount = subtotal - discount + tax_amount
    UPDATE sales_orders 
    SET total_amount = subtotal - discount + tax_amount,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.sales_order_id, OLD.sales_order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_sales_order_totals
    AFTER INSERT OR UPDATE OR DELETE ON sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_order_totals();

-- 7. NEW: Auto-update purchase order totals when items change
CREATE OR REPLACE FUNCTION update_purchase_order_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE purchase_orders 
    SET 
        subtotal = (
            SELECT COALESCE(SUM(line_total), 0) 
            FROM purchase_order_items 
            WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
    
    -- Update total_amount = subtotal + tax_amount
    UPDATE purchase_orders 
    SET total_amount = subtotal + COALESCE(tax_amount, 0),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_purchase_order_totals
    AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_order_totals();

-- 8. NEW: Auto-update last sale date in inventory
CREATE OR REPLACE FUNCTION update_inventory_last_sale()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE branch_inventory 
        SET last_sale_date = NOW(),
            updated_at = NOW()
        FROM sales_order_items soi, sales_orders so
        WHERE soi.id = NEW.sales_order_item_id
            AND so.id = soi.sales_order_id
            AND branch_inventory.branch_id = so.branch_id
            AND branch_inventory.product_id = soi.product_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_inventory_last_sale
    AFTER INSERT ON sales_batch_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_last_sale();

-- ================== VALIDATION FUNCTIONS ==================

-- Test function to verify triggers are working
CREATE OR REPLACE FUNCTION test_trigger_functionality()
RETURNS TABLE(
    test_name TEXT,
    status TEXT,
    message TEXT
) AS $$
BEGIN
    -- Test 1: Check if FIFO sequence trigger exists
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_update_fifo_sequence') THEN
        test_name := 'FIFO Sequence Trigger';
        status := 'PASS';
        message := 'Trigger exists and should auto-assign FIFO sequence';
        RETURN NEXT;
    ELSE
        test_name := 'FIFO Sequence Trigger';
        status := 'FAIL';
        message := 'Trigger missing';
        RETURN NEXT;
    END IF;
    
    -- Test 2: Check if current prices trigger exists  
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_update_current_prices') THEN
        test_name := 'Current Prices Trigger';
        status := 'PASS';
        message := 'Trigger exists and should update current prices';
        RETURN NEXT;
    ELSE
        test_name := 'Current Prices Trigger';
        status := 'FAIL';
        message := 'Trigger missing';
        RETURN NEXT;
    END IF;
    
    -- Test 3: Check if inventory totals trigger exists
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_update_branch_inventory_totals') THEN
        test_name := 'Inventory Totals Trigger';
        status := 'PASS';
        message := 'Trigger exists and should update inventory totals';
        RETURN NEXT;
    ELSE
        test_name := 'Inventory Totals Trigger';
        status := 'FAIL';
        message := 'Trigger missing';
        RETURN NEXT;
    END IF;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;