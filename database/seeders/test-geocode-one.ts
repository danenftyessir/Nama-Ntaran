import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testGeocodeOne() {
  console.log('🧪 Testing geocoding for ONE school...\n');

  // Fetch one school without coordinates
  const { data: schools, error: fetchError } = await supabase
    .from('schools')
    .select('id, name, address, city, province, district, latitude, longitude')
    .is('latitude', null)
    .is('longitude', null)
    .limit(1);

  if (fetchError) {
    console.error('❌ Fetch error:', fetchError);
    return;
  }

  if (!schools || schools.length === 0) {
    console.log('✅ No schools without coordinates found!');
    return;
  }

  const school = schools[0];
  console.log('📍 School:', school.name);
  console.log('📍 Address:', school.address);
  console.log('📍 City:', school.city);
  console.log('📍 Province:', school.province);
  console.log('');

  // Build query
  const query = [school.name, school.address, school.city, school.province, 'Indonesia']
    .filter(Boolean)
    .join(', ');

  console.log('🔍 Geocoding query:', query);
  console.log('');

  // Try geocoding
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: query,
        format: 'json',
        limit: 1,
        countrycodes: 'id',
        addressdetails: 1,
      },
      headers: {
        'User-Agent': 'NutriTrack-MBG-Geocoder/1.0',
      },
      timeout: 10000,
    });

    console.log('✅ API Response:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.length > 0) {
      const location = response.data[0];
      const lat = parseFloat(location.lat);
      const lon = parseFloat(location.lon);

      console.log('');
      console.log('📍 Coordinates found:');
      console.log('   Latitude:', lat);
      console.log('   Longitude:', lon);
      console.log('   Display:', location.display_name);
      console.log('');

      // Try updating database
      console.log('💾 Attempting database update...');
      const { error: updateError } = await supabase
        .from('schools')
        .update({
          latitude: lat,
          longitude: lon,
          updated_at: new Date().toISOString(),
        })
        .eq('id', school.id);

      if (updateError) {
        console.error('❌ Database update error:', updateError);
      } else {
        console.log('✅ Database updated successfully!');

        // Verify
        const { data: verified } = await supabase
          .from('schools')
          .select('id, name, latitude, longitude')
          .eq('id', school.id)
          .single();

        console.log('');
        console.log('✅ Verification:', JSON.stringify(verified, null, 2));
      }
    } else {
      console.log('❌ No geocoding results found');
    }
  } catch (error: any) {
    console.error('❌ Geocoding error:', error.message);
    if (error.response) {
      console.error('❌ Response data:', error.response.data);
    }
  }
}

testGeocodeOne();
