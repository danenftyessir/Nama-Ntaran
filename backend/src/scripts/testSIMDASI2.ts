// @ts-nocheck
/**
 * Test SIMDASI endpoint - see actual response
 */

import axios from 'axios';

const API_KEY = 'f475900cc09fb4013e90d5531c13313f';
const BASE_URL = 'https://webapi.bps.go.id/v1/api';

async function testSIMDASI2() {
  console.log('🔍 Testing SIMDASI endpoints...\n');

  try {
    // Test: Get province MFD codes
    console.log('📝 Getting province MFD codes...');
    const response = await axios.get(`${BASE_URL}/interoperabilitas/datasource/simdasi/id/26/`, {
      params: { key: API_KEY },
      timeout: 15000,
    });

    console.log('✅ Full Response:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testSIMDASI2()
  .then(() => {
    console.log('\n✅ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test error:', error);
    process.exit(1);
  });
