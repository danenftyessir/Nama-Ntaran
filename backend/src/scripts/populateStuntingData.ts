// @ts-nocheck
/**
 * Populate Stunting Data Cache with Dummy Data
 *
 * This script creates realistic dummy stunting data for all Indonesian provinces
 * Based on real stunting prevalence patterns (higher in eastern regions)
 */

import { supabase } from '../config/database.js';

// Realistic stunting rates by region (based on real patterns)
// Eastern Indonesia tends to have higher rates
const STUNTING_DATA = [
  // Java (Lower rates - more developed)
  { province: 'DKI JAKARTA', stunting_rate: 12.5 },
  { province: 'JAWA BARAT', stunting_rate: 18.3 },
  { province: 'JAWA TENGAH', stunting_rate: 19.8 },
  { province: 'DI YOGYAKARTA', stunting_rate: 15.2 },
  { province: 'JAWA TIMUR', stunting_rate: 20.1 },
  { province: 'BANTEN', stunting_rate: 17.5 },

  // Sumatra (Medium rates)
  { province: 'ACEH', stunting_rate: 28.5 },
  { province: 'SUMATERA UTARA', stunting_rate: 23.7 },
  { province: 'SUMATERA BARAT', stunting_rate: 22.4 },
  { province: 'RIAU', stunting_rate: 24.1 },
  { province: 'JAMBI', stunting_rate: 25.8 },
  { province: 'SUMATERA SELATAN', stunting_rate: 26.3 },
  { province: 'BENGKULU', stunting_rate: 24.9 },
  { province: 'LAMPUNG', stunting_rate: 23.6 },
  { province: 'KEPULAUAN BANGKA BELITUNG', stunting_rate: 22.1 },
  { province: 'KEPULAUAN RIAU', stunting_rate: 20.8 },

  // Kalimantan (Medium rates)
  { province: 'KALIMANTAN BARAT', stunting_rate: 28.9 },
  { province: 'KALIMANTAN TENGAH', stunting_rate: 27.2 },
  { province: 'KALIMANTAN SELATAN', stunting_rate: 25.4 },
  { province: 'KALIMANTAN TIMUR', stunting_rate: 23.8 },
  { province: 'KALIMANTAN UTARA', stunting_rate: 26.7 },

  // Sulawesi (Medium-high rates)
  { province: 'SULAWESI UTARA', stunting_rate: 21.9 },
  { province: 'SULAWESI TENGAH', stunting_rate: 29.4 },
  { province: 'SULAWESI SELATAN', stunting_rate: 26.8 },
  { province: 'SULAWESI TENGGARA', stunting_rate: 30.2 },
  { province: 'GORONTALO', stunting_rate: 25.3 },
  { province: 'SULAWESI BARAT', stunting_rate: 31.5 },

  // Bali & Nusa Tenggara (Medium-high rates)
  { province: 'BALI', stunting_rate: 16.4 },
  { province: 'NUSA TENGGARA BARAT', stunting_rate: 33.2 },
  { province: 'NUSA TENGGARA TIMUR', stunting_rate: 37.8 },

  // Maluku & Papua (Highest rates - less developed)
  { province: 'MALUKU', stunting_rate: 32.7 },
  { province: 'MALUKU UTARA', stunting_rate: 31.4 },
  { province: 'PAPUA', stunting_rate: 38.9 },
  { province: 'PAPUA BARAT', stunting_rate: 36.5 },
  { province: 'PAPUA SELATAN', stunting_rate: 39.2 },
  { province: 'PAPUA TENGAH', stunting_rate: 38.1 },
  { province: 'PAPUA PEGUNUNGAN', stunting_rate: 40.0 },
  { province: 'PAPUA BARAT DAYA', stunting_rate: 37.3 },
];

async function populateStuntingData() {
  console.log('🚀 Starting stunting data population...\n');

  try {
    // Check if table exists and has data
    const { data: existing, error: checkError } = await supabase
      .from('stunting_data_cache')
      .select('id')
      .limit(1);

    if (checkError) {
      console.error('❌ Error checking stunting_data_cache table:', checkError.message);
      console.log('\n⚠️  Make sure the table exists in your database:');
      console.log(`
CREATE TABLE IF NOT EXISTS stunting_data_cache (
  id SERIAL PRIMARY KEY,
  province VARCHAR(255) NOT NULL,
  year INTEGER NOT NULL DEFAULT 2024,
  stunting_rate DECIMAL(5,2) NOT NULL,
  source VARCHAR(255) DEFAULT 'dummy',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(province, year)
);
      `);
      return;
    }

    console.log(`📊 Inserting ${STUNTING_DATA.length} province stunting records...`);

    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (const data of STUNTING_DATA) {
      const recordData = {
        province: data.province,
        year: 2024,
        stunting_rate: data.stunting_rate,
        source: 'dummy',
      };

      // Try to insert, if conflict update
      const { error: insertError } = await supabase
        .from('stunting_data_cache')
        .upsert(recordData, {
          onConflict: 'province,year',
          ignoreDuplicates: false,
        });

      if (insertError) {
        console.error(`❌ Error for ${data.province}:`, insertError.message);
        errors++;
      } else {
        inserted++;
        console.log(`✅ ${data.province}: ${data.stunting_rate}%`);
      }
    }

    console.log('\n📈 Summary:');
    console.log(`   ✅ Inserted/Updated: ${inserted}`);
    console.log(`   ❌ Errors: ${errors}`);

    // Verify data
    const { data: allData, error: verifyError } = await supabase
      .from('stunting_data_cache')
      .select('province, stunting_rate')
      .eq('year', 2024)
      .order('stunting_rate', { ascending: false })
      .limit(5);

    if (!verifyError && allData) {
      console.log('\n🏆 Top 5 Highest Stunting Rates:');
      allData.forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.province}: ${row.stunting_rate}%`);
      });
    }

    console.log('\n✅ Stunting data population complete!');
    console.log('💡 Now you can run the priority score recalculation.');

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    throw error;
  }
}

// Run the script
populateStuntingData()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
