-- Migration: Add photo_url column to issues table
-- Description: Allows storing uploaded photo evidence for issue reports

ALTER TABLE issues
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add comment
COMMENT ON COLUMN issues.photo_url IS 'URL of the uploaded photo evidence from Supabase Storage';
