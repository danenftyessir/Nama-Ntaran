-- ============================================
-- FRESH MIGRATION: Allocations, Verifications, Payments
-- ============================================
-- Purpose: Drop existing tables and recreate fresh untuk re-seeding
-- Created: 2025-11-20
-- WARNING: This will DELETE ALL DATA in these tables!
-- ============================================

-- ============================================
-- STEP 1: DROP EXISTING TABLES (CASCADE)
-- ============================================

-- Drop in reverse dependency order
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS payment_events CASCADE;
DROP TABLE IF EXISTS delivery_confirmations CASCADE;
DROP TABLE IF EXISTS public_payment_feed CASCADE;
DROP TABLE IF EXISTS refunds CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS blockchain_sync_log CASCADE;
DROP TABLE IF EXISTS verifications CASCADE;
DROP TABLE IF EXISTS allocations CASCADE;

-- ============================================
-- STEP 2: RECREATE ALLOCATIONS TABLE
-- ============================================

CREATE TABLE allocations (
    id SERIAL PRIMARY KEY,

    -- Foreign Keys
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    catering_id INTEGER NOT NULL REFERENCES caterings(id) ON DELETE CASCADE,

    -- Unique Identifier
    allocation_id VARCHAR(255) UNIQUE NOT NULL,

    -- Dana
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'IDR',

    -- Status Allocation
    status VARCHAR(50) DEFAULT 'PLANNED' CHECK (status IN (
        'PLANNED',
        'LOCKING',
        'LOCKED',
        'RELEASING',
        'RELEASED',
        'ON_HOLD',
        'CANCELLED'
    )),

    -- Blockchain Data
    tx_hash_lock VARCHAR(255),
    tx_hash_release VARCHAR(255),
    blockchain_confirmed BOOLEAN DEFAULT false,

    -- Metadata
    metadata JSONB,

    -- Timestamps
    locked_at TIMESTAMP,
    released_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 3: RECREATE VERIFICATIONS TABLE
-- ============================================

CREATE TABLE verifications (
    id SERIAL PRIMARY KEY,
    delivery_id INTEGER REFERENCES deliveries(id) ON DELETE CASCADE,
    school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    portions_received INTEGER,
    quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
    notes TEXT,
    photo_url TEXT,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 4: RECREATE PAYMENTS TABLE
-- ============================================

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,

    -- Foreign Keys
    allocation_id INTEGER UNIQUE REFERENCES allocations(id) ON DELETE CASCADE,
    delivery_id INTEGER REFERENCES deliveries(id) ON DELETE SET NULL,
    school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    catering_id INTEGER REFERENCES caterings(id) ON DELETE CASCADE,

    -- Payment Details
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'IDR',

    -- Payment Status
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',
        'LOCKED',
        'CONFIRMED',
        'RELEASING',
        'COMPLETED',
        'FAILED',
        'REFUNDED'
    )),

    -- Blockchain Data
    blockchain_tx_hash VARCHAR(255),
    blockchain_block_number BIGINT,

    -- Xendit Integration
    xendit_invoice_id VARCHAR(255),
    xendit_payment_id VARCHAR(255),

    -- Payment Completion
    paid_at TIMESTAMP,
    confirmed_by_school_at TIMESTAMP,
    released_to_catering_at TIMESTAMP,

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 5: RECREATE PAYMENT EVENTS TABLE
-- ============================================

CREATE TABLE payment_events (
    id SERIAL PRIMARY KEY,

    -- Foreign Keys
    payment_id INTEGER REFERENCES payments(id) ON DELETE CASCADE,
    allocation_id INTEGER REFERENCES allocations(id) ON DELETE CASCADE,

    -- Event Details
    event_type VARCHAR(100) NOT NULL CHECK (event_type IN (
        'ALLOCATION_CREATED',
        'FUND_LOCKED',
        'DELIVERY_CONFIRMED',
        'PAYMENT_RELEASING',
        'PAYMENT_RELEASED',
        'PAYMENT_FAILED',
        'REFUND_INITIATED'
    )),

    -- Blockchain Event Data
    blockchain_event_signature VARCHAR(255),
    blockchain_tx_hash VARCHAR(255),
    blockchain_block_number BIGINT,

    -- Event Payload
    event_data JSONB,

    -- Status Processing
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 6: RECREATE DELIVERY CONFIRMATIONS TABLE
-- ============================================

CREATE TABLE delivery_confirmations (
    id SERIAL PRIMARY KEY,

    -- Foreign Keys
    delivery_id INTEGER NOT NULL UNIQUE REFERENCES deliveries(id) ON DELETE CASCADE,
    allocation_id INTEGER REFERENCES allocations(id) ON DELETE CASCADE,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,

    -- Confirmation Status
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',
        'APPROVED',
        'REJECTED',
        'ON_HOLD'
    )),

    -- Verification Details
    portions_received INTEGER,
    quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
    notes TEXT,
    photo_urls JSONB,

    -- Timestamps
    confirmed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 7: RECREATE PUBLIC PAYMENT FEED TABLE
-- ============================================

CREATE TABLE public_payment_feed (
    id SERIAL PRIMARY KEY,

    -- Foreign Keys
    payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
    allocation_id INTEGER REFERENCES allocations(id) ON DELETE SET NULL,

    -- Public Info
    school_name VARCHAR(255),
    school_region VARCHAR(100),
    catering_name VARCHAR(255),

    amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'IDR',

    portions_count INTEGER,
    delivery_date DATE,

    -- Status
    status VARCHAR(50),

    -- Blockchain Reference
    blockchain_tx_hash VARCHAR(255),
    blockchain_block_number BIGINT,

    -- Public Timeline
    locked_at TIMESTAMP,
    released_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 8: RECREATE REFUNDS TABLE
-- ============================================

CREATE TABLE refunds (
    id SERIAL PRIMARY KEY,

    -- Foreign Keys
    payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    allocation_id INTEGER REFERENCES allocations(id) ON DELETE CASCADE,

    -- Refund Details
    amount DECIMAL(15,2) NOT NULL,
    reason VARCHAR(255),

    -- Status
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',
        'PROCESSING',
        'COMPLETED',
        'FAILED'
    )),

    -- Blockchain
    blockchain_tx_hash VARCHAR(255),

    -- Timestamps
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 9: RECREATE PAYMENT METHODS TABLE
-- ============================================

CREATE TABLE payment_methods (
    id SERIAL PRIMARY KEY,

    -- Foreign Keys
    catering_id INTEGER NOT NULL REFERENCES caterings(id) ON DELETE CASCADE,

    -- Payment Method Type
    method_type VARCHAR(50) CHECK (method_type IN (
        'BANK_TRANSFER',
        'EWALLET',
        'CRYPTOCURRENCY',
        'OTHER'
    )),

    -- Bank Details
    bank_code VARCHAR(20),
    account_number VARCHAR(50),
    account_holder_name VARCHAR(255),

    -- E-wallet Details
    ewallet_provider VARCHAR(50),
    ewallet_identifier VARCHAR(255),

    -- Crypto Details
    wallet_address VARCHAR(255),

    -- Xendit Integration
    xendit_bank_account_id VARCHAR(255),

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 10: RECREATE BLOCKCHAIN SYNC LOG TABLE
-- ============================================

CREATE TABLE blockchain_sync_log (
    id SERIAL PRIMARY KEY,

    -- Event Info
    event_type VARCHAR(100),
    event_name VARCHAR(255),

    -- Block Data
    block_number BIGINT,
    tx_hash VARCHAR(255),

    -- Processing Status
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',
        'PROCESSING',
        'PROCESSED',
        'FAILED'
    )),

    -- Sync Details
    synced_at TIMESTAMP,
    processed_at TIMESTAMP,
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 11: CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Allocations
CREATE INDEX idx_allocations_status ON allocations(status);
CREATE INDEX idx_allocations_school_id ON allocations(school_id);
CREATE INDEX idx_allocations_catering_id ON allocations(catering_id);
CREATE INDEX idx_allocations_allocation_id ON allocations(allocation_id);
CREATE INDEX idx_allocations_created_at ON allocations(created_at DESC);

-- Verifications
CREATE INDEX idx_verifications_delivery_id ON verifications(delivery_id);
CREATE INDEX idx_verifications_school_id ON verifications(school_id);
CREATE INDEX idx_verifications_status ON verifications(status);

-- Payments
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_allocation_id ON payments(allocation_id);
CREATE INDEX idx_payments_delivery_id ON payments(delivery_id);
CREATE INDEX idx_payments_catering_id ON payments(catering_id);
CREATE INDEX idx_payments_blockchain_tx_hash ON payments(blockchain_tx_hash);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- Payment Events
CREATE INDEX idx_payment_events_payment_id ON payment_events(payment_id);
CREATE INDEX idx_payment_events_event_type ON payment_events(event_type);
CREATE INDEX idx_payment_events_blockchain_tx_hash ON payment_events(blockchain_tx_hash);
CREATE INDEX idx_payment_events_processed ON payment_events(processed);

-- Delivery Confirmations
CREATE INDEX idx_delivery_confirmations_delivery_id ON delivery_confirmations(delivery_id);
CREATE INDEX idx_delivery_confirmations_allocation_id ON delivery_confirmations(allocation_id);
CREATE INDEX idx_delivery_confirmations_school_id ON delivery_confirmations(school_id);
CREATE INDEX idx_delivery_confirmations_status ON delivery_confirmations(status);

-- Public Payment Feed
CREATE INDEX idx_public_payment_feed_status ON public_payment_feed(status);
CREATE INDEX idx_public_payment_feed_released_at ON public_payment_feed(released_at DESC);
CREATE INDEX idx_public_payment_feed_school_region ON public_payment_feed(school_region);

-- Refunds
CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX idx_refunds_status ON refunds(status);

-- Payment Methods
CREATE INDEX idx_payment_methods_catering_id ON payment_methods(catering_id);
CREATE INDEX idx_payment_methods_is_active ON payment_methods(is_active);

-- Blockchain Sync Log
CREATE INDEX idx_blockchain_sync_log_status ON blockchain_sync_log(status);
CREATE INDEX idx_blockchain_sync_log_block_number ON blockchain_sync_log(block_number);
CREATE INDEX idx_blockchain_sync_log_created_at ON blockchain_sync_log(created_at DESC);

-- ============================================
-- STEP 12: UPDATE EXISTING TABLES
-- ============================================

-- Add allocation_id to deliveries if not exists
ALTER TABLE deliveries
ADD COLUMN IF NOT EXISTS allocation_id INTEGER REFERENCES allocations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deliveries_allocation_id ON deliveries(allocation_id);

-- ============================================
-- MIGRATION COMPLETED
-- ============================================

-- Verify tables created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'allocations',
    'verifications',
    'payments',
    'payment_events',
    'delivery_confirmations',
    'public_payment_feed',
    'refunds',
    'payment_methods',
    'blockchain_sync_log'
  )
ORDER BY table_name;
