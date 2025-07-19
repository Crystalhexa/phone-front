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
