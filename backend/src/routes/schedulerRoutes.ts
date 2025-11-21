// @ts-nocheck
/**
 * ============================================================================
 * SCHEDULER ROUTES - REAL-TIME PRIORITY SCORING MANAGEMENT
 * ============================================================================
 *
 * Endpoints:
 * - GET  /api/scheduler/status - Get scheduler status
 * - POST /api/scheduler/trigger/priority-scoring - Manually trigger priority scoring
 * - POST /api/scheduler/trigger/bps-data-refresh - Manually trigger BPS data refresh
 *
 * ============================================================================
 */

import express from 'express';
import schedulerService from '../services/schedulerService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ============================================================================
// GET SCHEDULER STATUS
// ============================================================================

/**
 * GET /api/scheduler/status
 * Returns current status of all scheduled jobs
 */
router.get('/status', async (req, res) => {
  try {
    const status = schedulerService.getStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('[Scheduler API] Error getting status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get scheduler status',
      error: error.message,
    });
  }
});

// ============================================================================
// MANUAL TRIGGERS (ADMIN ONLY)
// ============================================================================

/**
 * POST /api/scheduler/trigger/priority-scoring
 * Manually trigger priority scoring job
 * Requires authentication
 */
router.post('/trigger/priority-scoring', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin' && req.user?.role !== 'system_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can trigger scheduled jobs',
      });
    }

    // Trigger the job (runs in background)
    schedulerService.triggerPriorityScoring();

    res.json({
      success: true,
      message: 'Priority scoring job triggered successfully. This will run in the background.',
    });
  } catch (error: any) {
    console.error('[Scheduler API] Error triggering priority scoring:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger priority scoring',
      error: error.message,
    });
  }
});

/**
 * POST /api/scheduler/trigger/bps-data-refresh
 * Manually trigger BPS data refresh job
 * Requires authentication
 */
router.post('/trigger/bps-data-refresh', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin' && req.user?.role !== 'system_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can trigger scheduled jobs',
      });
    }

    // Trigger the job (runs in background)
    schedulerService.triggerBpsDataRefresh();

    res.json({
      success: true,
      message: 'BPS data refresh job triggered successfully. This will run in the background.',
    });
  } catch (error: any) {
    console.error('[Scheduler API] Error triggering BPS data refresh:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger BPS data refresh',
      error: error.message,
    });
  }
});

// ============================================================================
// EXPORT
// ============================================================================

export default router;
