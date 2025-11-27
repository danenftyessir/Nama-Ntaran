-- ============================================
-- Migration 026: Admin & Government Enhancements
-- ============================================
-- Purpose: Menambahkan tabel dan kolom untuk mendukung fitur admin/pemerintah
-- Created: 2025-11-26
-- Author: MBG Dev Team

-- ============================================
-- 1. ADMIN PROFILES TABLE
-- ============================================
-- Tabel untuk profile lengkap admin pemerintah (Dinas Pendidikan)

CREATE TABLE IF NOT EXISTS admin_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Personal Info
    full_name VARCHAR(255) NOT NULL,
    nip VARCHAR(20), -- Nomor Induk Pegawai
    position VARCHAR(100), -- 'Kepala Dinas', 'Kabid', 'Staff', etc.

    -- Regional Assignment
    level VARCHAR(50), -- 'system', 'provinsi', 'kabupaten', 'kota'
    region_name VARCHAR(100), -- Nama provinsi/kabupaten/kota
    province VARCHAR(100),
    city VARCHAR(100),

    -- Contact Info
    phone VARCHAR(20),
    office_phone VARCHAR(20),
    office_address TEXT,

    -- Permissions & Access
    permissions JSONB, -- {canLockFunds: true, canApproveAllocations: true, etc.}
    assigned_schools INTEGER[], -- Array of school IDs yang di-assign ke admin ini

    -- Metadata
    department VARCHAR(100), -- 'Dinas Pendidikan Provinsi DKI Jakarta'
    supervisor_id INTEGER REFERENCES users(id), -- Atasan langsung

    -- Status
    is_active BOOLEAN DEFAULT true,
    start_date DATE,
    end_date DATE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    UNIQUE(user_id),
    UNIQUE(nip)
);

CREATE INDEX idx_admin_profiles_user_id ON admin_profiles(user_id);
CREATE INDEX idx_admin_profiles_level ON admin_profiles(level);
CREATE INDEX idx_admin_profiles_region ON admin_profiles(region_name);
CREATE INDEX idx_admin_profiles_nip ON admin_profiles(nip);

-- ============================================
-- 2. ADMIN ACTIVITY LOG TABLE
-- ============================================
-- Tabel untuk tracking aktivitas admin (audit trail)

CREATE TABLE IF NOT EXISTS admin_activity_log (
    id SERIAL PRIMARY KEY,

    -- Actor
    admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    admin_name VARCHAR(255),
    admin_role VARCHAR(50),

    -- Action
    action_type VARCHAR(100) NOT NULL, -- 'LOCK_FUND', 'APPROVE_ALLOCATION', 'CANCEL_DELIVERY', etc.
    action_description TEXT,

    -- Target/Affected Entity
    target_type VARCHAR(50), -- 'allocation', 'payment', 'delivery', 'school', 'catering'
    target_id INTEGER,

    -- Context
    metadata JSONB, -- Additional context data
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- Result
    status VARCHAR(20), -- 'success', 'failed', 'pending'
    error_message TEXT,

    -- Timestamps
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_activity_admin_id ON admin_activity_log(admin_id);
CREATE INDEX idx_admin_activity_action_type ON admin_activity_log(action_type);
CREATE INDEX idx_admin_activity_target ON admin_activity_log(target_type, target_id);
CREATE INDEX idx_admin_activity_performed_at ON admin_activity_log(performed_at DESC);

-- ============================================
-- 3. BUDGET PLANNING TABLE
-- ============================================
-- Tabel untuk perencanaan anggaran tahunan

CREATE TABLE IF NOT EXISTS budget_planning (
    id SERIAL PRIMARY KEY,

    -- Budget Period
    fiscal_year INTEGER NOT NULL,
    semester INTEGER CHECK (semester IN (1, 2)),
    quarter INTEGER CHECK (quarter BETWEEN 1 AND 4),

    -- Regional Assignment
    province VARCHAR(100),
    city VARCHAR(100),
    district VARCHAR(100),

    -- Budget Allocation
    total_budget DECIMAL(15,2) NOT NULL,
    allocated_amount DECIMAL(15,2) DEFAULT 0,
    disbursed_amount DECIMAL(15,2) DEFAULT 0,
    remaining_budget DECIMAL(15,2) GENERATED ALWAYS AS (total_budget - allocated_amount) STORED,

    -- Target Metrics
    target_schools INTEGER,
    target_students INTEGER,
    target_feeding_days INTEGER,
    price_per_portion DECIMAL(10,2),

    -- Status
    status VARCHAR(50) DEFAULT 'PLANNED' CHECK (status IN (
        'PLANNED', 'APPROVED', 'ACTIVE', 'DISBURSING', 'COMPLETED', 'CANCELLED'
    )),

    -- Approval
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,

    -- Metadata
    notes TEXT,
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    UNIQUE(fiscal_year, semester, province, city)
);

CREATE INDEX idx_budget_planning_fiscal_year ON budget_planning(fiscal_year DESC);
CREATE INDEX idx_budget_planning_province ON budget_planning(province);
CREATE INDEX idx_budget_planning_status ON budget_planning(status);

-- ============================================
-- 4. ALLOCATION APPROVALS TABLE
-- ============================================
-- Tabel untuk workflow approval allocations

CREATE TABLE IF NOT EXISTS allocation_approvals (
    id SERIAL PRIMARY KEY,

    -- Allocation Reference
    allocation_id INTEGER NOT NULL REFERENCES allocations(id) ON DELETE CASCADE,

    -- Approval Workflow
    approval_level INTEGER DEFAULT 1, -- 1 = Staff, 2 = Kabid, 3 = Kepala Dinas
    approver_id INTEGER REFERENCES users(id),
    approver_name VARCHAR(255),
    approver_position VARCHAR(100),

    -- Decision
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'APPROVED', 'REJECTED', 'ESCALATED'
    )),
    decision_notes TEXT,

    -- Timestamps
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    UNIQUE(allocation_id, approval_level)
);

CREATE INDEX idx_allocation_approvals_allocation_id ON allocation_approvals(allocation_id);
CREATE INDEX idx_allocation_approvals_approver_id ON allocation_approvals(approver_id);
CREATE INDEX idx_allocation_approvals_status ON allocation_approvals(status);

-- ============================================
-- 5. PERFORMANCE DASHBOARDS TABLE
-- ============================================
-- Tabel untuk menyimpan pre-computed dashboard metrics

CREATE TABLE IF NOT EXISTS performance_dashboards (
    id SERIAL PRIMARY KEY,

    -- Scope
    dashboard_type VARCHAR(50), -- 'national', 'provincial', 'city', 'district'
    region_name VARCHAR(100),
    province VARCHAR(100),
    city VARCHAR(100),

    -- Time Period
    period_type VARCHAR(20), -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Metrics (JSON for flexibility)
    metrics JSONB NOT NULL, -- {
        -- totalSchools, totalStudents, totalDeliveries,
        -- totalBudget, disbursedBudget, pendingBudget,
        -- onTimeDeliveryRate, qualityScore, issuesCount, etc.
    -- }

    -- Comparisons
    previous_period_metrics JSONB,
    growth_percentages JSONB,

    -- Status
    is_current BOOLEAN DEFAULT true,
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    UNIQUE(dashboard_type, region_name, period_start, period_end)
);

CREATE INDEX idx_performance_dashboards_type ON performance_dashboards(dashboard_type);
CREATE INDEX idx_performance_dashboards_region ON performance_dashboards(region_name);
CREATE INDEX idx_performance_dashboards_period ON performance_dashboards(period_start, period_end);
CREATE INDEX idx_performance_dashboards_current ON performance_dashboards(is_current) WHERE is_current = true;

-- ============================================
-- 6. GOVERNMENT NOTIFICATIONS TABLE
-- ============================================
-- Tabel untuk notifikasi ke admin pemerintah

CREATE TABLE IF NOT EXISTS government_notifications (
    id SERIAL PRIMARY KEY,

    -- Recipient
    recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_role VARCHAR(50),

    -- Notification Details
    notification_type VARCHAR(100) NOT NULL, -- 'BUDGET_LOW', 'QUALITY_ISSUE', 'DELIVERY_DELAYED', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),

    -- Related Entity
    related_type VARCHAR(50), -- 'allocation', 'payment', 'delivery', 'catering', 'school'
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

CREATE INDEX idx_government_notifications_recipient ON government_notifications(recipient_id);
CREATE INDEX idx_government_notifications_type ON government_notifications(notification_type);
CREATE INDEX idx_government_notifications_unread ON government_notifications(recipient_id, is_read) WHERE is_read = false;
CREATE INDEX idx_government_notifications_severity ON government_notifications(severity);
CREATE INDEX idx_government_notifications_created_at ON government_notifications(created_at DESC);

-- ============================================
-- 7. ALTER EXISTING TABLES
-- ============================================

-- Add approved_by to allocations if not exists
ALTER TABLE allocations
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- Add notes to allocations
ALTER TABLE allocations
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add cancelled_by to allocations
ALTER TABLE allocations
ADD COLUMN IF NOT EXISTS cancelled_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add budget_id reference to allocations
ALTER TABLE allocations
ADD COLUMN IF NOT EXISTS budget_id INTEGER REFERENCES budget_planning(id);

-- Add latest_risk_assessment_id to caterings if not exists
ALTER TABLE caterings
ADD COLUMN IF NOT EXISTS latest_risk_assessment_id INTEGER REFERENCES vendor_risk_assessments(id);

-- ============================================
-- 8. CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_allocations_created_by ON allocations(created_by);
CREATE INDEX IF NOT EXISTS idx_allocations_approved_by ON allocations(approved_by);
CREATE INDEX IF NOT EXISTS idx_allocations_budget_id ON allocations(budget_id);

-- ============================================
-- 9. CREATE VIEWS FOR ADMIN DASHBOARDS
-- ============================================

-- View: Daily Summary
CREATE OR REPLACE VIEW admin_daily_summary AS
SELECT
    DATE(a.created_at) as report_date,
    COUNT(DISTINCT a.id) as total_allocations,
    COUNT(DISTINCT CASE WHEN a.status = 'LOCKED' THEN a.id END) as locked_allocations,
    COUNT(DISTINCT CASE WHEN a.status = 'RELEASED' THEN a.id END) as released_allocations,
    SUM(a.amount) as total_amount,
    SUM(CASE WHEN a.status = 'LOCKED' THEN a.amount ELSE 0 END) as locked_amount,
    SUM(CASE WHEN a.status = 'RELEASED' THEN a.amount ELSE 0 END) as released_amount,
    COUNT(DISTINCT d.id) as total_deliveries,
    COUNT(DISTINCT CASE WHEN d.status = 'delivered' THEN d.id END) as completed_deliveries,
    COUNT(DISTINCT i.id) as total_issues
FROM allocations a
LEFT JOIN deliveries d ON a.id = d.allocation_id
LEFT JOIN issues i ON d.id = i.delivery_id
GROUP BY DATE(a.created_at)
ORDER BY DATE(a.created_at) DESC;

-- View: Regional Summary
CREATE OR REPLACE VIEW admin_regional_summary AS
SELECT
    s.province,
    s.city,
    COUNT(DISTINCT s.id) as total_schools,
    COUNT(DISTINCT a.id) as total_allocations,
    SUM(a.amount) as total_budget_allocated,
    SUM(CASE WHEN a.status = 'RELEASED' THEN a.amount ELSE 0 END) as total_disbursed,
    COUNT(DISTINCT d.id) as total_deliveries,
    COUNT(DISTINCT i.id) as total_issues,
    AVG(s.priority_score) as avg_priority_score
FROM schools s
LEFT JOIN allocations a ON s.id = a.school_id
LEFT JOIN deliveries d ON s.id = d.school_id
LEFT JOIN issues i ON d.id = i.delivery_id
GROUP BY s.province, s.city
ORDER BY total_budget_allocated DESC NULLS LAST;

-- View: Catering Performance
CREATE OR REPLACE VIEW admin_catering_performance AS
SELECT
    c.id as catering_id,
    c.name as catering_name,
    c.rating,
    c.total_deliveries,
    vra.risk_level,
    vra.risk_score,
    vra.late_delivery_rate,
    vra.quality_issue_rate,
    vra.compliance_rate,
    vra.avg_quality_score,
    COUNT(DISTINCT a.id) as total_allocations,
    SUM(a.amount) as total_amount_allocated,
    SUM(CASE WHEN a.status = 'RELEASED' THEN a.amount ELSE 0 END) as total_amount_received
FROM caterings c
LEFT JOIN vendor_risk_assessments vra ON c.id = vra.catering_id AND vra.id = c.latest_risk_assessment_id
LEFT JOIN allocations a ON c.id = a.catering_id
GROUP BY c.id, c.name, c.rating, c.total_deliveries, vra.risk_level, vra.risk_score,
         vra.late_delivery_rate, vra.quality_issue_rate, vra.compliance_rate, vra.avg_quality_score
ORDER BY vra.risk_score DESC NULLS LAST;

-- ============================================
-- 10. CREATE TRIGGERS
-- ============================================

-- Trigger: Update allocations updated_at
CREATE OR REPLACE FUNCTION update_allocations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_allocations_timestamp ON allocations;
CREATE TRIGGER trigger_update_allocations_timestamp
    BEFORE UPDATE ON allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_allocations_timestamp();

-- Trigger: Update admin_profiles updated_at
CREATE OR REPLACE FUNCTION update_admin_profiles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_admin_profiles_timestamp ON admin_profiles;
CREATE TRIGGER trigger_update_admin_profiles_timestamp
    BEFORE UPDATE ON admin_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_profiles_timestamp();

-- Trigger: Update budget_planning updated_at
CREATE OR REPLACE FUNCTION update_budget_planning_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_budget_planning_timestamp ON budget_planning;
CREATE TRIGGER trigger_update_budget_planning_timestamp
    BEFORE UPDATE ON budget_planning
    FOR EACH ROW
    EXECUTE FUNCTION update_budget_planning_timestamp();

-- ============================================
-- 11. GRANT PERMISSIONS (if using RLS)
-- ============================================

-- Enable RLS on sensitive tables
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_planning ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocation_approvals ENABLE ROW LEVEL SECURITY;

-- Create policies (examples)
-- Admins can view their own profile
CREATE POLICY admin_profiles_select_own ON admin_profiles
    FOR SELECT
    USING (user_id = current_setting('app.current_user_id', true)::INTEGER);

-- Admins can view their own activity log
CREATE POLICY admin_activity_log_select_own ON admin_activity_log
    FOR SELECT
    USING (admin_id = current_setting('app.current_user_id', true)::INTEGER);

-- ============================================
-- END MIGRATION
-- ============================================
