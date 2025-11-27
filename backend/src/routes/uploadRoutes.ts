/**
 * ============================================================================
 * UPLOAD ROUTES - File Upload via Backend (Bypass RLS)
 * ============================================================================
 *
 * Handles file uploads to Supabase Storage using service role key.
 * This bypasses RLS policies, so frontend doesn't need storage permissions.
 *
 * Endpoints:
 * - POST /api/upload/school-logo - Upload school logo/profile photo
 * - POST /api/upload/catering-logo - Upload catering logo
 * - POST /api/upload/user-avatar - Upload user avatar
 */

import express from 'express';
import type { Response } from 'express';
import { supabase } from '../config/supabase.js';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

/**
 * Helper function to upload file to Supabase Storage
 */
async function uploadToStorage(
  file: Express.Multer.File,
  folder: string
): Promise<{ publicUrl: string; path: string } | { error: string }> {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExt = file.originalname.split('.').pop() || 'jpg';
    const fileName = `${timestamp}-${randomString}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    console.log('[Upload] Uploading file to:', filePath);
    console.log('[Upload] File size:', file.size, 'bytes');
    console.log('[Upload] MIME type:', file.mimetype);

    // Upload to Supabase Storage (uses service role key - bypasses RLS)
    const { data, error: uploadError } = await supabase.storage
      .from('mbg')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Upload] Supabase upload error:', uploadError);
      return { error: uploadError.message };
    }

    console.log('[Upload] File uploaded successfully:', data.path);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('mbg')
      .getPublicUrl(filePath);

    if (!urlData.publicUrl) {
      console.error('[Upload] Failed to get public URL');
      return { error: 'Failed to get public URL' };
    }

    console.log('[Upload] Public URL:', urlData.publicUrl);

    return {
      publicUrl: urlData.publicUrl,
      path: filePath,
    };
  } catch (error: any) {
    console.error('[Upload] Exception:', error);
    return { error: error.message || 'Upload failed' };
  }
}

/**
 * POST /api/upload/school-logo
 * Upload school logo/profile photo
 *
 * Auth: Required (school role)
 * Body: multipart/form-data with 'file' field
 */
router.post(
  '/school-logo',
  authenticateToken,
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      // Validate user role
      if (req.user?.role !== 'school' && req.user?.role !== 'admin') {
        return res.status(403).json({
          error: 'Only school users can upload school logos'
        });
      }

      // Validate file
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      console.log('[Upload] School logo upload request from user:', req.user?.id);

      // Upload to storage
      const result = await uploadToStorage(req.file, 'schools/logos');

      if ('error' in result) {
        return res.status(500).json({
          error: 'Upload failed',
          details: result.error,
        });
      }

      // Success
      res.json({
        success: true,
        url: result.publicUrl,
        path: result.path,
        message: 'School logo uploaded successfully',
      });
    } catch (error: any) {
      console.error('[Upload] School logo error:', error);
      res.status(500).json({
        error: 'Upload failed',
        details: error.message || 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/upload/catering-logo
 * Upload catering company logo
 *
 * Auth: Required (catering role)
 * Body: multipart/form-data with 'file' field
 */
router.post(
  '/catering-logo',
  authenticateToken,
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      // Validate user role
      if (req.user?.role !== 'catering' && req.user?.role !== 'admin') {
        return res.status(403).json({
          error: 'Only catering users can upload catering logos',
        });
      }

      // Validate file
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      console.log('[Upload] Catering logo upload request from user:', req.user?.id);

      // Upload to storage
      const result = await uploadToStorage(req.file, 'caterings/logos');

      if ('error' in result) {
        return res.status(500).json({
          error: 'Upload failed',
          details: result.error,
        });
      }

      // Success
      res.json({
        success: true,
        url: result.publicUrl,
        path: result.path,
        message: 'Catering logo uploaded successfully',
      });
    } catch (error: any) {
      console.error('[Upload] Catering logo error:', error);
      res.status(500).json({
        error: 'Upload failed',
        details: error.message || 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/upload/user-avatar
 * Upload user avatar/profile photo
 *
 * Auth: Required (any authenticated user)
 * Body: multipart/form-data with 'file' field
 */
router.post(
  '/user-avatar',
  authenticateToken,
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      // Validate file
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      console.log('[Upload] User avatar upload request from user:', req.user?.id);

      // Upload to storage
      const result = await uploadToStorage(req.file, 'users/avatars');

      if ('error' in result) {
        return res.status(500).json({
          error: 'Upload failed',
          details: result.error,
        });
      }

      // Success
      res.json({
        success: true,
        url: result.publicUrl,
        path: result.path,
        message: 'User avatar uploaded successfully',
      });
    } catch (error: any) {
      console.error('[Upload] User avatar error:', error);
      res.status(500).json({
        error: 'Upload failed',
        details: error.message || 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/upload/generic
 * Generic upload endpoint for any authenticated user
 *
 * Auth: Required
 * Body: multipart/form-data with 'file' field and 'folder' field
 */
router.post(
  '/generic',
  authenticateToken,
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      // Validate file
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Get folder from request body
      const folder = req.body.folder || 'uploads';

      console.log('[Upload] Generic upload request from user:', req.user?.id);
      console.log('[Upload] Target folder:', folder);

      // Upload to storage
      const result = await uploadToStorage(req.file, folder);

      if ('error' in result) {
        return res.status(500).json({
          error: 'Upload failed',
          details: result.error,
        });
      }

      // Success
      res.json({
        success: true,
        url: result.publicUrl,
        path: result.path,
        message: 'File uploaded successfully',
      });
    } catch (error: any) {
      console.error('[Upload] Generic upload error:', error);
      res.status(500).json({
        error: 'Upload failed',
        details: error.message || 'Unknown error',
      });
    }
  }
);

export default router;
