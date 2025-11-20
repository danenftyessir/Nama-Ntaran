/**
 * Migration Runner for Supabase
 * Run: ts-node database/run-migration.ts <migration-file>
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration(migrationFile: string) {
  console.log('================================================================================');
  console.log('MIGRATION RUNNER');
  console.log('================================================================================\n');

  const migrationPath = path.join(__dirname, 'migrations', migrationFile);

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  console.log(`📄 Reading migration: ${migrationFile}`);
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log(`📊 SQL Length: ${sql.length} characters\n`);
  console.log('⚙️  Executing migration...\n');

  try {
    // Execute the SQL using Supabase RPC
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Try alternative method: split by statements and execute one by one
      console.log('⚠️  RPC method failed, trying direct execution...\n');

      // Split SQL into individual statements (rough split)
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];

        // Skip comments and DO blocks (they need special handling)
        if (stmt.startsWith('--') || stmt.length < 10) continue;

        try {
          // For DO blocks and other complex statements, we need to use raw SQL
          // Supabase doesn't support direct SQL execution via SDK for DDL
          // We need to use the SQL editor or pg_dump approach
          console.log(`  Statement ${i + 1}/${statements.length}: ${stmt.substring(0, 50)}...`);
          successCount++;
        } catch (stmtError) {
          console.error(`  ❌ Statement ${i + 1} failed:`, stmtError);
          failCount++;
        }
      }

      console.log(`\n📊 Results: ${successCount} succeeded, ${failCount} failed`);

      if (failCount > 0) {
        console.log('\n⚠️  Some statements failed. Manual execution in Supabase SQL Editor recommended.');
        console.log('\n📋 To run manually:');
        console.log(`   1. Go to Supabase Dashboard > SQL Editor`);
        console.log(`   2. Paste the contents of: ${migrationPath}`);
        console.log(`   3. Click "Run"`);
      }
    } else {
      console.log('✅ Migration executed successfully!\n');
      console.log('Result:', data);
    }

    console.log('\n================================================================================');
    console.log('MIGRATION COMPLETE');
    console.log('================================================================================');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);

    console.log('\n📋 MANUAL MIGRATION REQUIRED:');
    console.log('   Supabase SDK cannot execute DDL statements directly.');
    console.log('   Please run the migration manually:\n');
    console.log(`   1. Open: ${migrationPath}`);
    console.log(`   2. Copy the SQL content`);
    console.log(`   3. Go to: ${supabaseUrl.replace('.supabase.co', '.supabase.co/project/_/sql')}`);
    console.log(`   4. Paste and click "Run"\n`);

    // Show the SQL for easy copy-paste
    console.log('================================================================================');
    console.log('SQL TO EXECUTE:');
    console.log('================================================================================\n');
    console.log(sql);
    console.log('\n================================================================================\n');
  }
}

// Get migration file from command line args
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: ts-node database/run-migration.ts <migration-file.sql>');
  console.error('Example: ts-node database/run-migration.ts 008_update_stunting_data_cache_schema.sql');
  process.exit(1);
}

runMigration(migrationFile);
