// @ts-nocheck
/**
 * Test BPS API with key (with and without quotes)
 */

import axios from 'axios';

async function testBPSAPIWithKey() {
  console.log('🧪 Testing BPS API with different key formats...\n');

  const provinceCode = '31'; // DKI Jakarta
  const year = 2024;
  const kodeInd = 26; // Poverty percentage indicator

  // Test 1: WITH quotes (current problem)
  console.log('📝 Test 1: Key WITH quotes (current config)');
  const keyWithQuotes = '"f475900cc09fb4013e90d5531c13313f"';
  try {
    const response = await axios.get('https://webapi.bps.go.id/v1/api/interoperabilitas/datastatistik', {
      params: {
        kode_prov: provinceCode,
        tahun: year,
        kode_ind: kodeInd,
        key: keyWithQuotes,
      },
      timeout: 10000,
    });

    console.log('   ✅ Success:', response.data.status || 'OK');
    console.log('   Response:', JSON.stringify(response.data).substring(0, 200));
  } catch (error: any) {
    console.log('   ❌ Failed:', error.response?.data?.message || error.message);
  }

  console.log('\n📝 Test 2: Key WITHOUT quotes (should work)');
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

    console.log('   ✅ Success:', response.data.status || 'OK');
    if (response.data.data && response.data.data.length > 0) {
      console.log('   First data item:', JSON.stringify(response.data.data[0], null, 2));
      console.log('   Poverty rate value:', response.data.data[0].value || response.data.data[0]);
    }
  } catch (error: any) {
    console.log('   ❌ Failed:', error.response?.data?.message || error.message);
  }
}

testBPSAPIWithKey()
  .then(() => {
    console.log('\n✅ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test error:', error);
    process.exit(1);
  });
