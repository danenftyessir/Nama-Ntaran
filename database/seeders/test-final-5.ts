import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeProvinceName(province: string): string {
  return province
    .replace(/^D\.K\.I\.\s*/i, '')
    .replace(/^D\.I\.\s*/i, '')
    .replace(/^Daerah\s+Istimewa\s+/i, '')
    .replace(/^Prov\.?\s*/i, '')
    .replace(/^Provinsi\s+/i, '')
    .replace(/^Kab\.?\s*/i, '')
    .replace(/^Kabupaten\s+/i, '')
    .replace(/^Kota\s+/i, '')
    .replace(/^Kepulauan\s+/i, '')
    .replace(/^Kep\.?\s+/i, '')
    .trim();
}

async function tryGeocode(query: string): Promise<any[]> {
  try {
    await new Promise(resolve => setTimeout(resolve, 1100));
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: query, format: 'json', limit: 1, countrycodes: 'id' },
      headers: { 'User-Agent': 'NutriTrack-MBG-Geocoder/1.0' },
      timeout: 10000,
    });
    return response.data || [];
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    return [];
  }
}

async function testFinal() {
  console.log('\n🧪 Testing FINAL version with normalized province names\n');
  console.log('='.repeat(80));

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

  for (const school of schools) {
    console.log(`\n📍 ${school.name}`);
    console.log(`   Original province: "${school.province}"`);

    const normalized = normalizeProvinceName(school.province);
    console.log(`   Normalized: "${normalized}"`);

    const query = `${normalized}, Indonesia`;
    console.log(`   🔍 Query: "${query}"`);

    const result = await tryGeocode(query);

    if (result && result.length > 0) {
      const loc = result[0];
      console.log(`   ✅ Found: ${loc.lat}, ${loc.lon}`);
      console.log(`   📌 ${loc.display_name}`);

      const { error } = await supabase
        .from('schools')
        .update({
          latitude: parseFloat(loc.lat),
          longitude: parseFloat(loc.lon),
          updated_at: new Date().toISOString(),
        })
        .eq('id', school.id);

      if (!error) {
        console.log(`   💾 Saved!`);
        success++;
      }
    } else {
      console.log(`   ❌ No results`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n✅ Success: ${success}/5`);
}

testFinal();
