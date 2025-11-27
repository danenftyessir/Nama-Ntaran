// @ts-nocheck
/**
 * Test the correct BPS API endpoint and see the actual data
 */

import axios from 'axios';

const API_KEY = 'f475900cc09fb4013e90d5531c13313f';
const BASE_URL = 'https://webapi.bps.go.id/v1/api';

async function testCorrectEndpoint() {
  console.log('🧪 Testing BPS API correct endpoint for poverty data...\n');

  try {
    // Test endpoint that showed success
    const response = await axios.get(`${BASE_URL}/list`, {
      params: {
        key: API_KEY,
        model: 'data',
        domain: '0000',
        var: '26', // Poverty rate indicator
        th: '2023', // Year 2023 (2024 might not have data yet)
        prov: '31', // DKI Jakarta
      },
      timeout: 15000,
    });

    console.log('✅ Full Response:');
    console.log(JSON.stringify(response.data, null, 2));

    console.log('\n📊 Analyzing data structure...');

    if (response.data.data && Array.isArray(response.data.data)) {
      console.log(`   Data array length: ${response.data.data.length}`);

      response.data.data.forEach((item, index) => {
        console.log(`\n   Item ${index}:`);
        console.log(`     Type: ${Array.isArray(item) ? 'Array' : typeof item}`);

        if (Array.isArray(item)) {
          console.log(`     Array length: ${item.length}`);
          if (item.length > 0) {
            console.log(`     First element:`, JSON.stringify(item[0], null, 2));

            // Look for poverty rate value
            item.forEach((subItem, subIndex) => {
              if (subItem && typeof subItem === 'object') {
                if (subItem.val !== undefined || subItem.value !== undefined) {
                  console.log(`     Found value at [${index}][${subIndex}]:`, subItem);
                }
              }
            });
          }
        } else {
          console.log(`     Content:`, JSON.stringify(item, null, 2));
        }
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }

  console.log('\n' + '='.repeat(70));

  // Also test without province filter to see all provinces
  console.log('\n🧪 Testing without province filter (all provinces)...\n');

  try {
    const response = await axios.get(`${BASE_URL}/list`, {
      params: {
        key: API_KEY,
        model: 'data',
        domain: '0000',
        var: '26',
        th: '2023',
      },
      timeout: 15000,
    });

    console.log('✅ Response status:', response.data.status);
    console.log('   Data availability:', response.data['data-availability']);

    if (response.data.data && Array.isArray(response.data.data) && response.data.data.length > 1) {
      const dataItems = response.data.data[1]; // Usually pagination is [0], data is [1]

      if (Array.isArray(dataItems)) {
        console.log(`   Total data items: ${dataItems.length}`);
        console.log(`   First 3 items:`);
        dataItems.slice(0, 3).forEach((item, i) => {
          console.log(`     [${i}]:`, JSON.stringify(item).substring(0, 200));
        });
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testCorrectEndpoint()
  .then(() => {
    console.log('\n✅ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test error:', error);
    process.exit(1);
  });
