/**
 * ============================================
 * CATERING ISSUES & REPUTATION ROUTES
 * ============================================
 * Routes untuk dashboard issues dan reputasi catering
 * Menyediakan data masalah, rating, dan statistik kualitas
 *
 * Endpoints:
 * GET /api/catering/issues/dashboard - Get issues dashboard data
 * GET /api/catering/issues/list - Get list of issues
 * GET /api/catering/issues/stats - Get issues statistics
 *
 * Author: NutriChain Dev Team
 */

import express, { Router } from 'express';
import type { Response } from 'express';
import { pool } from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const router: Router = express.Router();

// semua routes memerlukan authentication dan role catering
router.use(authenticateToken);
router.use(requireRole('catering'));

// ============================================
// HELPER: Get Catering ID from User
// ============================================
async function getCateringIdFromUser(userId: number): Promise<number | null> {
  const result = await pool.query(
    'SELECT id FROM caterings WHERE user_id = $1',
    [userId]
  );
  return result.rows.length > 0 ? result.rows[0].id : null;
}

// ============================================
// GET /api/catering/issues/dashboard
// ============================================
/**
 * Get all issues dashboard data in one call
 * Returns: reputasi bisnis, persentase tepat waktu, skor kualitas, daftar masalah, trend
 */
router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cateringId = await getCateringIdFromUser(userId);
    if (!cateringId) {
      return res.status(404).json({ error: 'Catering not found for user' });
    }

    // ============================================
    // 1. Get Reputasi Bisnis (Rating dari reviews/issues)
    // ============================================
    // TODO: implementasi sistem review dari sekolah
    // untuk sementara, hitung dari severity dan jumlah issues
    const reputationQuery = `
      SELECT
        COUNT(*) as total_deliveries,
        COUNT(*) FILTER (WHERE i.id IS NOT NULL) as total_issues,
        COUNT(*) FILTER (WHERE i.severity = 'critical') as critical_issues,
        COUNT(*) FILTER (WHERE i.severity = 'high') as high_issues
      FROM deliveries d
      LEFT JOIN issues i ON d.id = i.delivery_id
      WHERE d.catering_id = $1
        AND d.created_at >= NOW() - INTERVAL '6 months'
    `;
    const reputationResult = await pool.query(reputationQuery, [cateringId]);
    const repData = reputationResult.rows[0];

    // hitung rating berdasarkan performa
    const totalDeliveries = parseInt(repData.total_deliveries) || 1;
    const totalIssues = parseInt(repData.total_issues) || 0;
    const criticalIssues = parseInt(repData.critical_issues) || 0;
    const highIssues = parseInt(repData.high_issues) || 0;

    // formula: 5.0 - (penalty dari issues)
    const issuePenalty = (totalIssues / totalDeliveries) * 2;
    const criticalPenalty = (criticalIssues / totalDeliveries) * 1;
    const highPenalty = (highIssues / totalDeliveries) * 0.5;
    const rating = Math.max(3.0, Math.min(5.0, 5.0 - issuePenalty - criticalPenalty - highPenalty));

    const reputation = {
      rating: parseFloat(rating.toFixed(1)),
      totalReviews: totalDeliveries,
    };

    // ============================================
    // 2. Get Persentase Tepat Waktu
    // ============================================
    const onTimeQuery = `
      SELECT
        COUNT(*) as total_deliveries,
        COUNT(*) FILTER (WHERE i.issue_type != 'late_delivery' OR i.id IS NULL) as on_time_deliveries
      FROM deliveries d
      LEFT JOIN issues i ON d.id = i.delivery_id AND i.issue_type = 'late_delivery'
      WHERE d.catering_id = $1
        AND d.created_at >= NOW() - INTERVAL '3 months'
    `;
    const onTimeResult = await pool.query(onTimeQuery, [cateringId]);
    const onTimeData = onTimeResult.rows[0];

    const totalDeliveriesOnTime = parseInt(onTimeData.total_deliveries) || 1;
    const onTimeDeliveries = parseInt(onTimeData.on_time_deliveries) || 0;
    const onTimePercentage = (onTimeDeliveries / totalDeliveriesOnTime) * 100;

    // ============================================
    // 3. Get Skor Kualitas
    // ============================================
    const qualityQuery = `
      SELECT
        COUNT(*) as total_deliveries,
        COUNT(*) FILTER (WHERE i.issue_type = 'quality_issue') as quality_issues
      FROM deliveries d
      LEFT JOIN issues i ON d.id = i.delivery_id AND i.issue_type = 'quality_issue'
      WHERE d.catering_id = $1
        AND d.created_at >= NOW() - INTERVAL '3 months'
    `;
    const qualityResult = await pool.query(qualityQuery, [cateringId]);
    const qualityData = qualityResult.rows[0];

    const totalDeliveriesQuality = parseInt(qualityData.total_deliveries) || 1;
    const qualityIssues = parseInt(qualityData.quality_issues) || 0;
    const qualityScore = ((totalDeliveriesQuality - qualityIssues) / totalDeliveriesQuality) * 10;

    // ============================================
    // 4. Get Daftar Masalah yang Dilaporkan
    // ============================================
    const issuesListQuery = `
      SELECT
        i.id,
        i.issue_type,
        i.description,
        i.severity,
        i.status,
        i.created_at,
        d.delivery_date,
        s.name as school_name
      FROM issues i
      LEFT JOIN deliveries d ON i.delivery_id = d.id
      LEFT JOIN schools s ON d.school_id = s.id
      WHERE d.catering_id = $1
      ORDER BY i.created_at DESC
      LIMIT 10
    `;
    const issuesListResult = await pool.query(issuesListQuery, [cateringId]);

    // map issue types ke Bahasa Indonesia
    const issueTypeMap: Record<string, string> = {
      late_delivery: 'Keterlambatan Pengiriman',
      quality_issue: 'Kualitas Makanan',
      wrong_portions: 'Porsi Kurang',
      missing_delivery: 'Kemasan Rusak',
      other: 'Dokumentasi Tidak Lengkap',
    };

    const issues = issuesListResult.rows.map((issue) => ({
      id: issue.id,
      title: issueTypeMap[issue.issue_type] || issue.issue_type,
      description: issue.description,
      severity: issue.severity,
      status: issue.status,
      date: issue.created_at,
      schoolName: issue.school_name || 'Unknown School',
    }));

    // ============================================
    // 5. Get Trend Kualitas Layanan (6 bulan terakhir)
    // ============================================
    const trendQuery = `
      SELECT
        TO_CHAR(d.created_at, 'Mon') as month,
        EXTRACT(MONTH FROM d.created_at) as month_num,
        COUNT(*) as total_deliveries,
        COUNT(*) FILTER (WHERE i.id IS NULL) as deliveries_without_issues
      FROM deliveries d
      LEFT JOIN issues i ON d.id = i.delivery_id
      WHERE d.catering_id = $1
        AND d.created_at >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(d.created_at, 'Mon'), EXTRACT(MONTH FROM d.created_at)
      ORDER BY month_num ASC
    `;
    const trendResult = await pool.query(trendQuery, [cateringId]);

    // map bulan ke Bahasa Indonesia
    const monthMap: Record<string, string> = {
      Jan: 'Januari',
      Feb: 'Februari',
      Mar: 'Maret',
      Apr: 'April',
      May: 'Mei',
      Jun: 'Juni',
      Jul: 'Juli',
      Aug: 'Agustus',
      Sep: 'September',
      Oct: 'Oktober',
      Nov: 'November',
      Dec: 'Desember',
    };

    const qualityTrend = trendResult.rows.map((row) => ({
      month: monthMap[row.month] || row.month,
      score: ((parseInt(row.deliveries_without_issues) || 0) / (parseInt(row.total_deliveries) || 1)) * 100,
    }));

    // jika tidak ada data, buat data demo
    if (qualityTrend.length === 0) {
      const demoMonths = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
      demoMonths.forEach((month) => {
        qualityTrend.push({
          month,
          score: 95 + Math.random() * 5, // random antara 95-100
        });
      });
    }

    // ============================================
    // Return Combined Response
    // ============================================
    res.json({
      success: true,
      data: {
        reputation,
        onTimePercentage: parseFloat(onTimePercentage.toFixed(1)),
        qualityScore: parseFloat(qualityScore.toFixed(1)),
        issues,
        qualityTrend,
      },
    });
  } catch (error: any) {
    console.error('Error fetching issues dashboard:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// ============================================
// GET /api/catering/issues/list
// ============================================
/**
 * Get issues list with pagination and filters
 */
router.get('/list', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cateringId = await getCateringIdFromUser(userId);
    if (!cateringId) {
      return res.status(404).json({ error: 'Catering not found for user' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const severity = req.query.severity as string;
    const issueType = req.query.issue_type as string;

    let query = `
      SELECT
        i.id,
        i.issue_type,
        i.description,
        i.severity,
        i.status,
        i.created_at,
        d.delivery_date,
        s.name as school_name
      FROM issues i
      LEFT JOIN deliveries d ON i.delivery_id = d.id
      LEFT JOIN schools s ON d.school_id = s.id
      WHERE d.catering_id = $1
    `;

    const params: any[] = [cateringId];
    let paramCounter = 2;

    if (status) {
      query += ` AND i.status = $${paramCounter}`;
      params.push(status);
      paramCounter++;
    }

    if (severity) {
      query += ` AND i.severity = $${paramCounter}`;
      params.push(severity);
      paramCounter++;
    }

    if (issueType) {
      query += ` AND i.issue_type = $${paramCounter}`;
      params.push(issueType);
      paramCounter++;
    }

    query += ` ORDER BY i.created_at DESC LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // get total count
    let countQuery = `
      SELECT COUNT(*)
      FROM issues i
      LEFT JOIN deliveries d ON i.delivery_id = d.id
      WHERE d.catering_id = $1
    `;
    const countParams = [cateringId];

    if (status) {
      countQuery += ' AND i.status = $2';
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching issues list:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// ============================================
// GET /api/catering/issues/stats
// ============================================
/**
 * Get issues statistics summary
 */
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cateringId = await getCateringIdFromUser(userId);
    if (!cateringId) {
      return res.status(404).json({ error: 'Catering not found for user' });
    }

    const statsQuery = `
      SELECT
        COUNT(*) as total_issues,
        COUNT(*) FILTER (WHERE i.status = 'open') as open_issues,
        COUNT(*) FILTER (WHERE i.status = 'investigating') as investigating_issues,
        COUNT(*) FILTER (WHERE i.status = 'resolved') as resolved_issues,
        COUNT(*) FILTER (WHERE i.status = 'closed') as closed_issues,
        COUNT(*) FILTER (WHERE i.severity = 'critical') as critical_issues,
        COUNT(*) FILTER (WHERE i.severity = 'high') as high_issues,
        COUNT(*) FILTER (WHERE i.severity = 'medium') as medium_issues,
        COUNT(*) FILTER (WHERE i.severity = 'low') as low_issues
      FROM issues i
      LEFT JOIN deliveries d ON i.delivery_id = d.id
      WHERE d.catering_id = $1
    `;

    const result = await pool.query(statsQuery, [cateringId]);

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error fetching issues stats:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

export default router;
