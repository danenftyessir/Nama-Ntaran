// @ts-nocheck
/**
 * Research BPS API endpoints - Part 2: With correct parameters
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
      timeout: 15000,
    });

    console.log(`   ✅ Success! Status: ${response.data.status || response.status}`);

    if (response.data.status === 'Error') {
      console.log(`   ⚠️  Error message:`, response.data.message);
      return null;
    }

    console.log(`   Response keys:`, Object.keys(response.data));

    if (response.data.data) {
      console.log(`   Data type:`, Array.isArray(response.data.data) ? 'Array' : typeof response.data.data);
      if (Array.isArray(response.data.data)) {
        console.log(`   Data length:`, response.data.data.length);
        if (response.data.data.length > 0) {
          console.log(`   First item:`, JSON.stringify(response.data.data[0], null, 2));
        }
      } else {
        console.log(`   Data:`, JSON.stringify(response.data.data, null, 2).substring(0, 500));
      }
    }

    return response.data;
  } catch (error: any) {
    console.log(`   ❌ Failed:`, error.response?.data?.message || error.message);
    return null;
  }
}

async function researchBPSAPI2() {
  console.log('🔍 Researching BPS API endpoints - Part 2...\n');
  console.log('=' .repeat(70));

  // Test 1: List with model=data and year
  await testEndpoint(
    'List data with year 2024',
    `${BASE_URL}/list`,
    { model: 'data', domain: '0000', var: '26', th: '2024' }
  );

  // Test 2: Try with year and province
  await testEndpoint(
    'List data with year 2024 and province DKI',
    `${BASE_URL}/list`,
    { model: 'data', domain: '0000', var: '26', th: '2024', prov: '31' }
  );

  // Test 3: Try year 2023
  await testEndpoint(
    'List data with year 2023',
    `${BASE_URL}/list`,
    { model: 'data', domain: '0000', var: '26', th: '2023' }
  );

  // Test 4: Try getting domain list first
  await testEndpoint(
    'Domain list with type=all',
    `${BASE_URL}/domain`,
    { type: 'all' }
  );

  // Test 5: Try getting variable/indicator list
  await testEndpoint(
    'Variable list for domain 0000',
    `${BASE_URL}/list`,
    { model: 'var', domain: '0000' }
  );

  // Test 6: Try getting all data for variable 26
  await testEndpoint(
    'All data for variable 26 (poverty rate)',
    `${BASE_URL}/list`,
    { model: 'data', var: '26', th: '2023;2024' }
  );

  // Test 7: Try label endpoint
  await testEndpoint(
    'Label for variable 26',
    `${BASE_URL}/list`,
    { model: 'label', var: '26' }
  );

  console.log('\n' + '='.repeat(70));
  console.log('✅ Research complete!');
}

researchBPSAPI2()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Research error:', error);
    process.exit(1);
  });
