
-- Function to assign FIFO sequence to new batches
CREATE OR REPLACE FUNCTION assign_fifo_sequence()
RETURNS TRIGGER AS $$
BEGIN
  -- Assign next FIFO sequence for this product across all branches
  NEW.fifo_sequence := COALESCE(
    (SELECT MAX(fifo_sequence) + 1 
     FROM purchase_batches pb
     JOIN purchase_order_items poi ON pb.purchase_order_item_id = poi.id
     WHERE poi.product_id = (
       SELECT product_id FROM purchase_order_items WHERE id = NEW.purchase_order_item_id
     )), 
    1
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_fifo_sequence
BEFORE INSERT ON purchase_batches
FOR EACH ROW
WHEN (NEW.fifo_sequence IS NULL)
EXECUTE FUNCTION assign_fifo_sequence();



-- Function to maintain FIFO order in branch inventory
CREATE OR REPLACE FUNCTION update_branch_inventory_fifo()
RETURNS TRIGGER AS $$
BEGIN
  -- Assign FIFO order based on received_date and batch FIFO sequence
  NEW.fifo_order := (
    SELECT COUNT(*) + 1
    FROM branch_inventory_items bii
    WHERE bii.branch_inventory_id = NEW.branch_inventory_id
    AND bii.is_active = true
    AND (
      bii.received_date < NEW.received_date
      OR (bii.received_date = NEW.received_date AND bii.id < NEW.id)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_branch_inventory_fifo
BEFORE INSERT ON branch_inventory_items
FOR EACH ROW
EXECUTE FUNCTION update_branch_inventory_fifo();