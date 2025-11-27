// @ts-nocheck
/**
 * HYBRID PRIORITY SCORING SERVICE
 *
 * Combines mathematical base score with AI urgency analysis
 *
 * Formula:
 *   Final Score = (Base Score × 70%) + (AI Urgency Score × 30%)
 *
 * Base Score = (Poverty × 40%) + (Stunting × 40%) + (Jenjang × 20%)
 * AI Urgency = Claude AI analysis of issues and patterns
 */

import { calculatePriorityScore, type PriorityScoreResult } from './priorityScoringService.js';
import { batchAnalyzeUrgency, type UrgencyAnalysis } from './aiUrgencyScoring.js';

const WEIGHTS = {
  BASE_SCORE: 0.70, // 70% mathematical formula
  AI_URGENCY: 0.30, // 30% AI analysis
};

export interface HybridScoreResult {
  schoolId: number;
  finalScore: number;
  baseScore: number;
  aiUrgencyScore: number;
  breakdown: {
    povertyScore: number;
    stuntingScore: number;
    jenjangScore: number;
    urgencyFactors?: UrgencyAnalysis['factors'];
  };
  aiAnalysis?: string;
  dataSource: string;
}

export interface HybridBatchResult {
  success: boolean;
  processed: number;
  updated: number;
  failed: number;
  errors: Array<{ schoolId: number; error: string }>;
  summary: {
    avgFinalScore: number;
    avgBaseScore: number;
    avgAiScore: number;
    minScore: number;
    maxScore: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
  };
  aiStats: {
    enabled: boolean;
    schoolsAnalyzed: number;
    avgUrgencyScore: number;
  };
}

/**
 * Calculate hybrid priority score for a single school
 */
export async function calculateHybridScore(
  supabase: any,
  schoolId: number,
  useAI: boolean = true
): Promise<HybridScoreResult> {
  try {
    // 1. Get school data
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, name, province, city, jenjang, status')
      .eq('id', schoolId)
      .single();

    if (schoolError || !school) {
      throw new Error(`School ${schoolId} not found`);
    }

    // 2. Calculate base score (mathematical formula)
    const baseResult = await calculatePriorityScore(supabase, school);
    const baseScore = baseResult.priorityScore;

    // 3. Calculate AI urgency score (if enabled)
    let aiUrgencyScore = 0;
    let urgencyAnalysis: UrgencyAnalysis | undefined;

    if (useAI) {
      try {
        const urgencyMap = await batchAnalyzeUrgency(supabase, [schoolId], true);
        urgencyAnalysis = urgencyMap.get(schoolId);
        aiUrgencyScore = urgencyAnalysis?.urgencyScore || 0;
      } catch (error) {
        console.warn(`AI analysis failed for school ${schoolId}, using base score only`);
        aiUrgencyScore = 0;
      }
    }

    // 4. Calculate final hybrid score
    const finalScore = (baseScore * WEIGHTS.BASE_SCORE) + (aiUrgencyScore * WEIGHTS.AI_URGENCY);

    return {
      schoolId,
      finalScore: Math.round(finalScore * 100) / 100,
      baseScore: Math.round(baseScore * 100) / 100,
      aiUrgencyScore: Math.round(aiUrgencyScore * 100) / 100,
      breakdown: {
        povertyScore: baseResult.breakdown.povertyScore,
        stuntingScore: baseResult.breakdown.stuntingScore,
        jenjangScore: baseResult.breakdown.jenjangScore,
        urgencyFactors: urgencyAnalysis?.factors,
      },
      aiAnalysis: urgencyAnalysis?.reasoning,
      dataSource: baseResult.dataSource,
    };
  } catch (error: any) {
    throw new Error(`Failed to calculate hybrid score for school ${schoolId}: ${error.message}`);
  }
}

/**
 * Batch calculate hybrid scores for all schools
 */
export async function batchCalculateHybridScores(
  supabase: any,
  limit: number = 1000,
  offset: number = 0,
  useAI: boolean = false // Default false to avoid high API costs
): Promise<HybridBatchResult> {
  try {
    console.log(`\n[Hybrid Scoring] Starting batch calculation (AI: ${useAI ? 'enabled' : 'disabled'})...`);

    // Fetch schools
    const { data: schools, error: fetchError } = await supabase
      .from('schools')
      .select('id, name, province, city, jenjang, status')
      .range(offset, offset + limit - 1);

    if (fetchError) {
      throw new Error(`Failed to fetch schools: ${fetchError.message}`);
    }

    if (!schools || schools.length === 0) {
      return createEmptyResult();
    }

    console.log(`[Hybrid Scoring] Processing ${schools.length} schools...`);

    // Calculate base scores for all schools
    const baseScores = new Map<number, PriorityScoreResult>();
    for (const school of schools) {
      try {
        const baseResult = await calculatePriorityScore(supabase, school);
        baseScores.set(school.id, baseResult);
      } catch (error: any) {
        console.error(`Error calculating base score for school ${school.id}:`, error.message);
      }
    }

    // Calculate AI urgency scores (if enabled)
    let urgencyScores = new Map<number, UrgencyAnalysis>();
    if (useAI) {
      console.log(`[Hybrid Scoring] Running AI analysis...`);
      urgencyScores = await batchAnalyzeUrgency(
        supabase,
        schools.map(s => s.id),
        true
      );
    }

    // Combine scores
    const results: HybridScoreResult[] = [];
    const errors: Array<{ schoolId: number; error: string }> = [];

    for (const school of schools) {
      try {
        const baseResult = baseScores.get(school.id);
        if (!baseResult) {
          throw new Error('Base score not calculated');
        }

        const urgencyAnalysis = urgencyScores.get(school.id);
        const aiUrgencyScore = urgencyAnalysis?.urgencyScore || 0;

        const finalScore = (baseResult.priorityScore * WEIGHTS.BASE_SCORE) + (aiUrgencyScore * WEIGHTS.AI_URGENCY);

        results.push({
          schoolId: school.id,
          finalScore: Math.round(finalScore * 100) / 100,
          baseScore: Math.round(baseResult.priorityScore * 100) / 100,
          aiUrgencyScore: Math.round(aiUrgencyScore * 100) / 100,
          breakdown: {
            povertyScore: baseResult.breakdown.povertyScore,
            stuntingScore: baseResult.breakdown.stuntingScore,
            jenjangScore: baseResult.breakdown.jenjangScore,
            urgencyFactors: urgencyAnalysis?.factors,
          },
          aiAnalysis: urgencyAnalysis?.reasoning,
          dataSource: baseResult.dataSource,
        });
      } catch (error: any) {
        console.error(`Error processing school ${school.id}:`, error.message);
        errors.push({ schoolId: school.id, error: error.message });
      }
    }

    // Update database with final scores
    let updated = 0;
    for (const result of results) {
      const { error: updateError } = await supabase
        .from('schools')
        .update({
          priority_score: result.finalScore,
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
    const finalScores = results.map(r => r.finalScore);
    const baseScoresList = results.map(r => r.baseScore);
    const aiScoresList = results.map(r => r.aiUrgencyScore);

    const avgFinalScore = finalScores.reduce((a, b) => a + b, 0) / finalScores.length;
    const avgBaseScore = baseScoresList.reduce((a, b) => a + b, 0) / baseScoresList.length;
    const avgAiScore = aiScoresList.reduce((a, b) => a + b, 0) / aiScoresList.length;
    const minScore = Math.min(...finalScores);
    const maxScore = Math.max(...finalScores);

    const highPriority = finalScores.filter(s => s >= 70).length;
    const mediumPriority = finalScores.filter(s => s >= 50 && s < 70).length;
    const lowPriority = finalScores.filter(s => s < 50).length;

    console.log(`\n[Hybrid Scoring] Complete: ${updated}/${schools.length} schools updated`);
    console.log(`[Hybrid Scoring] Score range: ${minScore.toFixed(2)} - ${maxScore.toFixed(2)}`);
    console.log(`[Hybrid Scoring] Avg final: ${avgFinalScore.toFixed(2)} | Avg base: ${avgBaseScore.toFixed(2)} | Avg AI: ${avgAiScore.toFixed(2)}`);
    console.log(`[Hybrid Scoring] Distribution: ${highPriority} high, ${mediumPriority} medium, ${lowPriority} low`);

    return {
      success: true,
      processed: schools.length,
      updated,
      failed: errors.length,
      errors,
      summary: {
        avgFinalScore: Math.round(avgFinalScore * 100) / 100,
        avgBaseScore: Math.round(avgBaseScore * 100) / 100,
        avgAiScore: Math.round(avgAiScore * 100) / 100,
        minScore: Math.round(minScore * 100) / 100,
        maxScore: Math.round(maxScore * 100) / 100,
        highPriority,
        mediumPriority,
        lowPriority,
      },
      aiStats: {
        enabled: useAI,
        schoolsAnalyzed: urgencyScores.size,
        avgUrgencyScore: avgAiScore,
      },
    };
  } catch (error: any) {
    console.error('[Hybrid Scoring] Batch error:', error.message);
    throw error;
  }
}

function createEmptyResult(): HybridBatchResult {
  return {
    success: true,
    processed: 0,
    updated: 0,
    failed: 0,
    errors: [],
    summary: {
      avgFinalScore: 0,
      avgBaseScore: 0,
      avgAiScore: 0,
      minScore: 0,
      maxScore: 0,
      highPriority: 0,
      mediumPriority: 0,
      lowPriority: 0,
    },
    aiStats: {
      enabled: false,
      schoolsAnalyzed: 0,
      avgUrgencyScore: 0,
    },
  };
}
