-- ============================================
-- MIGRATION 007: Add Escrow Transactions Table
-- ============================================
-- Purpose: Create escrow_transactions table for blockchain escrow tracking
-- Created: 2025-11-20
-- ============================================

-- Drop table if exists (for re-running migration)
DROP TABLE IF EXISTS escrow_transactions CASCADE;

-- ============================================
-- CREATE ESCROW TRANSACTIONS TABLE
-- ============================================

CREATE TABLE escrow_transactions (
    id SERIAL PRIMARY KEY,

    -- Foreign Keys
    allocation_id INTEGER NOT NULL REFERENCES allocations(id) ON DELETE CASCADE,

    -- Transaction Details
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
        'LOCK',
        'RELEASE',
        'FAILED'
    )),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'IDR',

    -- Blockchain Data
    blockchain_tx_hash VARCHAR(255) UNIQUE NOT NULL,
    blockchain_block_number BIGINT NOT NULL,
    blockchain_confirmed BOOLEAN DEFAULT false,

    -- Gas & Network
    gas_used BIGINT,
    gas_price_gwei DECIMAL(10,2),

    -- Addresses
    from_address VARCHAR(255),
    to_address VARCHAR(255),
    smart_contract_address VARCHAR(255),

    -- Transaction Status
    status VARCHAR(20) NOT NULL CHECK (status IN (
        'PENDING',
        'CONFIRMED',
        'FAILED'
    )),

    -- Error Handling
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,

    -- Metadata
    metadata JSONB,

    -- Timestamps
    executed_at TIMESTAMP NOT NULL,
    confirmed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_escrow_transactions_allocation_id ON escrow_transactions(allocation_id);
CREATE INDEX idx_escrow_transactions_transaction_type ON escrow_transactions(transaction_type);
CREATE INDEX idx_escrow_transactions_status ON escrow_transactions(status);
CREATE INDEX idx_escrow_transactions_blockchain_tx_hash ON escrow_transactions(blockchain_tx_hash);
CREATE INDEX idx_escrow_transactions_blockchain_block_number ON escrow_transactions(blockchain_block_number);
CREATE INDEX idx_escrow_transactions_executed_at ON escrow_transactions(executed_at DESC);
CREATE INDEX idx_escrow_transactions_confirmed ON escrow_transactions(blockchain_confirmed);

-- ============================================
-- MIGRATION COMPLETED
-- ============================================

-- Verify table created
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'escrow_transactions'
ORDER BY ordinal_position;
