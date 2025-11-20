/**
 * ============================================================================
 * PRIORITY SCORING SCRIPT: CALCULATE SCHOOL PRIORITIES
 * ============================================================================
 *
 * Purpose: Calculate and update priority scores for all schools
 * Uses: AI-driven scoring based on poverty, stunting, student count, jenjang
 *
 * Run: npx ts-node database/seeders/24-calculate-priority-scores.ts
 *
 * Options:
 *   LIMIT=1000 - Number of schools to process (default: 1000)
 *   OFFSET=0 - Starting offset (default: 0)
 *
 * Example:
 *   LIMIT=500 npx ts-node database/seeders/24-calculate-priority-scores.ts
 *
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// PRIORITY SCORING LOGIC (INLINE)
// ============================================================================

const WEIGHTS = {
  POVERTY: 0.40,    // 40% weight - increased from 35%
  STUNTING: 0.40,   // 40% weight - increased from 35%
  JENJANG: 0.20,    // 20% weight - increased from 10%
};

// STRICT Jenjang weights - differentiate priority clearly
const JENJANG_WEIGHTS: { [key: string]: number } = {
  'SD': 100,  // Elementary - HIGHEST (ages 6-12, critical growth)
  'MI': 100,  // Islamic Elementary
  'SMP': 70,  // Junior High - MEDIUM-HIGH (ages 13-15, still growing)
  'MTS': 70,  // Islamic Junior High
  'SMA': 40,  // Senior High - LOWER (ages 16-18, growth slowing)
  'SMK': 40,  // Vocational High
  'MA': 40,   // Islamic Senior High
  'DEFAULT': 60,
};

const STUDENT_COUNT_THRESHOLDS = {
  MAX_FOR_SCALING: 2000,
  MIN_FOR_SCALING: 50,
};

async function getPovertyRate(province: string): Promise<number> {
  const { data, error } = await supabase
    .from('poverty_data_cache')
    .select('poverty_rate')
    .eq('province', province)
    .eq('year', 2024)
    .single();

  if (error || !data) {
    return 10.0; // Default fallback
  }

  return data.poverty_rate;
}

async function getStuntingRate(province: string): Promise<number> {
  const { data, error } = await supabase
    .from('stunting_data_cache')
    .select('stunting_rate')
    .eq('province', province)
    .eq('year', 2024)
    .single();

  if (error || !data) {
    return 20.0; // Default fallback
  }

  return data.stunting_rate;
}

function calculateStudentDensityScore(studentCount: number): number {
  if (studentCount >= STUDENT_COUNT_THRESHOLDS.MAX_FOR_SCALING) {
    return 100;
  }
  if (studentCount <= STUDENT_COUNT_THRESHOLDS.MIN_FOR_SCALING) {
    return 20;
  }

  const range = STUDENT_COUNT_THRESHOLDS.MAX_FOR_SCALING - STUDENT_COUNT_THRESHOLDS.MIN_FOR_SCALING;
  const position = studentCount - STUDENT_COUNT_THRESHOLDS.MIN_FOR_SCALING;
  return 20 + (position / range) * 80;
}

function getJenjangWeight(jenjang: string | null, schoolName: string = ''): number {
  if (!jenjang && !schoolName) return JENJANG_WEIGHTS.DEFAULT;

  // First try exact jenjang matching (case-insensitive)
  const normalizedJenjang = (jenjang || '').toUpperCase();

  // Map dikdas/dikmen to specific levels
  if (normalizedJenjang.includes('DIKDAS')) {
    // Pendidikan Dasar - try to parse from name
    const nameUpper = schoolName.toUpperCase();
    if (nameUpper.includes('SMP') || nameUpper.includes('MTS')) return JENJANG_WEIGHTS.SMP;
    // Default dikdas to SD (most common)
    return JENJANG_WEIGHTS.SD;
  }
  if (normalizedJenjang.includes('DIKMEN')) {
    // Pendidikan Menengah - default to SMA
    return JENJANG_WEIGHTS.SMA;
  }

  // Try to extract from school name
  const nameUpper = schoolName.toUpperCase();
  for (const [key, weight] of Object.entries(JENJANG_WEIGHTS)) {
    if (key === 'DEFAULT') continue;
    if (nameUpper.includes(key)) {
      return weight;
    }
  }

  // Fallback: try original jenjang field
  for (const [key, weight] of Object.entries(JENJANG_WEIGHTS)) {
    if (key === 'DEFAULT') continue;
    if (normalizedJenjang.includes(key)) {
      return weight;
    }
  }

  return JENJANG_WEIGHTS.DEFAULT;
}

// Normalization ranges for strict 0-100 distribution
const POVERTY_RANGE = {
  MIN: 3.47,   // DKI Jakarta
  MAX: 26.80,  // Papua
};

const STUNTING_RANGE = {
  MIN: 10.0,   // DKI Jakarta (estimated)
  MAX: 40.0,   // NTT, Papua (estimated)
};

function normalizePovertyRate(povertyRate: number): number {
  const clamped = Math.max(POVERTY_RANGE.MIN, Math.min(POVERTY_RANGE.MAX, povertyRate));
  const range = POVERTY_RANGE.MAX - POVERTY_RANGE.MIN;
  const linearScore = ((clamped - POVERTY_RANGE.MIN) / range) * 100;

  // Exponential scaling for strict distribution
  const exponent = 1.3;
  const normalizedScore = Math.pow(linearScore / 100, exponent) * 100;

  return Math.round(normalizedScore * 100) / 100;
}

function normalizeStuntingRate(stuntingRate: number): number {
  const clamped = Math.max(STUNTING_RANGE.MIN, Math.min(STUNTING_RANGE.MAX, stuntingRate));
  const range = STUNTING_RANGE.MAX - STUNTING_RANGE.MIN;
  const linearScore = ((clamped - STUNTING_RANGE.MIN) / range) * 100;

  // Exponential scaling for strict distribution
  const exponent = 1.3;
  const normalizedScore = Math.pow(linearScore / 100, exponent) * 100;

  return Math.round(normalizedScore * 100) / 100;
}

async function calculatePriorityScore(school: any): Promise<number> {
  const povertyRate = await getPovertyRate(school.province);
  const stuntingRate = await getStuntingRate(school.province);

  // Normalize to 0-100 scale with exponential distribution
  const normalizedPoverty = normalizePovertyRate(povertyRate);
  const normalizedStunting = normalizeStuntingRate(stuntingRate);
  const jenjangWeight = getJenjangWeight(school.jenjang, school.name); // Pass school name

  // Calculate weighted score
  const priorityScore =
    (normalizedPoverty * WEIGHTS.POVERTY) +
    (normalizedStunting * WEIGHTS.STUNTING) +
    (jenjangWeight * WEIGHTS.JENJANG);

  return Math.max(0, Math.min(100, priorityScore));
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
// MAIN FUNCTION
// ============================================================================

async function calculatePriorityScores() {
  log('================================================================================');
  log('PRIORITY SCORING SCRIPT: CALCULATE SCHOOL PRIORITIES');
  log('================================================================================');

  try {
    const LIMIT = parseInt(process.env.LIMIT || '1000', 10);
    const OFFSET = parseInt(process.env.OFFSET || '0', 10);

    log(`Configuration: LIMIT=${LIMIT}, OFFSET=${OFFSET}`);
    log('');

    // ============================================
    // STEP 1: FETCH SCHOOLS
    // ============================================

    log('================================================================================');
    log('STEP 1: FETCHING SCHOOLS');
    log('================================================================================');

    const { data: schools, error: fetchError } = await supabase
      .from('schools')
      .select('id, name, province, city, jenjang, status')
      .range(OFFSET, OFFSET + LIMIT - 1);

    if (fetchError) {
      throw new Error(`Failed to fetch schools: ${fetchError.message}`);
    }

    if (!schools || schools.length === 0) {
      log('✅ No schools found to process');
      return;
    }

    log(`✅ Found ${schools.length} schools to process`);

    // ============================================
    // STEP 2: CALCULATE SCORES
    // ============================================

    log('');
    log('================================================================================');
    log('STEP 2: CALCULATING PRIORITY SCORES');
    log('================================================================================');

    const scores: Array<{ schoolId: number; score: number }> = [];

    for (let i = 0; i < schools.length; i++) {
      const school = schools[i];

      showProgress(i + 1, schools.length, 'Calculating scores');

      try {
        const score = await calculatePriorityScore(school);
        scores.push({ schoolId: school.id, score });
      } catch (error: any) {
        console.error(`\nError calculating score for school ${school.id}:`, error.message);
      }
    }

    log('');
    log(`✅ Calculated ${scores.length} priority scores`);

    // ============================================
    // STEP 3: UPDATE DATABASE
    // ============================================

    log('');
    log('================================================================================');
    log('STEP 3: UPDATING DATABASE');
    log('================================================================================');

    let updateCount = 0;
    const updateErrors: Array<{ schoolId: number; error: string }> = [];

    for (const { schoolId, score } of scores) {
      const { error: updateError } = await supabase
        .from('schools')
        .update({
          priority_score: score,
          updated_at: new Date().toISOString(),
        })
        .eq('id', schoolId);

      if (updateError) {
        updateErrors.push({ schoolId, error: updateError.message });
      } else {
        updateCount++;
      }
    }

    log(`✅ Updated ${updateCount}/${scores.length} schools in database`);

    // ============================================
    // STEP 4: GENERATE STATISTICS
    // ============================================

    log('');
    log('================================================================================');
    log('PRIORITY SCORING SUMMARY');
    log('================================================================================');
    log('');

    const scoreValues = scores.map(s => s.score);
    const avgScore = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
    const minScore = Math.min(...scoreValues);
    const maxScore = Math.max(...scoreValues);

    const highPriority = scoreValues.filter(s => s >= 70).length;
    const mediumPriority = scoreValues.filter(s => s >= 50 && s < 70).length;
    const lowPriority = scoreValues.filter(s => s < 50).length;

    console.log(`📊 PRIORITY SCORING RESULTS:`);
    console.log(`   Total Schools Processed: ${schools.length}`);
    console.log(`   ✅ Successfully Scored: ${scores.length}`);
    console.log(`   ✅ Successfully Updated: ${updateCount}`);
    console.log(`   ❌ Failed: ${updateErrors.length}`);
    console.log(``);

    console.log(`📊 SCORE STATISTICS:`);
    console.log(`   Average Score: ${avgScore.toFixed(2)}`);
    console.log(`   Min Score: ${minScore.toFixed(2)}`);
    console.log(`   Max Score: ${maxScore.toFixed(2)}`);
    console.log(``);

    console.log(`📊 PRIORITY DISTRIBUTION:`);
    console.log(`   🔴 High Priority (≥70): ${highPriority} schools (${((highPriority/scores.length)*100).toFixed(1)}%)`);
    console.log(`   🟡 Medium Priority (50-69): ${mediumPriority} schools (${((mediumPriority/scores.length)*100).toFixed(1)}%)`);
    console.log(`   🟢 Low Priority (<50): ${lowPriority} schools (${((lowPriority/scores.length)*100).toFixed(1)}%)`);
    console.log(``);

    if (updateErrors.length > 0 && updateErrors.length <= 10) {
      console.log(`❌ UPDATE ERRORS:`);
      updateErrors.forEach((err, idx) => {
        console.log(`${idx + 1}. School ID ${err.schoolId}: ${err.error}`);
      });
      console.log(``);
    }

    // Check remaining schools
    const { count: remainingCount } = await supabase
      .from('schools')
      .select('id', { count: 'exact', head: true });

    if (remainingCount && remainingCount > OFFSET + LIMIT) {
      console.log(`📊 REMAINING:`);
      console.log(`   ${remainingCount - OFFSET - LIMIT} schools still need priority scoring`);
      console.log(`   Run again with: OFFSET=${OFFSET + LIMIT} LIMIT=${LIMIT}`);
      console.log(``);
    }

    log('================================================================================');
    log('✅ PRIORITY SCORING COMPLETED!');
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

calculatePriorityScores()
  .then(() => {
    log('✅ Script execution completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
