// @ts-nocheck
import { supabase } from '../config/database.js';

async function checkSchoolDetails() {
  const { data, error } = await supabase
    .from('schools')
    .select('name, jenjang, province, priority_score')
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n📊 First 20 Schools:\n');
  console.table(data);
}

checkSchoolDetails()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
