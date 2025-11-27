/**
 * ============================================================================
 * SUPABASE STORAGE UTILITIES
 * ============================================================================
 *
 * Functions for uploading and managing files in Supabase Storage
 */

import { supabase } from './supabase-auth';

const SUPABASE_BUCKET = 'mbg';

/**
 * Upload an image file to Supabase Storage via Backend API
 *
 * Uses backend endpoint which has service role key (bypasses RLS)
 *
 * @param file - The file to upload
 * @param folder - Optional folder path in the bucket (e.g., 'avatars', 'schools/logos')
 * @returns Object with publicUrl or error
 */
export async function uploadImage(
  file: File,
  folder: string = 'uploads'
): Promise<{ publicUrl: string | null; error: Error | null }> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return {
        publicUrl: null,
        error: new Error('Hanya file gambar yang diizinkan'),
      };
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return {
        publicUrl: null,
        error: new Error('Ukuran file maksimal 5MB'),
      };
    }

    console.log('[Storage] Uploading via backend API, folder:', folder);

    // Determine endpoint based on folder
    let endpoint = '/api/upload/generic';
    if (folder === 'schools/logos') {
      endpoint = '/api/upload/school-logo';
    } else if (folder === 'caterings/logos') {
      endpoint = '/api/upload/catering-logo';
    } else if (folder === 'users/avatars') {
      endpoint = '/api/upload/user-avatar';
    }

    // Get auth token from localStorage (from old auth system)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    if (endpoint === '/api/upload/generic') {
      formData.append('folder', folder);
    }

    // Upload via backend API
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${apiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
      console.error('[Storage] Backend upload error:', errorData);
      return {
        publicUrl: null,
        error: new Error(errorData.error || errorData.details || 'Upload gagal'),
      };
    }

    const result = await response.json();
    console.log('[Storage] Upload successful:', result.url);

    return {
      publicUrl: result.url,
      error: null,
    };
  } catch (error: any) {
    console.error('[Storage] Upload exception:', error);
    return {
      publicUrl: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Delete a file from Supabase Storage
 *
 * @param filePath - Full path to the file in the bucket
 * @returns Error if failed, null if successful
 */
export async function deleteImage(filePath: string): Promise<Error | null> {
  try {
    // Extract path from URL if full URL is provided
    let path = filePath;
    if (filePath.includes(SUPABASE_BUCKET)) {
      const urlParts = filePath.split(`${SUPABASE_BUCKET}/`);
      path = urlParts[1] || filePath;
    }

    console.log('[Storage] Deleting file:', path);

    const { error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .remove([path]);

    if (error) {
      console.error('[Storage] Delete error:', error);
      return new Error(`Hapus gagal: ${error.message}`);
    }

    console.log('[Storage] File deleted successfully');
    return null;
  } catch (error: any) {
    console.error('[Storage] Delete exception:', error);
    return error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Get public URL for a file
 *
 * @param filePath - Path to the file in the bucket
 * @returns Public URL
 */
export function getPublicUrl(filePath: string): string {
  const { data } = supabase.storage
    .from(SUPABASE_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * List files in a folder
 *
 * @param folder - Folder path in the bucket
 * @returns Array of file objects
 */
export async function listFiles(folder: string = '') {
  try {
    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .list(folder, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('[Storage] List files error:', error);
      return { files: [], error };
    }

    return { files: data, error: null };
  } catch (error: any) {
    console.error('[Storage] List files exception:', error);
    return { files: [], error };
  }
}
