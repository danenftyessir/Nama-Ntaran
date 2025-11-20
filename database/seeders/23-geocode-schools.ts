/**
 * ============================================================================
 * GEOCODING SCRIPT: POPULATE SCHOOL COORDINATES
 * ============================================================================
 *
 * Purpose: Geocode schools and populate latitude/longitude columns
 * Uses: OpenStreetMap Nominatim API via geocodingService
 * Rate Limit: 1 request per second (respects Nominatim policy)
 *
 * Run: npx ts-node database/seeders/23-geocode-schools.ts
 *
 * Options:
 *   LIMIT=100 - Number of schools to geocode (default: 100)
 *   OFFSET=0 - Starting offset (default: 0)
 *
 * Example:
 *   LIMIT=50 npx ts-node database/seeders/23-geocode-schools.ts
 *
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// GEOCODING SERVICE (INLINE FOR SIMPLICITY)
// ============================================================================

import axios from 'axios';

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
  kabupaten?: string | null;
  provinsi?: string | null;
  district?: string | null;
  kecamatan?: string | null;
}

const NOMINATIM_CONFIG = {
  BASE_URL: 'https://nominatim.openstreetmap.org',
  USER_AGENT: 'NutriTrack-MBG-Geocoder/1.0',
  RATE_LIMIT_MS: 1000, // 1 request per second
  TIMEOUT_MS: 10000,
};

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

function buildGeocodingQuery(school: SchoolGeocodingData): string {
  const parts: string[] = [];

  if (school.name) parts.push(school.name);
  if (school.address) parts.push(school.address);

  const district = school.district || school.kecamatan;
  if (district) parts.push(district);

  const city = school.city || school.kabupaten;
  if (city) parts.push(city);

  const province = school.province || school.provinsi;
  if (province) parts.push(province);

  parts.push('Indonesia');

  return parts.join(', ');
}

async function geocodeSchool(
  school: SchoolGeocodingData
): Promise<GeocodingResult | GeocodingError> {
  try {
    // Try detailed query first
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

    // Fallback: If no results, try simpler query with just city + province
    if (!result || result.length === 0) {
      const city = school.city || '';
      const province = school.province || '';
      const simpleQuery = `${city}, ${province}, Indonesia`;

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

    // Validate Indonesia bounds: lat -11 to 6, lon 95 to 141
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
// PROGRESS BAR
// ============================================================================

function showProgress(current: number, total: number, message: string) {
  const percentage = (current / total) * 100;
  const barLength = 30;
  const filledLength = Math.floor((barLength * current) / total);
  const bar = '█'.repeat(filledLength) + ' '.repeat(barLength - filledLength);
  process.stdout.write(`\r[${bar}] ${percentage.toFixed(1)}% - ${message} (${current}/${total})`);
  if (current === total) process.stdout.write('\n');
}

// ============================================================================
// TIME TRACKING
// ============================================================================

const startTime = Date.now();
function getElapsedTime() {
  return ((Date.now() - startTime) / 1000).toFixed(2);
}

function log(message: string) {
  console.log(`[${getElapsedTime()}s] ${message}`);
}

// ============================================================================
// MAIN GEOCODING FUNCTION
// ============================================================================

async function geocodeSchools() {
  log('================================================================================');
  log('GEOCODING SCRIPT: POPULATE SCHOOL COORDINATES');
  log('================================================================================');

  try {
    // Parse environment variables
    const LIMIT = parseInt(process.env.LIMIT || '100', 10);
    const OFFSET = parseInt(process.env.OFFSET || '0', 10);

    log(`Configuration: LIMIT=${LIMIT}, OFFSET=${OFFSET}`);
    log('');

    // ============================================
    // STEP 1: FETCH SCHOOLS WITHOUT COORDINATES
    // ============================================

    log('================================================================================');
    log('STEP 1: FETCHING SCHOOLS WITHOUT COORDINATES');
    log('================================================================================');

    const { data: schools, error: fetchError } = await supabase
      .from('schools')
      .select('id, name, address, city, province, district, latitude, longitude')
      .is('latitude', null)
      .is('longitude', null)
      .range(OFFSET, OFFSET + LIMIT - 1);

    if (fetchError) {
      throw new Error(`Failed to fetch schools: ${fetchError.message}`);
    }

    if (!schools || schools.length === 0) {
      log('✅ No schools found without coordinates (all schools already geocoded!)');
      return;
    }

    log(`✅ Found ${schools.length} schools without coordinates`);

    // ============================================
    // STEP 2: GEOCODE SCHOOLS
    // ============================================

    log('');
    log('================================================================================');
    log('STEP 2: GEOCODING SCHOOLS');
    log('================================================================================');
    log(`⏱️  Estimated time: ${(schools.length * 1.2).toFixed(0)} seconds (1 req/sec + processing)`);
    log('');

    const results: Array<{
      schoolId: number;
      result: GeocodingResult | GeocodingError;
    }> = [];

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < schools.length; i++) {
      const school = schools[i];

      showProgress(i + 1, schools.length, `Geocoding schools`);

      const result = await geocodeSchool(school);

      if ('success' in result && !result.success) {
        failCount++;
      } else {
        successCount++;
      }

      results.push({
        schoolId: school.id,
        result,
      });
    }

    log('');
    log(`✅ Geocoding complete: ${successCount} successful, ${failCount} failed`);

    // ============================================
    // STEP 3: UPDATE DATABASE
    // ============================================

    log('');
    log('================================================================================');
    log('STEP 3: UPDATING DATABASE');
    log('================================================================================');

    let updateCount = 0;
    const updateErrors: Array<{ schoolId: number; error: string }> = [];

    for (const { schoolId, result } of results) {
      if ('success' in result && !result.success) {
        updateErrors.push({ schoolId, error: result.error });
        continue;
      }

      const geocodingResult = result as GeocodingResult;

      const { error: updateError } = await supabase
        .from('schools')
        .update({
          latitude: geocodingResult.latitude,
          longitude: geocodingResult.longitude,
          updated_at: new Date().toISOString(),
        })
        .eq('id', schoolId);

      if (updateError) {
        updateErrors.push({ schoolId, error: updateError.message });
      } else {
        updateCount++;
      }
    }

    log(`✅ Updated ${updateCount}/${schools.length} schools in database`);

    // ============================================
    // GENERATE STATISTICS
    // ============================================

    log('');
    log('================================================================================');
    log('GEOCODING SUMMARY');
    log('================================================================================');
    log('');

    console.log(`📊 GEOCODING RESULTS:`);
    console.log(`   Total Schools: ${schools.length}`);
    console.log(`   ✅ Successfully Geocoded: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   Success Rate: ${((successCount / schools.length) * 100).toFixed(1)}%`);
    console.log(``);

    console.log(`📊 DATABASE UPDATES:`);
    console.log(`   ✅ Updated: ${updateCount}`);
    console.log(`   ❌ Failed: ${updateErrors.length}`);
    console.log(`   Update Rate: ${((updateCount / schools.length) * 100).toFixed(1)}%`);
    console.log(``);

    if (updateErrors.length > 0 && updateErrors.length <= 10) {
      console.log(`❌ UPDATE ERRORS:`);
      updateErrors.forEach((err, idx) => {
        console.log(`${idx + 1}. School ID ${err.schoolId}: ${err.error}`);
      });
      console.log(``);
    } else if (updateErrors.length > 10) {
      console.log(`❌ UPDATE ERRORS (showing first 10 of ${updateErrors.length}):`);
      updateErrors.slice(0, 10).forEach((err, idx) => {
        console.log(`${idx + 1}. School ID ${err.schoolId}: ${err.error}`);
      });
      console.log(`... and ${updateErrors.length - 10} more errors`);
      console.log(``);
    }

    // Check if there are more schools to geocode
    const { count: remainingCount } = await supabase
      .from('schools')
      .select('id', { count: 'exact', head: true })
      .is('latitude', null)
      .is('longitude', null);

    if (remainingCount && remainingCount > 0) {
      console.log(`📊 REMAINING:`);
      console.log(`   ${remainingCount} schools still need geocoding`);
      console.log(`   Run again with: OFFSET=${OFFSET + LIMIT} LIMIT=${LIMIT} npx ts-node 23-geocode-schools.ts`);
      console.log(``);
    }

    log('================================================================================');
    log('✅ GEOCODING COMPLETED!');
    log('================================================================================');
  } catch (error: any) {
    log('');
    log('❌ ERROR: ' + error.message);
    console.error(error);
    process.exit(1);
  }
}

// ============================================================================
// RUN SCRIPT
// ============================================================================

geocodeSchools()
  .then(() => {
    log('✅ Script execution completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
