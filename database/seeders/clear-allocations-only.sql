-- ============================================
-- CLEAR ALLOCATIONS AND RELATED DATA ONLY
-- ============================================
-- WARNING: This script will DELETE allocations and related payment data!
-- Only use in DEVELOPMENT environment!
--
-- Purpose: Clear only allocations-related data (script 42)
-- Keeps: admin users, catering data, menu items, schools, deliveries
-- Usage: Upload to Supabase SQL Editor and run
-- ============================================

-- Display warning
DO $$
BEGIN
    RAISE NOTICE '⚠️  WARNING: Deleting allocations and payment-related data only';
    RAISE NOTICE 'Tables affected: allocations, payments, payment_events, public_payment_feed';
    RAISE NOTICE 'Tables preserved: users, schools, caterings, deliveries, menu_items';
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
-- STEP 2: Verify Deletion
-- ============================================

-- Display counts
SELECT 'Remaining Data After Cleanup' as status;

SELECT
    'allocations' as table_name,
    COUNT(*) as count
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
    'deliveries (with allocation_id)',
    COUNT(*)
FROM deliveries
WHERE allocation_id IS NOT NULL

ORDER BY table_name;

-- ============================================
-- OPTIONAL: Reset Sequences
-- ============================================
-- Uncomment if you want to reset auto-increment IDs

-- ALTER SEQUENCE allocations_id_seq RESTART WITH 1;
-- ALTER SEQUENCE payments_id_seq RESTART WITH 1;
-- ALTER SEQUENCE payment_events_id_seq RESTART WITH 1;
-- ALTER SEQUENCE public_payment_feed_id_seq RESTART WITH 1;

-- ============================================
-- END SCRIPT
-- ============================================

SELECT '✅ Allocations cleanup completed!' as status;
SELECT '📌 Note: Admin users, caterings, schools, and deliveries are preserved' as info;
