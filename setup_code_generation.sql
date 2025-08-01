-- ================== CREATE ENUMS ==================
CREATE TYPE gender AS ENUM ('MALE', 'FEMALE', 'OTHER');

CREATE TYPE barcode_type AS ENUM ('EXTERNAL', 'INTERNAL', 'SUPPLIER', 'MANUFACTURER');

CREATE TYPE barcode_status AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD', 'RETURNED', 'DAMAGED');

CREATE TYPE stock_entry_type AS ENUM (
    'PURCHASE', 'SALE', 'TRANSFER_IN', 'TRANSFER_OUT', 
    'ADJUSTMENT', 'RETURN', 'DAMAGED', 'INITIAL_STOCK'
);

CREATE TYPE transfer_status AS ENUM (
    'PENDING', 'APPROVED', 'REJECTED', 'DISPATCHED', 
    'RECEIVED', 'COMPLETED', 'CANCELLED'
);

CREATE TYPE priority_level AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

CREATE TYPE delivery_method AS ENUM ('INTERNAL_TRANSPORT', 'THIRD_PARTY', 'PICKUP', 'COURIER');

CREATE TYPE delivery_status AS ENUM (
    'PENDING', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 
    'RETURNED', 'CANCELLED'
);

CREATE TYPE adjustment_reason AS ENUM (
    'DAMAGED', 'EXPIRED', 'LOST', 'THEFT', 'COUNT_CORRECTION', 
    'QUALITY_ISSUE', 'SYSTEM_ERROR', 'INITIAL_STOCK'
);

CREATE TYPE low_stock_alert_type AS ENUM ('LOW_STOCK', 'OUT_OF_STOCK', 'CRITICAL_STOCK', 'EXPIRED_STOCK');

CREATE TYPE alert_status AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

CREATE TYPE order_status AS ENUM (
    'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 
    'DELIVERED', 'COMPLETED', 'CANCELLED', 'RETURNED'
);

CREATE TYPE return_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSED', 'COMPLETED');

CREATE TYPE customer_type AS ENUM ('RETAIL', 'WHOLESALE', 'CORPORATE', 'DISTRIBUTOR', 'VIP');

CREATE TYPE payment_method AS ENUM (
    'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 
    'CHEQUE', 'MOBILE_PAYMENT', 'CREDIT', 'INSTALLMENT'
);

CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED', 'REFUNDED');

CREATE TYPE price_type AS ENUM ('RETAIL', 'WHOLESALE', 'COST');

CREATE TYPE receipt_status AS ENUM ('PENDING', 'COMPLETED', 'PARTIAL', 'CANCELLED');

CREATE TYPE item_movement_type AS ENUM (
    'PURCHASE_RECEIVED', 'SALE_DISPATCHED', 'TRANSFER_OUT', 'TRANSFER_IN', 
    'RETURN_RECEIVED', 'RETURN_DISPATCHED', 'ADJUSTMENT', 'DAMAGED', 
    'LOST', 'LOCATION_CHANGE'
);

CREATE TYPE item_condition AS ENUM ('GOOD', 'DAMAGED', 'EXPIRED', 'DEFECTIVE', 'RETURNED', 'REPAIRED', 'REFURBISHED');

-- ================== CODE SEQUENCE TABLE ==================
CREATE TABLE code_sequences (
    sequence_key VARCHAR(255) PRIMARY KEY,
    current_value INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== USER MANAGEMENT TABLES ==================
CREATE TABLE permission_groups (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE permissions (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    group_id VARCHAR(255) NOT NULL REFERENCES permission_groups(id)
);

CREATE TABLE roles (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    discount INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE role_permissions (
    id VARCHAR(255) PRIMARY KEY,
    role_id VARCHAR(255) NOT NULL REFERENCES roles(id),
    permission_id VARCHAR(255) NOT NULL REFERENCES permissions(id),
    UNIQUE(role_id, permission_id)
);

CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    role_id VARCHAR(255) REFERENCES roles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

CREATE TABLE user_activity_logs (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(50),
    entity_id VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== BRANCH MANAGEMENT ==================
CREATE TABLE branches (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    location VARCHAR(255),
    address TEXT,
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    is_main_branch BOOLEAN DEFAULT FALSE,
    can_purchase BOOLEAN DEFAULT FALSE,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== EMPLOYEE MANAGEMENT ==================
CREATE TABLE employees (
    id VARCHAR(255) PRIMARY KEY,
    employee_number VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    nic VARCHAR(20) UNIQUE,
    gender gender,
    position VARCHAR(100),
    department VARCHAR(50),
    date_of_birth DATE,
    hire_date DATE,
    branch_id VARCHAR(255) REFERENCES branches(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    user_id VARCHAR(255) UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== PRODUCT CATEGORIES ==================
CREATE TABLE categories (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subcategories (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category_id VARCHAR(255) NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== BRANDS ==================
CREATE TABLE brands (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== SUPPLIERS ==================
CREATE TABLE suppliers (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    contact_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    sales_rep_name VARCHAR(100) NOT NULL,
    sales_rep_phone VARCHAR(20),
    payment_terms VARCHAR(100),
    credit_limit DECIMAL(12,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== PRODUCTS ==================
CREATE TABLE products (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    model VARCHAR(255) NOT NULL,
    description TEXT,
    subcategory_id VARCHAR(255) REFERENCES subcategories(id) ON DELETE SET NULL,
    brand_id VARCHAR(255) REFERENCES brands(id) ON DELETE SET NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    warranty_period INTEGER,
    wholesale_quantity INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    is_unique BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== PRODUCT SPECIFICATIONS ==================
CREATE TABLE product_specifications (
    id VARCHAR(255) PRIMARY KEY,
    product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    spec_name VARCHAR(100) NOT NULL,
    spec_value VARCHAR(255) NOT NULL,
    spec_unit VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== PRICING SYSTEM ==================
CREATE TABLE product_price_history (
    id VARCHAR(255) PRIMARY KEY,
    product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    effective_date TIMESTAMPTZ NOT NULL,
    cost_price DECIMAL(10,2) NOT NULL,
    wholesale_price DECIMAL(10,2),
    retail_price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(255) NOT NULL REFERENCES employees(id),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_current_prices (
    product_id VARCHAR(255) PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    cost_price DECIMAL(10,2) NOT NULL,
    wholesale_price DECIMAL(10,2),
    retail_price DECIMAL(10,2) NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL
);

CREATE TABLE price_overrides (
    id VARCHAR(255) PRIMARY KEY,
    product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    branch_id VARCHAR(255) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    override_price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2) NOT NULL,
    price_type price_type DEFAULT 'RETAIL',
    reason TEXT NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ,
    approved_by VARCHAR(255) NOT NULL REFERENCES employees(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== BARCODES ==================
CREATE TABLE barcodes (
    id VARCHAR(255) PRIMARY KEY,
    product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    type barcode_type DEFAULT 'INTERNAL',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== PURCHASE ORDERS ==================
CREATE TABLE purchase_orders (
    id VARCHAR(255) PRIMARY KEY,
    order_number VARCHAR(20) UNIQUE NOT NULL,
    invoice_number VARCHAR(255),
    supplier_id VARCHAR(255) NOT NULL REFERENCES suppliers(id),
    purchased_by VARCHAR(255) REFERENCES users(id),
    branch_id VARCHAR(255) REFERENCES branches(id),
    order_date DATE DEFAULT CURRENT_DATE,
    expected_date DATE,
    received_date DATE,
    status order_status DEFAULT 'PENDING',
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_order_items (
    id VARCHAR(255) PRIMARY KEY,
    purchase_order_id VARCHAR(255) NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id VARCHAR(255) NOT NULL REFERENCES products(id),
    quantity_ordered INTEGER NOT NULL,
    quantity_received INTEGER DEFAULT 0,
    cost_price DECIMAL(10,2) NOT NULL,
    wholesale_price DECIMAL(10,2),
    retail_price DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(12,2) NOT NULL,
    batch_number VARCHAR(50),
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(purchase_order_id, product_id)
);

-- ================== PURCHASE BATCHES ==================
CREATE TABLE purchase_batches (
    id VARCHAR(255) PRIMARY KEY,
    batch_number VARCHAR(50) UNIQUE,
    purchase_order_item_id VARCHAR(255) UNIQUE NOT NULL REFERENCES purchase_order_items(id) ON DELETE CASCADE,
    quantity_ordered INTEGER NOT NULL,
    quantity_received INTEGER DEFAULT 0,
    cost_price DECIMAL(10,2) NOT NULL,
    wholesale_price DECIMAL(10,2),
    retail_price DECIMAL(10,2) NOT NULL,
    expiry_date DATE,
    received_date DATE,
    received_by VARCHAR(255) REFERENCES employees(id),
    is_active BOOLEAN DEFAULT TRUE,
    fifo_sequence INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== ITEM TRACKING ==================
CREATE TABLE item_barcodes (
    id VARCHAR(255) PRIMARY KEY,
    purchase_batch_id VARCHAR(255) NOT NULL REFERENCES purchase_batches(id) ON DELETE CASCADE,
    product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    type barcode_type DEFAULT 'INTERNAL',
    status barcode_status DEFAULT 'AVAILABLE',
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    purchase_cost DECIMAL(10,2) NOT NULL,
    supplier_id VARCHAR(255) REFERENCES suppliers(id),
    sales_order_item_id VARCHAR(255),
    sold_at TIMESTAMPTZ,
    sold_price DECIMAL(10,2),
    sold_to_customer VARCHAR(255),
    sold_by_employee VARCHAR(255),
    returned_at TIMESTAMPTZ,
    return_reason TEXT,
    returned_by VARCHAR(255),
    warranty_expiry DATE,
    condition item_condition DEFAULT 'GOOD',
    location_branch VARCHAR(255) REFERENCES branches(id),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE item_movement_history (
    id VARCHAR(255) PRIMARY KEY,
    item_id VARCHAR(255) NOT NULL REFERENCES item_barcodes(id) ON DELETE CASCADE,
    from_branch VARCHAR(255) REFERENCES branches(id),
    to_branch VARCHAR(255) REFERENCES branches(id),
    movement_type item_movement_type NOT NULL,
    reference_id VARCHAR(255),
    moved_by VARCHAR(255) REFERENCES employees(id),
    reason TEXT,
    moved_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== CUSTOMERS ==================
CREATE TABLE customers (
    id VARCHAR(255) PRIMARY KEY,
    customer_number VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    nic VARCHAR(20) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    address TEXT,
    date_of_birth DATE,
    customer_type customer_type DEFAULT 'RETAIL',
    credit_limit DECIMAL(12,2),
    outstanding_balance DECIMAL(12,2) DEFAULT 0,
    loyalty_points INTEGER DEFAULT 0,
    discount_percentage DECIMAL(5,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== SALES ORDERS ==================
CREATE TABLE sales_orders (
    id VARCHAR(255) PRIMARY KEY,
    order_number VARCHAR(20) UNIQUE NOT NULL,
    customer_id VARCHAR(255) REFERENCES customers(id),
    branch_id VARCHAR(255) NOT NULL REFERENCES branches(id),
    sold_by VARCHAR(255),
    order_date DATE DEFAULT CURRENT_DATE,
    delivery_date DATE,
    status order_status DEFAULT 'PENDING',
    payment_method payment_method,
    payment_status payment_status DEFAULT 'PENDING',
    subtotal DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    total_cost DECIMAL(12,2) DEFAULT 0,
    profit_amount DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sales_order_items (
    id VARCHAR(255) PRIMARY KEY,
    sales_order_id VARCHAR(255) NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id VARCHAR(255) NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    line_total DECIMAL(12,2) NOT NULL,
    line_cost DECIMAL(12,2),
    line_profit DECIMAL(12,2),
    warranty_expiry DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== BATCH ALLOCATIONS FOR FIFO ==================
CREATE TABLE sales_batch_allocations (
    id VARCHAR(255) PRIMARY KEY,
    sales_order_item_id VARCHAR(255) NOT NULL REFERENCES sales_order_items(id) ON DELETE CASCADE,
    batch_id VARCHAR(255) NOT NULL REFERENCES purchase_batches(id) ON DELETE CASCADE,
    quantity_allocated INTEGER NOT NULL,
    cost_price_at_sale DECIMAL(10,2) NOT NULL,
    selling_price DECIMAL(10,2) NOT NULL,
    allocated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sales_order_item_id, batch_id)
);

-- ================== INVENTORY MANAGEMENT ==================
CREATE TABLE branch_inventory (
    id VARCHAR(255) PRIMARY KEY,
    branch_id VARCHAR(255) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    total_quantity INTEGER DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    reorder_quantity INTEGER DEFAULT 20,
    last_restock_date TIMESTAMPTZ,
    last_sale_date TIMESTAMPTZ,
    last_counted_at TIMESTAMPTZ,
    is_low_stock_alert_sent BOOLEAN DEFAULT FALSE,
    average_cost_price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(branch_id, product_id)
);

CREATE TABLE branch_inventory_items (
    id VARCHAR(255) PRIMARY KEY,
    branch_inventory_id VARCHAR(255) NOT NULL REFERENCES branch_inventory(id) ON DELETE CASCADE,
    purchase_batch_id VARCHAR(255) NOT NULL REFERENCES purchase_batches(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    cost_price DECIMAL(10,2) NOT NULL,
    wholesale_price DECIMAL(10,2),
    retail_price DECIMAL(10,2) NOT NULL,
    received_date TIMESTAMPTZ NOT NULL,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    fifo_order INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(branch_inventory_id, purchase_batch_id)
);

-- ================== STOCK OPERATIONS ==================
CREATE TABLE product_stock_ledgers (
    id VARCHAR(255) PRIMARY KEY,
    product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    branch_id VARCHAR(255) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    batch_id VARCHAR(255) REFERENCES purchase_batches(id),
    quantity INTEGER NOT NULL,
    entry_type stock_entry_type NOT NULL,
    reference_id VARCHAR(50),
    reference_type VARCHAR(50),
    cost_price DECIMAL(10,2),
    selling_price DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255) REFERENCES employees(id) ON DELETE SET NULL
);

CREATE TABLE stock_transfer_requests (
    id VARCHAR(255) PRIMARY KEY,
    request_number VARCHAR(20) UNIQUE NOT NULL,
    from_branch_id VARCHAR(255) NOT NULL REFERENCES branches(id),
    to_branch_id VARCHAR(255) NOT NULL REFERENCES branches(id),
    requested_by VARCHAR(255) NOT NULL REFERENCES employees(id),
    approved_by VARCHAR(255) REFERENCES employees(id),
    status transfer_status DEFAULT 'PENDING',
    priority priority_level DEFAULT 'NORMAL',
    request_reason TEXT,
    notes TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    dispatched_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stock_transfer_items (
    id VARCHAR(255) PRIMARY KEY,
    transfer_request_id VARCHAR(255) NOT NULL REFERENCES stock_transfer_requests(id) ON DELETE CASCADE,
    product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_id VARCHAR(255),
    quantity_requested INTEGER NOT NULL,
    quantity_approved INTEGER,
    quantity_dispatched INTEGER,
    quantity_received INTEGER,
    unit_cost_price DECIMAL(10,2) NOT NULL,
    unit_wholesale_price DECIMAL(10,2),
    unit_retail_price DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stock_transfer_logs (
    id VARCHAR(255) PRIMARY KEY,
    transfer_request_id VARCHAR(255) NOT NULL REFERENCES stock_transfer_requests(id) ON DELETE CASCADE,
    employee_id VARCHAR(255) NOT NULL REFERENCES employees(id),
    action_type transfer_status NOT NULL,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stock_adjustments (
    id VARCHAR(255) PRIMARY KEY,
    adjustment_number VARCHAR(20) UNIQUE NOT NULL,
    branch_id VARCHAR(255) NOT NULL REFERENCES branches(id),
    product_id VARCHAR(255) NOT NULL REFERENCES products(id),
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    quantity_change INTEGER NOT NULL,
    reason adjustment_reason NOT NULL,
    notes TEXT,
    adjusted_by VARCHAR(255) NOT NULL REFERENCES employees(id),
    approved_by VARCHAR(255) REFERENCES employees(id),
    adjustment_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== ALERTS SYSTEM ==================
CREATE TABLE low_stock_alerts (
    id VARCHAR(255) PRIMARY KEY,
    branch_id VARCHAR(255) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    current_stock INTEGER NOT NULL,
    threshold_level INTEGER NOT NULL,
    alert_type low_stock_alert_type DEFAULT 'LOW_STOCK',
    status alert_status DEFAULT 'ACTIVE',
    notified_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== RETURNS MANAGEMENT ==================
CREATE TABLE purchase_returns (
    id VARCHAR(255) PRIMARY KEY,
    return_number VARCHAR(20) UNIQUE NOT NULL,
    purchase_order_id VARCHAR(255) NOT NULL REFERENCES purchase_orders(id),
    returned_by VARCHAR(255) NOT NULL,
    return_date DATE DEFAULT CURRENT_DATE,
    reason TEXT,
    total_amount DECIMAL(12,2) DEFAULT 0,
    status return_status DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_return_items (
    id VARCHAR(255) PRIMARY KEY,
    purchase_return_id VARCHAR(255) NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
    product_id VARCHAR(255) NOT NULL REFERENCES products(id),
    batch_id VARCHAR(255),
    quantity INTEGER NOT NULL,
    cost_price DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(12,2) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(purchase_return_id, product_id)
);

CREATE TABLE sales_returns (
    id VARCHAR(255) PRIMARY KEY,
    return_number VARCHAR(20) UNIQUE NOT NULL,
    sales_order_id VARCHAR(255) NOT NULL REFERENCES sales_orders(id),
    returned_by VARCHAR(255) NOT NULL,
    return_date DATE DEFAULT CURRENT_DATE,
    reason TEXT,
    total_amount DECIMAL(12,2) DEFAULT 0,
    status return_status DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sales_return_items (
    id VARCHAR(255) PRIMARY KEY,
    sales_return_id VARCHAR(255) NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
    product_id VARCHAR(255) NOT NULL REFERENCES products(id),
    batch_id VARCHAR(255),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(12,2) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sales_return_id, product_id)
);

-- ================== ADD MISSING FOREIGN KEY CONSTRAINTS ==================
-- Add foreign key constraints that reference later tables
ALTER TABLE item_barcodes 
ADD CONSTRAINT fk_item_barcodes_sales_order_item 
FOREIGN KEY (sales_order_item_id) REFERENCES sales_order_items(id);

ALTER TABLE item_barcodes 
ADD CONSTRAINT fk_item_barcodes_customer 
FOREIGN KEY (sold_to_customer) REFERENCES customers(id);

ALTER TABLE item_barcodes 
ADD CONSTRAINT fk_item_barcodes_sold_by 
FOREIGN KEY (sold_by_employee) REFERENCES employees(id);

ALTER TABLE item_barcodes 
ADD CONSTRAINT fk_item_barcodes_returned_by 
FOREIGN KEY (returned_by) REFERENCES employees(id);

-- ================== CREATE INDEXES ==================
-- User Management Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_activity_logs_user_created ON user_activity_logs(user_id, created_at);
CREATE INDEX idx_activity_logs_entity ON user_activity_logs(entity, entity_id);

-- Employee Indexes
CREATE INDEX idx_employees_number ON employees(employee_number);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_branch ON employees(branch_id);

-- Branch Indexes
CREATE INDEX idx_branches_code ON branches(code);
CREATE INDEX idx_branches_main ON branches(is_main_branch);
CREATE INDEX idx_branches_purchase ON branches(can_purchase);

-- Product Indexes
CREATE INDEX idx_products_subcategory ON products(subcategory_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_subcategories_category ON subcategories(category_id);
CREATE INDEX idx_brands_code ON brands(code);

-- Product Specifications Indexes
CREATE INDEX idx_product_specs_product ON product_specifications(product_id);
CREATE INDEX idx_product_specs_name ON product_specifications(spec_name);

-- Pricing Indexes
CREATE INDEX idx_price_history_product_date ON product_price_history(product_id, effective_date);
CREATE INDEX idx_price_history_date_active ON product_price_history(effective_date, is_active);
CREATE INDEX idx_price_history_product_active ON product_price_history(product_id, is_active);
CREATE INDEX idx_price_overrides_product_branch_active ON price_overrides(product_id, branch_id, is_active);
CREATE INDEX idx_price_overrides_valid_dates ON price_overrides(valid_from, valid_until);

-- Barcode Indexes
CREATE INDEX idx_barcodes_product ON barcodes(product_id);
CREATE INDEX idx_item_barcodes_batch ON item_barcodes(purchase_batch_id);
CREATE INDEX idx_item_barcodes_product ON item_barcodes(product_id);
CREATE INDEX idx_item_barcodes_status ON item_barcodes(status);
CREATE INDEX idx_item_barcodes_sold_at ON item_barcodes(sold_at);
CREATE INDEX idx_item_barcodes_purchased_at ON item_barcodes(purchased_at);
CREATE INDEX idx_item_barcodes_supplier ON item_barcodes(supplier_id);
CREATE INDEX idx_item_barcodes_customer ON item_barcodes(sold_to_customer);
CREATE INDEX idx_item_barcodes_location ON item_barcodes(location_branch);

-- Purchase Order Indexes
CREATE INDEX idx_purchase_orders_number ON purchase_orders(order_number);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_branch ON purchase_orders(branch_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_suppliers_code ON suppliers(code);
CREATE INDEX idx_suppliers_name ON suppliers(name);

-- Purchase Batch Indexes
CREATE INDEX idx_purchase_batches_number ON purchase_batches(batch_number);
CREATE INDEX idx_purchase_batches_expiry ON purchase_batches(expiry_date);
CREATE INDEX idx_purchase_batches_fifo ON purchase_batches(fifo_sequence);
CREATE INDEX idx_purchase_batches_received ON purchase_batches(received_date);

-- Customer Indexes
CREATE INDEX idx_customers_number ON customers(customer_number);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_type ON customers(customer_type);

-- Sales Order Indexes
CREATE INDEX idx_sales_orders_number ON sales_orders(order_number);
CREATE INDEX idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX idx_sales_orders_branch ON sales_orders(branch_id);
CREATE INDEX idx_sales_orders_status ON sales_orders(status);
CREATE INDEX idx_sales_orders_date ON sales_orders(order_date);
CREATE INDEX idx_sales_order_items_product ON sales_order_items(product_id);

-- Batch Allocation Indexes
CREATE INDEX idx_sales_batch_allocations_batch ON sales_batch_allocations(batch_id);
CREATE INDEX idx_sales_batch_allocations_allocated ON sales_batch_allocations(allocated_at);

-- Inventory Indexes
CREATE INDEX idx_branch_inventory_branch ON branch_inventory(branch_id);
CREATE INDEX idx_branch_inventory_product ON branch_inventory(product_id);
CREATE INDEX idx_branch_inventory_quantity ON branch_inventory(total_quantity);
CREATE INDEX idx_branch_inventory_branch_quantity ON branch_inventory(branch_id, total_quantity);
CREATE INDEX idx_branch_inventory_items_inventory ON branch_inventory_items(branch_inventory_id);
CREATE INDEX idx_branch_inventory_items_batch ON branch_inventory_items(purchase_batch_id);
CREATE INDEX idx_branch_inventory_items_quantity ON branch_inventory_items(quantity);
CREATE INDEX idx_branch_inventory_items_expiry ON branch_inventory_items(expiry_date);
CREATE INDEX idx_branch_inventory_items_fifo ON branch_inventory_items(fifo_order);

-- Stock Ledger Indexes
CREATE INDEX idx_stock_ledgers_product_created ON product_stock_ledgers(product_id, created_at);
CREATE INDEX idx_stock_ledgers_branch_created ON product_stock_ledgers(branch_id, created_at);
CREATE INDEX idx_stock_ledgers_batch ON product_stock_ledgers(batch_id);
CREATE INDEX idx_stock_ledgers_reference ON product_stock_ledgers(reference_type, reference_id);
CREATE INDEX idx_stock_ledgers_entry_created ON product_stock_ledgers(entry_type, created_at);

-- Stock Transfer Indexes
CREATE INDEX idx_transfer_requests_number ON stock_transfer_requests(request_number);
CREATE INDEX idx_transfer_requests_from_branch ON stock_transfer_requests(from_branch_id);
CREATE INDEX idx_transfer_requests_to_branch ON stock_transfer_requests(to_branch_id);
CREATE INDEX idx_transfer_requests_status ON stock_transfer_requests(status);
CREATE INDEX idx_transfer_requests_requested ON stock_transfer_requests(requested_at);
CREATE INDEX idx_transfer_logs_request ON stock_transfer_logs(transfer_request_id);
CREATE INDEX idx_transfer_logs_employee ON stock_transfer_logs(employee_id);

-- Stock Adjustment Indexes
CREATE INDEX idx_stock_adjustments_number ON stock_adjustments(adjustment_number);
CREATE INDEX idx_stock_adjustments_branch ON stock_adjustments(branch_id);
CREATE INDEX idx_stock_adjustments_product ON stock_adjustments(product_id);

-- Alert Indexes
CREATE INDEX idx_low_stock_alerts_branch_status ON low_stock_alerts(branch_id, status);
CREATE INDEX idx_low_stock_alerts_product_status ON low_stock_alerts(product_id, status);
CREATE INDEX idx_low_stock_alerts_type_status ON low_stock_alerts(alert_type, status);

-- Item Movement Indexes
CREATE INDEX idx_item_movement_item ON item_movement_history(item_id);
CREATE INDEX idx_item_movement_moved_at ON item_movement_history(moved_at);
CREATE INDEX idx_item_movement_type ON item_movement_history(movement_type);

-- Return Indexes
CREATE INDEX idx_purchase_returns_number ON purchase_returns(return_number);
CREATE INDEX idx_purchase_returns_order ON purchase_returns(purchase_order_id);
CREATE INDEX idx_sales_returns_number ON sales_returns(return_number);
CREATE INDEX idx_sales_returns_order ON sales_returns(sales_order_id);

-- Index for performance
CREATE INDEX idx_code_sequences_key ON code_sequences (sequence_key);

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