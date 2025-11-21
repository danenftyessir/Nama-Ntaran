// @ts-nocheck
/**
 * ============================================================================
 * GEOCODING SERVICE
 * ============================================================================
 *
 * Purpose: Convert school addresses to latitude/longitude coordinates
 * Uses: OpenStreetMap Nominatim API (free, no API key required)
 * Rate Limit: 1 request per second (Nominatim policy)
 *
 * ============================================================================
 */

import axios from 'axios';

// ============================================================================
// TYPES
// ============================================================================

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
  confidence: number; // 0-1, based on OSM importance score
}

export interface GeocodingError {
  success: false;
  error: string;
  schoolId?: number;
  address?: string;
}

export interface SchoolGeocodingData {
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

// ============================================================================
// CONFIGURATION
// ============================================================================

const NOMINATIM_CONFIG = {
  BASE_URL: 'https://nominatim.openstreetmap.org',
  USER_AGENT: 'NutriTrack-MBG-Geocoder/1.0', // Required by Nominatim
  RATE_LIMIT_MS: 1000, // 1 request per second
  TIMEOUT_MS: 10000, // 10 second timeout
  MAX_RETRIES: 2,
};

// Rate limiting queue
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

/**
 * Build a geocoding query string from school data
 */
function buildGeocodingQuery(school: SchoolGeocodingData): string {
  const parts: string[] = [];

  // Add school name (helps with accuracy)
  if (school.name) {
    parts.push(school.name);
  }

  // Add address components
  if (school.address) {
    parts.push(school.address);
  }

  // Add district/kecamatan
  const district = school.district || school.kecamatan;
  if (district) {
    parts.push(district);
  }

  // Add city/kabupaten
  const city = school.city || school.kabupaten;
  if (city) {
    parts.push(city);
  }

  // Add province
  const province = school.province || school.provinsi;
  if (province) {
    parts.push(province);
  }

  // Always add Indonesia
  parts.push('Indonesia');

  return parts.join(', ');
}

/**
 * Geocode a single school using Nominatim API
 */
export async function geocodeSchool(
  school: SchoolGeocodingData
): Promise<GeocodingResult | GeocodingError> {
  try {
    const query = buildGeocodingQuery(school);

    const result = await rateLimitedRequest(async () => {
      const response = await axios.get(`${NOMINATIM_CONFIG.BASE_URL}/search`, {
        params: {
          q: query,
          format: 'json',
          limit: 1,
          countrycodes: 'id', // Indonesia only
          addressdetails: 1,
        },
        headers: {
          'User-Agent': NOMINATIM_CONFIG.USER_AGENT,
        },
        timeout: NOMINATIM_CONFIG.TIMEOUT_MS,
      });

      return response.data;
    });

    // Check if we got results
    if (!result || result.length === 0) {
      return {
        success: false,
        error: 'No geocoding results found',
        schoolId: school.id,
        address: query,
      };
    }

    const location = result[0];

    // Validate coordinates
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

    // Validate coordinates are in Indonesia bounds
    // Indonesia: lat -11 to 6, lon 95 to 141
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
    console.error(`Geocoding error for school ${school.id}:`, error.message);

    return {
      success: false,
      error: error.message || 'Unknown geocoding error',
      schoolId: school.id,
      address: buildGeocodingQuery(school),
    };
  }
}

/**
 * Geocode multiple schools with progress tracking
 */
export async function geocodeSchools(
  schools: SchoolGeocodingData[],
  onProgress?: (completed: number, total: number, school: SchoolGeocodingData) => void
): Promise<{
  results: Array<{ schoolId: number; result: GeocodingResult | GeocodingError }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  };
}> {
  const results: Array<{ schoolId: number; result: GeocodingResult | GeocodingError }> = [];
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < schools.length; i++) {
    const school = schools[i];

    // Geocode school
    const result = await geocodeSchool(school);

    // Track success/failure
    if ('success' in result && !result.success) {
      failed++;
    } else {
      successful++;
    }

    results.push({
      schoolId: school.id,
      result,
    });

    // Call progress callback
    if (onProgress) {
      onProgress(i + 1, schools.length, school);
    }
  }

  return {
    results,
    summary: {
      total: schools.length,
      successful,
      failed,
      successRate: schools.length > 0 ? (successful / schools.length) * 100 : 0,
    },
  };
}

/**
 * Batch geocode schools and update database
 * This function should be called from a seeder or admin endpoint
 */
export async function batchGeocodeAndUpdate(
  supabase: any,
  limit: number = 100,
  offset: number = 0
): Promise<{
  success: boolean;
  processed: number;
  updated: number;
  failed: number;
  errors: Array<{ schoolId: number; error: string }>;
}> {
  try {
    // Fetch schools without coordinates
    const { data: schools, error: fetchError } = await supabase
      .from('schools')
      .select('id, name, address, city, province, kabupaten, provinsi, district, kecamatan')
      .is('latitude', null)
      .is('longitude', null)
      .range(offset, offset + limit - 1);

    if (fetchError) {
      throw new Error(`Failed to fetch schools: ${fetchError.message}`);
    }

    if (!schools || schools.length === 0) {
      return {
        success: true,
        processed: 0,
        updated: 0,
        failed: 0,
        errors: [],
      };
    }

    console.log(`Geocoding ${schools.length} schools...`);

    // Geocode schools
    const { results, summary } = await geocodeSchools(schools, (completed, total, school) => {
      console.log(`[${completed}/${total}] Geocoding: ${school.name}`);
    });

    // Update database with results
    let updated = 0;
    const errors: Array<{ schoolId: number; error: string }> = [];

    for (const { schoolId, result } of results) {
      if ('success' in result && !result.success) {
        errors.push({ schoolId, error: result.error });
        continue;
      }

      const geocodingResult = result as GeocodingResult;

      // Update school coordinates
      const { error: updateError } = await supabase
        .from('schools')
        .update({
          latitude: geocodingResult.latitude,
          longitude: geocodingResult.longitude,
          updated_at: new Date().toISOString(),
        })
        .eq('id', schoolId);

      if (updateError) {
        console.error(`Failed to update school ${schoolId}:`, updateError.message);
        errors.push({ schoolId, error: updateError.message });
      } else {
        updated++;
      }
    }

    console.log(`\nGeocoding complete: ${updated}/${schools.length} schools updated`);

    return {
      success: true,
      processed: schools.length,
      updated,
      failed: schools.length - updated,
      errors,
    };
  } catch (error: any) {
    console.error('Batch geocoding error:', error.message);

    return {
      success: false,
      processed: 0,
      updated: 0,
      failed: 0,
      errors: [{ schoolId: 0, error: error.message }],
    };
  }
}
