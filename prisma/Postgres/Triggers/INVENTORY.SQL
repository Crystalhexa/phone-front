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

-- Trigger on branch_inventory_items changes
CREATE TRIGGER check_batch_depletion_on_inventory_update
    AFTER UPDATE ON branch_inventory_items
    FOR EACH ROW
    WHEN (OLD.quantity != NEW.quantity OR OLD.is_active != NEW.is_active)
    EXECUTE FUNCTION check_batch_depletion();

CREATE OR REPLACE FUNCTION check_batch_reactivation()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the batch has at least one active inventory item with stock
    IF EXISTS (
        SELECT 1 
        FROM branch_inventory_items 
        WHERE purchase_batch_id = NEW.purchase_batch_id 
          AND quantity > 0 
          AND is_active = true
    ) THEN
        -- Reactivate the batch
        UPDATE purchase_batches 
        SET is_active = true, updated_at = NOW()
        WHERE id = NEW.purchase_batch_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on branch_inventory_items changes
CREATE TRIGGER check_batch_reactivation_on_inventory_update
    AFTER UPDATE ON branch_inventory_items
    FOR EACH ROW
    WHEN (OLD.quantity != NEW.quantity OR OLD.is_active != NEW.is_active)
    EXECUTE FUNCTION check_batch_reactivation();

