// @ts-nocheck
/**
 * Research BPS API endpoints to find correct poverty data endpoint
 */

import axios from 'axios';

const API_KEY = 'f475900cc09fb4013e90d5531c13313f';
const BASE_URL = 'https://webapi.bps.go.id/v1/api';

async function testEndpoint(name: string, url: string, params: any = {}) {
  console.log(`\n📝 Testing: ${name}`);
  console.log(`   URL: ${url}`);
  console.log(`   Params:`, params);

  try {
    const response = await axios.get(url, {
      params: { ...params, key: API_KEY },
      timeout: 10000,
    });

    console.log(`   ✅ Success! Status: ${response.data.status || response.status}`);
    console.log(`   Response keys:`, Object.keys(response.data));

    if (response.data.data) {
      console.log(`   Data type:`, Array.isArray(response.data.data) ? 'Array' : typeof response.data.data);
      if (Array.isArray(response.data.data)) {
        console.log(`   Data length:`, response.data.data.length);
        if (response.data.data.length > 0) {
          console.log(`   First item keys:`, Object.keys(response.data.data[0]));
          console.log(`   First item sample:`, JSON.stringify(response.data.data[0]).substring(0, 200));
        }
      }
    }

    // Show full response if small
    const responseStr = JSON.stringify(response.data);
    if (responseStr.length < 1000) {
      console.log(`   Full response:`, JSON.stringify(response.data, null, 2));
    }

    return response.data;
  } catch (error: any) {
    console.log(`   ❌ Failed:`, error.response?.data?.message || error.message);
    return null;
  }
}

async function researchBPSAPI() {
  console.log('🔍 Researching BPS API endpoints for poverty data...\n');
  console.log('=' .repeat(70));

  // Test 1: List (to see available endpoints/methods)
  await testEndpoint(
    'List available endpoints',
    `${BASE_URL}/list`
  );

  // Test 2: Domain list
  await testEndpoint(
    'Domain list',
    `${BASE_URL}/domain`
  );

  // Test 3: Subject list for a province
  await testEndpoint(
    'Subject list for DKI Jakarta',
    `${BASE_URL}/subject`,
    { prov: '31' }
  );

  // Test 4: Indicators/Variables for social subject (usually subject 23 or similar)
  await testEndpoint(
    'Indicators for subject 23 (Kesejahteraan Rakyat)',
    `${BASE_URL}/var`,
    { domain: '0000', subject: '23' }
  );

  // Test 5: Try direct data access with strategic indicator
  await testEndpoint(
    'Strategic data with indicator 26',
    `${BASE_URL}/strategicdata`,
    { prov: '31', var: '26' }
  );

  // Test 6: Try statdata endpoint
  await testEndpoint(
    'Stat data for poverty indicator',
    `${BASE_URL}/statdata`,
    { prov: '31', var: '26' }
  );

  // Test 7: Try list endpoint with model parameter
  await testEndpoint(
    'List with model=data',
    `${BASE_URL}/list`,
    { model: 'data', domain: '0000', var: '26' }
  );

  console.log('\n' + '='.repeat(70));
  console.log('✅ Research complete!');
}

researchBPSAPI()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Research error:', error);
    process.exit(1);
  });
