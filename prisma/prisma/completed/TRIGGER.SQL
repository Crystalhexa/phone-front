---barcode squence
CREATE SEQUENCE barcode_sequence START 1 INCREMENT 1;



-- Automation for order number generation in order table
--sequence
CREATE SEQUENCE purchase_order_number_seq START 1;
--function
CREATE OR REPLACE FUNCTION generate_purchase_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := 'PO-' || LPAD(NEXTVAL('purchase_order_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--triger
CREATE TRIGGER set_order_number
BEFORE INSERT ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION generate_purchase_order_number();


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