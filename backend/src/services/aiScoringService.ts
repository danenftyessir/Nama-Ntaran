// @ts-nocheck
import { supabase } from '../config/database.js';
import { getPovertyData, calculatePovertyIndex } from './bpsDataService.js';

/**
 * AI Scoring Service untuk menentukan prioritas sekolah
 *
 * Formula Scoring:
 * Priority Score = (Poverty Index * 0.4) + (Stunting Rate * 0.4) + (Geographic Access * 0.2)
 *
 * Score Range: 0-100 (semakin tinggi = semakin prioritas)
 *
 * UPDATE: Now uses real BPS API data for poverty index!
 */

interface School {
  id: number;
  npsn: string;
  name: string;
  province: string;
  city: string;
  district: string;
  kecamatan_url?: string;
}

interface PovertyData {
  provinsi: string;
  percentage: number;
}

interface StuntingData {
  provinsi: string;
  rate: number;
}

/**
 * Get poverty index from BPS API (REAL DATA!)
 * Returns poverty index score 0-100 (higher = worse poverty)
 */
async function getPovertyIndexByProvince(province: string): Promise<number> {
  try {
    // Fetch real poverty data from BPS service
    const povertyData = await getPovertyData(province, true); // use cache

    // Calculate poverty index (0-100 scale)
    const povertyIndex = calculatePovertyIndex(povertyData);

    console.log(`[AI Scoring] ${province} - Poverty: ${povertyData.povertyRate.toFixed(2)}%, Index: ${povertyIndex.toFixed(2)}, Source: ${povertyData.source}`);

    return povertyIndex;
  } catch (error) {
    console.error('Error fetching poverty data:', error);
    return 50.0; // Default moderate poverty index
  }
}

/**
 * Get stunting data from database cache
 * (Kemenkes API not available, using pre-populated data from migration)
 */
async function getStuntingRateByProvince(province: string): Promise<number> {
  try {
    // Fetch from database cache (populated by migration)
    const { data, error } = await supabase
      .from('latest_stunting_data')
      .select('stunting_rate')
      .eq('province', province)
      .single();

    if (error || !data) {
      // Fallback to national average if not found
      console.warn(`[AI Scoring] Stunting data not found for ${province}, using national average`);
      return 21.6; // National average
    }

    const stuntingRate = parseFloat(data.stunting_rate);
    console.log(`[AI Scoring] ${province} - Stunting: ${stuntingRate.toFixed(2)}%`);
    return stuntingRate;
  } catch (error) {
    console.error('Error fetching stunting data:', error);
    return 21.6; // National average
  }
}

/**
 * Calculate geographic access score based on location
 * Higher score = more remote/harder access
 */
function calculateGeographicScore(school: School): number {
  let score = 0;

  // Faktor 1: Provinsi terpencil
  const remoterProvinces = [
    'Papua', 'Papua Barat', 'Maluku', 'Maluku Utara',
    'Nusa Tenggara Timur', 'Nusa Tenggara Barat',
    'Kalimantan Utara', 'Sulawesi Barat'
  ];

  if (remoterProvinces.some(p => school.province.includes(p))) {
    score += 40;
  }

  // Faktor 2: Kota vs Kabupaten
  // Kabupaten biasanya lebih sulit akses
  if (school.city.toLowerCase().includes('kabupaten')) {
    score += 30;
  }

  // Faktor 3: Kata kunci desa/terpencil di nama kecamatan
  const remoteKeywords = ['pegunungan', 'kepulauan', 'pedalaman', 'terpencil'];
  if (school.district && remoteKeywords.some(k => school.district.toLowerCase().includes(k))) {
    score += 30;
  }

  // Normalize to 0-100
  return Math.min(score, 100);
}

/**
 * Normalize value to 0-100 scale
 */
function normalize(value: number, min: number, max: number): number {
  return ((value - min) / (max - min)) * 100;
}

/**
 * Calculate priority score for a single school
 * UPDATED to use real BPS data and database stunting data
 */
async function calculateSchoolPriority(school: School): Promise<number> {
  try {
    // Get data from real sources
    const povertyIndex = await getPovertyIndexByProvince(school.province); // Already 0-100
    const stuntingRate = await getStuntingRateByProvince(school.province);
    const geographicScore = calculateGeographicScore(school);

    // Normalize stunting: 0-40% → 0-100
    const normalizedStunting = normalize(stuntingRate, 0, 40);

    // Weighted average
    // Poverty Index: 40%, Stunting: 40%, Geographic: 20%
    const priorityScore =
      (povertyIndex * 0.4) +
      (normalizedStunting * 0.4) +
      (geographicScore * 0.2);

    return Math.round(priorityScore * 100) / 100; // Round to 2 decimals
  } catch (error) {
    console.error(`Error calculating priority for school ${school.npsn}:`, error);
    return 0;
  }
}

/**
 * Calculate and update priority scores for all schools
 */
export async function calculateAllSchoolPriorities(): Promise<{
  success: boolean;
  updated: number;
  error?: string;
}> {
  try {
    console.log('🤖 Starting AI priority scoring for all schools...');

    // Get all schools from database
    const { data: schools, error } = await supabase
      .from('schools')
      .select('id, npsn, name, province, city, district');

    if (error || !schools) {
      console.error('Error fetching schools:', error);
      return { success: false, updated: 0, error: error?.message || 'Failed to fetch schools' };
    }

    console.log(`  Found ${schools.length} schools to process`);

    let updated = 0;

    // Process in batches for better performance
    const batchSize = 50;
    for (let i = 0; i < schools.length; i += batchSize) {
      const batch = schools.slice(i, i + batchSize);

      await Promise.all(batch.map(async (school) => {
        const priorityScore = await calculateSchoolPriority(school);

        const { error: updateError } = await supabase
          .from('schools')
          .update({ priority_score: priorityScore, updated_at: new Date().toISOString() })
          .eq('id', school.id);

        if (!updateError) {
          updated++;
        }

        if (updated % 100 === 0) {
          console.log(`  Processed ${updated}/${schools.length} schools...`);
        }
      }));
    }

    console.log(`✅ Priority scoring complete! Updated ${updated} schools`);

    return {
      success: true,
      updated
    };
  } catch (error: any) {
    console.error('❌ Error in AI scoring:', error.message);
    return {
      success: false,
      updated: 0,
      error: error.message
    };
  }
}

/**
 * Get top priority schools (for admin dashboard)
 */
export async function getTopPrioritySchools(limit: number = 100): Promise<School[]> {
  try {
    const { data, error } = await supabase
      .from('schools')
      .select('id, npsn, name, province, city, district, priority_score')
      .gt('priority_score', 0)
      .order('priority_score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting top priority schools:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting top priority schools:', error);
    return [];
  }
}

/**
 * Get priority schools by province
 */
export async function getPrioritySchoolsByProvince(province: string, limit: number = 50): Promise<School[]> {
  try {
    const { data, error } = await supabase
      .from('schools')
      .select('id, npsn, name, province, city, district, priority_score')
      .eq('province', province)
      .gt('priority_score', 0)
      .order('priority_score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting priority schools by province:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting priority schools by province:', error);
    return [];
  }
}

/**
 * Get priority statistics
 */
export async function getPriorityStatistics(): Promise<{
  totalSchools: number;
  scoredSchools: number;
  averageScore: number;
  highPriority: number; // score > 70
  mediumPriority: number; // score 40-70
  lowPriority: number; // score < 40
}> {
  try {
    const { data, error } = await supabase.rpc('get_priority_statistics');

    if (error || !data || data.length === 0) {
      console.error('Error getting priority statistics:', error);
      return {
        totalSchools: 0,
        scoredSchools: 0,
        averageScore: 0,
        highPriority: 0,
        mediumPriority: 0,
        lowPriority: 0
      };
    }

    const row = data[0];

    return {
      totalSchools: parseInt(row.total_schools),
      scoredSchools: parseInt(row.scored_schools),
      averageScore: parseFloat(row.average_score) || 0,
      highPriority: parseInt(row.high_priority),
      mediumPriority: parseInt(row.medium_priority),
      lowPriority: parseInt(row.low_priority)
    };
  } catch (error) {
    console.error('Error getting priority statistics:', error);
    return {
      totalSchools: 0,
      scoredSchools: 0,
      averageScore: 0,
      highPriority: 0,
      mediumPriority: 0,
      lowPriority: 0
    };
  }
}

/**
 * Get heatmap data for map visualization
 */
export async function getHeatmapData(): Promise<Array<{
  province: string;
  avgScore: number;
  schoolCount: number;
  highPriorityCount: number;
}>> {
  try {
    const { data, error } = await supabase.rpc('get_heatmap_data');

    if (error || !data) {
      console.error('Error getting heatmap data:', error);
      return [];
    }

    return data.map(row => ({
      province: row.province,
      avgScore: parseFloat(row.avg_score),
      schoolCount: parseInt(row.school_count),
      highPriorityCount: parseInt(row.high_priority_count)
    }));
  } catch (error) {
    console.error('Error getting heatmap data:', error);
    return [];
  }
}

export default {
  calculateAllSchoolPriorities,
  getTopPrioritySchools,
  getPrioritySchoolsByProvince,
  getPriorityStatistics,
  getHeatmapData
};
