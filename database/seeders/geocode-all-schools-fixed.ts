/**
 * ============================================================================
 * GEOCODE ALL SCHOOLS - FIXED WITH SMART FALLBACK STRATEGY
 * ============================================================================
 *
 * Strategy:
 * 1. Try: City + Province (most accurate for Indonesian schools)
 * 2. Fallback: Province center (if city fails)
 * 3. Skip: If province also fails
 *
 * Run: npm run geocode:all:fixed
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
  RATE_LIMIT_MS: 1100, // 1.1 seconds to be safe
  TIMEOUT_MS: 10000,
};

// ============================================================================
// TYPES
// ============================================================================

interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
  confidence: string; // 'high', 'medium', 'low'
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
// SMART GEOCODING WITH FALLBACK
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
          addressdetails: 1,
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
    console.error(`  ⚠️  Geocode error: ${error.message}`);
    return [];
  }
}

async function geocodeSchoolSmart(
  school: SchoolGeocodingData
): Promise<GeocodingResult | GeocodingError> {
  const city = school.city || '';
  const province = school.province || '';

  // STRATEGY 1: City + Province (most accurate)
  if (city && province) {
    const query1 = `${city}, ${province}, Indonesia`;
    const result1 = await tryGeocode(query1);

    if (result1 && result1.length > 0) {
      const location = result1[0];
      return {
        latitude: parseFloat(location.lat),
        longitude: parseFloat(location.lon),
        displayName: location.display_name,
        confidence: 'high', // City-level accuracy
      };
    }
  }

  // STRATEGY 2: Province only (fallback to province center)
  if (province) {
    const query2 = `${province}, Indonesia`;
    const result2 = await tryGeocode(query2);

    if (result2 && result2.length > 0) {
      const location = result2[0];
      return {
        latitude: parseFloat(location.lat),
        longitude: parseFloat(location.lon),
        displayName: location.display_name,
        confidence: 'medium', // Province-level accuracy
      };
    }
  }

  // STRATEGY 3: Failed - no coordinates found
  return {
    success: false,
    error: 'No geocoding results found for city or province',
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

  // Calculate ETA
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
  // Fetch schools
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

  // Geocode and update each school
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

    // Validate coordinates are in Indonesia bounds
    const lat = geocodingResult.latitude;
    const lon = geocodingResult.longitude;

    if (isNaN(lat) || isNaN(lon) || lat < -11 || lat > 6 || lon < 95 || lon > 141) {
      failed++;
      continue;
    }

    // Update database
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
  console.log('🗺️  GEOCODING ALL SCHOOLS - SMART FALLBACK STRATEGY');
  console.log('='.repeat(80));
  console.log('');

  // Get total count
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
  console.log(`📊 Total schools to geocode: ${globalTotal}`);
  console.log(`📦 Batch size: ${BATCH_SIZE}`);
  console.log(`⏱️  Estimated time: ${Math.ceil((globalTotal * 1.2) / 60)} minutes (~${Math.ceil((globalTotal * 1.2) / 3600)} hours)`);
  console.log(`🌍 Using: OpenStreetMap Nominatim API`);
  console.log('');
  console.log('📍 Strategy:');
  console.log('   1. City + Province (high confidence)');
  console.log('   2. Province only (medium confidence - province center)');
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
    console.log(`✅ Batch ${batchNumber} complete: ${successful} success, ${failed} failed`);
    console.log(`   📍 High confidence (city): ${highConfidence}`);
    console.log(`   📍 Medium confidence (province): ${mediumConfidence}`);

    offset += BATCH_SIZE;
    batchNumber++;

    // Small delay between batches
    if (offset < globalTotal) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Final summary
  console.log('');
  console.log('='.repeat(80));
  console.log('✅ GEOCODING COMPLETED!');
  console.log('='.repeat(80));
  console.log('');
  console.log(`📊 FINAL STATISTICS:`);
  console.log(`   Total Processed: ${globalProcessed}`);
  console.log(`   ✅ Successful: ${totalSuccessful} (${((totalSuccessful / globalProcessed) * 100).toFixed(1)}%)`);
  console.log(`   ❌ Failed: ${totalFailed} (${((totalFailed / globalProcessed) * 100).toFixed(1)}%)`);
  console.log(`   📍 High Confidence (city-level): ${totalHighConfidence}`);
  console.log(`   📍 Medium Confidence (province-level): ${totalMediumConfidence}`);
  console.log(`   ⏱️  Total Time: ${((Date.now() - globalStartTime) / 60000).toFixed(1)} minutes`);
  console.log('');
  console.log('='.repeat(80));
}

// ============================================================================
// RUN SCRIPT
// ============================================================================

geocodeAllSchools()
  .then(() => {
    console.log('✅ Script execution completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error);
    process.exit(1);
  });
