import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkProgress() {
  console.log('\n📊 GEOCODING PROGRESS REPORT');
  console.log('='.repeat(60));

  // Total schools
  const { count: totalSchools } = await supabase
    .from('schools')
    .select('id', { count: 'exact', head: true });

  // Geocoded schools
  const { count: geocoded } = await supabase
    .from('schools')
    .select('id', { count: 'exact', head: true })
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  // Not geocoded
  const { count: notGeocoded } = await supabase
    .from('schools')
    .select('id', { count: 'exact', head: true })
    .is('latitude', null)
    .is('longitude', null);

  const percentage = ((geocoded || 0) / (totalSchools || 1)) * 100;
  const barLength = 50;
  const filled = Math.floor((barLength * (geocoded || 0)) / (totalSchools || 1));
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

  console.log(`Total Sekolah      : ${totalSchools}`);
  console.log(`Sudah Geocoded     : ${geocoded}`);
  console.log(`Belum Geocoded     : ${notGeocoded}`);
  console.log(`\nProgress           : [${bar}] ${percentage.toFixed(1)}%`);

  if (notGeocoded && notGeocoded > 0) {
    const remainingMinutes = Math.ceil((notGeocoded * 1.2) / 60);
    console.log(`Sisa Waktu Estimasi: ${remainingMinutes} menit (~${Math.ceil(remainingMinutes / 60)} jam)`);
  } else {
    console.log('\n✅ SEMUA SEKOLAH SUDAH DI-GEOCODE!');
  }

  console.log('='.repeat(60));
  console.log('');

  // Show sample geocoded schools
  const { data: samples } = await supabase
    .from('schools')
    .select('name, latitude, longitude, province')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(5);

  if (samples && samples.length > 0) {
    console.log('🗺️  Sample Sekolah Terakhir yang Di-geocode:');
    console.log('-'.repeat(60));
    samples.forEach((school: any, idx: number) => {
      console.log(`${idx + 1}. ${school.name}`);
      console.log(`   📍 ${school.latitude}, ${school.longitude}`);
      console.log(`   📌 ${school.province}`);
    });
    console.log('');
  }
}

checkProgress();
