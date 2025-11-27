-- ============================================
-- Migration 027: Catering Enhancements
-- ============================================
-- Purpose: Menambahkan tabel dan kolom untuk mendukung fitur catering vendors
-- Created: 2025-11-26
-- Author: MBG Dev Team

-- ============================================
-- 1. CATERING PROFILES TABLE
-- ============================================
-- Tabel untuk profile lengkap catering vendors

CREATE TABLE IF NOT EXISTS catering_profiles (
    id SERIAL PRIMARY KEY,
    catering_id INTEGER NOT NULL REFERENCES caterings(id) ON DELETE CASCADE,

    -- Business Information
    business_type VARCHAR(50), -- 'PT', 'CV', 'UD', 'Perorangan'
    established_year INTEGER,
    npwp VARCHAR(20), -- Nomor Pokok Wajib Pajak
    siup VARCHAR(50), -- Surat Izin Usaha Perdagangan
    halal_certificate_number VARCHAR(50),
    halal_certificate_expiry DATE,

    -- Production Capacity
    max_daily_capacity INTEGER, -- Maximum portions per day
    min_order_quantity INTEGER, -- Minimum portions per order
    production_facilities TEXT, -- Deskripsi fasilitas produksi

    -- Service Area
    service_provinces TEXT[], -- Array of provinces
    service_cities TEXT[], -- Array of cities
    service_radius_km INTEGER, -- Delivery radius in KM

    -- Certifications
    certifications JSONB, -- {hygiene: {number, expiry}, food_safety: {number, expiry}}

    -- Banking Information
    tax_registered BOOLEAN DEFAULT false,
    tax_id VARCHAR(50),

    -- Owner/Contact Person
    owner_name VARCHAR(255),
    owner_phone VARCHAR(20),
    technical_contact_name VARCHAR(255),
    technical_contact_phone VARCHAR(20),

    -- Emergency Contact
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),

    -- Operational Info
    operational_hours JSONB, -- {monday: {open: '08:00', close: '17:00'}, ...}
    holidays TEXT[], -- Array of holiday dates

    -- Documents
    document_urls JSONB, -- {siup: 'url', halal_cert: 'url', npwp: 'url'}

    -- Status
    is_verified BOOLEAN DEFAULT false,
    verified_by INTEGER REFERENCES users(id),
    verified_at TIMESTAMP,
    verification_notes TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    UNIQUE(catering_id)
);

CREATE INDEX idx_catering_profiles_catering_id ON catering_profiles(catering_id);
CREATE INDEX idx_catering_profiles_verified ON catering_profiles(is_verified);
CREATE INDEX idx_catering_profiles_halal_cert_expiry ON catering_profiles(halal_certificate_expiry);

-- ============================================
-- 2. CATERING DELIVERY SCHEDULES TABLE
-- ============================================
-- Tabel untuk jadwal pengiriman reguler catering

CREATE TABLE IF NOT EXISTS catering_delivery_schedules (
    id SERIAL PRIMARY KEY,

    -- References
    catering_id INTEGER NOT NULL REFERENCES caterings(id) ON DELETE CASCADE,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

    -- Schedule Info
    schedule_type VARCHAR(20) DEFAULT 'recurring' CHECK (schedule_type IN ('one_time', 'recurring')),

    -- Recurring Schedule
    day_of_week INTEGER, -- 1 = Monday, 7 = Sunday
    delivery_time TIME, -- Expected delivery time

    -- One-time Schedule
    delivery_date DATE,

    -- Portions
    portions INTEGER NOT NULL,

    -- Status
    is_active BOOLEAN DEFAULT true,
    start_date DATE,
    end_date DATE,

    -- Metadata
    notes TEXT,
    special_instructions TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_catering_delivery_schedules_catering ON catering_delivery_schedules(catering_id);
CREATE INDEX idx_catering_delivery_schedules_school ON catering_delivery_schedules(school_id);
CREATE INDEX idx_catering_delivery_schedules_active ON catering_delivery_schedules(is_active) WHERE is_active = true;

-- ============================================
-- 3. CATERING PERFORMANCE METRICS TABLE
-- ============================================
-- Tabel untuk tracking real-time performance metrics catering

CREATE TABLE IF NOT EXISTS catering_performance_metrics (
    id SERIAL PRIMARY KEY,

    -- Reference
    catering_id INTEGER NOT NULL REFERENCES caterings(id) ON DELETE CASCADE,

    -- Time Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Delivery Metrics
    total_deliveries INTEGER DEFAULT 0,
    successful_deliveries INTEGER DEFAULT 0,
    late_deliveries INTEGER DEFAULT 0,
    cancelled_deliveries INTEGER DEFAULT 0,

    -- Quality Metrics
    total_portions INTEGER DEFAULT 0,
    avg_quality_rating DECIMAL(3,2), -- 0-5
    quality_issues_count INTEGER DEFAULT 0,

    -- Compliance Metrics
    compliance_rate DECIMAL(5,4), -- 0-1
    hygiene_violations_count INTEGER DEFAULT 0,

    -- Financial Metrics
    total_revenue DECIMAL(15,2) DEFAULT 0,
    pending_payments DECIMAL(15,2) DEFAULT 0,
    completed_payments DECIMAL(15,2) DEFAULT 0,

    -- Customer Satisfaction
    avg_school_rating DECIMAL(3,2), -- 0-5
    complaints_count INTEGER DEFAULT 0,
    compliments_count INTEGER DEFAULT 0,

    -- Timestamps
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    UNIQUE(catering_id, period_start, period_end)
);

CREATE INDEX idx_catering_performance_metrics_catering ON catering_performance_metrics(catering_id);
CREATE INDEX idx_catering_performance_metrics_period ON catering_performance_metrics(period_start, period_end);

-- ============================================
-- 4. CATERING INVENTORY TABLE
-- ============================================
-- Tabel untuk tracking inventory bahan baku (optional)

CREATE TABLE IF NOT EXISTS catering_inventory (
    id SERIAL PRIMARY KEY,

    -- Reference
    catering_id INTEGER NOT NULL REFERENCES caterings(id) ON DELETE CASCADE,

    -- Item Info
    item_name VARCHAR(255) NOT NULL,
    item_category VARCHAR(50), -- 'protein', 'vegetable', 'grain', 'spice', etc.

    -- Quantity
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20), -- 'kg', 'liter', 'pcs', etc.

    -- Threshold
    minimum_quantity DECIMAL(10,2), -- Reorder threshold

    -- Supplier
    supplier_name VARCHAR(255),
    supplier_contact VARCHAR(100),

    -- Cost
    unit_price DECIMAL(10,2),
    total_value DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,

    -- Expiry
    expiry_date DATE,

    -- Status
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'low_stock', 'out_of_stock', 'expired')),

    -- Timestamps
    last_restocked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_catering_inventory_catering ON catering_inventory(catering_id);
CREATE INDEX idx_catering_inventory_status ON catering_inventory(status);
CREATE INDEX idx_catering_inventory_expiry ON catering_inventory(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_catering_inventory_low_stock ON catering_inventory(catering_id, status) WHERE status IN ('low_stock', 'out_of_stock');

-- ============================================
-- 5. CATERING FEEDBACK TABLE
-- ============================================
-- Tabel untuk feedback dari sekolah ke catering

CREATE TABLE IF NOT EXISTS catering_feedback (
    id SERIAL PRIMARY KEY,

    -- References
    catering_id INTEGER NOT NULL REFERENCES caterings(id) ON DELETE CASCADE,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    delivery_id INTEGER REFERENCES deliveries(id) ON DELETE SET NULL,

    -- Feedback Details
    feedback_type VARCHAR(50), -- 'complaint', 'compliment', 'suggestion', 'question'
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,

    -- Rating (optional)
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),

    -- Categories
    categories TEXT[], -- ['food_quality', 'delivery_time', 'packaging', 'hygiene']

    -- Attachments
    photo_urls TEXT[],

    -- Response
    response TEXT,
    responded_by INTEGER REFERENCES users(id),
    responded_at TIMESTAMP,

    -- Status
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'resolved', 'closed')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    -- Resolution
    resolution_notes TEXT,
    resolved_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_catering_feedback_catering ON catering_feedback(catering_id);
CREATE INDEX idx_catering_feedback_school ON catering_feedback(school_id);
CREATE INDEX idx_catering_feedback_delivery ON catering_feedback(delivery_id);
CREATE INDEX idx_catering_feedback_status ON catering_feedback(status);
CREATE INDEX idx_catering_feedback_priority ON catering_feedback(priority);
CREATE INDEX idx_catering_feedback_type ON catering_feedback(feedback_type);

-- ============================================
-- 6. CATERING NOTIFICATIONS TABLE
-- ============================================
-- Tabel untuk notifikasi ke catering

CREATE TABLE IF NOT EXISTS catering_notifications (
    id SERIAL PRIMARY KEY,

    -- Recipient
    catering_id INTEGER NOT NULL REFERENCES caterings(id) ON DELETE CASCADE,

    -- Notification Details
    notification_type VARCHAR(100) NOT NULL, -- 'NEW_ALLOCATION', 'PAYMENT_RELEASED', 'DELIVERY_VERIFIED', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    -- Related Entity
    related_type VARCHAR(50), -- 'allocation', 'payment', 'delivery', 'feedback'
    related_id INTEGER,
    related_url VARCHAR(500),

    -- Metadata
    metadata JSONB,

    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    is_archived BOOLEAN DEFAULT false,
    archived_at TIMESTAMP,

    -- Actions
    action_required BOOLEAN DEFAULT false,
    action_url VARCHAR(500),
    action_label VARCHAR(100),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE INDEX idx_catering_notifications_catering ON catering_notifications(catering_id);
CREATE INDEX idx_catering_notifications_type ON catering_notifications(notification_type);
CREATE INDEX idx_catering_notifications_unread ON catering_notifications(catering_id, is_read) WHERE is_read = false;
CREATE INDEX idx_catering_notifications_priority ON catering_notifications(priority);

-- ============================================
-- 7. ALTER EXISTING TABLES
-- ============================================

-- Add additional fields to caterings table
ALTER TABLE caterings
ADD COLUMN IF NOT EXISTS certification_status VARCHAR(50) DEFAULT 'pending' CHECK (certification_status IN ('pending', 'verified', 'expired', 'revoked')),
ADD COLUMN IF NOT EXISTS last_audit_date DATE,
ADD COLUMN IF NOT EXISTS next_audit_date DATE,
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS min_order_portions INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS max_daily_portions INTEGER DEFAULT 1000;

-- Add delivery preferences to caterings
ALTER TABLE caterings
ADD COLUMN IF NOT EXISTS delivery_vehicle_type VARCHAR(50), -- 'motor', 'mobil', 'box_truck'
ADD COLUMN IF NOT EXISTS delivery_staff_count INTEGER DEFAULT 1;

-- ============================================
-- 8. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_caterings_certification_status ON caterings(certification_status);
CREATE INDEX IF NOT EXISTS idx_caterings_suspended ON caterings(is_suspended) WHERE is_suspended = true;
CREATE INDEX IF NOT EXISTS idx_caterings_next_audit ON caterings(next_audit_date) WHERE next_audit_date IS NOT NULL;

-- ============================================
-- 9. CREATE VIEWS FOR CATERING DASHBOARDS
-- ============================================

-- View: Catering Revenue Summary
CREATE OR REPLACE VIEW catering_revenue_summary AS
SELECT
    c.id as catering_id,
    c.name as catering_name,
    COUNT(DISTINCT a.id) as total_allocations,
    SUM(a.amount) FILTER (WHERE a.status = 'LOCKED') as locked_funds,
    SUM(a.amount) FILTER (WHERE a.status = 'RELEASED') as released_funds,
    SUM(a.amount) FILTER (WHERE a.status IN ('LOCKED', 'RELEASING')) as pending_funds,
    COUNT(DISTINCT d.id) as total_deliveries,
    COUNT(DISTINCT CASE WHEN d.status = 'delivered' THEN d.id END) as completed_deliveries,
    AVG(v.quality_rating) as avg_quality_rating,
    COUNT(DISTINCT i.id) as total_issues
FROM caterings c
LEFT JOIN allocations a ON c.id = a.catering_id
LEFT JOIN deliveries d ON c.id = d.catering_id
LEFT JOIN verifications v ON d.id = v.delivery_id
LEFT JOIN issues i ON d.id = i.delivery_id
GROUP BY c.id, c.name;

-- View: Catering Upcoming Deliveries
CREATE OR REPLACE VIEW catering_upcoming_deliveries AS
SELECT
    d.id as delivery_id,
    d.delivery_date,
    d.portions,
    d.amount,
    d.status,
    c.id as catering_id,
    c.name as catering_name,
    s.id as school_id,
    s.name as school_name,
    s.address as school_address,
    s.city as school_city,
    a.status as allocation_status,
    a.amount as allocation_amount
FROM deliveries d
INNER JOIN caterings c ON d.catering_id = c.id
INNER JOIN schools s ON d.school_id = s.id
LEFT JOIN allocations a ON d.allocation_id = a.id
WHERE d.delivery_date >= CURRENT_DATE
  AND d.status NOT IN ('cancelled', 'delivered')
ORDER BY d.delivery_date ASC, d.created_at ASC;

-- View: Catering Payment Status
CREATE OR REPLACE VIEW catering_payment_status AS
SELECT
    c.id as catering_id,
    c.name as catering_name,
    COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'PENDING') as pending_payments,
    COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'LOCKED') as locked_payments,
    COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'RELEASING') as releasing_payments,
    COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'COMPLETED') as completed_payments,
    SUM(p.amount) FILTER (WHERE p.status = 'PENDING') as pending_amount,
    SUM(p.amount) FILTER (WHERE p.status = 'LOCKED') as locked_amount,
    SUM(p.amount) FILTER (WHERE p.status = 'RELEASING') as releasing_amount,
    SUM(p.amount) FILTER (WHERE p.status = 'COMPLETED') as completed_amount,
    COUNT(DISTINCT p.id) as total_payments,
    SUM(p.amount) as total_amount
FROM caterings c
LEFT JOIN payments p ON c.id = p.catering_id
GROUP BY c.id, c.name;

-- ============================================
-- 10. CREATE TRIGGERS
-- ============================================

-- Trigger: Update catering_profiles updated_at
CREATE OR REPLACE FUNCTION update_catering_profiles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_catering_profiles_timestamp ON catering_profiles;
CREATE TRIGGER trigger_update_catering_profiles_timestamp
    BEFORE UPDATE ON catering_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_catering_profiles_timestamp();

-- Trigger: Update catering_delivery_schedules updated_at
CREATE OR REPLACE FUNCTION update_catering_delivery_schedules_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_catering_delivery_schedules_timestamp ON catering_delivery_schedules;
CREATE TRIGGER trigger_update_catering_delivery_schedules_timestamp
    BEFORE UPDATE ON catering_delivery_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_catering_delivery_schedules_timestamp();

-- Trigger: Update catering_inventory updated_at
CREATE OR REPLACE FUNCTION update_catering_inventory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_catering_inventory_timestamp ON catering_inventory;
CREATE TRIGGER trigger_update_catering_inventory_timestamp
    BEFORE UPDATE ON catering_inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_catering_inventory_timestamp();

-- Trigger: Auto-update inventory status based on quantity
CREATE OR REPLACE FUNCTION auto_update_inventory_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expiry_date IS NOT NULL AND NEW.expiry_date < CURRENT_DATE THEN
        NEW.status = 'expired';
    ELSIF NEW.quantity <= 0 THEN
        NEW.status = 'out_of_stock';
    ELSIF NEW.minimum_quantity IS NOT NULL AND NEW.quantity <= NEW.minimum_quantity THEN
        NEW.status = 'low_stock';
    ELSE
        NEW.status = 'available';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_update_inventory_status ON catering_inventory;
CREATE TRIGGER trigger_auto_update_inventory_status
    BEFORE INSERT OR UPDATE ON catering_inventory
    FOR EACH ROW
    EXECUTE FUNCTION auto_update_inventory_status();

-- Trigger: Update catering total_deliveries on new delivery
CREATE OR REPLACE FUNCTION update_catering_total_deliveries()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'delivered' THEN
        UPDATE caterings
        SET total_deliveries = total_deliveries + 1
        WHERE id = NEW.catering_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status != 'delivered' AND NEW.status = 'delivered' THEN
        UPDATE caterings
        SET total_deliveries = total_deliveries + 1
        WHERE id = NEW.catering_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_catering_total_deliveries ON deliveries;
CREATE TRIGGER trigger_update_catering_total_deliveries
    AFTER INSERT OR UPDATE ON deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_catering_total_deliveries();

-- ============================================
-- 11. GRANT PERMISSIONS (if using RLS)
-- ============================================

-- Enable RLS on sensitive tables
ALTER TABLE catering_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE catering_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE catering_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies (examples)
-- Caterings can only view their own profile
CREATE POLICY catering_profiles_select_own ON catering_profiles
    FOR SELECT
    USING (catering_id IN (
        SELECT id FROM caterings WHERE user_id = current_setting('app.current_user_id', true)::INTEGER
    ));

-- Caterings can only view their own inventory
CREATE POLICY catering_inventory_select_own ON catering_inventory
    FOR SELECT
    USING (catering_id IN (
        SELECT id FROM caterings WHERE user_id = current_setting('app.current_user_id', true)::INTEGER
    ));

-- ============================================
-- END MIGRATION
-- ============================================
