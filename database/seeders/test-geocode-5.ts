import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function tryGeocode(query: string): Promise<any[]> {
  try {
    await new Promise(resolve => setTimeout(resolve, 1100)); // Rate limit
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: query,
        format: 'json',
        limit: 1,
        countrycodes: 'id',
      },
      headers: {
        'User-Agent': 'NutriTrack-MBG-Geocoder/1.0',
      },
      timeout: 10000,
    });
    return response.data || [];
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    return [];
  }
}

async function testFiveSchools() {
  console.log('\n🧪 Testing smart geocoding on 5 schools\n');
  console.log('='.repeat(80));

  // Fetch 5 schools
  const { data: schools } = await supabase
    .from('schools')
    .select('id, name, city, province')
    .is('latitude', null)
    .is('longitude', null)
    .limit(5);

  if (!schools || schools.length === 0) {
    console.log('No schools found!');
    return;
  }

  let success = 0;
  let failed = 0;

  for (const school of schools) {
    console.log(`\n📍 ${school.name}`);
    console.log(`   City: ${school.city}`);
    console.log(`   Province: ${school.province}`);

    // Strategy 1: City + Province
    const query1 = `${school.city}, ${school.province}, Indonesia`;
    console.log(`   🔍 Try: "${query1}"`);

    let result = await tryGeocode(query1);

    // Strategy 2: Province only
    if (!result || result.length === 0) {
      console.log(`   ⚠️  City failed, trying province only...`);
      const query2 = `${school.province}, Indonesia`;
      console.log(`   🔍 Try: "${query2}"`);
      result = await tryGeocode(query2);
    }

    if (result && result.length > 0) {
      const loc = result[0];
      const lat = parseFloat(loc.lat);
      const lon = parseFloat(loc.lon);

      console.log(`   ✅ Found: ${lat}, ${lon}`);
      console.log(`   📌 ${loc.display_name}`);

      // Update database
      const { error } = await supabase
        .from('schools')
        .update({
          latitude: lat,
          longitude: lon,
          updated_at: new Date().toISOString(),
        })
        .eq('id', school.id);

      if (error) {
        console.log(`   ❌ DB update failed: ${error.message}`);
        failed++;
      } else {
        console.log(`   💾 Saved to database!`);
        success++;
      }
    } else {
      console.log(`   ❌ No results found`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n✅ Success: ${success}/${schools.length}`);
  console.log(`❌ Failed: ${failed}/${schools.length}`);
  console.log('');
}

testFiveSchools();
