// @ts-nocheck
/**
 * Test Priority Scoring - Quick Test with 10 Schools
 */

import { supabase } from '../config/database.js';
import { batchCalculatePriorityScores } from '../services/priorityScoringService.js';

async function testPriorityScoring() {
  console.log('🧪 Testing Priority Scoring with 10 schools...\n');

  try {
    const result = await batchCalculatePriorityScores(supabase, 10, 0);

    console.log('\n📊 Test Results:');
    console.log(`   Processed: ${result.processed}`);
    console.log(`   Updated: ${result.updated}`);
    console.log(`   Failed: ${result.failed}`);
    console.log(`   Avg Score: ${result.summary.avgScore}`);
    console.log(`   Range: ${result.summary.minScore} - ${result.summary.maxScore}`);
    console.log(`   Distribution:`);
    console.log(`     - High (≥70):   ${result.summary.highPriority}`);
    console.log(`     - Medium (50-69): ${result.summary.mediumPriority}`);
    console.log(`     - Low (<50):    ${result.summary.lowPriority}`);
    console.log(`\n   Data Sources:`);
    console.log(`     - BPS API:    ${result.dataSourceStats.bpsApi}`);
    console.log(`     - Cached:     ${result.dataSourceStats.cached}`);
    console.log(`     - Simulated:  ${result.dataSourceStats.simulated}`);

    if (result.errors.length > 0) {
      console.log(`\n❌ Errors:`);
      result.errors.forEach(err => {
        console.log(`   School ${err.schoolId}: ${err.error}`);
      });
    }

    if (result.updated > 0) {
      console.log('\n✅ Priority scoring working!');
    } else {
      console.log('\n⚠️  No schools were updated');
    }

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testPriorityScoring()
  .then(() => {
    console.log('\n🎉 Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test error:', error);
    process.exit(1);
  });
