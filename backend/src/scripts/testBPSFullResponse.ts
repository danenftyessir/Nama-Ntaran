// @ts-nocheck
/**
 * Test BPS API to see full response structure
 */

import axios from 'axios';

async function testBPSFullResponse() {
  console.log('🧪 Testing BPS API full response...\n');

  const provinceCode = '31'; // DKI Jakarta
  const year = 2024;
  const kodeInd = 26; // Poverty percentage indicator
  const keyWithoutQuotes = 'f475900cc09fb4013e90d5531c13313f';

  try {
    const response = await axios.get('https://webapi.bps.go.id/v1/api/interoperabilitas/datastatistik', {
      params: {
        kode_prov: provinceCode,
        tahun: year,
        kode_ind: kodeInd,
        key: keyWithoutQuotes,
      },
      timeout: 10000,
    });

    console.log('✅ Full Response:');
    console.log(JSON.stringify(response.data, null, 2));

    console.log('\n📊 Analyzing structure...');
    console.log('   response.data:', typeof response.data);
    console.log('   response.data.data:', typeof response.data.data);

    if (Array.isArray(response.data.data)) {
      console.log('   response.data.data is Array with length:', response.data.data.length);
      console.log('   First item:', JSON.stringify(response.data.data[0], null, 2));
    } else {
      console.log('   response.data.data is NOT an array');
      console.log('   response.data.data:', response.data.data);
    }

  } catch (error: any) {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testBPSFullResponse()
  .then(() => {
    console.log('\n✅ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test error:', error);
    process.exit(1);
  });
