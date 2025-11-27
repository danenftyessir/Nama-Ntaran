// @ts-nocheck
/**
 * Test SIMDASI endpoint for poverty data
 */

import axios from 'axios';

const API_KEY = 'f475900cc09fb4013e90d5531c13313f';
const BASE_URL = 'https://webapi.bps.go.id/v1/api';

async function testSIMDASI() {
  console.log('🔍 Testing SIMDASI for poverty data...\n');

  try {
    // Step 1: Get list of provinces (MFD codes)
    console.log('📝 Step 1: Getting province MFD codes...');
    const provResponse = await axios.get(`${BASE_URL}/interoperabilitas/datasource/simdasi/id/26/`, {
      params: { key: API_KEY },
      timeout: 15000,
    });

    console.log('✅ Province response status:', provResponse.data.status);

    if (provResponse.data.data && Array.isArray(provResponse.data.data) && provResponse.data.data.length > 1) {
      const provinces = provResponse.data.data[1];
      if (Array.isArray(provinces)) {
        console.log(`   Found ${provinces.length} provinces`);

        // Find DKI Jakarta
        const jakarta = provinces.find((p: any) =>
          p.nama?.toLowerCase().includes('jakarta') ||
          p.nama?.toLowerCase().includes('dki')
        );

        if (jakarta) {
          console.log(`   DKI Jakarta MFD code:`, jakarta);

          const jakartaCode = jakarta.kode_mfd || jakarta.kode || jakarta.id;

          // Step 2: Get subjects for Jakarta
          console.log(`\n📝 Step 2: Getting subjects for Jakarta (${jakartaCode})...`);
          const subjResponse = await axios.get(`${BASE_URL}/interoperabilitas/datasource/simdasi/id/22/`, {
            params: {
              key: API_KEY,
              wilayah: jakartaCode
            },
            timeout: 15000,
          });

          console.log('✅ Subject response status:', subjResponse.data.status);

          if (subjResponse.data.data && Array.isArray(subjResponse.data.data) && subjResponse.data.data.length > 1) {
            const subjectData = subjResponse.data.data[1];

            if (subjectData.data && Array.isArray(subjectData.data)) {
              console.log(`   Found ${subjectData.data.length} subjects`);

              // Search for poverty-related subjects
              const povertySubjects = subjectData.data.filter((s: any) => {
                const subj = (s.subject || s.bab || '').toLowerCase();
                return subj.includes('miskin') || subj.includes('kemiskinan') ||
                       subj.includes('kesra') || subj.includes('kesejahteraan') ||
                       subj.includes('sosial');
              });

              console.log(`\n🔎 Found ${povertySubjects.length} poverty/social related subjects:`);
              povertySubjects.forEach((s: any, i: number) => {
                console.log(`\n   ${i + 1}. Subject: ${s.subject || s.bab}`);
                console.log(`      MMS ID: ${s.mms_id}`);
                console.log(`      Chapter: ${s.bab}`);

                // Show tables in this subject
                if (s.tabel && Array.isArray(s.tabel)) {
                  console.log(`      Tables (${s.tabel.length}):`);
                  s.tabel.slice(0, 3).forEach((t: any) => {
                    console.log(`        - ${t.judul?.substring(0, 80) || t.kode_tabel}`);
                  });
                }
              });

              // If we found poverty subjects, try to get tables
              if (povertySubjects.length > 0) {
                const firstSubject = povertySubjects[0];
                console.log(`\n📝 Step 3: Getting tables for subject "${firstSubject.subject}"...`);

                const tableResponse = await axios.get(`${BASE_URL}/interoperabilitas/datasource/simdasi/id/24/`, {
                  params: {
                    key: API_KEY,
                    wilayah: jakartaCode,
                    id_subjek: firstSubject.mms_id
                  },
                  timeout: 15000,
                });

                console.log('✅ Table response status:', tableResponse.data.status);

                if (tableResponse.data.data && Array.isArray(tableResponse.data.data) && tableResponse.data.data.length > 1) {
                  const tableData = tableResponse.data.data[1];

                  if (tableData.data && Array.isArray(tableData.data)) {
                    console.log(`   Found ${tableData.data.length} tables`);

                    // Look for poverty rate table
                    const povertyTables = tableData.data.filter((t: any) => {
                      const title = (t.judul || '').toLowerCase();
                      return title.includes('miskin') || title.includes('kemiskinan');
                    });

                    console.log(`\n🔎 Poverty-related tables (${povertyTables.length}):`);
                    povertyTables.forEach((t: any, i: number) => {
                      console.log(`\n   ${i + 1}. ${t.judul}`);
                      console.log(`      Code: ${t.kode_tabel}`);
                      console.log(`      ID: ${t.id_tabel}`);
                      console.log(`      Years: ${t.ketersediaan_tahun?.join(', ')}`);
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testSIMDASI()
  .then(() => {
    console.log('\n✅ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test error:', error);
    process.exit(1);
  });
