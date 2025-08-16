-- Function to check and create low stock alerts
CREATE OR REPLACE FUNCTION check_and_create_low_stock_alert()
RETURNS TRIGGER AS $$
DECLARE
    available_stock INTEGER;
    existing_alert_id TEXT;
BEGIN
    -- Calculate available stock (total - reserved)
    available_stock := NEW.total_quantity - NEW.reserved_quantity;
    
    -- Check if stock is at or below threshold
    IF available_stock <= NEW.low_stock_threshold THEN
    -- Check if stock is at or below threshold
    IF available_stock <= NEW.low_stock_threshold THEN
        -- Check if there's already an active or acknowledged alert for this branch-product combination
        SELECT id INTO existing_alert_id
        FROM low_stock_alerts
        WHERE 
            branch_id = NEW.branch_id 
            AND product_id = NEW.product_id 
            AND status IN ('ACTIVE', 'ACKNOWLEDGED')
        LIMIT 1;
        
        IF existing_alert_id IS NOT NULL THEN
            -- Update existing alert with current stock level
            UPDATE low_stock_alerts 
            SET 
                current_stock = available_stock,
                updated_at = NOW(),
                notes = COALESCE(notes, '') || ' | Stock updated to ' || available_stock::text || ' at ' || NOW()::text
            WHERE id = existing_alert_id;
        ELSE
            -- Create new alert
            INSERT INTO low_stock_alerts (
                branch_id,
                product_id,
                current_stock,
                threshold_level,
                alert_type,
                status,
                created_at,
                updated_at,
                notes
            ) VALUES (
                NEW.branch_id,
                NEW.product_id,
                available_stock,
                NEW.low_stock_threshold,
                'LOW_STOCK',
                'ACTIVE',
                NOW(),
                NOW(),
                'Auto-generated low stock alert - Available: ' || available_stock::text || ', Threshold: ' || NEW.low_stock_threshold::text
            );
            
            -- Update the branch inventory alert flag
            UPDATE branch_inventory 
            SET 
                is_low_stock_alert_sent = TRUE,
                updated_at = NOW()
            WHERE id = NEW.id;
        END IF;
    ELSE
        -- Stock is above threshold, resolve any existing alerts
        UPDATE low_stock_alerts 
        SET 
            status = 'RESOLVED',
            resolved_at = NOW(),
            updated_at = NOW()
        WHERE 
            branch_id = NEW.branch_id 
            AND product_id = NEW.product_id 
            AND status IN ('ACTIVE', 'ACKNOWLEDGED');
            
        -- Update the branch inventory alert flag
        UPDATE branch_inventory 
        SET 
            is_low_stock_alert_sent = FALSE,
            updated_at = NOW()
        WHERE id = NEW.id;
            
        -- Update alert flag
        UPDATE branch_inventory 
        SET 
            is_low_stock_alert_sent = FALSE,
            updated_at = NOW()
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle alert resolution when stock is restocked
CREATE OR REPLACE FUNCTION resolve_alerts_on_restock()
RETURNS TRIGGER AS $$
DECLARE
    available_stock INTEGER;
BEGIN
    -- Calculate available stock
    available_stock := NEW.total_quantity - NEW.reserved_quantity;
    
    -- If stock is now above threshold and there was a restock
    IF available_stock > NEW.low_stock_threshold 
       AND (OLD.total_quantity < NEW.total_quantity OR OLD.last_restock_date != NEW.last_restock_date) THEN
        
        -- Resolve active and acknowledged alerts
        UPDATE low_stock_alerts 
        SET 
            status = 'RESOLVED',
            resolved_at = NOW(),
            updated_at = NOW(),
            notes = COALESCE(notes, '') || ' | Resolved due to restock at ' || NOW()::text
        WHERE 
            branch_id = NEW.branch_id 
            AND product_id = NEW.product_id 
            AND status IN ('ACTIVE', 'ACKNOWLEDGED');
            
        -- Update alert flag
        UPDATE branch_inventory 
        SET 
            is_low_stock_alert_sent = FALSE,
            updated_at = NOW()
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_check_low_stock ON branch_inventory;
CREATE TRIGGER trigger_check_low_stock
    AFTER INSERT OR UPDATE OF total_quantity, reserved_quantity, low_stock_threshold
    ON branch_inventory
    FOR EACH ROW
    EXECUTE FUNCTION check_and_create_low_stock_alert();

DROP TRIGGER IF EXISTS trigger_resolve_alerts_on_restock ON branch_inventory;
CREATE TRIGGER trigger_resolve_alerts_on_restock
    AFTER UPDATE OF total_quantity, last_restock_date
    ON branch_inventory
    FOR EACH ROW
    EXECUTE FUNCTION resolve_alerts_on_restock();


-- Trigger to auto-deactivate when stock is depleted
CREATE OR REPLACE FUNCTION check_inventory_active()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quantity = 0 AND NEW.reserved_quantity = 0 THEN
        NEW.is_active = false;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_active
    BEFORE UPDATE ON branch_inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION check_inventory_active();


-- Trigger to auto-activate when stock is replenished
CREATE OR REPLACE FUNCTION check_inventory_reactivate()
RETURNS TRIGGER AS $$
BEGIN
    -- If quantity or reserved_quantity is greater than 0, set is_active to true
    IF (NEW.quantity > 0 OR NEW.reserved_quantity > 0) THEN
        NEW.is_active = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_reactivate
    BEFORE UPDATE ON branch_inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION check_inventory_reactivate();


CREATE OR REPLACE FUNCTION check_batch_depletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if this batch has any active inventory remaining
    IF NOT EXISTS (
        SELECT 1 
        FROM branch_inventory_items 
        WHERE purchase_batch_id = NEW.purchase_batch_id 
          AND quantity > 0 
          AND is_active = true
    ) THEN
        -- Deactivate the batch
        UPDATE purchase_batches 
        SET is_active = false, updated_at = NOW()
        WHERE id = NEW.purchase_batch_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
