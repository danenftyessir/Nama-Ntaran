-- Migration: Add Blockchain Analytics Tables (EXTRA)
-- Created: 2025-11-21
-- Description: Advanced blockchain tracking tables for analytics, debugging, and monitoring

-- ============================================
-- 1. Blockchain Transaction History
-- ============================================

CREATE TABLE IF NOT EXISTS blockchain_transaction_history (
  id SERIAL PRIMARY KEY,
  tx_hash VARCHAR(66) UNIQUE NOT NULL,
  from_address VARCHAR(42) NOT NULL,
  to_address VARCHAR(42) NOT NULL,
  value_wei VARCHAR(78) NOT NULL, -- Large number as string
  value_idr DECIMAL(15,2),
  gas_used BIGINT NOT NULL,
  gas_price_gwei DECIMAL(10,2) NOT NULL,
  total_fee_wei VARCHAR(78),
  total_fee_idr DECIMAL(12,2),
  block_number BIGINT NOT NULL,
  block_timestamp TIMESTAMP NOT NULL,
  tx_status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'pending'
  network VARCHAR(50) NOT NULL, -- 'polygon-mainnet', 'arbitrum-one', etc.
  nonce INTEGER,
  transaction_index INTEGER,
  contract_address VARCHAR(42),
  logs_count INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_tx_status CHECK (tx_status IN ('success', 'failed', 'pending'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tx_history_hash ON blockchain_transaction_history(tx_hash);
CREATE INDEX IF NOT EXISTS idx_tx_history_from ON blockchain_transaction_history(from_address);
CREATE INDEX IF NOT EXISTS idx_tx_history_to ON blockchain_transaction_history(to_address);
CREATE INDEX IF NOT EXISTS idx_tx_history_block ON blockchain_transaction_history(block_number DESC);
CREATE INDEX IF NOT EXISTS idx_tx_history_timestamp ON blockchain_transaction_history(block_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tx_history_network ON blockchain_transaction_history(network);
CREATE INDEX IF NOT EXISTS idx_tx_history_status ON blockchain_transaction_history(tx_status);

-- ============================================
-- 2. Smart Contract Events Raw
-- ============================================

CREATE TABLE IF NOT EXISTS smart_contract_events_raw (
  id SERIAL PRIMARY KEY,
  tx_hash VARCHAR(66) NOT NULL,
  block_number BIGINT NOT NULL,
  block_timestamp TIMESTAMP NOT NULL,
  contract_address VARCHAR(42) NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  event_signature VARCHAR(255) NOT NULL,
  topic_0 VARCHAR(66), -- Event signature hash
  topic_1 VARCHAR(66), -- Indexed parameter 1
  topic_2 VARCHAR(66), -- Indexed parameter 2
  topic_3 VARCHAR(66), -- Indexed parameter 3
  data TEXT, -- Non-indexed parameters (hex encoded)
  decoded_data JSONB, -- Decoded event parameters
  log_index INTEGER NOT NULL,
  transaction_index INTEGER NOT NULL,
  removed BOOLEAN DEFAULT false,
  network VARCHAR(50) NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(tx_hash, log_index)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_tx_hash ON smart_contract_events_raw(tx_hash);
CREATE INDEX IF NOT EXISTS idx_events_block ON smart_contract_events_raw(block_number DESC);
CREATE INDEX IF NOT EXISTS idx_events_contract ON smart_contract_events_raw(contract_address);
CREATE INDEX IF NOT EXISTS idx_events_name ON smart_contract_events_raw(event_name);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON smart_contract_events_raw(block_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_processed ON smart_contract_events_raw(processed) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_events_network ON smart_contract_events_raw(network);

-- ============================================
-- 3. Wallet Balances Snapshot
-- ============================================

CREATE TABLE IF NOT EXISTS wallet_balances_snapshot (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  wallet_type VARCHAR(50) NOT NULL, -- 'government', 'school', 'catering', 'escrow_contract'
  entity_type VARCHAR(50), -- 'school', 'catering', 'admin'
  entity_id INTEGER, -- Reference to schools.id, caterings.id, etc.
  balance_wei VARCHAR(78) NOT NULL,
  balance_eth DECIMAL(18,8),
  balance_idr DECIMAL(15,2),
  token_balances JSONB, -- For ERC20 tokens if any
  network VARCHAR(50) NOT NULL,
  snapshot_type VARCHAR(50) NOT NULL, -- 'scheduled', 'on_transaction', 'manual'
  block_number BIGINT NOT NULL,
  block_timestamp TIMESTAMP NOT NULL,
  previous_balance_wei VARCHAR(78),
  balance_change_wei VARCHAR(78),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_wallet_type CHECK (wallet_type IN ('government', 'school', 'catering', 'escrow_contract', 'other')),
  CONSTRAINT valid_snapshot_type CHECK (snapshot_type IN ('scheduled', 'on_transaction', 'manual'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_balances_address ON wallet_balances_snapshot(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_balances_type ON wallet_balances_snapshot(wallet_type);
CREATE INDEX IF NOT EXISTS idx_wallet_balances_entity ON wallet_balances_snapshot(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_wallet_balances_timestamp ON wallet_balances_snapshot(block_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_balances_network ON wallet_balances_snapshot(network);
CREATE INDEX IF NOT EXISTS idx_wallet_balances_composite ON wallet_balances_snapshot(wallet_address, block_timestamp DESC);

-- ============================================
-- 4. Create Views for Easy Querying
-- ============================================

-- View: Latest wallet balances per address
CREATE OR REPLACE VIEW latest_wallet_balances AS
SELECT DISTINCT ON (wallet_address, network)
  wallet_address,
  wallet_type,
  entity_type,
  entity_id,
  balance_wei,
  balance_eth,
  balance_idr,
  network,
  block_timestamp,
  created_at
FROM wallet_balances_snapshot
ORDER BY wallet_address, network, block_timestamp DESC;

-- View: Successful transactions summary
CREATE OR REPLACE VIEW successful_transactions AS
SELECT
  tx_hash,
  from_address,
  to_address,
  value_idr,
  gas_price_gwei,
  total_fee_idr,
  block_number,
  block_timestamp,
  network
FROM blockchain_transaction_history
WHERE tx_status = 'success'
ORDER BY block_timestamp DESC;

-- View: Recent contract events
CREATE OR REPLACE VIEW recent_contract_events AS
SELECT
  event_name,
  contract_address,
  tx_hash,
  decoded_data,
  block_number,
  block_timestamp,
  network
FROM smart_contract_events_raw
WHERE processed = true
  AND removed = false
ORDER BY block_timestamp DESC
LIMIT 1000;

-- ============================================
-- 5. Add Helper Functions
-- ============================================

-- Function: Get wallet balance at specific timestamp
CREATE OR REPLACE FUNCTION get_wallet_balance_at_time(
  p_wallet_address VARCHAR(42),
  p_timestamp TIMESTAMP,
  p_network VARCHAR(50) DEFAULT 'polygon-mainnet'
)
RETURNS TABLE (
  balance_wei VARCHAR(78),
  balance_eth DECIMAL(18,8),
  balance_idr DECIMAL(15,2),
  snapshot_time TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wbs.balance_wei,
    wbs.balance_eth,
    wbs.balance_idr,
    wbs.block_timestamp
  FROM wallet_balances_snapshot wbs
  WHERE wbs.wallet_address = p_wallet_address
    AND wbs.network = p_network
    AND wbs.block_timestamp <= p_timestamp
  ORDER BY wbs.block_timestamp DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function: Get transaction history for address
CREATE OR REPLACE FUNCTION get_address_transactions(
  p_address VARCHAR(42),
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  tx_hash VARCHAR(66),
  direction VARCHAR(10), -- 'sent' or 'received'
  counterparty VARCHAR(42),
  value_idr DECIMAL(15,2),
  block_timestamp TIMESTAMP,
  tx_status VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bth.tx_hash,
    CASE
      WHEN bth.from_address = p_address THEN 'sent'
      ELSE 'received'
    END as direction,
    CASE
      WHEN bth.from_address = p_address THEN bth.to_address
      ELSE bth.from_address
    END as counterparty,
    bth.value_idr,
    bth.block_timestamp,
    bth.tx_status
  FROM blockchain_transaction_history bth
  WHERE bth.from_address = p_address
     OR bth.to_address = p_address
  ORDER BY bth.block_timestamp DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Success Message
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Blockchain Analytics Tables Created!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Created tables:';
  RAISE NOTICE '  ✅ blockchain_transaction_history';
  RAISE NOTICE '  ✅ smart_contract_events_raw';
  RAISE NOTICE '  ✅ wallet_balances_snapshot';
  RAISE NOTICE '';
  RAISE NOTICE 'Created views:';
  RAISE NOTICE '  ✅ latest_wallet_balances';
  RAISE NOTICE '  ✅ successful_transactions';
  RAISE NOTICE '  ✅ recent_contract_events';
  RAISE NOTICE '';
  RAISE NOTICE 'Created functions:';
  RAISE NOTICE '  ✅ get_wallet_balance_at_time()';
  RAISE NOTICE '  ✅ get_address_transactions()';
  RAISE NOTICE '';
  RAISE NOTICE 'Ready to run seeders:';
  RAISE NOTICE '  npm run seed:blockchain-transaction-history';
  RAISE NOTICE '  npm run seed:smart-contract-events-raw';
  RAISE NOTICE '  npm run seed:wallet-balances-snapshot';
  RAISE NOTICE '========================================';
END $$;
