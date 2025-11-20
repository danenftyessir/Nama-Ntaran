-- Migration: Update Stunting Data Cache Schema
-- Created: 2025-11-21
-- Description: Add missing columns for comprehensive stunting data tracking

-- ============================================
-- 1. Add Missing Columns to stunting_data_cache
-- ============================================

-- Add province_code column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stunting_data_cache' AND column_name = 'province_code'
  ) THEN
    ALTER TABLE stunting_data_cache ADD COLUMN province_code VARCHAR(10);
    RAISE NOTICE 'Added province_code column';
  END IF;
END $$;

-- Add month column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stunting_data_cache' AND column_name = 'month'
  ) THEN
    ALTER TABLE stunting_data_cache ADD COLUMN month INTEGER NOT NULL DEFAULT 12;
    RAISE NOTICE 'Added month column';
  END IF;
END $$;

-- Add severe_stunting_rate column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stunting_data_cache' AND column_name = 'severe_stunting_rate'
  ) THEN
    ALTER TABLE stunting_data_cache ADD COLUMN severe_stunting_rate DECIMAL(5,2);
    RAISE NOTICE 'Added severe_stunting_rate column';
  END IF;
END $$;

-- Add severe_stunting_count column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stunting_data_cache' AND column_name = 'severe_stunting_count'
  ) THEN
    ALTER TABLE stunting_data_cache ADD COLUMN severe_stunting_count INTEGER;
    RAISE NOTICE 'Added severe_stunting_count column';
  END IF;
END $$;

-- Add intervention_programs column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stunting_data_cache' AND column_name = 'intervention_programs'
  ) THEN
    ALTER TABLE stunting_data_cache ADD COLUMN intervention_programs TEXT[];
    RAISE NOTICE 'Added intervention_programs column';
  END IF;
END $$;

-- ============================================
-- 2. Drop Old Unique Constraint and Create New One
-- ============================================

-- Drop old unique constraint (province, year)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stunting_data_cache_province_year_key'
  ) THEN
    ALTER TABLE stunting_data_cache DROP CONSTRAINT stunting_data_cache_province_year_key;
    RAISE NOTICE 'Dropped old unique constraint (province, year)';
  END IF;
END $$;

-- Create new unique constraint (province, year, month)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stunting_data_cache_province_year_month_key'
  ) THEN
    ALTER TABLE stunting_data_cache ADD CONSTRAINT stunting_data_cache_province_year_month_key
      UNIQUE (province, year, month);
    RAISE NOTICE 'Added new unique constraint (province, year, month)';
  END IF;
END $$;

-- ============================================
-- 3. Create Additional Indexes for Performance
-- ============================================

-- Index on province_code for faster joins
CREATE INDEX IF NOT EXISTS idx_stunting_province_code ON stunting_data_cache(province_code);

-- Index on month for seasonal analysis
CREATE INDEX IF NOT EXISTS idx_stunting_month ON stunting_data_cache(month);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_stunting_province_year_month ON stunting_data_cache(province, year DESC, month DESC);

-- ============================================
-- 4. Update Existing Sample Data (if any)
-- ============================================

-- Delete existing sample data to avoid conflicts
DELETE FROM stunting_data_cache WHERE source = 'simulated';

DO $$
BEGIN
  RAISE NOTICE 'Cleared old simulated data. Ready for new seeding with enhanced schema.';
END $$;

-- ============================================
-- 5. Update View to Include New Columns
-- ============================================

-- Drop the old view first
DROP VIEW IF EXISTS latest_stunting_data;

-- Create new view with all columns
CREATE VIEW latest_stunting_data AS
SELECT DISTINCT ON (province)
  province,
  province_code,
  year,
  month,
  stunting_rate,
  stunting_count,
  severe_stunting_rate,
  severe_stunting_count,
  intervention_programs,
  source,
  last_updated
FROM stunting_data_cache
ORDER BY province, year DESC, month DESC, last_updated DESC;

-- ============================================
-- Success Message
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Stunting Data Cache Schema Updated!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Added columns:';
  RAISE NOTICE '  ✅ province_code (VARCHAR 10)';
  RAISE NOTICE '  ✅ month (INTEGER)';
  RAISE NOTICE '  ✅ severe_stunting_rate (DECIMAL)';
  RAISE NOTICE '  ✅ severe_stunting_count (INTEGER)';
  RAISE NOTICE '  ✅ intervention_programs (TEXT[])';
  RAISE NOTICE '';
  RAISE NOTICE 'Updated indexes:';
  RAISE NOTICE '  ✅ idx_stunting_province_code';
  RAISE NOTICE '  ✅ idx_stunting_month';
  RAISE NOTICE '  ✅ idx_stunting_province_year_month';
  RAISE NOTICE '';
  RAISE NOTICE 'Updated views:';
  RAISE NOTICE '  ✅ latest_stunting_data (now includes all columns)';
  RAISE NOTICE '';
  RAISE NOTICE 'Ready to run: npm run seed:stunting-data-cache';
  RAISE NOTICE '========================================';
END $$;
