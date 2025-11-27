// @ts-nocheck
/**
 * Find the correct variable/indicator code for poverty data
 */

import axios from 'axios';

const API_KEY = 'f475900cc09fb4013e90d5531c13313f';
const BASE_URL = 'https://webapi.bps.go.id/v1/api';

async function findPovertyVariable() {
  console.log('🔍 Searching for poverty-related variables in BPS API...\n');

  try {
    // Get list of all variables in domain 0000 (National/Strategic)
    console.log('📝 Getting variable list for domain 0000...');

    const response = await axios.get(`${BASE_URL}/list`, {
      params: {
        key: API_KEY,
        model: 'var',
        domain: '0000',
        page: '1',
        per_page: '100', // Get more results
      },
      timeout: 15000,
    });

    console.log(`✅ Response status: ${response.data.status}`);

    if (response.data.data && Array.isArray(response.data.data)) {
      const pagination = response.data.data[0];
      const variables = response.data.data[1];

      console.log(`📊 Pagination:`, pagination);
      console.log(`📊 Total variables available: ${pagination.total}`);
      console.log(`📊 Variables in this page: ${variables ? variables.length : 0}\n`);

      if (Array.isArray(variables)) {
        console.log('🔎 Searching for poverty-related keywords...\n');

        const povertyKeywords = ['miskin', 'poverty', 'kemiskinan', 'poor'];

        const povertyVars = variables.filter((v: any) => {
          if (!v) return false;
          const title = (v.title || v.label || v.var_name || '').toLowerCase();
          const subject = (v.subject || '').toLowerCase();

          return povertyKeywords.some(keyword =>
            title.includes(keyword) || subject.includes(keyword)
          );
        });

        console.log(`✅ Found ${povertyVars.length} poverty-related variables:\n`);

        povertyVars.forEach((v: any, i: number) => {
          console.log(`${i + 1}. Variable ID: ${v.var || v.var_id || v.turvar || 'N/A'}`);
          console.log(`   Title: ${v.title || v.label || v.var_name || 'N/A'}`);
          console.log(`   Subject: ${v.subject || v.subcat || 'N/A'}`);
          console.log(`   Unit: ${v.unit || v.satuan || 'N/A'}`);
          console.log('');
        });

        // Also show first 10 variables to see structure
        console.log('\n📋 First 10 variables (to see structure):\n');
        variables.slice(0, 10).forEach((v: any, i: number) => {
          console.log(`${i + 1}.`, JSON.stringify(v).substring(0, 150));
        });
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }

  // Also try to get domain list to see what domains exist
  console.log('\n' + '='.repeat(70));
  console.log('\n📝 Getting domain list...');

  try {
    const response = await axios.get(`${BASE_URL}/domain`, {
      params: {
        key: API_KEY,
        type: 'all',
      },
      timeout: 15000,
    });

    if (response.data.data && Array.isArray(response.data.data) && response.data.data.length > 1) {
      const domains = response.data.data[1];

      if (Array.isArray(domains)) {
        console.log(`✅ Total domains: ${domains.length}\n`);

        // Look for social/welfare domains
        const socialDomains = domains.filter((d: any) => {
          const name = (d.domain_name || d.title || '').toLowerCase();
          return name.includes('sosial') || name.includes('kesra') ||
                 name.includes('kesejahteraan') || name.includes('welfare');
        });

        console.log(`🔎 Social/Welfare related domains:\n`);
        socialDomains.forEach((d: any, i: number) => {
          console.log(`${i + 1}. Domain ID: ${d.domain_id || d.dom_id}`);
          console.log(`   Name: ${d.domain_name || d.title}`);
          console.log('');
        });
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

findPovertyVariable()
  .then(() => {
    console.log('\n✅ Search complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Search error:', error);
    process.exit(1);
  });
