
CREATE SEQUENCE product_code_seq START 27;
CREATE OR REPLACE FUNCTION generate_product_code()
RETURNS TRIGGER AS $$
DECLARE
    nextval_seq INT;
BEGIN
    -- Get the next number from sequence
    nextval_seq := nextval('product_code_seq');
    
    -- Build product code like EL10, EL11, EL12...
    NEW.product_code := 'EL' || nextval_seq;

    RETURN NEW;
END;

$$ LANGUAGE plpgsql;
CREATE TRIGGER set_product_code
BEFORE INSERT ON products
FOR EACH ROW
WHEN (NEW.product_code IS NULL) -- only if product_code not provided
EXECUTE FUNCTION generate_product_code();


-- 2. GENERIC FUNCTION FOR ALL ORDER TYPES (NO PADDING - DYNAMIC LENGTH)
CREATE OR REPLACE FUNCTION generate_order_number(
  prefix TEXT,
  include_date BOOLEAN DEFAULT true,
  use_padding BOOLEAN DEFAULT false,
  sequence_length INTEGER DEFAULT 6
)
RETURNS TEXT AS $$
DECLARE
  today TEXT := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  seq_key TEXT;
  seq_val INTEGER;
  order_number TEXT;
  number_part TEXT;
BEGIN
  -- Create sequence key
  IF include_date THEN
    seq_key := LOWER(prefix) || '_' || today;
  ELSE
    seq_key := LOWER(prefix) || '_global';
  END IF;
  
  -- Get next sequence value (atomic operation)
  INSERT INTO code_sequences (sequence_key, current_value, updated_at)
  VALUES (seq_key, 1, NOW())
  ON CONFLICT (sequence_key) 
  DO UPDATE SET 
    current_value = code_sequences.current_value + 1,
    updated_at = NOW()
  RETURNING current_value INTO seq_val;
  
  -- Format number part (with or without padding)
  IF use_padding THEN
    number_part := LPAD(seq_val::TEXT, sequence_length, '0');
  ELSE
    number_part := seq_val::TEXT;
  END IF;
  
  -- Build order number
  IF include_date THEN
    order_number := prefix || '-' || today || '-' || number_part;
  ELSE
    order_number := prefix || '-' || number_part;
  END IF;
  
  RETURN order_number;
END;
$$ LANGUAGE plpgsql;

-- 3. SPECIFIC TRIGGER FUNCTIONS FOR EACH TABLE

-- Purchase Orders
CREATE OR REPLACE FUNCTION trg_purchase_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number('PO', true, false);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_purchase_order_number
  BEFORE INSERT ON purchase_orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
  EXECUTE FUNCTION trg_purchase_order_number();

-- Sales Orders
CREATE OR REPLACE FUNCTION trg_sales_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number('SO', true, false);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_sales_order_number
  BEFORE INSERT ON sales_orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
  EXECUTE FUNCTION trg_sales_order_number();

-- Stock Transfer Requests
CREATE OR REPLACE FUNCTION trg_transfer_request_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
    NEW.request_number := generate_order_number('STR', true, false);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_transfer_request_number
  BEFORE INSERT ON stock_transfer_requests
  FOR EACH ROW
  WHEN (NEW.request_number IS NULL OR NEW.request_number = '')
  EXECUTE FUNCTION trg_transfer_request_number();

-- Stock Adjustments
CREATE OR REPLACE FUNCTION trg_adjustment_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.adjustment_number IS NULL OR NEW.adjustment_number = '' THEN
    NEW.adjustment_number := generate_order_number('SA', true, false);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_adjustment_number
  BEFORE INSERT ON stock_adjustments
  FOR EACH ROW
  WHEN (NEW.adjustment_number IS NULL OR NEW.adjustment_number = '')
  EXECUTE FUNCTION trg_adjustment_number();

-- Sales Returns
CREATE OR REPLACE FUNCTION trg_sales_return_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.return_number IS NULL OR NEW.return_number = '' THEN
    NEW.return_number := generate_order_number('SRT', true, false);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_sales_return_number
  BEFORE INSERT ON sales_returns
  FOR EACH ROW
  WHEN (NEW.return_number IS NULL OR NEW.return_number = '')
  EXECUTE FUNCTION trg_sales_return_number();

-- Purchase Returns
CREATE OR REPLACE FUNCTION trg_purchase_return_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.return_number IS NULL OR NEW.return_number = '' THEN
    NEW.return_number := generate_order_number('PRT', true, false);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_purchase_return_number
  BEFORE INSERT ON purchase_returns
  FOR EACH ROW
  WHEN (NEW.return_number IS NULL OR NEW.return_number = '')
  EXECUTE FUNCTION trg_purchase_return_number();

-- Purchase Batches
CREATE OR REPLACE FUNCTION trg_batch_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.batch_number IS NULL OR NEW.batch_number = '' THEN
    NEW.batch_number := generate_order_number('BT', true, false);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_batch_number
  BEFORE INSERT ON purchase_batches
  FOR EACH ROW
  WHEN (NEW.batch_number IS NULL OR NEW.batch_number = '')
  EXECUTE FUNCTION trg_batch_number();

-- Item Barcodes
CREATE OR REPLACE FUNCTION trg_item_barcode()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := generate_order_number('ITEM', true, false);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_item_barcode
  BEFORE INSERT ON item_barcodes
  FOR EACH ROW
  WHEN (NEW.code IS NULL OR NEW.code = '')
  EXECUTE FUNCTION trg_item_barcode();

-- barcode
CREATE OR REPLACE FUNCTION trg_barcode()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := generate_order_number('PRO', true, false);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_barcode
  BEFORE INSERT ON barcodes
  FOR EACH ROW
  WHEN (NEW.code IS NULL OR NEW.code = '')
  EXECUTE FUNCTION trg_barcode(); 


-- Warranty Claims
CREATE OR REPLACE FUNCTION trg_warranty_claim_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.claim_number IS NULL OR NEW.claim_number = '' THEN
    NEW.claim_number := generate_order_number('WC', true, false);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_warranty_claim_number
  BEFORE INSERT ON warranty_claims
  FOR EACH ROW
  WHEN (NEW.claim_number IS NULL OR NEW.claim_number = '')
  EXECUTE FUNCTION trg_warranty_claim_number();

-- 4. CUSTOMER, EMPLOYEE, SUPPLIER CODES (Global sequences)

-- Customers (Global sequence - no date)
CREATE OR REPLACE FUNCTION trg_customer_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_number IS NULL OR NEW.customer_number = '' THEN
    NEW.customer_number := generate_order_number('CUST', false, true, 6);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_customer_number
  BEFORE INSERT ON customers
  FOR EACH ROW
  WHEN (NEW.customer_number IS NULL OR NEW.customer_number = '')
  EXECUTE FUNCTION trg_customer_number();

-- Employees (Global sequence - no date)
CREATE OR REPLACE FUNCTION trg_employee_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.employee_number IS NULL OR NEW.employee_number = '' THEN
    NEW.employee_number := generate_order_number('EMP', false, true, 4);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_employee_number
  BEFORE INSERT ON employees
  FOR EACH ROW
  WHEN (NEW.employee_number IS NULL OR NEW.employee_number = '')
  EXECUTE FUNCTION trg_employee_number();

-- Suppliers (Global sequence - no date)
CREATE OR REPLACE FUNCTION trg_supplier_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := generate_order_number('SUP', false, true, 4);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_supplier_code
  BEFORE INSERT ON suppliers
  FOR EACH ROW
  WHEN (NEW.code IS NULL OR NEW.code = '')
  EXECUTE FUNCTION trg_supplier_code();
