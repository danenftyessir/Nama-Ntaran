// @ts-nocheck
/**
 * OPTIMIZED Priority Score Recalculation
 *
 * Strategy:
 * - First 10,000 schools: HYBRID scoring with AI (70% base + 30% AI)
 * - Remaining schools: BASE formula only (no AI, faster)
 *
 * This balances accuracy with speed, ensuring high-priority schools
 * get AI analysis while processing completes in reasonable time.
 */

import { supabase } from '../config/database.js';
import { batchCalculateHybridScores } from '../services/hybridPriorityScoring.js';

const AI_SCHOOL_LIMIT = 10000; // First 10k schools get AI analysis
const BATCH_SIZE = 1000;
const RESUME_FROM_OFFSET = 6000; // Set to 0 to start fresh, or offset to resume
const ENABLE_AI = process.env.ENABLE_AI_SCORING === 'true'; // Read from .env

async function recalculatePriorityScoresOptimized() {
  console.log('🚀 Starting OPTIMIZED priority score recalculation...');
  console.log(`   AI Scoring: ${ENABLE_AI ? '✅ ENABLED' : '❌ DISABLED (using base formula only)'}`);
  console.log(`   Strategy: First ${AI_SCHOOL_LIMIT} schools with AI, rest without AI\n`);

  try {
    // Get total school count
    const { count: totalSchools, error: countError } = await supabase
      .from('schools')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Failed to count schools: ${countError.message}`);
    }

    console.log(`📊 Total schools to process: ${totalSchools}`);
    console.log(`   - With AI: ${Math.min(AI_SCHOOL_LIMIT, totalSchools || 0)}`);
    console.log(`   - Without AI: ${Math.max(0, (totalSchools || 0) - AI_SCHOOL_LIMIT)}\n`);

    if (RESUME_FROM_OFFSET > 0) {
      console.log(`⏭️  RESUMING from offset ${RESUME_FROM_OFFSET} (skipping first ${RESUME_FROM_OFFSET} schools)\n`);
    }

    let offset = RESUME_FROM_OFFSET;
    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalFailed = 0;
    const startTime = Date.now();

    // Process all schools in batches
    while (offset < (totalSchools || 0)) {
      const isAIBatch = offset < AI_SCHOOL_LIMIT;
      const batchNum = Math.floor(offset / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil((totalSchools || 0) / BATCH_SIZE);

      console.log(`\n${'='.repeat(70)}`);
      console.log(`🔄 Batch ${batchNum}/${totalBatches}: Schools ${offset + 1} to ${Math.min(offset + BATCH_SIZE, totalSchools || 0)}`);
      console.log(`   Mode: ${isAIBatch ? '🤖 AI-ENHANCED HYBRID' : '⚡ BASE FORMULA ONLY'}`);
      console.log(`${'='.repeat(70)}`);

      const batchStartTime = Date.now();

      const result = await batchCalculateHybridScores(
        supabase,
        BATCH_SIZE,
        offset,
        ENABLE_AI && isAIBatch // Use AI only if enabled in .env AND within first 10k schools
      );

      const batchDuration = ((Date.now() - batchStartTime) / 1000).toFixed(1);
      const batchRate = (result.processed / (Date.now() - batchStartTime) * 1000).toFixed(2);

      totalProcessed += result.processed;
      totalUpdated += result.updated;
      totalFailed += result.failed;

      console.log(`\n✅ Batch ${batchNum} complete:`);
      console.log(`   Updated: ${result.updated}/${result.processed} schools`);
      console.log(`   Failed: ${result.failed}`);
      console.log(`   Duration: ${batchDuration}s (${batchRate} schools/sec)`);

      if (result.summary) {
        console.log(`   Score range: ${result.summary.minScore.toFixed(2)} - ${result.summary.maxScore.toFixed(2)} (avg: ${result.summary.avgFinalScore.toFixed(2)})`);
        console.log(`   Distribution: ${result.summary.highPriority} high, ${result.summary.mediumPriority} medium, ${result.summary.lowPriority} low`);
      }

      // Progress summary
      const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      const overallRate = (totalProcessed / (Date.now() - startTime) * 1000).toFixed(2);
      const remaining = totalSchools - totalProcessed;
      const estimatedTimeLeft = (remaining / parseFloat(overallRate) / 60).toFixed(1);

      console.log(`\n📊 Overall Progress:`);
      console.log(`   Processed: ${totalProcessed}/${totalSchools} (${((totalProcessed / totalSchools) * 100).toFixed(1)}%)`);
      console.log(`   Success rate: ${((totalUpdated / totalProcessed) * 100).toFixed(1)}%`);
      console.log(`   Elapsed: ${elapsed} min`);
      console.log(`   Speed: ${overallRate} schools/sec`);
      console.log(`   Estimated time left: ${estimatedTimeLeft} min`);

      offset += BATCH_SIZE;

      // Break if we processed fewer than batch size (last batch)
      if (result.processed < BATCH_SIZE) {
        break;
      }
    }

    const totalDuration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    console.log('\n' + '='.repeat(70));
    console.log('✅ OPTIMIZED PRIORITY SCORE RECALCULATION COMPLETE!');
    console.log('='.repeat(70));
    console.log(`📊 Final Summary:`);
    console.log(`   Total processed: ${totalProcessed}`);
    console.log(`   Total updated: ${totalUpdated}`);
    console.log(`   Total failed: ${totalFailed}`);
    console.log(`   Success rate: ${((totalUpdated / totalProcessed) * 100).toFixed(1)}%`);
    console.log(`   Total duration: ${totalDuration} minutes (${(parseFloat(totalDuration) / 60).toFixed(2)} hours)`);
    console.log(`   Average speed: ${(totalProcessed / (Date.now() - startTime) * 1000).toFixed(2)} schools/sec`);

    // Get final statistics
    const { data: stats, error: statsError } = await supabase
      .from('schools')
      .select('priority_score')
      .not('priority_score', 'is', null);

    if (!statsError && stats) {
      const scores = stats.map((s: any) => s.priority_score);
      const avgScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
      const minScore = Math.min(...scores);
      const maxScore = Math.max(...scores);

      const highPriority = scores.filter((s: number) => s >= 70).length;
      const mediumPriority = scores.filter((s: number) => s >= 50 && s < 70).length;
      const lowPriority = scores.filter((s: number) => s < 50).length;

      console.log('\n📊 Final Database Statistics:');
      console.log(`   Average score: ${avgScore.toFixed(2)}`);
      console.log(`   Score range: ${minScore.toFixed(2)} - ${maxScore.toFixed(2)}`);
      console.log(`   Distribution:`);
      console.log(`     - High (≥70):   ${highPriority} schools (${((highPriority / scores.length) * 100).toFixed(1)}%)`);
      console.log(`     - Medium (50-69): ${mediumPriority} schools (${((mediumPriority / scores.length) * 100).toFixed(1)}%)`);
      console.log(`     - Low (<50):    ${lowPriority} schools (${((lowPriority / scores.length) * 100).toFixed(1)}%)`);
    }

    console.log('\n💡 Tip: Visit http://localhost:3000/school-list to see the updated scores!');
    console.log('🎯 First 10,000 schools have AI-enhanced scores for accurate prioritization.\n');

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    throw error;
  }
}

// Run the script
recalculatePriorityScoresOptimized()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
