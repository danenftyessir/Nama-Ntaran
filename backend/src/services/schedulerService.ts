/**
 * ============================================================================
 * SCHEDULER SERVICE - REAL-TIME PRIORITY SCORING & BPS DATA UPDATES
 * ============================================================================
 *
 * Purpose: Automated scheduling for:
 * - Priority score calculation (weekly)
 * - BPS poverty data refresh (monthly)
 * - Data cache cleanup (monthly)
 *
 * Uses: node-cron for scheduling
 * ============================================================================
 */

import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import { batchCalculatePriorityScores } from './priorityScoringService.js';
import { getAllProvincePovertyData } from './bpsDataService.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Schedule configurations (cron format)
const SCHEDULES = {
  // Priority scoring: Every Sunday at 2:00 AM
  PRIORITY_SCORING: process.env.PRIORITY_SCORING_SCHEDULE || '0 2 * * 0',

  // BPS data refresh: 1st day of every month at 3:00 AM
  BPS_DATA_REFRESH: process.env.BPS_DATA_REFRESH_SCHEDULE || '0 3 1 * *',

  // Health check: Every day at 1:00 AM
  HEALTH_CHECK: process.env.HEALTH_CHECK_SCHEDULE || '0 1 * * *',
};

// Batch size for processing
const BATCH_SIZE = parseInt(process.env.PRIORITY_SCORING_BATCH_SIZE || '1000', 10);

// ============================================================================
// JOB TRACKING
// ============================================================================

interface JobStatus {
  lastRun: Date | null;
  lastSuccess: Date | null;
  lastError: string | null;
  isRunning: boolean;
  runCount: number;
}

const jobStatuses: Record<string, JobStatus> = {
  priorityScoring: {
    lastRun: null,
    lastSuccess: null,
    lastError: null,
    isRunning: false,
    runCount: 0,
  },
  bpsDataRefresh: {
    lastRun: null,
    lastSuccess: null,
    lastError: null,
    isRunning: false,
    runCount: 0,
  },
  healthCheck: {
    lastRun: null,
    lastSuccess: null,
    lastError: null,
    isRunning: false,
    runCount: 0,
  },
};

// ============================================================================
// SCHEDULED JOBS
// ============================================================================

/**
 * Priority Scoring Job
 * Calculates priority scores for all schools in batches
 */
async function priorityScoringJob() {
  const jobName = 'priorityScoring';

  if (jobStatuses[jobName].isRunning) {
    console.log('[Scheduler] Priority scoring job already running, skipping...');
    return;
  }

  console.log('\n' + '='.repeat(80));
  console.log('[Scheduler] Starting PRIORITY SCORING JOB');
  console.log('='.repeat(80));

  jobStatuses[jobName].isRunning = true;
  jobStatuses[jobName].lastRun = new Date();
  jobStatuses[jobName].runCount++;

  try {
    // Get total school count
    const { count: totalSchools } = await supabase
      .from('schools')
      .select('id', { count: 'exact', head: true });

    if (!totalSchools) {
      throw new Error('No schools found in database');
    }

    console.log(`[Scheduler] Processing ${totalSchools} schools in batches of ${BATCH_SIZE}`);

    let offset = 0;
    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalFailed = 0;

    // Process in batches
    while (offset < totalSchools) {
      console.log(`\n[Scheduler] Batch ${Math.floor(offset / BATCH_SIZE) + 1}: Processing schools ${offset + 1} to ${Math.min(offset + BATCH_SIZE, totalSchools)}`);

      const result = await batchCalculatePriorityScores(supabase, BATCH_SIZE, offset);

      totalProcessed += result.processed;
      totalUpdated += result.updated;
      totalFailed += result.failed;

      console.log(`[Scheduler] Batch complete: ${result.updated}/${result.processed} updated, ${result.failed} failed`);
      console.log(`[Scheduler] Score range: ${result.summary.minScore} - ${result.summary.maxScore} (avg: ${result.summary.avgScore})`);
      console.log(`[Scheduler] Distribution: ${result.summary.highPriority} high, ${result.summary.mediumPriority} medium, ${result.summary.lowPriority} low`);

      offset += BATCH_SIZE;

      // Small delay between batches to avoid overwhelming database
      if (offset < totalSchools) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('[Scheduler] PRIORITY SCORING JOB COMPLETED');
    console.log(`[Scheduler] Total: ${totalUpdated}/${totalProcessed} schools updated, ${totalFailed} failed`);
    console.log('='.repeat(80) + '\n');

    jobStatuses[jobName].lastSuccess = new Date();
    jobStatuses[jobName].lastError = null;
  } catch (error: any) {
    console.error('[Scheduler] Priority scoring job failed:', error.message);
    jobStatuses[jobName].lastError = error.message;
  } finally {
    jobStatuses[jobName].isRunning = false;
  }
}

/**
 * BPS Data Refresh Job
 * Fetches latest poverty data from BPS API for all provinces
 */
async function bpsDataRefreshJob() {
  const jobName = 'bpsDataRefresh';

  if (jobStatuses[jobName].isRunning) {
    console.log('[Scheduler] BPS data refresh job already running, skipping...');
    return;
  }

  console.log('\n' + '='.repeat(80));
  console.log('[Scheduler] Starting BPS DATA REFRESH JOB');
  console.log('='.repeat(80));

  jobStatuses[jobName].isRunning = true;
  jobStatuses[jobName].lastRun = new Date();
  jobStatuses[jobName].runCount++;

  try {
    // Fetch data for all provinces
    const povertyData = await getAllProvincePovertyData();

    console.log(`[Scheduler] Fetched poverty data for ${povertyData.length} provinces`);

    // Count data sources
    const bpsApiCount = povertyData.filter(d => d.source === 'bps_api').length;
    const cachedCount = povertyData.filter(d => d.source === 'cached').length;
    const simulatedCount = povertyData.filter(d => d.source === 'simulated').length;

    console.log(`[Scheduler] Data sources: ${bpsApiCount} BPS API, ${cachedCount} cached, ${simulatedCount} simulated`);

    console.log('\n' + '='.repeat(80));
    console.log('[Scheduler] BPS DATA REFRESH JOB COMPLETED');
    console.log('='.repeat(80) + '\n');

    jobStatuses[jobName].lastSuccess = new Date();
    jobStatuses[jobName].lastError = null;
  } catch (error: any) {
    console.error('[Scheduler] BPS data refresh job failed:', error.message);
    jobStatuses[jobName].lastError = error.message;
  } finally {
    jobStatuses[jobName].isRunning = false;
  }
}

/**
 * Health Check Job
 * Verifies system health and logs status
 */
async function healthCheckJob() {
  const jobName = 'healthCheck';

  jobStatuses[jobName].lastRun = new Date();
  jobStatuses[jobName].runCount++;

  try {
    // Check database connection
    const { error: dbError } = await supabase
      .from('schools')
      .select('id', { count: 'exact', head: true });

    if (dbError) {
      throw new Error(`Database check failed: ${dbError.message}`);
    }

    console.log('[Scheduler] Health check: OK');

    jobStatuses[jobName].lastSuccess = new Date();
    jobStatuses[jobName].lastError = null;
  } catch (error: any) {
    console.error('[Scheduler] Health check failed:', error.message);
    jobStatuses[jobName].lastError = error.message;
  }
}

// ============================================================================
// SCHEDULER MANAGEMENT
// ============================================================================

let priorityScoringTask: cron.ScheduledTask | null = null;
let bpsDataRefreshTask: cron.ScheduledTask | null = null;
let healthCheckTask: cron.ScheduledTask | null = null;

/**
 * Start all scheduled jobs
 */
export function startScheduler() {
  console.log('\n' + '='.repeat(80));
  console.log('[Scheduler] STARTING SCHEDULER SERVICE');
  console.log('='.repeat(80));
  console.log(`[Scheduler] Priority Scoring: ${SCHEDULES.PRIORITY_SCORING} (Every Sunday 2:00 AM)`);
  console.log(`[Scheduler] BPS Data Refresh: ${SCHEDULES.BPS_DATA_REFRESH} (1st of month 3:00 AM)`);
  console.log(`[Scheduler] Health Check: ${SCHEDULES.HEALTH_CHECK} (Every day 1:00 AM)`);
  console.log('='.repeat(80) + '\n');

  // Priority Scoring: Every Sunday at 2:00 AM
  priorityScoringTask = cron.schedule(SCHEDULES.PRIORITY_SCORING, priorityScoringJob, {
    timezone: 'Asia/Jakarta',
  });

  // BPS Data Refresh: 1st day of every month at 3:00 AM
  bpsDataRefreshTask = cron.schedule(SCHEDULES.BPS_DATA_REFRESH, bpsDataRefreshJob, {
    timezone: 'Asia/Jakarta',
  });

  // Health Check: Every day at 1:00 AM
  healthCheckTask = cron.schedule(SCHEDULES.HEALTH_CHECK, healthCheckJob, {
    timezone: 'Asia/Jakarta',
  });

  console.log('[Scheduler] All scheduled jobs started successfully');
}

/**
 * Stop all scheduled jobs
 */
export function stopScheduler() {
  console.log('[Scheduler] Stopping all scheduled jobs...');

  if (priorityScoringTask) {
    priorityScoringTask.stop();
    priorityScoringTask = null;
  }

  if (bpsDataRefreshTask) {
    bpsDataRefreshTask.stop();
    bpsDataRefreshTask = null;
  }

  if (healthCheckTask) {
    healthCheckTask.stop();
    healthCheckTask = null;
  }

  console.log('[Scheduler] All scheduled jobs stopped');
}

/**
 * Get status of all scheduled jobs
 */
export function getSchedulerStatus() {
  return {
    enabled: priorityScoringTask !== null,
    schedules: SCHEDULES,
    jobs: jobStatuses,
    timezone: 'Asia/Jakarta',
  };
}

/**
 * Manually trigger priority scoring job
 */
export async function triggerPriorityScoring() {
  console.log('[Scheduler] Manual trigger: Priority Scoring');
  await priorityScoringJob();
}

/**
 * Manually trigger BPS data refresh job
 */
export async function triggerBpsDataRefresh() {
  console.log('[Scheduler] Manual trigger: BPS Data Refresh');
  await bpsDataRefreshJob();
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  start: startScheduler,
  stop: stopScheduler,
  getStatus: getSchedulerStatus,
  triggerPriorityScoring,
  triggerBpsDataRefresh,
};
