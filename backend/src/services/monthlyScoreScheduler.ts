// @ts-nocheck
/**
 * MONTHLY SCORE SCHEDULER
 *
 * Automatically recalculates priority scores monthly using:
 * - Base mathematical formula (70%)
 * - AI urgency analysis (30%)
 *
 * Configure with environment variable: ENABLE_AI_SCORING=true/false
 */

import cron from 'node-cron';
import { supabase } from '../config/database.js';
import { batchCalculateHybridScores } from './hybridPriorityScoring.js';

// Configuration
const ENABLE_AI_SCORING = process.env.ENABLE_AI_SCORING === 'true';
const BATCH_SIZE = 1000;

// Cron schedule: Run at 2 AM on the 1st of every month
// Format: minute hour day month day-of-week
const MONTHLY_SCHEDULE = '0 2 1 * *';

/**
 * Monthly recalculation task
 */
async function runMonthlyRecalculation() {
  const startTime = new Date();
  console.log('\n' + '='.repeat(70));
  console.log(`🗓️  MONTHLY PRIORITY SCORE RECALCULATION`);
  console.log(`   Started: ${startTime.toISOString()}`);
  console.log(`   AI Scoring: ${ENABLE_AI_SCORING ? 'ENABLED' : 'DISABLED'}`);
  console.log('='.repeat(70));

  try {
    // Get total school count
    const { count: totalSchools, error: countError } = await supabase
      .from('schools')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Failed to count schools: ${countError.message}`);
    }

    console.log(`\n📊 Total schools to process: ${totalSchools}`);

    // Process in batches
    let offset = 0;
    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalFailed = 0;

    while (offset < (totalSchools || 0)) {
      console.log(`\n📦 Processing batch: ${offset + 1} to ${Math.min(offset + BATCH_SIZE, totalSchools || 0)}`);

      const result = await batchCalculateHybridScores(
        supabase,
        BATCH_SIZE,
        offset,
        ENABLE_AI_SCORING
      );

      totalProcessed += result.processed;
      totalUpdated += result.updated;
      totalFailed += result.failed;

      console.log(`   ✅ Batch complete: ${result.updated}/${result.processed} updated`);

      offset += BATCH_SIZE;

      // Break if processed fewer than batch size (last batch)
      if (result.processed < BATCH_SIZE) {
        break;
      }

      // Small delay between batches to avoid overloading
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000 / 60; // minutes

    console.log('\n' + '='.repeat(70));
    console.log('✅ MONTHLY RECALCULATION COMPLETE!');
    console.log('='.repeat(70));
    console.log(`📊 Summary:`);
    console.log(`   Total processed: ${totalProcessed}`);
    console.log(`   Total updated: ${totalUpdated}`);
    console.log(`   Total failed: ${totalFailed}`);
    console.log(`   Success rate: ${((totalUpdated / totalProcessed) * 100).toFixed(1)}%`);
    console.log(`   Duration: ${duration.toFixed(1)} minutes`);
    console.log(`   Completed: ${endTime.toISOString()}`);
    console.log('='.repeat(70) + '\n');

    // Log to database (optional)
    await logRecalculationToDatabase(supabase, {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      totalProcessed,
      totalUpdated,
      totalFailed,
      aiEnabled: ENABLE_AI_SCORING,
      durationMinutes: Math.round(duration * 10) / 10,
    });

  } catch (error: any) {
    console.error('\n❌ MONTHLY RECALCULATION FAILED!');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);

    // Log error to database
    await logRecalculationErrorToDatabase(supabase, error);
  }
}

/**
 * Log recalculation results to database
 */
async function logRecalculationToDatabase(supabase: any, logData: any) {
  try {
    const { error } = await supabase
      .from('priority_score_logs')
      .insert({
        type: 'monthly_recalculation',
        start_time: logData.startTime,
        end_time: logData.endTime,
        total_processed: logData.totalProcessed,
        total_updated: logData.totalUpdated,
        total_failed: logData.totalFailed,
        ai_enabled: logData.aiEnabled,
        duration_minutes: logData.durationMinutes,
        status: 'completed',
      });

    if (error) {
      console.warn('Failed to log recalculation to database:', error.message);
    }
  } catch (error) {
    console.warn('Error logging to database:', error);
  }
}

/**
 * Log error to database
 */
async function logRecalculationErrorToDatabase(supabase: any, error: any) {
  try {
    await supabase
      .from('priority_score_logs')
      .insert({
        type: 'monthly_recalculation',
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        status: 'failed',
        error_message: error.message,
      });
  } catch (err) {
    console.warn('Error logging error to database:', err);
  }
}

/**
 * Start the monthly scheduler
 */
export function startMonthlyScheduler() {
  console.log('\n📅 Monthly Score Scheduler Configuration:');
  console.log(`   Schedule: ${MONTHLY_SCHEDULE} (2 AM on 1st of each month)`);
  console.log(`   AI Scoring: ${ENABLE_AI_SCORING ? 'ENABLED ⚡' : 'DISABLED'}`);
  console.log(`   Batch Size: ${BATCH_SIZE} schools`);

  // Schedule the task
  cron.schedule(MONTHLY_SCHEDULE, async () => {
    await runMonthlyRecalculation();
  });

  console.log('✅ Monthly scheduler started successfully!\n');

  // Optional: Run immediately on startup if env var is set
  if (process.env.RUN_ON_STARTUP === 'true') {
    console.log('🚀 RUN_ON_STARTUP enabled - starting immediate recalculation...\n');
    setTimeout(() => runMonthlyRecalculation(), 5000); // 5 second delay
  }
}

/**
 * Stop the scheduler (for graceful shutdown)
 */
export function stopMonthlyScheduler() {
  console.log('📅 Monthly scheduler stopped');
}

// For manual execution
export { runMonthlyRecalculation };
