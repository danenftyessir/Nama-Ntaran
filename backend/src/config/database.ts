/**
 * ============================================================================
 * DATABASE CONFIGURATION - SUPABASE CLIENT (RECOMMENDED)
 * ============================================================================
 *
 * IMPORTANT: Semua kode baru HARUS menggunakan Supabase client!
 *
 * ✅ GUNAKAN: import { supabase } from '../config/database.js';
 * ❌ JANGAN:  import { pool } from '../config/database.js';
 *
 * Pool hanya disediakan untuk backward compatibility dan akan di-deprecate.
 * ============================================================================
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { supabase, testSupabaseConnection } from './supabase.js';

dotenv.config();

// ============================================================================
// SUPABASE CLIENT (RECOMMENDED) ✅
// ============================================================================

/**
 * @deprecated Use Supabase client for all new code
 * Export Supabase client sebagai primary database interface
 */
export { supabase };

// ============================================================================
// LEGACY PG POOL (DEPRECATED) ⚠️
// ============================================================================

/**
 * @deprecated Legacy PostgreSQL pool - akan dihapus di versi future
 * Hanya untuk backward compatibility dengan kode lama
 */
export const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Test connection untuk pool (legacy)
pool.on('connect', () => {
  console.log('⚠️  Connected to PostgreSQL via legacy pool (deprecated)');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

// ============================================================================
// INITIALIZATION & HEALTH CHECK
// ============================================================================

// Test Supabase connection on startup
testSupabaseConnection().then((success) => {
  if (success) {
    console.log('✅ Database ready: Using Supabase client');
  } else {
    console.warn('⚠️  Supabase connection test failed, falling back to legacy pool');
  }
});