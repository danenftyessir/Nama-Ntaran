/**
 * ============================================================================
 * GEOCODE ALL SCHOOLS - AUTOMATIC BATCH RUNNER
 * ============================================================================
 *
 * Purpose: Geocode ALL schools in database automatically with progress tracking
 * Features:
 *   - Auto-continues until all schools are geocoded
 *   - Real-time progress bar
 *   - Estimated time remaining
 *   - Error handling with retry logic
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

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '500', 10); // Process 500 at a time
const NOMINATIM_CONFIG = {
  BASE_URL: 'https://nominatim.openstreetmap.org',
  USER_AGENT: 'NutriTrack-MBG-Geocoder/1.0',
  RATE_LIMIT_MS: 1000, // 1 request per second
  TIMEOUT_MS: 10000,
};

// ============================================================================
// TYPES
// ============================================================================

interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
  confidence: number;
}

interface GeocodingError {
  success: false;
  error: string;
  schoolId?: number;
  address?: string;
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
// GEOCODING FUNCTIONS
// ============================================================================

function buildGeocodingQuery(school: SchoolGeocodingData): string {
  const parts: string[] = [];
  if (school.name) parts.push(school.name);
  if (school.address) parts.push(school.address);
  if (school.district) parts.push(school.district);
  if (school.city) parts.push(school.city);
  if (school.province) parts.push(school.province);
  parts.push('Indonesia');
  return parts.join(', ');
}

async function geocodeSchool(
  school: SchoolGeocodingData
): Promise<GeocodingResult | GeocodingError> {
  try {
    const query = buildGeocodingQuery(school);

    let result = await rateLimitedRequest(async () => {
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

    // Fallback: simpler query
    if (!result || result.length === 0) {
      const simpleQuery = `${school.city}, ${school.province}, Indonesia`;
      result = await rateLimitedRequest(async () => {
        const response = await axios.get(`${NOMINATIM_CONFIG.BASE_URL}/search`, {
          params: {
            q: simpleQuery,
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
    }

    if (!result || result.length === 0) {
      return {
        success: false,
        error: 'No geocoding results found',
        schoolId: school.id,
        address: query,
      };
    }

    const location = result[0];
    const lat = parseFloat(location.lat);
    const lon = parseFloat(location.lon);

    if (isNaN(lat) || isNaN(lon)) {
      return {
        success: false,
        error: 'Invalid coordinates returned',
        schoolId: school.id,
        address: query,
      };
    }

    // Validate Indonesia bounds
    if (lat < -11 || lat > 6 || lon < 95 || lon > 141) {
      return {
        success: false,
        error: 'Coordinates outside Indonesia bounds',
        schoolId: school.id,
        address: query,
      };
    }

    return {
      latitude: lat,
      longitude: lon,
      displayName: location.display_name,
      confidence: parseFloat(location.importance) || 0.5,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown geocoding error',
      schoolId: school.id,
      address: buildGeocodingQuery(school),
    };
  }
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
    `Batch: ${batchCurrent}/${batchTotal} | ` +
    `ETA: ${etaMinutes}m | ${message}`.padEnd(120)
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
    return { processed: 0, successful: 0, failed: 0 };
  }

  let successful = 0;
  let failed = 0;

  // Geocode and update each school
  for (let i = 0; i < schools.length; i++) {
    const school = schools[i];
    globalProcessed++;

    showProgress(
      i + 1,
      schools.length,
      globalProcessed,
      globalTotal,
      `Geocoding: ${school.name.substring(0, 30)}...`
    );

    const result = await geocodeSchool(school);

    if ('success' in result && !result.success) {
      failed++;
      continue;
    }

    const geocodingResult = result as GeocodingResult;

    // Update database
    const { error: updateError } = await supabase
      .from('schools')
      .update({
        latitude: geocodingResult.latitude,
        longitude: geocodingResult.longitude,
        updated_at: new Date().toISOString(),
      })
      .eq('id', school.id);

    if (updateError) {
      failed++;
    } else {
      successful++;
    }
  }

  return {
    processed: schools.length,
    successful,
    failed,
  };
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function geocodeAllSchools() {
  console.log('');
  console.log('='.repeat(80));
  console.log('🗺️  GEOCODING ALL SCHOOLS - AUTOMATIC BATCH RUNNER');
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
  console.log(`🌍 Using: OpenStreetMap Nominatim API (1 req/sec)`);
  console.log('');
  console.log('='.repeat(80));
  console.log('');

  let offset = 0;
  let totalSuccessful = 0;
  let totalFailed = 0;
  let batchNumber = 1;
  const totalBatches = Math.ceil(globalTotal / BATCH_SIZE);

  globalStartTime = Date.now();

  while (offset < globalTotal) {
    console.log(`\n📦 Batch ${batchNumber}/${totalBatches} (offset: ${offset})`);
    console.log('-'.repeat(80));

    const { processed, successful, failed } = await processBatch(offset, BATCH_SIZE);

    if (processed === 0) break; // No more schools

    totalSuccessful += successful;
    totalFailed += failed;

    console.log('');
    console.log(`✅ Batch ${batchNumber} complete: ${successful} success, ${failed} failed`);

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
