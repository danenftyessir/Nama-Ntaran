-- ============================================================================
-- MIGRATION 011: Add Profile Photo Columns
-- ============================================================================
-- Created: 2025-11-24
-- Purpose: Add logo_url and avatar_url columns for profile photos
-- Dependencies: schools, caterings, users tables must exist
-- ============================================================================

-- 1. Add logo_url to SCHOOLS table
ALTER TABLE schools
ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN schools.logo_url IS 'URL to school logo/profile photo stored in Supabase Storage (mbg/schools/logos/)';

-- 2. Add logo_url to CATERINGS table
ALTER TABLE caterings
ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN caterings.logo_url IS 'URL to catering company logo stored in Supabase Storage (mbg/caterings/logos/)';

-- 3. Add avatar_url and full_name to USERS table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

COMMENT ON COLUMN users.avatar_url IS 'URL to user avatar/profile photo stored in Supabase Storage (mbg/users/avatars/)';
COMMENT ON COLUMN users.full_name IS 'Full name of the user';

-- 4. Create indexes for better query performance (only on non-null values)
CREATE INDEX IF NOT EXISTS idx_schools_logo
ON schools(logo_url)
WHERE logo_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_caterings_logo
ON caterings(logo_url)
WHERE logo_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_avatar
ON users(avatar_url)
WHERE avatar_url IS NOT NULL;

-- 5. Create index on full_name for search
CREATE INDEX IF NOT EXISTS idx_users_full_name
ON users(full_name)
WHERE full_name IS NOT NULL;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify columns were added
DO $$
BEGIN
  RAISE NOTICE 'Verifying profile photo columns...';

  -- Check schools.logo_url
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schools' AND column_name = 'logo_url'
  ) THEN
    RAISE NOTICE '✓ schools.logo_url column added';
  ELSE
    RAISE WARNING '✗ schools.logo_url column NOT added';
  END IF;

  -- Check caterings.logo_url
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'caterings' AND column_name = 'logo_url'
  ) THEN
    RAISE NOTICE '✓ caterings.logo_url column added';
  ELSE
    RAISE WARNING '✗ caterings.logo_url column NOT added';
  END IF;

  -- Check users.avatar_url
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'avatar_url'
  ) THEN
    RAISE NOTICE '✓ users.avatar_url column added';
  ELSE
    RAISE WARNING '✗ users.avatar_url column NOT added';
  END IF;

  -- Check users.full_name
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'full_name'
  ) THEN
    RAISE NOTICE '✓ users.full_name column added';
  ELSE
    RAISE WARNING '✗ users.full_name column NOT added';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Migration 011 completed successfully!';
  RAISE NOTICE '================================================';
END $$;

-- Display summary
SELECT
  'Profile Photo Columns Summary' as info,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'logo_url') as schools_logo,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'caterings' AND column_name = 'logo_url') as caterings_logo,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'avatar_url') as users_avatar,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'full_name') as users_fullname;
