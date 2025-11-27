// @ts-nocheck
/**
 * Test SIMDASI - Get tables for Jakarta
 */

import axios from 'axios';

const API_KEY = 'f475900cc09fb4013e90d5531c13313f';
const BASE_URL = 'https://webapi.bps.go.id/v1/api';

async function testSIMDASITables() {
  console.log('🔍 Getting SIMDASI tables for DKI Jakarta...\n');

  const jakartaCode = '3100000';

  try {
    // Get all tables for Jakarta
    console.log('📝 Getting all tables for Jakarta...');
    const response = await axios.get(`${BASE_URL}/interoperabilitas/datasource/simdasi/id/23/`, {
      params: {
        key: API_KEY,
        wilayah: jakartaCode
      },
      timeout: 15000,
    });

    console.log('✅ Response status:', response.data.status);

    if (response.data.data && Array.isArray(response.data.data) && response.data.data.length > 1) {
      const tableData = response.data.data[1];

      if (tableData.data && Array.isArray(tableData.data)) {
        console.log(`   Total tables: ${tableData.data.length}\n`);

        // Search for poverty-related tables
        const povertyTables = tableData.data.filter((t: any) => {
          const title = (t.judul || '').toLowerCase();
          return title.includes('miskin') || title.includes('kemiskinan') ||
                 title.includes('poverty') || title.includes('poor');
        });

        console.log(`🔎 Found ${povertyTables.length} poverty-related tables:\n`);

        povertyTables.forEach((t: any, i: number) => {
          console.log(`${i + 1}. ${t.judul}`);
          console.log(`   Code: ${t.kode_tabel}`);
          console.log(`   ID: ${t.id_tabel}`);
          console.log(`   Subject: ${t.subject}`);
          console.log(`   Years available: ${t.ketersediaan_tahun?.join(', ')}`);
          console.log('');
        });

        if (povertyTables.length > 0) {
          // Try to get actual data from first table
          const firstTable = povertyTables[0];
          const latestYear = firstTable.ketersediaan_tahun?.[firstTable.ketersediaan_tahun.length - 1];

          if (latestYear) {
            console.log(`\n📊 Getting data for table "${firstTable.judul.substring(0, 50)}..." (Year: ${latestYear})...\n`);

            const dataResponse = await axios.get(`${BASE_URL}/interoperabilitas/datasource/simdasi/id/25/`, {
              params: {
                key: API_KEY,
                wilayah: jakartaCode,
                tahun: latestYear,
                id_tabel: firstTable.id_tabel
              },
              timeout: 15000,
            });

            console.log('✅ Data response:');
            console.log(JSON.stringify(dataResponse.data, null, 2).substring(0, 2000));
          }
        }
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testSIMDASITables()
  .then(() => {
    console.log('\n✅ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test error:', error);
    process.exit(1);
  });
