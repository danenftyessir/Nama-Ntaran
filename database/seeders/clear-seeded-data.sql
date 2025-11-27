-- ============================================
-- CLEAR SEEDED DATA
-- ============================================
-- WARNING: This script will DELETE all seeded data!
-- Only use in DEVELOPMENT environment!
--
-- Purpose: Clear all data created by seeding scripts 41, 42, 43
-- Usage: Upload to Supabase SQL Editor and run
-- ============================================

-- Display warning
DO $$
BEGIN
    RAISE NOTICE '⚠️  WARNING: This will DELETE all seeded data!';
    RAISE NOTICE 'Tables affected: allocations, payments, payment_events, public_payment_feed, vendor_risk_assessments, payment_methods, menu_items, admin users';
    RAISE NOTICE 'Press Continue to proceed...';
END $$;

-- ============================================
-- STEP 1: Delete Payment & Allocation Related Data
-- ============================================

-- Delete public payment feed
DELETE FROM public_payment_feed
WHERE created_at >= '2025-11-01';

-- Delete payment events
DELETE FROM payment_events
WHERE created_at >= '2025-11-01';

-- Delete payments
DELETE FROM payments
WHERE created_at >= '2025-11-01';

-- Remove allocation_id reference from deliveries
UPDATE deliveries
SET allocation_id = NULL
WHERE allocation_id IS NOT NULL;

-- Delete allocations
DELETE FROM allocations
WHERE created_at >= '2025-11-01';

-- ============================================
-- STEP 2: Delete Catering Related Data
-- ============================================

-- Delete catering notifications
DELETE FROM catering_notifications
WHERE created_at >= '2025-11-01';

-- Delete catering feedback
DELETE FROM catering_feedback
WHERE created_at >= '2025-11-01';

-- Delete catering inventory
DELETE FROM catering_inventory
WHERE created_at >= '2025-11-01';

-- Delete catering performance metrics
DELETE FROM catering_performance_metrics
WHERE created_at >= '2025-11-01';

-- Delete catering delivery schedules
DELETE FROM catering_delivery_schedules
WHERE created_at >= '2025-11-01';

-- Delete catering profiles
DELETE FROM catering_profiles
WHERE created_at >= '2025-11-01';

-- Update caterings to remove risk assessment reference
UPDATE caterings
SET latest_risk_assessment_id = NULL,
    risk_level = NULL
WHERE latest_risk_assessment_id IS NOT NULL;

-- Delete vendor risk assessments
DELETE FROM vendor_risk_assessments
WHERE created_at >= '2025-11-01';

-- Delete payment methods
DELETE FROM payment_methods
WHERE created_at >= '2025-11-01';

-- Note: We keep menu_items as they might be used by other parts of the system
-- If you want to delete menu_items, uncomment the line below:
-- DELETE FROM menu_items WHERE created_at >= '2025-11-01';

-- ============================================
-- STEP 3: Delete Admin Related Data
-- ============================================

-- Delete admin notifications
DELETE FROM government_notifications
WHERE created_at >= '2025-11-01';

-- Delete admin activity log
DELETE FROM admin_activity_log
WHERE created_at >= '2025-11-01';

-- Delete admin profiles
DELETE FROM admin_profiles
WHERE created_at >= '2025-11-01';

-- Delete admin and government users
-- This will cascade to related admin_profiles
DELETE FROM users
WHERE role IN ('admin', 'government')
AND created_at >= '2025-11-01';

-- ============================================
-- STEP 4: Verify Deletion
-- ============================================

-- Display counts
SELECT 'Remaining Data After Cleanup' as status;

SELECT
    'users (admin)' as table_name,
    COUNT(*) as count
FROM users
WHERE role = 'admin'

UNION ALL

SELECT
    'users (government)',
    COUNT(*)
FROM users
WHERE role = 'government'

UNION ALL

SELECT
    'allocations',
    COUNT(*)
FROM allocations

UNION ALL

SELECT
    'payments',
    COUNT(*)
FROM payments

UNION ALL

SELECT
    'payment_events',
    COUNT(*)
FROM payment_events

UNION ALL

SELECT
    'public_payment_feed',
    COUNT(*)
FROM public_payment_feed

UNION ALL

SELECT
    'vendor_risk_assessments',
    COUNT(*)
FROM vendor_risk_assessments

UNION ALL

SELECT
    'payment_methods',
    COUNT(*)
FROM payment_methods

UNION ALL

SELECT
    'catering_profiles',
    COUNT(*)
FROM catering_profiles

UNION ALL

SELECT
    'admin_profiles',
    COUNT(*)
FROM admin_profiles

ORDER BY table_name;

-- ============================================
-- OPTIONAL: Reset Sequences
-- ============================================
-- Uncomment if you want to reset auto-increment IDs

-- ALTER SEQUENCE allocations_id_seq RESTART WITH 1;
-- ALTER SEQUENCE payments_id_seq RESTART WITH 1;
-- ALTER SEQUENCE payment_events_id_seq RESTART WITH 1;
-- ALTER SEQUENCE public_payment_feed_id_seq RESTART WITH 1;
-- ALTER SEQUENCE vendor_risk_assessments_id_seq RESTART WITH 1;
-- ALTER SEQUENCE payment_methods_id_seq RESTART WITH 1;
-- ALTER SEQUENCE admin_profiles_id_seq RESTART WITH 1;

-- ============================================
-- END SCRIPT
-- ============================================

SELECT '✅ Cleanup completed!' as status;
