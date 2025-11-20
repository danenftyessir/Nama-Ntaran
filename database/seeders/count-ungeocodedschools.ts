import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function countUngeocoded() {
  const { count, error } = await supabase
    .from('schools')
    .select('id', { count: 'exact', head: true })
    .is('latitude', null)
    .is('longitude', null);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n📊 GEOCODING STATUS');
  console.log('='.repeat(50));
  console.log(`Sekolah tanpa koordinat: ${count}`);
  console.log(`Estimasi waktu: ${Math.ceil((count || 0) * 1.2 / 60)} menit`);
  console.log('='.repeat(50));
}

countUngeocoded();
