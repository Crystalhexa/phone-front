-- 1. Current Product Prices with Overrides
CREATE OR REPLACE VIEW vw_product_current_prices AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.sku,
    b.name as brand_name,
    COALESCE(po.override_price, pcp.retail_price) as current_retail_price,
    COALESCE(po.override_price, pcp.wholesale_price) as current_wholesale_price,
    pcp.cost_price,
    po.override_price,
    po.valid_from as override_valid_from,
    po.valid_until as override_valid_until,
    po.reason as override_reason,
    pcp.last_updated as price_last_updated
FROM products p
LEFT JOIN brands b ON p.brand_id = b.id
LEFT JOIN product_current_prices pcp ON p.id = pcp.product_id
LEFT JOIN price_overrides po ON p.id = po.product_id 
    AND po.is_active = true 
    AND po.valid_from <= NOW() 
    AND (po.valid_until IS NULL OR po.valid_until >= NOW());

-- 2. Branch Inventory Summary with Pricing
CREATE OR REPLACE VIEW vw_branch_inventory_summary AS
SELECT 
    bi.id,
    br.name as branch_name,
    br.code as branch_code,
    p.name as product_name,
    p.sku,
    b.name as brand_name,
    bi.total_quantity,
    bi.reserved_quantity,
    (bi.total_quantity - bi.reserved_quantity) as available_quantity,
    bi.low_stock_threshold,
    CASE 
        WHEN (bi.total_quantity - bi.reserved_quantity) <= 0 THEN 'OUT_OF_STOCK'
        WHEN (bi.total_quantity - bi.reserved_quantity) <= bi.low_stock_threshold THEN 'LOW_STOCK'
        ELSE 'IN_STOCK'
    END as stock_status,
    bi.average_cost_price,
    vcp.current_retail_price,
    vcp.current_wholesale_price,
    bi.last_restock_date,
    bi.last_sale_date,
    bi.last_counted_at
FROM branch_inventory bi
JOIN branches br ON bi.branch_id = br.id
JOIN products p ON bi.product_id = p.id
LEFT JOIN brands b ON p.brand_id = b.id
LEFT JOIN vw_product_current_prices vcp ON p.id = vcp.product_id;

-- 3. FIFO Batch Availability
CREATE OR REPLACE VIEW vw_fifo_batch_availability AS
SELECT 
    bii.id,
    bii.branch_inventory_id,
    bi.branch_id,
    bi.product_id,
    p.name as product_name,
    p.sku,
    pb.batch_number,
    bii.quantity,
    bii.reserved_quantity,
    (bii.quantity - bii.reserved_quantity) as available_quantity,
    bii.cost_price,
    bii.retail_price,
    bii.received_date,
    bii.expiry_date,
    bii.fifo_order,
    CASE 
        WHEN bii.expiry_date IS NOT NULL AND bii.expiry_date <= CURRENT_DATE THEN true
        ELSE false
    END as is_expired,
    CASE 
        WHEN bii.expiry_date IS NOT NULL AND bii.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN true
        ELSE false
    END as expires_soon
FROM branch_inventory_items bii
JOIN branch_inventory bi ON bii.branch_inventory_id = bi.id
JOIN products p ON bi.product_id = p.id
JOIN purchase_batches pb ON bii.purchase_batch_id = pb.id
WHERE bii.is_active = true 
    AND (bii.quantity - bii.reserved_quantity) > 0
ORDER BY bi.branch_id, bi.product_id, bii.received_date ASC, bii.fifo_order ASC;

-- 4. Cross-Branch Inventory View
CREATE OR REPLACE VIEW vw_cross_branch_inventory AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.sku,
    b.name as brand_name,
    JSON_AGG(
        JSON_BUILD_OBJECT(
            'branch_id', br.id,
            'branch_name', br.name,
            'branch_code', br.code,
            'total_quantity', COALESCE(bi.total_quantity, 0),
            'available_quantity', COALESCE(bi.total_quantity - bi.reserved_quantity, 0),
            'average_cost_price', bi.average_cost_price,
            'stock_status', CASE 
                WHEN bi.id IS NULL THEN 'NOT_STOCKED'
                WHEN (bi.total_quantity - bi.reserved_quantity) <= 0 THEN 'OUT_OF_STOCK'
                WHEN (bi.total_quantity - bi.reserved_quantity) <= bi.low_stock_threshold THEN 'LOW_STOCK'
                ELSE 'IN_STOCK'
            END
        )
    ) as branch_stock_info,
    SUM(COALESCE(bi.total_quantity, 0)) as total_system_quantity,
    SUM(COALESCE(bi.total_quantity - bi.reserved_quantity, 0)) as total_available_quantity
FROM products p
LEFT JOIN brands b ON p.brand_id = b.id
CROSS JOIN branches br
LEFT JOIN branch_inventory bi ON p.id = bi.product_id AND br.id = bi.branch_id
WHERE p.is_active = true AND br.is_active = true
GROUP BY p.id, p.name, p.sku, b.name;

-- 5. Sales Performance View
CREATE OR REPLACE VIEW vw_sales_performance AS
SELECT 
    so.id,
    so.order_number,
    so.order_date,
    br.name as branch_name,
    c.name as customer_name,
    c.customer_type,
    so.subtotal,
    so.discount,
    so.total_amount,
    so.total_cost,
    so.profit_amount,
    CASE 
        WHEN so.total_cost > 0 THEN (so.profit_amount / so.total_cost * 100)
        ELSE 0
    END as profit_margin_percentage,
    so.payment_method,
    so.payment_status,
    so.status
FROM sales_orders so
JOIN branches br ON so.branch_id = br.id
LEFT JOIN customers c ON so.customer_id = c.id;

-- 6. Stock Transfer Dashboard
CREATE OR REPLACE VIEW vw_stock_transfer_dashboard AS
SELECT 
    str.id,
    str.request_number,
    fb.name as from_branch_name,
    tb.name as to_branch_name,
    e1.name as requested_by_name,
    e2.name as approved_by_name,
    str.status,
    str.priority,
    str.requested_at,
    str.approved_at,
    str.dispatched_at,
    str.completed_at,
    COUNT(sti.id) as total_items,
    SUM(sti.quantity_requested * sti.unit_retail_price) as total_value,
    str.request_reason
FROM stock_transfer_requests str
JOIN branches fb ON str.from_branch_id = fb.id
JOIN branches tb ON str.to_branch_id = tb.id
JOIN employees e1 ON str.requested_by = e1.id
LEFT JOIN employees e2 ON str.approved_by = e2.id
LEFT JOIN stock_transfer_items sti ON str.id = sti.transfer_request_id
GROUP BY str.id, fb.name, tb.name, e1.name, e2.name;
