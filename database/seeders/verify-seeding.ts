/**
 * ============================================================================
 * SEEDING VERIFICATION SCRIPT
 * ============================================================================
 *
 * Purpose: Verify all seeding scripts have been run successfully
 * Run: npx ts-node database/seeders/verify-seeding.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Expected seeding results
const EXPECTED_SEEDING = [
  { script: '01', table: 'users', description: 'Users (all roles)', minRecords: 100 },
  { script: '01', table: 'schools', description: 'Schools', minRecords: 100 },
  { script: '01', table: 'caterings', description: 'Caterings', minRecords: 50 },
  { script: '02', table: 'menu_items', description: 'Menu Items', minRecords: 1000 },
  { script: '03', table: 'allocations', description: 'Budget Allocations', minRecords: 500 },
  { script: '04', table: 'deliveries', description: 'Deliveries', minRecords: 500 },
  { script: '05', table: 'verifications', description: 'Delivery Verifications', minRecords: 500 },
  { script: '06', table: 'payments', description: 'Payments', minRecords: 500 },
  { script: '07', table: 'issues', description: 'Issues/Problems', minRecords: 50 },
  { script: '08', table: 'escrow_transactions', description: 'Escrow Transactions (Blockchain)', minRecords: 50 },
  { script: '09', table: 'payment_events', description: 'Payment Events', minRecords: 1000 },
  { script: '10', table: 'delivery_confirmations', description: 'Delivery Confirmations', minRecords: 100 },
  { script: '11', table: 'public_payment_feed', description: 'Public Payment Feed', minRecords: 100 },
  { script: '12', table: 'refunds', description: 'Refunds', minRecords: 10 },
  { script: '13', table: 'payment_methods', description: 'Payment Methods', minRecords: 50 },
  { script: '14', table: 'blockchain_sync_log', description: 'Blockchain Sync Log', minRecords: 100 },
  { script: '15', table: 'poverty_data_cache', description: 'Poverty Data Cache (BPS)', minRecords: 100 },
  { script: '16', table: 'ai_food_analyses', description: 'AI Food Analyses', minRecords: 100 },
  { script: '17', table: 'anomaly_alerts', description: 'Anomaly Alerts (AI)', minRecords: 10 },
  { script: '18', table: 'vendor_risk_assessments', description: 'Vendor Risk Assessments', minRecords: 50 },
  { script: '19', table: 'stunting_data_cache', description: 'Stunting Data Cache (Kemenkes)', minRecords: 100 },
];

interface VerificationResult {
  script: string;
  table: string;
  description: string;
  expected: number;
  actual: number;
  status: 'OK' | 'WARNING' | 'MISSING' | 'ERROR';
  message: string;
}

async function verifyTable(
  table: string,
  minRecords: number
): Promise<{ count: number; error: string | null }> {
  try {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      return { count: 0, error: error.message };
    }

    return { count: count || 0, error: null };
  } catch (error: any) {
    return { count: 0, error: error.message };
  }
}

async function runVerification() {
  console.log('================================================================================');
  console.log('SEEDING VERIFICATION - WEB3 BLOCKCHAIN + AI SYSTEM');
  console.log('================================================================================\n');

  const results: VerificationResult[] = [];
  let totalTables = 0;
  let successTables = 0;
  let warningTables = 0;
  let missingTables = 0;
  let errorTables = 0;
  let totalRecords = 0;

  console.log('Verifying all seeded tables...\n');

  for (const seed of EXPECTED_SEEDING) {
    totalTables++;
    const { count, error } = await verifyTable(seed.table, seed.minRecords);

    let status: 'OK' | 'WARNING' | 'MISSING' | 'ERROR';
    let message: string;

    if (error) {
      status = 'ERROR';
      message = `Error: ${error}`;
      errorTables++;
    } else if (count === 0) {
      status = 'MISSING';
      message = 'No records found - seeding not run';
      missingTables++;
    } else if (count < seed.minRecords) {
      status = 'WARNING';
      message = `Below expected minimum (${count} < ${seed.minRecords})`;
      warningTables++;
    } else {
      status = 'OK';
      message = 'Seeded successfully';
      successTables++;
    }

    totalRecords += count;

    results.push({
      script: seed.script,
      table: seed.table,
      description: seed.description,
      expected: seed.minRecords,
      actual: count,
      status,
      message,
    });

    // Print status
    const statusIcon = {
      OK: '✅',
      WARNING: '⚠️',
      MISSING: '❌',
      ERROR: '🔴',
    }[status];

    console.log(
      `${statusIcon} [${seed.script}] ${seed.table.padEnd(30)} - ${count
        .toString()
        .padStart(6)} records (min: ${seed.minRecords})`
    );
  }

  // Summary
  console.log('\n================================================================================');
  console.log('VERIFICATION SUMMARY');
  console.log('================================================================================\n');

  console.log(`📊 Total Tables: ${totalTables}`);
  console.log(`✅ Success: ${successTables} (${((successTables / totalTables) * 100).toFixed(1)}%)`);
  console.log(`⚠️  Warning: ${warningTables}`);
  console.log(`❌ Missing: ${missingTables}`);
  console.log(`🔴 Error: ${errorTables}`);
  console.log(`\n📈 Total Records: ${totalRecords.toLocaleString()}`);

  // Detailed breakdown by status
  if (successTables > 0) {
    console.log('\n✅ SUCCESSFULLY SEEDED:');
    results
      .filter((r) => r.status === 'OK')
      .forEach((r) => {
        console.log(`   ${r.table.padEnd(30)} - ${r.actual.toLocaleString().padStart(8)} records`);
      });
  }

  if (warningTables > 0) {
    console.log('\n⚠️  WARNINGS (Below Expected):');
    results
      .filter((r) => r.status === 'WARNING')
      .forEach((r) => {
        console.log(
          `   [${r.script}] ${r.table.padEnd(30)} - ${r.actual} / ${r.expected} records`
        );
      });
  }

  if (missingTables > 0) {
    console.log('\n❌ MISSING (Not Seeded):');
    results
      .filter((r) => r.status === 'MISSING')
      .forEach((r) => {
        console.log(`   [${r.script}] ${r.table.padEnd(30)} - Run: npm run seed:${getScriptName(r.script)}`);
      });
  }

  if (errorTables > 0) {
    console.log('\n🔴 ERRORS:');
    results
      .filter((r) => r.status === 'ERROR')
      .forEach((r) => {
        console.log(`   [${r.script}] ${r.table.padEnd(30)} - ${r.message}`);
      });
  }

  // Recommendations
  console.log('\n================================================================================');
  console.log('RECOMMENDATIONS');
  console.log('================================================================================\n');

  if (missingTables > 0 || warningTables > 0) {
    console.log('🔧 To fix missing/incomplete seeding, run:\n');

    const scriptsToRun = new Set<string>();
    results
      .filter((r) => r.status === 'MISSING' || r.status === 'WARNING')
      .forEach((r) => scriptsToRun.add(r.script));

    Array.from(scriptsToRun)
      .sort()
      .forEach((script) => {
        const scriptName = getScriptName(script);
        console.log(`   npm run seed:${scriptName}`);
      });

    console.log('\nOr run all seeders:');
    console.log('   npm run seed:all');
  } else {
    console.log('🎉 All seeding completed successfully!');
    console.log('✅ Database is ready for production use.');
  }

  console.log('\n================================================================================\n');

  // Exit with appropriate code
  if (errorTables > 0 || missingTables > 0) {
    process.exit(1);
  } else if (warningTables > 0) {
    process.exit(2);
  } else {
    process.exit(0);
  }
}

function getScriptName(scriptNumber: string): string {
  const scriptMap: { [key: string]: string } = {
    '01': 'users',
    '02': 'menu-items',
    '03': 'allocations',
    '04': 'deliveries',
    '05': 'verifications',
    '06': 'payments',
    '07': 'issues',
    '08': 'escrow-transactions',
    '09': 'payment-events',
    '10': 'delivery-confirmations',
    '11': 'public-payment-feed',
    '12': 'refunds',
    '13': 'payment-methods',
    '14': 'blockchain-sync-log',
    '15': 'poverty-data-cache',
    '16': 'ai-food-analyses',
    '17': 'anomaly-alerts',
    '18': 'vendor-risk-assessments',
    '19': 'stunting-data-cache',
  };

  return scriptMap[scriptNumber] || `script-${scriptNumber}`;
}

// Run verification
runVerification();
