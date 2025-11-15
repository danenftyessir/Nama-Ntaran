/**
 * AI Analytics API Endpoints
 *
 * Endpoints for:
 * - Anomaly detection
 * - Vendor risk assessment
 * - Budget optimization
 * - Demand forecasting
 */

import express from 'express';
import type { Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import {
  detectVerificationAnomalies,
  assessVendorRisk,
  optimizeBudgetAllocation,
  forecastDemand,
} from '../services/aiAnalytics.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ============================================
// GET /api/ai-analytics/anomalies
// Get detected anomalies (fraud patterns, suspicious activity)
// ============================================
router.get('/anomalies', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    console.log('[API] Detecting anomalies...');

    const anomalies = await detectVerificationAnomalies();

    res.json({
      success: true,
      count: anomalies.length,
      anomalies: anomalies,
    });
  } catch (error: any) {
    console.error('[API] Anomaly detection failed:', error);
    res.status(500).json({
      error: 'Failed to detect anomalies',
      details: error.message,
    });
  }
});

// ============================================
// GET /api/ai-analytics/vendor-risk/:cateringId
// Get risk assessment for a vendor
// ============================================
router.get('/vendor-risk/:cateringId', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const cateringId = parseInt(req.params.cateringId);

    if (isNaN(cateringId)) {
      return res.status(400).json({ error: 'Invalid catering ID' });
    }

    console.log(`[API] Assessing risk for catering #${cateringId}...`);

    const riskAssessment = await assessVendorRisk(cateringId);

    res.json({
      success: true,
      riskAssessment,
    });
  } catch (error: any) {
    console.error('[API] Vendor risk assessment failed:', error);
    res.status(500).json({
      error: 'Failed to assess vendor risk',
      details: error.message,
    });
  }
});

// ============================================
// POST /api/ai-analytics/optimize-budget
// Get AI-powered budget allocation recommendations
// ============================================
router.post('/optimize-budget', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { totalBudget } = req.body;

    if (!totalBudget || totalBudget <= 0) {
      return res.status(400).json({ error: 'Valid totalBudget is required' });
    }

    console.log(`[API] Optimizing budget allocation for Rp ${totalBudget.toLocaleString()}...`);

    const recommendations = await optimizeBudgetAllocation(totalBudget);

    res.json({
      success: true,
      totalBudget,
      recommendations,
    });
  } catch (error: any) {
    console.error('[API] Budget optimization failed:', error);
    res.status(500).json({
      error: 'Failed to optimize budget',
      details: error.message,
    });
  }
});

// ============================================
// GET /api/ai-analytics/forecast-demand
// Get demand forecast for a province
// ============================================
router.get('/forecast-demand', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { province, month } = req.query;

    if (!province || !month) {
      return res.status(400).json({ error: 'province and month (YYYY-MM format) are required' });
    }

    console.log(`[API] Forecasting demand for ${province}, ${month}...`);

    const forecast = await forecastDemand(province as string, month as string);

    res.json({
      success: true,
      forecast,
    });
  } catch (error: any) {
    console.error('[API] Demand forecasting failed:', error);
    res.status(500).json({
      error: 'Failed to forecast demand',
      details: error.message,
    });
  }
});

// ============================================
// GET /api/ai-analytics/summary
// Get summary of all AI insights
// ============================================
router.get('/summary', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    console.log('[API] Generating AI analytics summary...');

    // Run all analytics in parallel
    const [anomalies] = await Promise.all([
      detectVerificationAnomalies(),
    ]);

    // Count high-severity anomalies
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical' || a.severity === 'high');

    res.json({
      success: true,
      summary: {
        totalAnomalies: anomalies.length,
        criticalAnomalies: criticalAnomalies.length,
        anomalyTypes: {
          collusion: anomalies.filter(a => a.type === 'collusion').length,
          fakeVerification: anomalies.filter(a => a.type === 'fake_verification').length,
          lateDelivery: anomalies.filter(a => a.type === 'late_delivery_pattern').length,
        },
      },
      recentAnomalies: anomalies.slice(0, 5), // Top 5 most recent
    });
  } catch (error: any) {
    console.error('[API] Summary generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate summary',
      details: error.message,
    });
  }
});

export default router;
