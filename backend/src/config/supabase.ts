/**
 * ============================================================================
 * SUPABASE CONFIGURATION - CENTRALIZED CLIENT
 * ============================================================================
 *
 * Single source of truth untuk Supabase client di seluruh aplikasi.
 * Semua routes dan services harus import dari file ini.
 *
 * Usage:
 *   import { supabase } from '../config/supabase.js';
 *   const { data, error } = await supabase.from('users').select('*');
 *
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ============================================================================
// TYPE DEFINITION
// ============================================================================

// Get SupabaseClient type from createClient return type
type SupabaseClient = ReturnType<typeof createClient>;

// ============================================================================
// ENVIRONMENT VARIABLES VALIDATION
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ ERROR: Missing Supabase credentials!');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

// ============================================================================
// SUPABASE CLIENT INITIALIZATION
// ============================================================================

/**
 * Main Supabase client with service role key
 * Has full access to database (bypasses RLS)
 */
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Test database connection
 */
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Supabase connection test failed:', error.message);
      return false;
    }

    console.log('✅ Supabase connection successful!');
    return true;
  } catch (error: any) {
    console.error('❌ Supabase connection test failed:', error.message);
    return false;
  }
}

/**
 * Get Supabase client info
 */
export function getSupabaseInfo() {
  return {
    url: SUPABASE_URL,
    hasServiceKey: !!SUPABASE_SERVICE_KEY,
    connected: true,
  };
}

// ============================================================================
// TYPE DEFINITIONS FOR DATABASE TABLES
// ============================================================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: number;
          email: string;
          password_hash: string;
          role: 'admin' | 'government' | 'school' | 'catering';
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      schools: {
        Row: {
          id: number;
          npsn: string;
          name: string;
          address: string | null;
          kelurahan: string | null;
          status: string | null;
          kode_kecamatan: string | null;
          province: string;
          city: string;
          district: string | null;
          jenjang: string | null;
          npsn_url: string | null;
          kecamatan_url: string | null;
          source_url: string | null;
          priority_score: number;
          latitude: number | null;
          longitude: number | null;
          contact_name: string | null;
          user_id: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['schools']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['schools']['Insert']>;
      };
      caterings: {
        Row: {
          id: number;
          name: string;
          company_name: string | null;
          wallet_address: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          rating: number;
          total_deliveries: number;
          user_id: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['caterings']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['caterings']['Insert']>;
      };
      menu_items: {
        Row: {
          id: number;
          catering_id: number;
          name: string;
          description: string | null;
          category: string;
          price: number;
          calories: number | null;
          protein: number | null;
          carbohydrates: number | null;
          fat: number | null;
          fiber: number | null;
          vitamins: string[] | null;
          minerals: string[] | null;
          allergens: string[] | null;
          image_url: string | null;
          is_available: boolean;
          is_halal: boolean;
          preparation_time: number | null;
          serving_size: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['menu_items']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['menu_items']['Insert']>;
      };
      // Add more table types as needed...
    };
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export default supabase;

console.log('📦 Supabase client initialized:', getSupabaseInfo());
