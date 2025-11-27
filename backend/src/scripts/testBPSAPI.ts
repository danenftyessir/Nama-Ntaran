// @ts-nocheck
/**
 * Test BPS API to see actual response
 */

import axios from 'axios';

async function testBPSAPI() {
  console.log('🧪 Testing BPS API...\n');

  const provinceCode = '31'; // DKI Jakarta
  const year = 2024;
  const kodeInd = 26; // Poverty percentage indicator

  try {
    const response = await axios.get('https://webapi.bps.go.id/v1/api/interoperabilitas/datastatistik', {
      params: {
        kode_prov: provinceCode,
        tahun: year,
        kode_ind: kodeInd,
      },
      timeout: 10000,
    });

    console.log('✅ API Response:');
    console.log('   Status:', response.status);
    console.log('   Response data:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.data && response.data.data.length > 0) {
      console.log('\n📊 First data item:');
      console.log('   Full object:', JSON.stringify(response.data.data[0], null, 2));
      console.log('   Value field:', response.data.data[0].value);
      console.log('   Parsed value:', parseFloat(response.data.data[0].value));
    }

  } catch (error: any) {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testBPSAPI()
  .then(() => {
    console.log('\n✅ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test error:', error);
    process.exit(1);
  });
