-- ============================================================================
-- MIGRATION 006: Update Deliveries Table - Add Missing Columns
-- ============================================================================
-- Created: 2025-11-20
-- Purpose: Add missing columns to deliveries table as per specification
-- ============================================================================

-- Add missing columns to deliveries table
ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS allocation_id INTEGER REFERENCES allocations(id),
  ADD COLUMN IF NOT EXISTS delivery_time_start TIME,
  ADD COLUMN IF NOT EXISTS delivery_time_end TIME,
  ADD COLUMN IF NOT EXISTS menu_items JSONB,
  ADD COLUMN IF NOT EXISTS qr_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS driver_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS driver_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;

-- Rename 'amount' to 'total_amount' if needed (for consistency with spec)
-- Note: If 'amount' already exists, this will create an alias
ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2);

-- Update total_amount from amount if amount exists
UPDATE deliveries
SET total_amount = amount
WHERE total_amount IS NULL AND amount IS NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_deliveries_allocation ON deliveries(allocation_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_qr_code ON deliveries(qr_code);
CREATE INDEX IF NOT EXISTS idx_deliveries_delivered_at ON deliveries(delivered_at);
CREATE INDEX IF NOT EXISTS idx_deliveries_delivery_date ON deliveries(delivery_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);

-- Update status constraint to include all status values from spec
ALTER TABLE deliveries
  DROP CONSTRAINT IF EXISTS deliveries_status_check;

ALTER TABLE deliveries
  ADD CONSTRAINT deliveries_status_check
  CHECK (status IN ('pending', 'scheduled', 'in_transit', 'delivered', 'verified', 'cancelled'));

-- Add comments
COMMENT ON COLUMN deliveries.allocation_id IS 'Reference to budget allocation for this delivery';
COMMENT ON COLUMN deliveries.delivery_time_start IS 'Delivery window start time (e.g., 11:00)';
COMMENT ON COLUMN deliveries.delivery_time_end IS 'Delivery window end time (e.g., 12:00)';
COMMENT ON COLUMN deliveries.menu_items IS 'JSON array of menu items: [{menu_id, menu_name, quantity, unit_price, subtotal}]';
COMMENT ON COLUMN deliveries.qr_code IS 'Unique QR code for delivery verification (format: MBG-{school_id}-{delivery_id}-{hash})';
COMMENT ON COLUMN deliveries.driver_name IS 'Name of delivery driver';
COMMENT ON COLUMN deliveries.driver_phone IS 'Phone number of delivery driver';
COMMENT ON COLUMN deliveries.vehicle_number IS 'Vehicle plate number (e.g., B 1234 ABC)';
COMMENT ON COLUMN deliveries.delivered_at IS 'Actual delivery timestamp';
COMMENT ON COLUMN deliveries.total_amount IS 'Total amount for this delivery (sum of all menu items)';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 006 completed successfully!';
    RAISE NOTICE 'Updated deliveries table with missing columns';
    RAISE NOTICE 'Added columns: allocation_id, delivery_time_start, delivery_time_end, menu_items, qr_code, driver_name, driver_phone, vehicle_number, delivered_at, total_amount';
END $$;
