// @ts-nocheck
/**
 * Test Hybrid Scoring - Small Sample
 */

import { supabase } from '../config/database.js';
import { batchCalculateHybridScores } from '../services/hybridPriorityScoring.js';

async function testHybridScoring() {
  console.log('🧪 Testing Hybrid Scoring with 10 schools...\n');

  try {
    // Test with AI disabled first
    console.log('1️⃣ Testing WITHOUT AI (base formula only)...');
    const resultNoAI = await batchCalculateHybridScores(
      supabase,
      10,  // Only 10 schools
      0,
      false // AI disabled
    );

    console.log('\n📊 Results WITHOUT AI:');
    console.log(`   Processed: ${resultNoAI.processed}`);
    console.log(`   Updated: ${resultNoAI.updated}`);
    console.log(`   Avg Score: ${resultNoAI.summary.avgFinalScore}`);
    console.log(`   Range: ${resultNoAI.summary.minScore} - ${resultNoAI.summary.maxScore}`);

    if (resultNoAI.updated > 0) {
      console.log('\n✅ Base formula working!');

      // If base works and CLAUDE_API_KEY is set, test with AI
      if (process.env.CLAUDE_API_KEY) {
        console.log('\n2️⃣ Testing WITH AI...');

        const resultWithAI = await batchCalculateHybridScores(
          supabase,
          5,  // Only 5 schools for AI test (to save cost)
          0,
          true // AI enabled
        );

        console.log('\n📊 Results WITH AI:');
        console.log(`   Processed: ${resultWithAI.processed}`);
        console.log(`   Updated: ${resultWithAI.updated}`);
        console.log(`   Avg Final Score: ${resultWithAI.summary.avgFinalScore}`);
        console.log(`   Avg Base Score: ${resultWithAI.summary.avgBaseScore}`);
        console.log(`   Avg AI Score: ${resultWithAI.summary.avgAiScore}`);

        console.log('\n✅ AI scoring working!');
      } else {
        console.log('\n⚠️  CLAUDE_API_KEY not set - skipping AI test');
        console.log('   Add to .env to test AI scoring');
      }
    }

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testHybridScoring()
  .then(() => {
    console.log('\n🎉 Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test error:', error);
    process.exit(1);
  });
