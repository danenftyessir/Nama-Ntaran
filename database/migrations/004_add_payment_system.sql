-- ============================================
-- Migration 004: Payment System dengan Xendit & Blockchain Escrow
-- ============================================
-- Purpose: Menambah tabel untuk payment system terintegrasi blockchain escrow + xendit
-- Created: 2024-11-16
-- Author: NutriChain Dev Team

-- ============================================
-- ALLOCATIONS TABLE
-- Tabel utama untuk tracking dana yang di-lock di smart contract
-- ============================================
CREATE TABLE IF NOT EXISTS allocations (
    id SERIAL PRIMARY KEY,

    -- Foreign Keys
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    catering_id INTEGER NOT NULL REFERENCES caterings(id) ON DELETE CASCADE,

    -- Unique Identifier dari Backend
    -- Format: hash(schoolId + cateringId + deliveryDate)
    allocation_id VARCHAR(255) UNIQUE NOT NULL,

    -- Dana
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'IDR',

    -- Status Allocation (PLANNED -> LOCKED -> RELEASED)
    status VARCHAR(50) DEFAULT 'PLANNED' CHECK (status IN (
        'PLANNED',      -- Allocation baru dibuat, belum lock
        'LOCKING',      -- Sedang proses lock ke smart contract
        'LOCKED',       -- Dana sudah di-lock di escrow
        'RELEASING',    -- Sedang proses release dana
        'RELEASED',     -- Dana sudah di-release ke katering
        'ON_HOLD',      -- Ada issue/masalah
        'CANCELLED'     -- Dibatalkan
    )),

    -- Blockchain Data
    tx_hash_lock VARCHAR(255),      -- Transaction hash dari lockFund()
    tx_hash_release VARCHAR(255),   -- Transaction hash dari releaseEscrow()
    blockchain_confirmed BOOLEAN DEFAULT false,

    -- Metadata (JSON)
    metadata JSONB, -- {deliveryDate, portions, notes, schoolContact, cateringContact}

    -- Timestamps
    locked_at TIMESTAMP,
    released_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PAYMENTS TABLE
-- Tabel untuk tracking setiap pembayaran (invoice dari xendit / blockchain)
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
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
        'PENDING',      -- Payment dibuat, menunggu escrow lock
        'LOCKED',       -- Dana di-lock di smart contract
        'CONFIRMED',    -- Sekolah sudah konfirmasi penerimaan
        'RELEASING',    -- Sedang proses release dana
        'COMPLETED',    -- Dana sudah diterima katering
        'FAILED',       -- Ada error saat lock/release
        'REFUNDED'      -- Dana dikembalikan ke payer
    )),

    -- Blockchain Data
    blockchain_tx_hash VARCHAR(255),
    blockchain_block_number BIGINT,

    -- Xendit Integration (untuk future use)
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
-- PAYMENT EVENTS TABLE
-- Tabel untuk log setiap event yang terjadi (audit trail)
-- ============================================
CREATE TABLE IF NOT EXISTS payment_events (
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
    blockchain_event_signature VARCHAR(255), -- Event signature dari smart contract
    blockchain_tx_hash VARCHAR(255),
    blockchain_block_number BIGINT,

    -- Event Payload (JSON)
    event_data JSONB, -- {allocationId, payer, payee, amount, timestamp, metadata}

    -- Status Processing
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- DELIVERY CONFIRMATIONS TABLE
-- Tabel untuk tracking konfirmasi penerimaan dari sekolah
-- ============================================
CREATE TABLE IF NOT EXISTS delivery_confirmations (
    id SERIAL PRIMARY KEY,

    -- Foreign Keys
    delivery_id INTEGER NOT NULL UNIQUE REFERENCES deliveries(id) ON DELETE CASCADE,
    allocation_id INTEGER REFERENCES allocations(id) ON DELETE CASCADE,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,

    -- Confirmation Status
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',      -- Menunggu konfirmasi sekolah
        'APPROVED',     -- Sekolah approve penerimaan
        'REJECTED',     -- Ada masalah, ditolak
        'ON_HOLD'       -- Ada issue yang perlu diinvestigasi
    )),

    -- Verification Details
    portions_received INTEGER,
    quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
    notes TEXT,
    photo_urls JSONB, -- Array of photo URLs

    -- Timestamps
    confirmed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PUBLIC PAYMENT FEED TABLE
-- Tabel untuk public transparency dashboard
-- Berisi semua pembayaran yang sudah selesai
-- ============================================
CREATE TABLE IF NOT EXISTS public_payment_feed (
    id SERIAL PRIMARY KEY,

    -- Foreign Keys
    payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
    allocation_id INTEGER REFERENCES allocations(id) ON DELETE SET NULL,

    -- Public Info (tidak ada sensitive data)
    school_name VARCHAR(255),
    school_region VARCHAR(100),
    catering_name VARCHAR(255),

    amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'IDR',

    portions_count INTEGER,
    delivery_date DATE,

    -- Status
    status VARCHAR(50), -- LOCKED, COMPLETED, etc.

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
-- REFUNDS TABLE
-- Untuk tracking refund jika ada pembatalan
-- ============================================
CREATE TABLE IF NOT EXISTS refunds (
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
-- PAYMENT METHODS TABLE
-- Untuk tracking metode pembayaran catering (optional untuk xendit payout)
-- ============================================
CREATE TABLE IF NOT EXISTS payment_methods (
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

    -- Bank Details (untuk BANK_TRANSFER)
    bank_code VARCHAR(20),
    account_number VARCHAR(50),
    account_holder_name VARCHAR(255),

    -- E-wallet Details
    ewallet_provider VARCHAR(50), -- OVO, Dana, LinkAja, etc.
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
-- BLOCKCHAIN SYNC LOG TABLE
-- Untuk tracking sync blockchain events
-- ============================================
CREATE TABLE IF NOT EXISTS blockchain_sync_log (
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
-- INDEXES UNTUK PERFORMANCE
-- ============================================

-- Allocations
CREATE INDEX idx_allocations_status ON allocations(status);
CREATE INDEX idx_allocations_school_id ON allocations(school_id);
CREATE INDEX idx_allocations_catering_id ON allocations(catering_id);
CREATE INDEX idx_allocations_allocation_id ON allocations(allocation_id);
CREATE INDEX idx_allocations_created_at ON allocations(created_at DESC);

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
-- UPDATE EXISTING TABLES
-- ============================================

-- Tambah payment_id column ke escrow_transactions jika belum ada
ALTER TABLE escrow_transactions
ADD COLUMN IF NOT EXISTS payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL;

-- Tambah allocation_id ke deliveries untuk reference
ALTER TABLE deliveries
ADD COLUMN IF NOT EXISTS allocation_id INTEGER REFERENCES allocations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deliveries_allocation_id ON deliveries(allocation_id);

-- ============================================
-- END MIGRATION
-- ============================================
