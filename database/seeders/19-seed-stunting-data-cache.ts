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

// Indonesian provinces with codes and realistic stunting data
// Data based on Kemenkes (Ministry of Health) reports
const PROVINCES_STUNTING_DATA = [
  { name: 'Papua', code: '91', base_stunting: 31.8, base_severe: 12.4, trend: -0.8, intervention_priority: 'high' },
  { name: 'Papua Barat', code: '92', base_stunting: 30.2, base_severe: 11.8, trend: -0.7, intervention_priority: 'high' },
  { name: 'Nusa Tenggara Timur', code: '53', base_stunting: 35.3, base_severe: 14.2, trend: -1.0, intervention_priority: 'high' },
  { name: 'Sulawesi Barat', code: '76', base_stunting: 30.1, base_severe: 11.5, trend: -0.9, intervention_priority: 'high' },
  { name: 'Kalimantan Selatan', code: '63', base_stunting: 29.8, base_severe: 10.8, trend: -0.7, intervention_priority: 'high' },
  { name: 'Sulawesi Tenggara', code: '74', base_stunting: 28.4, base_severe: 10.2, trend: -0.6, intervention_priority: 'high' },
  { name: 'Kalimantan Tengah', code: '62', base_stunting: 27.9, base_severe: 9.8, trend: -0.6, intervention_priority: 'medium' },
  { name: 'Aceh', code: '11', base_stunting: 31.2, base_severe: 11.4, trend: -0.8, intervention_priority: 'high' },
  { name: 'Nusa Tenggara Barat', code: '52', base_stunting: 30.5, base_severe: 11.0, trend: -0.8, intervention_priority: 'high' },
  { name: 'Gorontalo', code: '75', base_stunting: 28.7, base_severe: 10.1, trend: -0.7, intervention_priority: 'medium' },
  { name: 'Maluku Utara', code: '82', base_stunting: 27.3, base_severe: 9.5, trend: -0.6, intervention_priority: 'medium' },
  { name: 'Maluku', code: '81', base_stunting: 26.8, base_severe: 9.2, trend: -0.6, intervention_priority: 'medium' },
  { name: 'Sulawesi Tengah', code: '72', base_stunting: 26.1, base_severe: 8.9, trend: -0.6, intervention_priority: 'medium' },
  { name: 'Lampung', code: '18', base_stunting: 25.4, base_severe: 8.4, trend: -0.5, intervention_priority: 'medium' },
  { name: 'Bengkulu', code: '17', base_stunting: 24.8, base_severe: 8.1, trend: -0.5, intervention_priority: 'medium' },
  { name: 'Kalimantan Barat', code: '61', base_stunting: 24.2, base_severe: 7.8, trend: -0.5, intervention_priority: 'medium' },
  { name: 'Sulawesi Utara', code: '71', base_stunting: 23.7, base_severe: 7.5, trend: -0.5, intervention_priority: 'medium' },
  { name: 'Sulawesi Selatan', code: '73', base_stunting: 23.1, base_severe: 7.2, trend: -0.5, intervention_priority: 'medium' },
  { name: 'Jambi', code: '15', base_stunting: 22.8, base_severe: 7.0, trend: -0.4, intervention_priority: 'medium' },
  { name: 'Sumatera Selatan', code: '16', base_stunting: 22.3, base_severe: 6.8, trend: -0.4, intervention_priority: 'medium' },
  { name: 'Jawa Timur', code: '35', base_stunting: 21.9, base_severe: 6.5, trend: -0.4, intervention_priority: 'medium' },
  { name: 'Jawa Tengah', code: '33', base_stunting: 21.2, base_severe: 6.2, trend: -0.4, intervention_priority: 'medium' },
  { name: 'Kalimantan Timur', code: '64', base_stunting: 20.7, base_severe: 5.9, trend: -0.4, intervention_priority: 'medium' },
  { name: 'Kalimantan Utara', code: '65', base_stunting: 20.1, base_severe: 5.6, trend: -0.4, intervention_priority: 'low' },
  { name: 'Sumatera Utara', code: '12', base_stunting: 19.8, base_severe: 5.4, trend: -0.3, intervention_priority: 'low' },
  { name: 'Sumatera Barat', code: '13', base_stunting: 19.2, base_severe: 5.1, trend: -0.3, intervention_priority: 'low' },
  { name: 'Riau', code: '14', base_stunting: 18.7, base_severe: 4.9, trend: -0.3, intervention_priority: 'low' },
  { name: 'Jawa Barat', code: '32', base_stunting: 18.3, base_severe: 4.7, trend: -0.3, intervention_priority: 'low' },
  { name: 'Banten', code: '36', base_stunting: 17.8, base_severe: 4.5, trend: -0.3, intervention_priority: 'low' },
  { name: 'DI Yogyakarta', code: '34', base_stunting: 16.9, base_severe: 4.1, trend: -0.3, intervention_priority: 'low' },
  { name: 'Kepulauan Riau', code: '21', base_stunting: 15.8, base_severe: 3.7, trend: -0.2, intervention_priority: 'low' },
  { name: 'Kepulauan Bangka Belitung', code: '19', base_stunting: 15.2, base_severe: 3.5, trend: -0.2, intervention_priority: 'low' },
  { name: 'Bali', code: '51', base_stunting: 14.5, base_severe: 3.2, trend: -0.2, intervention_priority: 'low' },
  { name: 'DKI Jakarta', code: '31', base_stunting: 13.8, base_severe: 2.9, trend: -0.2, intervention_priority: 'low' },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateStuntingRate(baseRate: number, trend: number, yearOffset: number, month: number): number {
  // Apply yearly trend (stunting decreases over time due to interventions)
  let rate = baseRate + (trend * yearOffset);

  // Add seasonal variation (stunting tends to be higher in dry season)
  const seasonalVariation = Math.sin((month / 12) * Math.PI * 2) * 0.4;
  rate += seasonalVariation;

  // Add small random variation
  rate += (Math.random() - 0.5) * 0.3;

  // Ensure minimum of 5% and maximum of 40%
  return Math.max(5, Math.min(40, parseFloat(rate.toFixed(2))));
}

function calculateSevereStunting(stuntingRate: number, baseSevere: number): number {
  // Severe stunting is typically 30-40% of total stunting cases
  const severeRatio = baseSevere / (baseSevere * 3); // Approximate ratio
  const severeRate = stuntingRate * severeRatio;

  return parseFloat(Math.max(1, Math.min(15, severeRate)).toFixed(2));
}

function estimateStuntingCount(stuntingRate: number, provinceCode: string): number {
  // Population under 5 years estimates by province (in thousands)
  const populationsUnder5: { [key: string]: number } = {
    '31': 850,   // DKI Jakarta
    '32': 4200,  // Jawa Barat
    '33': 2900,  // Jawa Tengah
    '34': 280,   // DI Yogyakarta
    '35': 3200,  // Jawa Timur
    '36': 1050,  // Banten
    '11': 450,   // Aceh
    '12': 1350,  // Sumatera Utara
    '13': 480,   // Sumatera Barat
    '14': 580,   // Riau
    '15': 320,   // Jambi
    '16': 780,   // Sumatera Selatan
    '17': 180,   // Bengkulu
    '18': 740,   // Lampung
    '19': 130,   // Kepulauan Bangka Belitung
    '21': 190,   // Kepulauan Riau
    '51': 380,   // Bali
    '52': 480,   // Nusa Tenggara Barat
    '53': 520,   // Nusa Tenggara Timur
    '61': 490,   // Kalimantan Barat
    '62': 250,   // Kalimantan Tengah
    '63': 380,   // Kalimantan Selatan
    '64': 350,   // Kalimantan Timur
    '65': 65,    // Kalimantan Utara
    '71': 230,   // Sulawesi Utara
    '72': 280,   // Sulawesi Tengah
    '73': 840,   // Sulawesi Selatan
    '74': 240,   // Sulawesi Tenggara
    '75': 110,   // Gorontalo
    '76': 130,   // Sulawesi Barat
    '81': 160,   // Maluku
    '82': 120,   // Maluku Utara
    '91': 420,   // Papua
    '92': 105,   // Papua Barat
  };

  const population = populationsUnder5[provinceCode] || 250; // Default 250k
  const stuntingCount = (population * 1000 * stuntingRate) / 100;

  return Math.round(stuntingCount);
}

function getInterventionPrograms(priority: string): string[] {
  const basePrograms = ['POSYANDU', 'PMT', 'VITAMIN_A', 'IRON_SUPPLEMENTS'];

  if (priority === 'high') {
    return [...basePrograms, 'NUTRITION_COUNSELING', 'HOME_VISIT', 'FOOD_ASSISTANCE', 'HEALTH_MONITORING'];
  } else if (priority === 'medium') {
    return [...basePrograms, 'NUTRITION_COUNSELING', 'HEALTH_MONITORING'];
  } else {
    return basePrograms;
  }
}

function getDataSource(year: number, month: number): string {
  // Simulate different data sources
  if (year === 2024 && month >= 6) return 'kemenkes_api';
  if (year === 2024) return 'cached';
  if (Math.random() > 0.6) return 'kemenkes_api';
  return 'cached';
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

async function seedStuntingDataCache() {
  log('================================================================================');
  log('SEEDING SCRIPT 19: STUNTING DATA CACHE');
  log('================================================================================');

  try {
    log('Initializing Supabase client...');
    const { data: testData, error: testError } = await supabase.from('stunting_data_cache').select('count').limit(1);
    if (testError) throw new Error(`Supabase connection failed: ${testError.message}`);
    log('✅ Supabase client initialized');

    // ============================================
    // STEP 1: CLEAR EXISTING DATA
    // ============================================

    log('\n================================================================================');
    log('STEP 1: CLEARING EXISTING STUNTING DATA');
    log('================================================================================');

    const { error: deleteError } = await supabase
      .from('stunting_data_cache')
      .delete()
      .neq('id', 0); // Delete all records

    if (deleteError) {
      log(`⚠️  Warning: Could not clear existing data: ${deleteError.message}`);
    } else {
      log('✅ Existing data cleared');
    }

    // ============================================
    // STEP 2: GENERATE STUNTING DATA
    // ============================================

    log('\n================================================================================');
    log('STEP 2: GENERATING STUNTING DATA CACHE');
    log('================================================================================');

    const stuntingDataRecords: any[] = [];

    for (const province of PROVINCES_STUNTING_DATA) {
      CONFIG.YEARS.forEach((year, yearIndex) => {
        // Annual data (one record per year, using December as reference month)
        const month = 12;

        const stuntingRate = calculateStuntingRate(
          province.base_stunting,
          province.trend,
          yearIndex,
          month
        );

        const severeStuntingRate = calculateSevereStunting(stuntingRate, province.base_severe);
        const stuntingCount = estimateStuntingCount(stuntingRate, province.code);
        const severeStuntingCount = Math.round(stuntingCount * (severeStuntingRate / stuntingRate));
        const interventionPrograms = getInterventionPrograms(province.intervention_priority);
        const source = getDataSource(year, month);

        // Create timestamp for last_updated (December 31st of each year)
        const lastUpdated = new Date(year, 11, 31).toISOString();

        stuntingDataRecords.push({
          province: province.name,
          province_code: province.code,
          year,
          month,
          stunting_rate: stuntingRate,
          stunting_count: stuntingCount,
          severe_stunting_rate: severeStuntingRate,
          severe_stunting_count: severeStuntingCount,
          intervention_programs: interventionPrograms,
          source,
          last_updated: lastUpdated,
        });
      });
    }

    log(`✅ Generated ${stuntingDataRecords.length} stunting data records`);

    // ============================================
    // STEP 3: INSERT TO DATABASE
    // ============================================

    log('\n================================================================================');
    log('STEP 3: INSERTING STUNTING DATA TO DATABASE');
    log('================================================================================');

    const totalBatches = Math.ceil(stuntingDataRecords.length / CONFIG.BATCH_SIZE);
    log(`Inserting ${stuntingDataRecords.length} records in ${totalBatches} batches...`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < stuntingDataRecords.length; i += CONFIG.BATCH_SIZE) {
      const batch = stuntingDataRecords.slice(i, i + CONFIG.BATCH_SIZE);
      const batchNumber = Math.floor(i / CONFIG.BATCH_SIZE) + 1;

      showProgress(i + batch.length, stuntingDataRecords.length, 'Inserting stunting data');

      const { error } = await supabase.from('stunting_data_cache').insert(batch);

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
    const bySource = stuntingDataRecords.reduce((acc: any, rec) => {
      acc[rec.source] = (acc[rec.source] || 0) + 1;
      return acc;
    }, {});

    const byYear = stuntingDataRecords.reduce((acc: any, rec) => {
      acc[rec.year] = (acc[rec.year] || 0) + 1;
      return acc;
    }, {});

    const byPriority = stuntingDataRecords.reduce((acc: any, rec) => {
      acc[rec.intervention_priority] = (acc[rec.intervention_priority] || 0) + 1;
      return acc;
    }, {});

    const avgStuntingRate = stuntingDataRecords.reduce((sum, r) => sum + r.stunting_rate, 0) / stuntingDataRecords.length;
    const avgSevereRate = stuntingDataRecords.reduce((sum, r) => sum + r.severe_stunting_rate, 0) / stuntingDataRecords.length;
    const totalStuntingCount = stuntingDataRecords.reduce((sum, r) => sum + r.stunting_count, 0);

    // Sort provinces by average stunting rate
    const provinceStats = PROVINCES_STUNTING_DATA.map(prov => {
      const provRecords = stuntingDataRecords.filter(r => r.province === prov.name);
      const avgRate = provRecords.reduce((sum, r) => sum + r.stunting_rate, 0) / provRecords.length;
      return { name: prov.name, avgRate };
    }).sort((a, b) => b.avgRate - a.avgRate);

    const stats = {
      summary: {
        total_records: stuntingDataRecords.length,
        total_provinces: PROVINCES_STUNTING_DATA.length,
        years_covered: CONFIG.YEARS,
        success_count: successCount,
        fail_count: failCount,
        success_rate: ((successCount / stuntingDataRecords.length) * 100).toFixed(1),
      },
      aggregates: {
        avg_stunting_rate: avgStuntingRate.toFixed(2),
        avg_severe_stunting_rate: avgSevereRate.toFixed(2),
        total_stunting_count: totalStuntingCount.toLocaleString(),
        data_points_per_province: stuntingDataRecords.length / PROVINCES_STUNTING_DATA.length,
      },
      by_source: bySource,
      by_year: byYear,
      by_intervention_priority: byPriority,
      highest_stunting: provinceStats.slice(0, 5).map(p => `${p.name} (${p.avgRate.toFixed(1)}%)`),
      lowest_stunting: provinceStats.slice(-5).reverse().map(p => `${p.name} (${p.avgRate.toFixed(1)}%)`),
    };

    // Print summary
    console.log('📊 STUNTING DATA CACHE:');
    console.log(`   Total Records: ${stats.summary.total_records}`);
    console.log(`   Total Provinces: ${stats.summary.total_provinces}`);
    console.log(`   Years Covered: ${CONFIG.YEARS.join(', ')}`);
    console.log(`   ✅ Success: ${stats.summary.success_count}`);
    console.log(`   ❌ Failed: ${stats.summary.fail_count}`);
    console.log(`   Success Rate: ${stats.summary.success_rate}%\n`);

    console.log('📊 AGGREGATE STATISTICS:');
    console.log(`   Avg Stunting Rate: ${stats.aggregates.avg_stunting_rate}%`);
    console.log(`   Avg Severe Stunting Rate: ${stats.aggregates.avg_severe_stunting_rate}%`);
    console.log(`   Total Stunting Cases: ${stats.aggregates.total_stunting_count} children`);
    console.log(`   Data Points per Province: ${stats.aggregates.data_points_per_province}\n`);

    console.log('📊 BY DATA SOURCE:');
    Object.entries(stats.by_source).forEach(([source, count]) => {
      const pct = ((count as number / stats.summary.total_records) * 100).toFixed(1);
      console.log(`   ${source.padEnd(18)}: ${String(count).padStart(4)} (${pct}%)`);
    });

    console.log('\n📊 BY INTERVENTION PRIORITY:');
    Object.entries(stats.by_intervention_priority).forEach(([priority, count]) => {
      const pct = ((count as number / stats.summary.total_records) * 100).toFixed(1);
      console.log(`   ${priority.padEnd(18)}: ${String(count).padStart(4)} (${pct}%)`);
    });

    console.log('\n📊 HIGHEST STUNTING RATES:');
    stats.highest_stunting.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item}`);
    });

    console.log('\n📊 LOWEST STUNTING RATES:');
    stats.lowest_stunting.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item}`);
    });

    // Save statistics to file
    const statsFilePath = path.join(__dirname, '../seeding-logs/19-stunting-data-cache-stats.json');
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

seedStuntingDataCache();
