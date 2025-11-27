// @ts-nocheck
import { supabase } from '../config/database.js';

async function checkProvinces() {
  console.log('🔍 Checking province name formats...\n');

  // Get sample schools provinces
  const { data: schools } = await supabase
    .from('schools')
    .select('province')
    .limit(50);

  const schoolProvinces = [...new Set(schools?.map(d => d.province))].sort();

  console.log('📚 Schools provinces (sample):');
  schoolProvinces.forEach(p => console.log(`   - "${p}"`));

  // Get stunting provinces
  const { data: stunting } = await supabase
    .from('stunting_data_cache')
    .select('province');

  const stuntingProvinces = [...new Set(stunting?.map(d => d.province))].sort();

  console.log('\n🎯 Stunting data provinces:');
  stuntingProvinces.forEach(p => console.log(`   - "${p}"`));

  // Find mismatches
  console.log('\n⚠️  Mismatches:');
  schoolProvinces.forEach(sp => {
    if (!stuntingProvinces.includes(sp)) {
      console.log(`   ❌ "${sp}" not in stunting data`);
    }
  });

  process.exit(0);
}

checkProvinces().catch(console.error);
