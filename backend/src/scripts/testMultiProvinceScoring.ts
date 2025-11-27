// @ts-nocheck
/**
 * Test Hybrid Scoring - Multiple Provinces
 */

import { supabase } from '../config/database.js';
import { batchCalculateHybridScores } from '../services/hybridPriorityScoring.js';

async function testMultiProvince() {
  console.log('🧪 Testing scores across different provinces...\n');

  try {
    // Get schools from different provinces
    const provinces = ['DKI Jakarta', 'Jawa Barat', 'Papua', 'Nusa Tenggara Timur'];

    for (const province of provinces) {
      console.log(`\n📍 Testing ${province}...`);

      // Get 2-3 schools from this province
      const { data: schools, error } = await supabase
        .from('schools')
        .select('id, name, province')
        .ilike('province', `%${province}%`)
        .limit(3);

      if (error || !schools || schools.length === 0) {
        console.log(`   ⚠️  No schools found for ${province}`);
        continue;
      }

      console.log(`   Found ${schools.length} schools`);

      // Calculate scores
      const schoolIds = schools.map(s => s.id);
      const result = await batchCalculateHybridScores(
        supabase,
        schools.length,
        0,
        false // No AI for speed
      );

      console.log(`   Avg Score: ${result.summary.avgFinalScore.toFixed(2)}`);
      console.log(`   Range: ${result.summary.minScore.toFixed(2)} - ${result.summary.maxScore.toFixed(2)}`);

      // Delay between provinces
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n✅ Multi-province test complete!');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testMultiProvince()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
