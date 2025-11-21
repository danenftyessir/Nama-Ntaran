// @ts-nocheck
/**
 * ============================================================================
 * PRIORITY SCORING SERVICE - UPDATED FOR 0-100 STRICT DISTRIBUTION
 * ============================================================================
 *
 * Purpose: Calculate priority scores for schools based on multiple factors
 * Used for: AI-driven allocation of nutrition program resources
 *
 * NEW FORMULA (STRICT DISTRIBUTION 0-100):
 *   Priority Score = (normalizedPoverty × 0.40) + (normalizedStunting × 0.40) + (jenjang × 0.20)
 *
 * Key Changes:
 * - Uses BPS API service for real-time poverty data
 * - Normalizes poverty (3-27%) and stunting (10-40%) to 0-100 scale
 * - Removed student_count dependency (column doesn't exist)
 * - Increased weights for poverty/stunting from 0.35 to 0.40
 * - Non-linear scaling for better distribution
 *
 * Score Range: 0-100 (higher = more urgent/priority)
 * Distribution Target: ~15% high (≥70), ~35% medium (50-69), ~50% low (<50)
 *
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import { getPovertyData } from './bpsDataService.js';

// ============================================================================
// TYPES
// ============================================================================

export interface SchoolPriorityData {
  id: number;
  name: string;
  province: string;
  city: string;
  jenjang: string;
  status: string;
}

export interface PriorityScoreResult {
  schoolId: number;
  priorityScore: number;
  breakdown: {
    povertyScore: number;
    stuntingScore: number;
    jenjangScore: number;
  };
  povertyRate?: number;
  stuntingRate?: number;
  dataSource: string; // 'bps_api', 'cached', or 'simulated'
}

export interface BatchScoringResult {
  success: boolean;
  processed: number;
  updated: number;
  failed: number;
  errors: Array<{ schoolId: number; error: string }>;
  summary: {
    avgScore: number;
    minScore: number;
    maxScore: number;
    highPriority: number;  // score >= 70
    mediumPriority: number; // score 50-69
    lowPriority: number;    // score < 50
  };
  dataSourceStats: {
    bpsApi: number;
    cached: number;
    simulated: number;
  };
}

// ============================================================================
// CONFIGURATION - STRICT DISTRIBUTION
// ============================================================================

const WEIGHTS = {
  POVERTY: 0.40,      // 40% weight for poverty rate (increased from 0.35)
  STUNTING: 0.40,     // 40% weight for stunting rate (increased from 0.35)
  JENJANG: 0.20,      // 20% weight for education level (increased from 0.10)
};

// Indonesia's actual ranges (BPS 2024 data)
const POVERTY_RANGE = {
  MIN: 3.47,  // DKI Jakarta
  MAX: 26.80, // Papua
  NATIONAL_AVG: 9.36,
};

const STUNTING_RANGE = {
  MIN: 10.0,  // DKI Jakarta (estimated)
  MAX: 40.0,  // NTT, Papua (estimated)
  NATIONAL_AVG: 21.6, // National prevalence
};

// Jenjang (education level) weights - STRICT PRIORITY
const JENJANG_WEIGHTS: { [key: string]: number } = {
  'SD': 100,  // Elementary - HIGHEST priority (ages 6-12, critical growth period)
  'MI': 100,  // Islamic Elementary
  'SMP': 70,  // Junior High - MEDIUM-HIGH (ages 13-15, still growing)
  'MTS': 70,  // Islamic Junior High
  'SMA': 40,  // Senior High - LOWER priority (ages 16-18, growth slowing)
  'SMK': 40,  // Vocational High
  'MA': 40,   // Islamic Senior High
  'DEFAULT': 60,
};

// ============================================================================
// NORMALIZATION FUNCTIONS - STRICT SCALING
// ============================================================================

/**
 * Normalize poverty rate to 0-100 scale with non-linear scaling
 * Creates better distribution by penalizing low poverty and amplifying high poverty
 */
function normalizePovertyRate(povertyRate: number): number {
  // Clamp to valid range
  const clamped = Math.max(POVERTY_RANGE.MIN, Math.min(POVERTY_RANGE.MAX, povertyRate));

  // Linear scale 0-100
  const range = POVERTY_RANGE.MAX - POVERTY_RANGE.MIN;
  const linearScore = ((clamped - POVERTY_RANGE.MIN) / range) * 100;

  // Apply exponential scaling for strict distribution
  // This makes high poverty areas score much higher
  const exponent = 1.3; // Increase for even stricter distribution
  const normalizedScore = Math.pow(linearScore / 100, exponent) * 100;

  return Math.round(normalizedScore * 100) / 100;
}

/**
 * Normalize stunting rate to 0-100 scale with non-linear scaling
 */
function normalizeStuntingRate(stuntingRate: number): number {
  // Clamp to valid range
  const clamped = Math.max(STUNTING_RANGE.MIN, Math.min(STUNTING_RANGE.MAX, stuntingRate));

  // Linear scale 0-100
  const range = STUNTING_RANGE.MAX - STUNTING_RANGE.MIN;
  const linearScore = ((clamped - STUNTING_RANGE.MIN) / range) * 100;

  // Apply exponential scaling
  const exponent = 1.3;
  const normalizedScore = Math.pow(linearScore / 100, exponent) * 100;

  return Math.round(normalizedScore * 100) / 100;
}

/**
 * Get jenjang weight (0-100) with strict priority
 */
function getJenjangWeight(jenjang: string | null): number {
  if (!jenjang) return JENJANG_WEIGHTS.DEFAULT;

  const normalizedJenjang = jenjang.toUpperCase();

  for (const [key, weight] of Object.entries(JENJANG_WEIGHTS)) {
    if (normalizedJenjang.includes(key)) {
      return weight;
    }
  }

  return JENJANG_WEIGHTS.DEFAULT;
}

// ============================================================================
// DATA FETCHING - USES BPS API SERVICE
// ============================================================================

/**
 * Get poverty rate with BPS API integration (uses bpsDataService)
 */
async function getPovertyRateWithAPI(province: string): Promise<{ rate: number; source: string }> {
  try {
    // Use BPS API service (with automatic fallback)
    const povertyData = await getPovertyData(province, true); // useCache = true

    return {
      rate: povertyData.povertyRate,
      source: povertyData.source,
    };
  } catch (error) {
    console.warn(`Failed to get poverty data for ${province}, using fallback`);
    return {
      rate: POVERTY_RANGE.NATIONAL_AVG,
      source: 'simulated',
    };
  }
}

/**
 * Get stunting rate from cache (Kemenkes data not implemented per user request)
 */
async function getStuntingRate(supabase: any, province: string): Promise<number> {
  const { data, error } = await supabase
    .from('stunting_data_cache')
    .select('stunting_rate')
    .eq('province', province)
    .eq('year', 2024)
    .single();

  if (error || !data) {
    console.warn(`No stunting data for province: ${province}, using national average`);
    return STUNTING_RANGE.NATIONAL_AVG;
  }

  return data.stunting_rate;
}

// ============================================================================
// PRIORITY SCORE CALCULATION
// ============================================================================

/**
 * Calculate priority score for a single school with STRICT 0-100 distribution
 */
export async function calculatePriorityScore(
  supabase: any,
  school: SchoolPriorityData
): Promise<PriorityScoreResult> {
  // Fetch data with BPS API integration
  const { rate: povertyRate, source: povertySource } = await getPovertyRateWithAPI(school.province);
  const stuntingRate = await getStuntingRate(supabase, school.province);

  // Normalize to 0-100 scale with strict distribution
  const normalizedPoverty = normalizePovertyRate(povertyRate);
  const normalizedStunting = normalizeStuntingRate(stuntingRate);
  const jenjangWeight = getJenjangWeight(school.jenjang);

  // Calculate component scores (already weighted)
  const povertyScore = normalizedPoverty * WEIGHTS.POVERTY;
  const stuntingScore = normalizedStunting * WEIGHTS.STUNTING;
  const jenjangScore = jenjangWeight * WEIGHTS.JENJANG;

  // Calculate final score
  const priorityScore = povertyScore + stuntingScore + jenjangScore;

  // Ensure score is within 0-100 range
  const finalScore = Math.max(0, Math.min(100, priorityScore));

  return {
    schoolId: school.id,
    priorityScore: Math.round(finalScore * 100) / 100, // Round to 2 decimals
    breakdown: {
      povertyScore: Math.round(povertyScore * 100) / 100,
      stuntingScore: Math.round(stuntingScore * 100) / 100,
      jenjangScore: Math.round(jenjangScore * 100) / 100,
    },
    povertyRate,
    stuntingRate,
    dataSource: povertySource,
  };
}

/**
 * Batch calculate and update priority scores for all schools
 */
export async function batchCalculatePriorityScores(
  supabase: any,
  limit: number = 1000,
  offset: number = 0
): Promise<BatchScoringResult> {
  try {
    // Fetch schools (removed student_count as it doesn't exist)
    const { data: schools, error: fetchError } = await supabase
      .from('schools')
      .select('id, name, province, city, jenjang, status')
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
        summary: {
          avgScore: 0,
          minScore: 0,
          maxScore: 0,
          highPriority: 0,
          mediumPriority: 0,
          lowPriority: 0,
        },
        dataSourceStats: {
          bpsApi: 0,
          cached: 0,
          simulated: 0,
        },
      };
    }

    console.log(`[Priority Scoring] Calculating scores for ${schools.length} schools with BPS API integration...`);

    // Calculate scores
    const results: PriorityScoreResult[] = [];
    const errors: Array<{ schoolId: number; error: string }> = [];
    const dataSourceCounts = { bpsApi: 0, cached: 0, simulated: 0 };

    for (const school of schools) {
      try {
        const result = await calculatePriorityScore(supabase, school);
        results.push(result);

        // Track data sources
        if (result.dataSource === 'bps_api') dataSourceCounts.bpsApi++;
        else if (result.dataSource === 'cached') dataSourceCounts.cached++;
        else dataSourceCounts.simulated++;
      } catch (error: any) {
        console.error(`Error calculating score for school ${school.id}:`, error.message);
        errors.push({ schoolId: school.id, error: error.message });
      }
    }

    // Update database
    let updated = 0;
    for (const result of results) {
      const { error: updateError } = await supabase
        .from('schools')
        .update({
          priority_score: result.priorityScore,
          updated_at: new Date().toISOString(),
        })
        .eq('id', result.schoolId);

      if (updateError) {
        console.error(`Failed to update school ${result.schoolId}:`, updateError.message);
        errors.push({ schoolId: result.schoolId, error: updateError.message });
      } else {
        updated++;
      }
    }

    // Calculate summary statistics
    const scores = results.map(r => r.priorityScore);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);

    const highPriority = scores.filter(s => s >= 70).length;
    const mediumPriority = scores.filter(s => s >= 50 && s < 70).length;
    const lowPriority = scores.filter(s => s < 50).length;

    console.log(`\n[Priority Scoring] Complete: ${updated}/${schools.length} schools updated`);
    console.log(`[Priority Scoring] Score range: ${minScore.toFixed(2)} - ${maxScore.toFixed(2)} (avg: ${avgScore.toFixed(2)})`);
    console.log(`[Priority Scoring] Distribution: ${highPriority} high (${((highPriority/scores.length)*100).toFixed(1)}%), ${mediumPriority} medium (${((mediumPriority/scores.length)*100).toFixed(1)}%), ${lowPriority} low (${((lowPriority/scores.length)*100).toFixed(1)}%)`);
    console.log(`[Priority Scoring] Data sources: ${dataSourceCounts.bpsApi} BPS API, ${dataSourceCounts.cached} cached, ${dataSourceCounts.simulated} simulated`);

    return {
      success: true,
      processed: schools.length,
      updated,
      failed: errors.length,
      errors,
      summary: {
        avgScore: Math.round(avgScore * 100) / 100,
        minScore: Math.round(minScore * 100) / 100,
        maxScore: Math.round(maxScore * 100) / 100,
        highPriority,
        mediumPriority,
        lowPriority,
      },
      dataSourceStats: dataSourceCounts,
    };
  } catch (error: any) {
    console.error('[Priority Scoring] Batch error:', error.message);

    return {
      success: false,
      processed: 0,
      updated: 0,
      failed: 0,
      errors: [{ schoolId: 0, error: error.message }],
      summary: {
        avgScore: 0,
        minScore: 0,
        maxScore: 0,
        highPriority: 0,
        mediumPriority: 0,
        lowPriority: 0,
      },
      dataSourceStats: {
        bpsApi: 0,
        cached: 0,
        simulated: 0,
      },
    };
  }
}
