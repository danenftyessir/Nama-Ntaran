-- ============================================
-- MIGRATION 010: Add delivery_id and catering_id to escrow_transactions
-- ============================================
-- Purpose: Add direct foreign keys to deliveries and caterings for easier querying
-- Created: 2025-11-24
-- ============================================

-- Add delivery_id column
ALTER TABLE escrow_transactions
ADD COLUMN delivery_id INTEGER REFERENCES deliveries(id) ON DELETE SET NULL;

-- Add catering_id column
ALTER TABLE escrow_transactions
ADD COLUMN catering_id INTEGER REFERENCES caterings(id) ON DELETE SET NULL;

-- Add school_id column
ALTER TABLE escrow_transactions
ADD COLUMN school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL;

-- Rename columns for consistency with backend code
ALTER TABLE escrow_transactions
RENAME COLUMN blockchain_tx_hash TO tx_hash;

-- Add status column that matches backend expectations (locked/released)
ALTER TABLE escrow_transactions
ADD COLUMN escrow_status VARCHAR(20) CHECK (escrow_status IN ('locked', 'released', 'disputed', 'cancelled'));

-- Add timestamp columns that backend expects
ALTER TABLE escrow_transactions
ADD COLUMN locked_at TIMESTAMP;

ALTER TABLE escrow_transactions
ADD COLUMN released_at TIMESTAMP;

-- Create indexes for performance
CREATE INDEX idx_escrow_transactions_delivery_id ON escrow_transactions(delivery_id);
CREATE INDEX idx_escrow_transactions_catering_id ON escrow_transactions(catering_id);
CREATE INDEX idx_escrow_transactions_school_id ON escrow_transactions(school_id);
CREATE INDEX idx_escrow_transactions_escrow_status ON escrow_transactions(escrow_status);

-- ============================================
-- UPDATE EXISTING DATA
-- ============================================

-- Update escrow_status based on transaction_type
UPDATE escrow_transactions
SET escrow_status = CASE
    WHEN transaction_type = 'LOCK' THEN 'locked'
    WHEN transaction_type = 'RELEASE' THEN 'released'
    WHEN transaction_type = 'FAILED' THEN 'cancelled'
    ELSE 'locked'
END;

-- Update timestamps
UPDATE escrow_transactions
SET locked_at = executed_at
WHERE transaction_type = 'LOCK';

UPDATE escrow_transactions
SET released_at = executed_at
WHERE transaction_type = 'RELEASE';

-- Populate delivery_id, school_id, catering_id from metadata JSON
UPDATE escrow_transactions
SET
    delivery_id = (metadata->>'deliveryId')::INTEGER,
    school_id = (metadata->>'schoolId')::INTEGER,
    catering_id = (metadata->>'cateringId')::INTEGER
WHERE metadata IS NOT NULL;

-- ============================================
-- MIGRATION COMPLETED
-- ============================================

-- Verify columns added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'escrow_transactions'
  AND column_name IN ('delivery_id', 'catering_id', 'school_id', 'tx_hash', 'escrow_status', 'locked_at', 'released_at')
ORDER BY ordinal_position;
