// @ts-nocheck
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
import { supabase } from '../config/database.js';
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
  const { data, error } = await supabase
    .from('caterings')
    .select('id')
    .eq('user_id', userId)
    .single();

  return (error || !data) ? null : (data as any).id;
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

    // Get deliveries in last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: deliveries, error: deliveriesError } = await supabase
      .from('deliveries')
      .select(`
        id,
        created_at,
        issues(id, severity)
      `)
      .eq('catering_id', cateringId)
      .gte('created_at', sixMonthsAgo.toISOString());

    if (deliveriesError) {
      throw deliveriesError;
    }

    // Calculate stats from fetched data
    const totalDeliveries = (deliveries || []).length || 1;
    let totalIssues = 0;
    let criticalIssues = 0;
    let highIssues = 0;

    (deliveries || []).forEach((delivery: any) => {
      const issuesList = Array.isArray(delivery.issues) ? delivery.issues : (delivery.issues ? [delivery.issues] : []);
      if (issuesList.length > 0) {
        totalIssues++;
        issuesList.forEach((issue: any) => {
          if (issue.severity === 'critical') criticalIssues++;
          if (issue.severity === 'high') highIssues++;
        });
      }
    });

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
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: onTimeDeliveries, error: onTimeError } = await supabase
      .from('deliveries')
      .select(`
        id,
        issues!left(id, issue_type)
      `)
      .eq('catering_id', cateringId)
      .gte('created_at', threeMonthsAgo.toISOString());

    if (onTimeError) {
      throw onTimeError;
    }

    const totalDeliveriesOnTime = (onTimeDeliveries || []).length || 1;
    let onTimeCount = 0;

    (onTimeDeliveries || []).forEach((delivery: any) => {
      const issuesList = Array.isArray(delivery.issues) ? delivery.issues : (delivery.issues ? [delivery.issues] : []);
      const hasLateDeliveryIssue = issuesList.some((issue: any) => issue.issue_type === 'late_delivery');
      if (!hasLateDeliveryIssue) {
        onTimeCount++;
      }
    });

    const onTimePercentage = (onTimeCount / totalDeliveriesOnTime) * 100;

    // ============================================
    // 3. Get Skor Kualitas
    // ============================================
    const { data: qualityDeliveries, error: qualityError } = await supabase
      .from('deliveries')
      .select(`
        id,
        issues!left(id, issue_type)
      `)
      .eq('catering_id', cateringId)
      .gte('created_at', threeMonthsAgo.toISOString());

    if (qualityError) {
      throw qualityError;
    }

    const totalDeliveriesQuality = (qualityDeliveries || []).length || 1;
    let qualityIssuesCount = 0;

    (qualityDeliveries || []).forEach((delivery: any) => {
      const issuesList = Array.isArray(delivery.issues) ? delivery.issues : (delivery.issues ? [delivery.issues] : []);
      const hasQualityIssue = issuesList.some((issue: any) => issue.issue_type === 'quality_issue');
      if (hasQualityIssue) {
        qualityIssuesCount++;
      }
    });

    const qualityScore = ((totalDeliveriesQuality - qualityIssuesCount) / totalDeliveriesQuality) * 10;

    // ============================================
    // 4. Get Daftar Masalah yang Dilaporkan
    // ============================================
    const { data: issuesListData, error: issuesListError } = await supabase
      .from('issues')
      .select(`
        id,
        issue_type,
        description,
        severity,
        status,
        created_at,
        deliveries!inner(
          delivery_date,
          catering_id,
          schools(name)
        )
      `)
      .eq('deliveries.catering_id', cateringId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (issuesListError) {
      throw issuesListError;
    }

    // map issue types ke Bahasa Indonesia
    const issueTypeMap: Record<string, string> = {
      late_delivery: 'Keterlambatan Pengiriman',
      quality_issue: 'Kualitas Makanan',
      wrong_portions: 'Porsi Kurang',
      missing_delivery: 'Kemasan Rusak',
      other: 'Dokumentasi Tidak Lengkap',
    };

    const issues = (issuesListData || []).map((issue: any) => {
      const delivery = Array.isArray(issue.deliveries) ? issue.deliveries[0] : issue.deliveries;
      const school = delivery?.schools ? (Array.isArray(delivery.schools) ? delivery.schools[0] : delivery.schools) : null;

      return {
        id: issue.id,
        title: issueTypeMap[issue.issue_type] || issue.issue_type,
        description: issue.description,
        severity: issue.severity,
        status: issue.status,
        date: issue.created_at,
        schoolName: school?.name || 'Unknown School',
      };
    });

    // ============================================
    // 5. Get Trend Kualitas Layanan (6 bulan terakhir)
    // ============================================
    const { data: trendDeliveries, error: trendError } = await supabase
      .from('deliveries')
      .select(`
        id,
        created_at,
        issues(id)
      `)
      .eq('catering_id', cateringId)
      .gte('created_at', sixMonthsAgo.toISOString())
      .order('created_at', { ascending: true });

    if (trendError) {
      throw trendError;
    }

    // Group by month and calculate stats
    const monthlyStats: Record<number, { total: number; withoutIssues: number }> = {};

    (trendDeliveries || []).forEach((delivery: any) => {
      const date = new Date(delivery.created_at);
      const monthNum = date.getMonth() + 1; // 1-12

      if (!monthlyStats[monthNum]) {
        monthlyStats[monthNum] = { total: 0, withoutIssues: 0 };
      }

      monthlyStats[monthNum].total++;

      const issuesList = Array.isArray(delivery.issues) ? delivery.issues : (delivery.issues ? [delivery.issues] : []);
      if (issuesList.length === 0) {
        monthlyStats[monthNum].withoutIssues++;
      }
    });

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

    const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    const qualityTrend = Object.keys(monthlyStats)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map((monthNum) => {
        const stats = monthlyStats[parseInt(monthNum)];
        return {
          month: monthNames[parseInt(monthNum)],
          score: (stats.withoutIssues / stats.total) * 100,
        };
      });

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

    let query = supabase
      .from('issues')
      .select(`
        id,
        issue_type,
        description,
        severity,
        status,
        created_at,
        deliveries!inner(
          delivery_date,
          catering_id,
          schools(name)
        )
      `, { count: 'exact' })
      .eq('deliveries.catering_id', cateringId);

    if (status) {
      query = query.eq('status', status);
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    if (issueType) {
      query = query.eq('issue_type', issueType);
    }

    const { data: result, error: listError, count: total } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (listError) {
      throw listError;
    }

    // Transform the nested data structure
    const transformedData = (result || []).map((issue: any) => {
      const delivery = Array.isArray(issue.deliveries) ? issue.deliveries[0] : issue.deliveries;
      const school = delivery?.schools ? (Array.isArray(delivery.schools) ? delivery.schools[0] : delivery.schools) : null;

      return {
        id: issue.id,
        issue_type: issue.issue_type,
        description: issue.description,
        severity: issue.severity,
        status: issue.status,
        created_at: issue.created_at,
        delivery_date: delivery?.delivery_date,
        school_name: school?.name,
      };
    });

    res.json({
      success: true,
      data: transformedData,
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
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

    const { data: issuesData, error: statsError } = await supabase
      .from('issues')
      .select(`
        id,
        status,
        severity,
        deliveries!inner(catering_id)
      `)
      .eq('deliveries.catering_id', cateringId);

    if (statsError) {
      throw statsError;
    }

    // Calculate stats from fetched data
    const stats = {
      total_issues: (issuesData || []).length,
      open_issues: 0,
      investigating_issues: 0,
      resolved_issues: 0,
      closed_issues: 0,
      critical_issues: 0,
      high_issues: 0,
      medium_issues: 0,
      low_issues: 0,
    };

    (issuesData || []).forEach((issue: any) => {
      // Count by status
      if (issue.status === 'open') stats.open_issues++;
      if (issue.status === 'investigating') stats.investigating_issues++;
      if (issue.status === 'resolved') stats.resolved_issues++;
      if (issue.status === 'closed') stats.closed_issues++;

      // Count by severity
      if (issue.severity === 'critical') stats.critical_issues++;
      if (issue.severity === 'high') stats.high_issues++;
      if (issue.severity === 'medium') stats.medium_issues++;
      if (issue.severity === 'low') stats.low_issues++;
    });

    res.json({
      success: true,
      data: stats,
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
