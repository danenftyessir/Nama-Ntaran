// @ts-nocheck
import { supabase } from '../config/database.js';

async function checkStuntingData() {
  console.log('📊 Checking stunting data table...\n');

  // Check if table exists and get sample data
  const { data, error } = await supabase
    .from('latest_stunting_data')
    .select('province, stunting_rate')
    .limit(10);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  Table is empty or does not exist');
    return;
  }

  console.log(`✅ Found ${data.length} rows (showing first 10):\n`);
  data.forEach((row: any) => {
    console.log(`  - Province: "${row.province}" | Stunting: ${row.stunting_rate}%`);
  });

  // Check specifically for DKI Jakarta variations
  console.log('\n🔍 Searching for DKI Jakarta variations...\n');

  const variations = ['DKI Jakarta', 'D.K.I. Jakarta', 'DKI JAKARTA', 'Jakarta'];

  for (const variant of variations) {
    const { data: found, error: searchError } = await supabase
      .from('latest_stunting_data')
      .select('province, stunting_rate')
      .eq('province', variant)
      .single();

    if (found) {
      console.log(`  ✅ Found: "${variant}" → ${found.stunting_rate}%`);
    } else {
      console.log(`  ❌ Not found: "${variant}"`);
    }
  }
}

checkStuntingData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
