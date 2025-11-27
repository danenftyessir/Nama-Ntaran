// @ts-nocheck
/**
 * Recalculate Priority Scores for All Schools with AI
 *
 * This script recalculates priority scores using HYBRID scoring:
 * - Base Score (70%): Poverty (40%) + Stunting (40%) + Jenjang (20%)
 * - AI Urgency (30%): Claude AI analysis of school-specific factors
 *
 * AI analyzes unique conditions per school for accurate prioritization.
 */

import { supabase } from '../config/database.js';
import { batchCalculateHybridScores } from '../services/hybridPriorityScoring.js';

// Enable AI scoring (set to false to use base formula only)
const ENABLE_AI = process.env.ENABLE_AI_SCORING === 'true';

async function recalculatePriorityScores() {
  console.log('🚀 Starting priority score recalculation...\n');

  try {
    // Get total school count first
    const { count: totalSchools, error: countError } = await supabase
      .from('schools')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Failed to count schools: ${countError.message}`);
    }

    console.log(`📊 Total schools to process: ${totalSchools}\n`);

    // Calculate in batches to avoid timeout
    const batchSize = 1000;
    let offset = 0;
    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalFailed = 0;

    while (offset < (totalSchools || 0)) {
      console.log(`\n🔄 Processing batch: ${offset + 1} to ${Math.min(offset + batchSize, totalSchools || 0)}`);

      const result = await batchCalculateHybridScores(supabase, batchSize, offset, ENABLE_AI);

      totalProcessed += result.processed;
      totalUpdated += result.updated;
      totalFailed += result.failed;

      console.log(`   Batch result: ${result.updated}/${result.processed} updated, ${result.failed} failed`);

      if (result.summary) {
        console.log(`   Score range: ${result.summary.minScore} - ${result.summary.maxScore} (avg: ${result.summary.avgScore})`);
        console.log(`   Distribution: ${result.summary.highPriority} high, ${result.summary.mediumPriority} medium, ${result.summary.lowPriority} low`);
      }

      offset += batchSize;

      // Break if we processed fewer than the batch size (last batch)
      if (result.processed < batchSize) {
        break;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ PRIORITY SCORE RECALCULATION COMPLETE!');
    console.log('='.repeat(60));
    console.log(`📊 Total processed: ${totalProcessed}`);
    console.log(`✅ Total updated: ${totalUpdated}`);
    console.log(`❌ Total failed: ${totalFailed}`);
    console.log(`📈 Success rate: ${((totalUpdated / totalProcessed) * 100).toFixed(1)}%`);

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

      console.log('\n📊 Final Statistics:');
      console.log(`   Average score: ${avgScore.toFixed(2)}`);
      console.log(`   Score range: ${minScore.toFixed(2)} - ${maxScore.toFixed(2)}`);
      console.log(`   Distribution:`);
      console.log(`     - High (≥70):   ${highPriority} schools (${((highPriority / scores.length) * 100).toFixed(1)}%)`);
      console.log(`     - Medium (50-69): ${mediumPriority} schools (${((mediumPriority / scores.length) * 100).toFixed(1)}%)`);
      console.log(`     - Low (<50):    ${lowPriority} schools (${((lowPriority / scores.length) * 100).toFixed(1)}%)`);
    }

    console.log('\n💡 Tip: Refresh http://localhost:3000/school-list to see the updated scores!');

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    throw error;
  }
}

// Run the script
recalculatePriorityScores()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
