-- ============================================
-- Migration 028: Fix User Roles
-- ============================================
-- Purpose: Menambahkan role 'government' ke users table
-- Created: 2025-11-27

-- Drop existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new constraint with 'government' role
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin', 'government', 'school', 'catering'));

-- Verify constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'users'::regclass AND conname = 'users_role_check';

-- ============================================
-- END MIGRATION
-- ============================================
