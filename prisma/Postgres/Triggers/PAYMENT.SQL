-- PostgreSQL Payment Allocation Function
CREATE OR REPLACE FUNCTION process_payment_allocation()
RETURNS TRIGGER AS $$
DECLARE
    remaining_payment DECIMAL(12,2);
    v_oldest_order_id TEXT;
    v_oldest_balance DECIMAL(12,2);
    payment_applied DECIMAL(12,2);
BEGIN
    -- Start with the payment amount
    remaining_payment := NEW.amount;
    
    -- If payment is linked to a specific sales order, just update that one
    IF NEW.sales_order_id IS NOT NULL THEN
        -- Update that order's balance and payment status
        UPDATE sales_orders
        SET 
            balance_due = GREATEST(balance_due - NEW.amount, 0),
            payment_status = CASE 
                WHEN GREATEST(balance_due - NEW.amount, 0) = 0 THEN 'PAID'::payment_status
                WHEN GREATEST(balance_due - NEW.amount, 0) < total_amount THEN 'PARTIAL'::payment_status
                ELSE payment_status
            END,
            updated_at = NOW()
        WHERE id = NEW.sales_order_id;
        
        
    ELSE
        -- If payment is not linked to a specific order, apply to oldest unpaid orders first
        WHILE remaining_payment > 0 LOOP
            -- Find oldest unpaid order for the customer
            SELECT id, balance_due
            INTO v_oldest_order_id, v_oldest_balance
            FROM sales_orders
            WHERE customer_id = NEW.customer_id
              AND payment_status IN ('PENDING', 'PARTIAL')
              AND balance_due > 0
            ORDER BY order_date ASC, created_at ASC
            LIMIT 1;
            
            -- If no unpaid orders found, exit the loop
            IF v_oldest_order_id IS NULL THEN
                EXIT;
            END IF;
            
            -- Calculate how much to apply to this order
            IF remaining_payment >= v_oldest_balance THEN
                -- Payment fully covers this order
                payment_applied := v_oldest_balance;
                
                UPDATE sales_orders
                SET 
                    balance_due = 0,
                    payment_status = 'PAID'::payment_status,
                    updated_at = NOW()
                WHERE id = v_oldest_order_id;
                
            ELSE
                -- Payment only partially covers this order
                payment_applied := remaining_payment;
                
                UPDATE sales_orders
                SET 
                    balance_due = balance_due - remaining_payment,
                    payment_status = 'PARTIAL'::payment_status,
                    updated_at = NOW()
                WHERE id = v_oldest_order_id;
                
            END IF;
            
            -- Reduce remaining payment
            remaining_payment := remaining_payment - payment_applied;
            
        END LOOP;
        
    END IF;
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error for debugging
        INSERT INTO payment_errors (payment_id, error_message, created_at)
        VALUES (NEW.id, SQLERRM, NOW());
        
        -- Re-raise the exception
        RAISE;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS after_payment_insert ON payments;
CREATE TRIGGER after_payment_insert
    AFTER INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION process_payment_allocation();

-- Optional: Create error logging table
CREATE TABLE IF NOT EXISTS payment_errors (
    id SERIAL PRIMARY KEY,
    payment_id TEXT NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Essential indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_orders_allocation 
ON sales_orders (customer_id, payment_status, order_date, created_at) 
WHERE balance_due > 0;


-- Optional: Performance monitoring table
CREATE TABLE IF NOT EXISTS payment_processing_log (
    id SERIAL PRIMARY KEY,
    payment_id TEXT NOT NULL,
    processing_start TIMESTAMPTZ DEFAULT NOW(),
    orders_processed INTEGER DEFAULT 0,
    total_allocated DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);