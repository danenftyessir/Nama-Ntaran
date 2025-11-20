/**
 * ============================================================================
 * GEOCODE ALL SCHOOLS - FINAL VERSION WITH NORMALIZED NAMES
 * ============================================================================
 *
 * Key Fix: Normalize province names (D.K.I. Jakarta → Jakarta)
 * Strategy: City + Province → Province only → Skip
 *
 * Run: npm run geocode:all
 *
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// CONFIGURATION
// ============================================================================

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '500', 10);
const NOMINATIM_CONFIG = {
  BASE_URL: 'https://nominatim.openstreetmap.org',
  USER_AGENT: 'NutriTrack-MBG-Geocoder/1.0',
  RATE_LIMIT_MS: 1100,
  TIMEOUT_MS: 10000,
};

// ============================================================================
// PROVINCE NAME NORMALIZATION
// ============================================================================

const PROVINCE_NORMALIZATION: { [key: string]: string } = {
  'D.K.I. Jakarta': 'Jakarta',
  'D.I. Yogyakarta': 'Yogyakarta',
  'Daerah Istimewa Yogyakarta': 'Yogyakarta',
  'DKI Jakarta': 'Jakarta',
  'DIY Yogyakarta': 'Yogyakarta',
  'Bangka Belitung': 'Bangka-Belitung',
  'Kepulauan Bangka Belitung': 'Bangka-Belitung',
  'Kep. Bangka Belitung': 'Bangka-Belitung',
  'Kepulauan Riau': 'Riau',
  'Kep. Riau': 'Riau',
  'Papua Barat': 'West Papua',
  'Papua Barat Daya': 'Southwest Papua',
  'Papua Tengah': 'Central Papua',
  'Papua Pegunungan': 'Highland Papua',
  'Papua Selatan': 'South Papua',
};

function normalizeProvinceName(province: string): string {
  // Check exact match first
  if (PROVINCE_NORMALIZATION[province]) {
    return PROVINCE_NORMALIZATION[province];
  }

  // Remove common prefixes
  let normalized = province
    .replace(/^D\.K\.I\.\s*/i, '')
    .replace(/^D\.I\.\s*/i, '')
    .replace(/^Daerah\s+Istimewa\s+/i, '')
    .replace(/^Prov\.?\s*/i, '')
    .replace(/^Provinsi\s+/i, '')
    .replace(/^Kab\.?\s*/i, '')
    .replace(/^Kabupaten\s+/i, '')
    .replace(/^Kota\s+/i, '')
    .replace(/^Kepulauan\s+/i, '')
    .replace(/^Kep\.?\s+/i, '');

  return normalized.trim();
}

// ============================================================================
// TYPES
// ============================================================================

interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
  confidence: string;
}

interface GeocodingError {
  success: false;
  error: string;
}

interface SchoolGeocodingData {
  id: number;
  name: string;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  district?: string | null;
}

// ============================================================================
// RATE LIMITING
// ============================================================================

let lastRequestTime = 0;

async function rateLimitedRequest<T>(requestFn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < NOMINATIM_CONFIG.RATE_LIMIT_MS) {
    const waitTime = NOMINATIM_CONFIG.RATE_LIMIT_MS - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
  return requestFn();
}

// ============================================================================
// SMART GEOCODING
// ============================================================================

async function tryGeocode(query: string): Promise<any[]> {
  try {
    const result = await rateLimitedRequest(async () => {
      const response = await axios.get(`${NOMINATIM_CONFIG.BASE_URL}/search`, {
        params: {
          q: query,
          format: 'json',
          limit: 1,
          countrycodes: 'id',
        },
        headers: {
          'User-Agent': NOMINATIM_CONFIG.USER_AGENT,
        },
        timeout: NOMINATIM_CONFIG.TIMEOUT_MS,
      });
      return response.data;
    });
    return result || [];
  } catch (error: any) {
    return [];
  }
}

async function geocodeSchoolSmart(
  school: SchoolGeocodingData
): Promise<GeocodingResult | GeocodingError> {
  const city = school.city || '';
  const province = normalizeProvinceName(school.province || '');

  // STRATEGY 1: City + Province
  if (city && province) {
    const query1 = `${city}, ${province}, Indonesia`;
    const result1 = await tryGeocode(query1);

    if (result1 && result1.length > 0) {
      const location = result1[0];
      return {
        latitude: parseFloat(location.lat),
        longitude: parseFloat(location.lon),
        displayName: location.display_name,
        confidence: 'high',
      };
    }
  }

  // STRATEGY 2: Province only
  if (province) {
    const query2 = `${province}, Indonesia`;
    const result2 = await tryGeocode(query2);

    if (result2 && result2.length > 0) {
      const location = result2[0];
      return {
        latitude: parseFloat(location.lat),
        longitude: parseFloat(location.lon),
        displayName: location.display_name,
        confidence: 'medium',
      };
    }
  }

  return {
    success: false,
    error: 'No geocoding results found',
  };
}

// ============================================================================
// PROGRESS TRACKING
// ============================================================================

let globalStartTime = Date.now();
let globalProcessed = 0;
let globalTotal = 0;

function showProgress(
  batchCurrent: number,
  batchTotal: number,
  globalCurrent: number,
  globalTotal: number,
  successful: number,
  failed: number,
  message: string
) {
  const percentage = (globalCurrent / globalTotal) * 100;
  const barLength = 40;
  const filledLength = Math.floor((barLength * globalCurrent) / globalTotal);
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

  const elapsed = (Date.now() - globalStartTime) / 1000;
  const rate = globalCurrent / elapsed;
  const remaining = (globalTotal - globalCurrent) / rate;
  const etaMinutes = Math.ceil(remaining / 60);

  process.stdout.write(
    `\r[${bar}] ${percentage.toFixed(1)}% | ` +
    `${globalCurrent}/${globalTotal} | ` +
    `✅${successful} ❌${failed} | ` +
    `ETA: ${etaMinutes}m | ${message}`.padEnd(130)
  );

  if (globalCurrent === globalTotal) process.stdout.write('\n');
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

async function processBatch(offset: number, limit: number): Promise<{
  processed: number;
  successful: number;
  failed: number;
  highConfidence: number;
  mediumConfidence: number;
}> {
  const { data: schools, error: fetchError } = await supabase
    .from('schools')
    .select('id, name, address, city, province, district')
    .is('latitude', null)
    .is('longitude', null)
    .range(offset, offset + limit - 1);

  if (fetchError) {
    throw new Error(`Failed to fetch schools: ${fetchError.message}`);
  }

  if (!schools || schools.length === 0) {
    return { processed: 0, successful: 0, failed: 0, highConfidence: 0, mediumConfidence: 0 };
  }

  let successful = 0;
  let failed = 0;
  let highConfidence = 0;
  let mediumConfidence = 0;

  for (let i = 0; i < schools.length; i++) {
    const school = schools[i];
    globalProcessed++;

    showProgress(
      i + 1,
      schools.length,
      globalProcessed,
      globalTotal,
      successful,
      failed,
      `${school.name.substring(0, 30)}...`
    );

    const result = await geocodeSchoolSmart(school);

    if ('success' in result && !result.success) {
      failed++;
      continue;
    }

    const geocodingResult = result as GeocodingResult;
    const lat = geocodingResult.latitude;
    const lon = geocodingResult.longitude;

    if (isNaN(lat) || isNaN(lon) || lat < -11 || lat > 6 || lon < 95 || lon > 141) {
      failed++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('schools')
      .update({
        latitude: lat,
        longitude: lon,
        updated_at: new Date().toISOString(),
      })
      .eq('id', school.id);

    if (updateError) {
      failed++;
    } else {
      successful++;
      if (geocodingResult.confidence === 'high') highConfidence++;
      if (geocodingResult.confidence === 'medium') mediumConfidence++;
    }
  }

  return {
    processed: schools.length,
    successful,
    failed,
    highConfidence,
    mediumConfidence,
  };
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function geocodeAllSchools() {
  console.log('');
  console.log('='.repeat(80));
  console.log('🗺️  GEOCODING ALL SCHOOLS - FINAL VERSION');
  console.log('='.repeat(80));
  console.log('');

  const { count: totalCount } = await supabase
    .from('schools')
    .select('id', { count: 'exact', head: true })
    .is('latitude', null)
    .is('longitude', null);

  if (!totalCount || totalCount === 0) {
    console.log('✅ All schools already geocoded!');
    return;
  }

  globalTotal = totalCount;
  console.log(`📊 Total schools: ${globalTotal}`);
  console.log(`📦 Batch size: ${BATCH_SIZE}`);
  console.log(`⏱️  Estimated: ${Math.ceil((globalTotal * 1.2) / 60)} minutes`);
  console.log('');
  console.log('📍 Strategy:');
  console.log('   1. City + Province (normalized)');
  console.log('   2. Province only');
  console.log('   3. Skip if both fail');
  console.log('');
  console.log('='.repeat(80));
  console.log('');

  let offset = 0;
  let totalSuccessful = 0;
  let totalFailed = 0;
  let totalHighConfidence = 0;
  let totalMediumConfidence = 0;
  let batchNumber = 1;
  const totalBatches = Math.ceil(globalTotal / BATCH_SIZE);

  globalStartTime = Date.now();

  while (offset < globalTotal) {
    console.log(`\n📦 Batch ${batchNumber}/${totalBatches} (offset: ${offset})`);
    console.log('-'.repeat(80));

    const { processed, successful, failed, highConfidence, mediumConfidence } =
      await processBatch(offset, BATCH_SIZE);

    if (processed === 0) break;

    totalSuccessful += successful;
    totalFailed += failed;
    totalHighConfidence += highConfidence;
    totalMediumConfidence += mediumConfidence;

    console.log('');
    console.log(`✅ Batch ${batchNumber}: ${successful} success, ${failed} failed`);
    console.log(`   High: ${highConfidence}, Medium: ${mediumConfidence}`);

    offset += BATCH_SIZE;
    batchNumber++;

    if (offset < globalTotal) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('✅ GEOCODING COMPLETED!');
  console.log('='.repeat(80));
  console.log('');
  console.log(`📊 STATISTICS:`);
  console.log(`   Processed: ${globalProcessed}`);
  console.log(`   ✅ Success: ${totalSuccessful} (${((totalSuccessful / globalProcessed) * 100).toFixed(1)}%)`);
  console.log(`   ❌ Failed: ${totalFailed}`);
  console.log(`   📍 High confidence: ${totalHighConfidence}`);
  console.log(`   📍 Medium confidence: ${totalMediumConfidence}`);
  console.log(`   ⏱️  Time: ${((Date.now() - globalStartTime) / 60000).toFixed(1)} min`);
  console.log('');
  console.log('='.repeat(80));
}

geocodeAllSchools()
  .then(() => {
    console.log('✅ Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
