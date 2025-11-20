import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  YEARS: [2020, 2021, 2022, 2023, 2024],
  BATCH_SIZE: 50,
};

// Indonesian provinces with codes and realistic poverty data
const PROVINCES_DATA = [
  { name: 'Papua', code: '91', base_poverty: 26.8, base_gini: 0.384, trend: -0.4 },
  { name: 'Papua Barat', code: '92', base_poverty: 24.2, base_gini: 0.376, trend: -0.5 },
  { name: 'Nusa Tenggara Timur', code: '53', base_poverty: 21.3, base_gini: 0.361, trend: -0.6 },
  { name: 'Maluku', code: '81', base_poverty: 18.4, base_gini: 0.348, trend: -0.5 },
  { name: 'Nusa Tenggara Barat', code: '52', base_poverty: 14.6, base_gini: 0.352, trend: -0.4 },
  { name: 'Gorontalo', code: '75', base_poverty: 15.8, base_gini: 0.387, trend: -0.3 },
  { name: 'Maluku Utara', code: '82', base_poverty: 7.5, base_gini: 0.341, trend: -0.2 },
  { name: 'Bengkulu', code: '17', base_poverty: 14.7, base_gini: 0.349, trend: -0.4 },
  { name: 'Aceh', code: '11', base_poverty: 15.0, base_gini: 0.337, trend: -0.3 },
  { name: 'Sulawesi Barat', code: '76', base_poverty: 11.2, base_gini: 0.352, trend: -0.3 },
  { name: 'Sulawesi Tengah', code: '72', base_poverty: 12.8, base_gini: 0.371, trend: -0.4 },
  { name: 'Sulawesi Tenggara', code: '74', base_poverty: 11.3, base_gini: 0.389, trend: -0.3 },
  { name: 'Lampung', code: '18', base_poverty: 12.5, base_gini: 0.358, trend: -0.3 },
  { name: 'Sumatera Selatan', code: '16', base_poverty: 12.6, base_gini: 0.364, trend: -0.4 },
  { name: 'Jawa Timur', code: '35', base_poverty: 10.4, base_gini: 0.393, trend: -0.3 },
  { name: 'Jawa Tengah', code: '33', base_poverty: 10.8, base_gini: 0.368, trend: -0.3 },
  { name: 'Kalimantan Barat', code: '61', base_poverty: 7.0, base_gini: 0.322, trend: -0.2 },
  { name: 'Kalimantan Selatan', code: '63', base_poverty: 4.6, base_gini: 0.342, trend: -0.2 },
  { name: 'Kalimantan Tengah', code: '62', base_poverty: 5.1, base_gini: 0.319, trend: -0.2 },
  { name: 'Sulawesi Selatan', code: '73', base_poverty: 8.7, base_gini: 0.402, trend: -0.3 },
  { name: 'Sulawesi Utara', code: '71', base_poverty: 7.6, base_gini: 0.391, trend: -0.2 },
  { name: 'Sumatera Utara', code: '12', base_poverty: 8.7, base_gini: 0.327, trend: -0.3 },
  { name: 'Jambi', code: '15', base_poverty: 7.2, base_gini: 0.331, trend: -0.2 },
  { name: 'Jawa Barat', code: '32', base_poverty: 7.8, base_gini: 0.426, trend: -0.2 },
  { name: 'Banten', code: '36', base_poverty: 5.4, base_gini: 0.408, trend: -0.2 },
  { name: 'Sumatera Barat', code: '13', base_poverty: 6.2, base_gini: 0.329, trend: -0.2 },
  { name: 'Riau', code: '14', base_poverty: 6.9, base_gini: 0.334, trend: -0.2 },
  { name: 'Kalimantan Timur', code: '64', base_poverty: 5.8, base_gini: 0.327, trend: -0.2 },
  { name: 'Kalimantan Utara', code: '65', base_poverty: 6.7, base_gini: 0.313, trend: -0.2 },
  { name: 'DI Yogyakarta', code: '34', base_poverty: 11.2, base_gini: 0.436, trend: -0.3 },
  { name: 'Kepulauan Riau', code: '21', base_poverty: 5.6, base_gini: 0.359, trend: -0.1 },
  { name: 'Kepulauan Bangka Belitung', code: '19', base_poverty: 4.6, base_gini: 0.269, trend: -0.1 },
  { name: 'Bali', code: '51', base_poverty: 4.5, base_gini: 0.378, trend: -0.1 },
  { name: 'DKI Jakarta', code: '31', base_poverty: 4.5, base_gini: 0.404, trend: -0.1 },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculatePovertyRate(baseRate: number, trend: number, yearOffset: number, month: number): number {
  // Apply yearly trend
  let rate = baseRate + (trend * yearOffset);

  // Add seasonal variation (poverty tends to be higher in early year)
  const seasonalVariation = Math.sin((month / 12) * Math.PI) * 0.3;
  rate += seasonalVariation;

  // Add small random variation
  rate += (Math.random() - 0.5) * 0.2;

  // Ensure minimum of 2% and maximum of 35%
  return Math.max(2, Math.min(35, parseFloat(rate.toFixed(2))));
}

function calculateGiniRatio(baseGini: number, yearOffset: number): number {
  // Gini ratio changes very slowly
  const gini = baseGini + (Math.random() - 0.5) * 0.01 + (yearOffset * 0.002);

  // Gini ratio should be between 0.20 and 0.50
  return parseFloat(Math.max(0.20, Math.min(0.50, gini)).toFixed(3));
}

function estimatePovertyCount(povertyRate: number, provinceCode: string): number {
  // Rough population estimates by province (in millions)
  const populations: { [key: string]: number } = {
    '31': 10.6, // DKI Jakarta
    '32': 49.3, // Jawa Barat
    '33': 36.5, // Jawa Tengah
    '34': 3.7,  // DI Yogyakarta
    '35': 40.7, // Jawa Timur
    '36': 12.9, // Banten
    '11': 5.3,  // Aceh
    '12': 15.1, // Sumatera Utara
    '13': 5.5,  // Sumatera Barat
    '14': 6.4,  // Riau
    '15': 3.6,  // Jambi
    '16': 8.5,  // Sumatera Selatan
    '17': 2.0,  // Bengkulu
    '18': 8.1,  // Lampung
    '19': 1.5,  // Kepulauan Bangka Belitung
    '21': 2.1,  // Kepulauan Riau
    '51': 4.3,  // Bali
    '52': 5.3,  // Nusa Tenggara Barat
    '53': 5.5,  // Nusa Tenggara Timur
    '61': 5.4,  // Kalimantan Barat
    '62': 2.7,  // Kalimantan Tengah
    '63': 4.1,  // Kalimantan Selatan
    '64': 3.8,  // Kalimantan Timur
    '65': 0.7,  // Kalimantan Utara
    '71': 2.6,  // Sulawesi Utara
    '72': 3.0,  // Sulawesi Tengah
    '73': 9.1,  // Sulawesi Selatan
    '74': 2.6,  // Sulawesi Tenggara
    '75': 1.2,  // Gorontalo
    '76': 1.4,  // Sulawesi Barat
    '81': 1.8,  // Maluku
    '82': 1.3,  // Maluku Utara
    '91': 4.3,  // Papua
    '92': 1.1,  // Papua Barat
  };

  const population = populations[provinceCode] || 3.0; // Default 3 million
  const povertyCount = (population * 1000000 * povertyRate) / 100;

  return Math.round(povertyCount);
}

function getDataSource(year: number, month: number): string {
  // ALL data is simulated for development/demo purposes
  // In production, replace with actual BPS API integration
  return 'simulated';
}

// ============================================
// PROGRESS BAR
// ============================================

function showProgress(current: number, total: number, message: string) {
  const percentage = (current / total) * 100;
  const barLength = 30;
  const filledLength = Math.floor((barLength * current) / total);
  const bar = '█'.repeat(filledLength) + ' '.repeat(barLength - filledLength);
  process.stdout.write(`\r[${bar}] ${percentage.toFixed(1)}% - ${message} (${current}/${total})`);
  if (current === total) process.stdout.write('\n');
}

// ============================================
// TIME TRACKING
// ============================================

const startTime = Date.now();
function getElapsedTime() {
  return ((Date.now() - startTime) / 1000).toFixed(2);
}

function log(message: string) {
  console.log(`[${getElapsedTime()}s] ${message}`);
}

// ============================================
// MAIN SEEDING FUNCTION
// ============================================

async function seedPovertyDataCache() {
  log('================================================================================');
  log('SEEDING SCRIPT 15: POVERTY DATA CACHE');
  log('================================================================================');

  try {
    log('Initializing Supabase client...');
    const { data: testData, error: testError } = await supabase.from('poverty_data_cache').select('count').limit(1);
    if (testError) throw new Error(`Supabase connection failed: ${testError.message}`);
    log('✅ Supabase client initialized');

    // ============================================
    // STEP 1: CLEAR EXISTING DATA
    // ============================================

    log('\n================================================================================');
    log('STEP 1: CLEARING EXISTING POVERTY DATA');
    log('================================================================================');

    const { error: deleteError } = await supabase
      .from('poverty_data_cache')
      .delete()
      .neq('id', 0); // Delete all records

    if (deleteError) {
      log(`⚠️  Warning: Could not clear existing data: ${deleteError.message}`);
    } else {
      log('✅ Existing data cleared');
    }

    // ============================================
    // STEP 2: GENERATE POVERTY DATA
    // ============================================

    log('\n================================================================================');
    log('STEP 2: GENERATING POVERTY DATA CACHE');
    log('================================================================================');

    const povertyDataRecords: any[] = [];

    for (const province of PROVINCES_DATA) {
      CONFIG.YEARS.forEach((year, yearIndex) => {
        // Annual data (one record per year, using December as reference month)
        const month = 12;

        const povertyRate = calculatePovertyRate(
          province.base_poverty,
          province.trend,
          yearIndex,
          month
        );

        const giniRatio = calculateGiniRatio(province.base_gini, yearIndex);
        const povertyCount = estimatePovertyCount(povertyRate, province.code);
        const source = getDataSource(year, month);

        // Create timestamp for last_updated (December 31st of each year)
        const lastUpdated = new Date(year, 11, 31).toISOString();

        povertyDataRecords.push({
          province: province.name,
          province_code: province.code,
          year,
          month,
          poverty_rate: povertyRate,
          poverty_count: povertyCount,
          gini_ratio: giniRatio,
          source,
          last_updated: lastUpdated,
        });
      });
    }

    log(`✅ Generated ${povertyDataRecords.length} poverty data records`);

    // ============================================
    // STEP 3: INSERT TO DATABASE
    // ============================================

    log('\n================================================================================');
    log('STEP 3: INSERTING POVERTY DATA TO DATABASE');
    log('================================================================================');

    const totalBatches = Math.ceil(povertyDataRecords.length / CONFIG.BATCH_SIZE);
    log(`Inserting ${povertyDataRecords.length} records in ${totalBatches} batches...`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < povertyDataRecords.length; i += CONFIG.BATCH_SIZE) {
      const batch = povertyDataRecords.slice(i, i + CONFIG.BATCH_SIZE);
      const batchNumber = Math.floor(i / CONFIG.BATCH_SIZE) + 1;

      showProgress(i + batch.length, povertyDataRecords.length, 'Inserting poverty data');

      const { error } = await supabase.from('poverty_data_cache').insert(batch);

      if (error) {
        console.error(`\n❌ Error in batch ${batchNumber}:`, error.message);
        failCount += batch.length;
      } else {
        successCount += batch.length;
      }
    }

    // ============================================
    // GENERATE STATISTICS
    // ============================================

    log('\n================================================================================');
    log('SEEDING SUMMARY');
    log('================================================================================\n');

    // Calculate statistics
    const bySource = povertyDataRecords.reduce((acc: any, rec) => {
      acc[rec.source] = (acc[rec.source] || 0) + 1;
      return acc;
    }, {});

    const byYear = povertyDataRecords.reduce((acc: any, rec) => {
      acc[rec.year] = (acc[rec.year] || 0) + 1;
      return acc;
    }, {});

    const avgPovertyRate = povertyDataRecords.reduce((sum, r) => sum + r.poverty_rate, 0) / povertyDataRecords.length;
    const avgGiniRatio = povertyDataRecords.reduce((sum, r) => sum + r.gini_ratio, 0) / povertyDataRecords.length;
    const totalPovertyCount = povertyDataRecords.reduce((sum, r) => sum + r.poverty_count, 0);

    // Sort provinces by average poverty rate
    const provinceStats = PROVINCES_DATA.map(prov => {
      const provRecords = povertyDataRecords.filter(r => r.province === prov.name);
      const avgRate = provRecords.reduce((sum, r) => sum + r.poverty_rate, 0) / provRecords.length;
      return { name: prov.name, avgRate };
    }).sort((a, b) => b.avgRate - a.avgRate);

    const stats = {
      summary: {
        total_records: povertyDataRecords.length,
        total_provinces: PROVINCES_DATA.length,
        years_covered: CONFIG.YEARS,
        success_count: successCount,
        fail_count: failCount,
        success_rate: ((successCount / povertyDataRecords.length) * 100).toFixed(1),
      },
      aggregates: {
        avg_poverty_rate: avgPovertyRate.toFixed(2),
        avg_gini_ratio: avgGiniRatio.toFixed(3),
        total_poverty_count: totalPovertyCount.toLocaleString(),
        data_points_per_province: povertyDataRecords.length / PROVINCES_DATA.length,
      },
      by_source: bySource,
      by_year: byYear,
      highest_poverty: provinceStats.slice(0, 5).map(p => `${p.name} (${p.avgRate.toFixed(1)}%)`),
      lowest_poverty: provinceStats.slice(-5).reverse().map(p => `${p.name} (${p.avgRate.toFixed(1)}%)`),
    };

    // Print summary
    console.log('📊 POVERTY DATA CACHE:');
    console.log(`   Total Records: ${stats.summary.total_records}`);
    console.log(`   Total Provinces: ${stats.summary.total_provinces}`);
    console.log(`   Years Covered: ${CONFIG.YEARS.join(', ')}`);
    console.log(`   ✅ Success: ${stats.summary.success_count}`);
    console.log(`   ❌ Failed: ${stats.summary.fail_count}`);
    console.log(`   Success Rate: ${stats.summary.success_rate}%\n`);

    console.log('📊 AGGREGATE STATISTICS:');
    console.log(`   Avg Poverty Rate: ${stats.aggregates.avg_poverty_rate}%`);
    console.log(`   Avg Gini Ratio: ${stats.aggregates.avg_gini_ratio}`);
    console.log(`   Total Poverty Count: ${stats.aggregates.total_poverty_count} people`);
    console.log(`   Data Points per Province: ${stats.aggregates.data_points_per_province}\n`);

    console.log('📊 BY DATA SOURCE:');
    Object.entries(stats.by_source).forEach(([source, count]) => {
      const pct = ((count as number / stats.summary.total_records) * 100).toFixed(1);
      console.log(`   ${source.padEnd(15)}: ${String(count).padStart(4)} (${pct}%)`);
    });

    console.log('\n📊 BY YEAR:');
    Object.entries(stats.by_year).forEach(([year, count]) => {
      console.log(`   ${year}: ${count}`);
    });

    console.log('\n📊 HIGHEST POVERTY RATES:');
    stats.highest_poverty.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item}`);
    });

    console.log('\n📊 LOWEST POVERTY RATES:');
    stats.lowest_poverty.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item}`);
    });

    // Save statistics to file
    const statsFilePath = path.join(__dirname, '../seeding-logs/15-poverty-data-cache-stats.json');
    fs.writeFileSync(statsFilePath, JSON.stringify(stats, null, 2));

    log('\n================================================================================');
    log('✅ SEEDING COMPLETED!');
    log('================================================================================');
    log(`\nStats saved to: ${statsFilePath}`);
    log('✅ Script execution completed');

  } catch (error: any) {
    console.error('\n❌ SEEDING FAILED:', error.message);
    process.exit(1);
  }
}

// ============================================
// RUN SEEDING
// ============================================

seedPovertyDataCache();
