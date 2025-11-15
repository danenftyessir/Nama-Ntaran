-- Migration: Add AI Features Support
-- Created: 2025-11-15
-- Description: Tables untuk Computer Vision results, AI Analytics, dan BPS data cache

-- ============================================
-- 1. Poverty Data Cache (from BPS API)
-- ============================================

CREATE TABLE IF NOT EXISTS poverty_data_cache (
  id SERIAL PRIMARY KEY,
  province VARCHAR(100) NOT NULL,
  province_code VARCHAR(2) NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER,
  poverty_rate DECIMAL(5,2) NOT NULL, -- Percentage
  poverty_count BIGINT DEFAULT 0, -- Number of people
  gini_ratio DECIMAL(4,3) DEFAULT 0.350, -- Income inequality 0-1
  last_updated TIMESTAMP DEFAULT NOW(),
  source VARCHAR(20) DEFAULT 'simulated', -- 'bps_api', 'cached', 'simulated'
  created_at TIMESTAMP DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(province, year)
);

CREATE INDEX idx_poverty_province ON poverty_data_cache(province);
CREATE INDEX idx_poverty_year ON poverty_data_cache(year DESC);

-- ============================================
-- 2. AI Analysis Results (Computer Vision)
-- ============================================

CREATE TABLE IF NOT EXISTS ai_food_analyses (
  id SERIAL PRIMARY KEY,
  verification_id INTEGER REFERENCES verifications(id) ON DELETE CASCADE,
  delivery_id INTEGER REFERENCES deliveries(id) ON DELETE CASCADE,

  -- Detection results
  detected_items TEXT[], -- Array of detected food items
  portion_estimate INTEGER,
  portion_confidence DECIMAL(3,2), -- 0-1

  -- Quality scores (0-100)
  quality_score INTEGER,
  freshness_score INTEGER,
  presentation_score INTEGER,
  hygiene_score INTEGER,

  -- Nutrition estimates
  estimated_calories INTEGER,
  estimated_protein INTEGER, -- grams
  estimated_carbs INTEGER, -- grams
  has_vegetables BOOLEAN DEFAULT false,

  -- Compliance checks
  menu_match BOOLEAN DEFAULT false,
  portion_match BOOLEAN DEFAULT false,
  quality_acceptable BOOLEAN DEFAULT false,
  meets_bgn_standards BOOLEAN DEFAULT false,

  -- AI metadata
  confidence DECIMAL(3,2), -- Overall confidence 0-1
  reasoning TEXT,
  issues TEXT[], -- Array of issues
  warnings TEXT[], -- Array of warnings
  recommendations TEXT[], -- Array of recommendations

  -- Review status
  needs_manual_review BOOLEAN DEFAULT false,
  manual_review_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,

  -- Timestamps
  analyzed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_analysis_verification ON ai_food_analyses(verification_id);
CREATE INDEX idx_ai_analysis_delivery ON ai_food_analyses(delivery_id);
CREATE INDEX idx_ai_analysis_review_needed ON ai_food_analyses(needs_manual_review) WHERE needs_manual_review = true;

-- ============================================
-- 3. Anomaly Alerts (from AI Analytics)
-- ============================================

CREATE TABLE IF NOT EXISTS anomaly_alerts (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- 'collusion', 'fake_verification', 'late_delivery_pattern', etc
  severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  suspicious_patterns TEXT[], -- Array of patterns

  -- Involved parties
  school_id INTEGER REFERENCES schools(id),
  catering_id INTEGER REFERENCES caterings(id),

  -- AI metadata
  confidence_score DECIMAL(3,2), -- 0-1
  recommendation VARCHAR(50), -- 'investigate', 'block', 'monitor', 'alert_admin'
  data_points JSONB, -- Flexible storage for supporting data

  -- Status tracking
  status VARCHAR(20) DEFAULT 'new', -- 'new', 'investigating', 'resolved', 'dismissed'
  investigated_by INTEGER REFERENCES users(id),
  investigated_at TIMESTAMP,
  resolution_notes TEXT,

  -- Timestamps
  detected_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_anomaly_type ON anomaly_alerts(type);
CREATE INDEX idx_anomaly_severity ON anomaly_alerts(severity);
CREATE INDEX idx_anomaly_status ON anomaly_alerts(status);
CREATE INDEX idx_anomaly_school ON anomaly_alerts(school_id);
CREATE INDEX idx_anomaly_catering ON anomaly_alerts(catering_id);

-- ============================================
-- 4. Vendor Risk Assessments
-- ============================================

CREATE TABLE IF NOT EXISTS vendor_risk_assessments (
  id SERIAL PRIMARY KEY,
  catering_id INTEGER REFERENCES caterings(id) ON DELETE CASCADE,

  -- Risk metrics
  risk_score INTEGER, -- 0-100 (higher = worse)
  risk_level VARCHAR(20), -- 'low', 'medium', 'high', 'critical'

  -- Performance factors
  late_delivery_rate DECIMAL(5,4), -- 0-1
  quality_issue_rate DECIMAL(5,4), -- 0-1
  compliance_rate DECIMAL(5,4), -- 0-1
  avg_quality_score DECIMAL(5,2), -- 0-100

  -- Predictions
  likely_to_default DECIMAL(3,2), -- probability 0-1
  recommended_action TEXT,

  -- Historical context
  total_deliveries INTEGER DEFAULT 0,
  successful_deliveries INTEGER DEFAULT 0,
  issues_reported INTEGER DEFAULT 0,

  -- Assessment period
  assessment_period_start DATE,
  assessment_period_end DATE,

  -- Timestamps
  assessed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vendor_risk_catering ON vendor_risk_assessments(catering_id);
CREATE INDEX idx_vendor_risk_level ON vendor_risk_assessments(risk_level);
CREATE INDEX idx_vendor_risk_score ON vendor_risk_assessments(risk_score DESC);

-- ============================================
-- 5. Stunting Data Cache (for AI Scoring)
-- ============================================

CREATE TABLE IF NOT EXISTS stunting_data_cache (
  id SERIAL PRIMARY KEY,
  province VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL,
  stunting_rate DECIMAL(5,2) NOT NULL, -- Percentage
  stunting_count BIGINT DEFAULT 0,
  source VARCHAR(20) DEFAULT 'simulated', -- 'kemenkes_api', 'simulated'
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(province, year)
);

CREATE INDEX idx_stunting_province ON stunting_data_cache(province);
CREATE INDEX idx_stunting_year ON stunting_data_cache(year DESC);

-- ============================================
-- 6. Insert Sample Data
-- ============================================

-- Sample stunting data (based on real Indonesian data)
INSERT INTO stunting_data_cache (province, year, stunting_rate, source) VALUES
('Nusa Tenggara Timur', 2024, 35.3, 'simulated'),
('Sulawesi Barat', 2024, 31.4, 'simulated'),
('Nusa Tenggara Barat', 2024, 30.5, 'simulated'),
('Papua Barat', 2024, 29.2, 'simulated'),
('Papua', 2024, 28.5, 'simulated'),
('Kalimantan Barat', 2024, 27.1, 'simulated'),
('Maluku', 2024, 25.7, 'simulated'),
('Aceh', 2024, 24.2, 'simulated'),
('Gorontalo', 2024, 23.8, 'simulated'),
('Kalimantan Selatan', 2024, 22.9, 'simulated'),
('Sulawesi Tengah', 2024, 22.3, 'simulated'),
('Sulawesi Tenggara', 2024, 21.5, 'simulated'),
('Kalimantan Tengah', 2024, 20.8, 'simulated'),
('Jambi', 2024, 20.1, 'simulated'),
('Bengkulu', 2024, 19.7, 'simulated'),
('Lampung', 2024, 19.2, 'simulated'),
('Sumatera Selatan', 2024, 18.4, 'simulated'),
('Sulawesi Selatan', 2024, 17.9, 'simulated'),
('Jawa Timur', 2024, 17.1, 'simulated'),
('Sulawesi Utara', 2024, 16.3, 'simulated'),
('Jawa Tengah', 2024, 15.8, 'simulated'),
('Sumatera Utara', 2024, 15.2, 'simulated'),
('Maluku Utara', 2024, 14.9, 'simulated'),
('Jawa Barat', 2024, 14.1, 'simulated'),
('Banten', 2024, 13.5, 'simulated'),
('Sumatera Barat', 2024, 12.8, 'simulated'),
('Riau', 2024, 12.1, 'simulated'),
('Kalimantan Timur', 2024, 11.4, 'simulated'),
('DI Yogyakarta', 2024, 10.9, 'simulated'),
('Kepulauan Riau', 2024, 10.2, 'simulated'),
('Bali', 2024, 8.5, 'simulated'),
('DKI Jakarta', 2024, 7.8, 'simulated'),
('Kalimantan Utara', 2024, 11.9, 'simulated'),
('Kepulauan Bangka Belitung', 2024, 10.7, 'simulated')
ON CONFLICT (province, year) DO NOTHING;

-- ============================================
-- 7. Update Existing Tables (if needed)
-- ============================================

-- Add AI analysis reference to verifications table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'verifications' AND column_name = 'ai_analysis_id'
  ) THEN
    ALTER TABLE verifications ADD COLUMN ai_analysis_id INTEGER REFERENCES ai_food_analyses(id);
  END IF;
END $$;

-- Add risk assessment reference to caterings table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'caterings' AND column_name = 'latest_risk_assessment_id'
  ) THEN
    ALTER TABLE caterings ADD COLUMN latest_risk_assessment_id INTEGER REFERENCES vendor_risk_assessments(id);
    ALTER TABLE caterings ADD COLUMN risk_level VARCHAR(20) DEFAULT 'low';
  END IF;
END $$;

-- ============================================
-- 8. Create Views for Easy Querying
-- ============================================

-- View: Latest poverty data per province
CREATE OR REPLACE VIEW latest_poverty_data AS
SELECT DISTINCT ON (province)
  province,
  province_code,
  year,
  poverty_rate,
  gini_ratio,
  source,
  last_updated
FROM poverty_data_cache
ORDER BY province, year DESC, last_updated DESC;

-- View: Latest stunting data per province
CREATE OR REPLACE VIEW latest_stunting_data AS
SELECT DISTINCT ON (province)
  province,
  year,
  stunting_rate,
  source,
  last_updated
FROM stunting_data_cache
ORDER BY province, year DESC, last_updated DESC;

-- View: Anomalies requiring immediate attention
CREATE OR REPLACE VIEW critical_anomalies AS
SELECT *
FROM anomaly_alerts
WHERE status = 'new'
  AND severity IN ('high', 'critical')
ORDER BY detected_at DESC;

-- View: High-risk vendors
CREATE OR REPLACE VIEW high_risk_vendors AS
SELECT
  vra.*,
  c.name as catering_name,
  c.wallet_address
FROM vendor_risk_assessments vra
JOIN caterings c ON vra.catering_id = c.id
WHERE vra.risk_level IN ('high', 'critical')
  AND vra.id IN (
    SELECT MAX(id) FROM vendor_risk_assessments GROUP BY catering_id
  )
ORDER BY vra.risk_score DESC;

-- ============================================
-- Success Message
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'AI Features Migration Completed Successfully!';
  RAISE NOTICE 'Created tables:';
  RAISE NOTICE '  - poverty_data_cache';
  RAISE NOTICE '  - ai_food_analyses';
  RAISE NOTICE '  - anomaly_alerts';
  RAISE NOTICE '  - vendor_risk_assessments';
  RAISE NOTICE '  - stunting_data_cache';
  RAISE NOTICE 'Created views:';
  RAISE NOTICE '  - latest_poverty_data';
  RAISE NOTICE '  - latest_stunting_data';
  RAISE NOTICE '  - critical_anomalies';
  RAISE NOTICE '  - high_risk_vendors';
END $$;
