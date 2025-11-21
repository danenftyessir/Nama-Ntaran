// @ts-nocheck
import express from 'express';
import type { Response } from 'express';
import { supabase } from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/analytics/dashboard - Get dashboard statistics
router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    let stats = {};

    if (role === 'admin') {
      // Admin dashboard stats
      const [
        deliveriesData,
        schoolsData,
        cateringsData,
        verificationsData,
        issuesData
      ] = await Promise.all([
        // Fetch deliveries for budget and delivery statistics
        supabase.from('deliveries').select('amount, status, delivery_date'),
        // Fetch schools
        supabase.from('schools').select('id, user_id'),
        // Fetch caterings
        supabase.from('caterings').select('id, rating'),
        // Fetch verifications
        supabase.from('verifications').select('id, status, verified_at, quality_rating'),
        // Fetch issues
        supabase.from('issues').select('id, status, severity')
      ]);

      // Budget statistics (from deliveries)
      const deliveries = deliveriesData.data || [];
      const total_allocated = deliveries.reduce((sum, d) => sum + (d.amount || 0), 0);
      const total_disbursed = deliveries
        .filter(d => d.status === 'verified')
        .reduce((sum, d) => sum + (d.amount || 0), 0);
      const locked_escrow = deliveries
        .filter(d => d.status === 'scheduled' || d.status === 'delivered')
        .reduce((sum, d) => sum + (d.amount || 0), 0);

      // School statistics
      const schools = schoolsData.data || [];
      const total_schools = schools.length;
      const registered_schools = schools.filter(s => s.user_id !== null).length;

      // Catering statistics
      const caterings = cateringsData.data || [];
      const total_caterings = caterings.length;
      const avg_rating = caterings.length > 0
        ? Math.round((caterings.reduce((sum, c) => sum + (c.rating || 0), 0) / caterings.length) * 100) / 100
        : 0;

      // Delivery statistics
      const today = new Date().toISOString().split('T')[0];
      const total_deliveries = deliveries.length;
      const pending = deliveries.filter(d => d.status === 'pending').length;
      const scheduled = deliveries.filter(d => d.status === 'scheduled').length;
      const delivered = deliveries.filter(d => d.status === 'delivered').length;
      const verified = deliveries.filter(d => d.status === 'verified').length;
      const upcoming = deliveries.filter(d => d.delivery_date && d.delivery_date >= today).length;

      // Verification statistics
      const verifications = verificationsData.data || [];
      const total_verifications = verifications.length;
      const pending_verifications = verifications.filter(v => v.status === 'pending').length;
      const today_verifications = verifications.filter(v => v.verified_at && v.verified_at >= today).length;
      const avg_quality_rating = verifications.length > 0
        ? Math.round((verifications.reduce((sum, v) => sum + (v.quality_rating || 0), 0) / verifications.length) * 100) / 100
        : 0;

      // Issue statistics
      const issues = issuesData.data || [];
      const total_issues = issues.length;
      const open_issues = issues.filter(i => i.status === 'open').length;
      const critical_issues = issues.filter(i => i.severity === 'high' || i.severity === 'critical').length;

      stats = {
        budget: {
          total_allocated: total_allocated.toString(),
          total_disbursed: total_disbursed.toString(),
          locked_escrow: locked_escrow.toString()
        },
        schools: {
          total_schools: total_schools.toString(),
          registered_schools: registered_schools.toString()
        },
        caterings: {
          total_caterings: total_caterings.toString(),
          avg_rating: avg_rating.toString()
        },
        deliveries: {
          total_deliveries: total_deliveries.toString(),
          pending: pending.toString(),
          scheduled: scheduled.toString(),
          delivered: delivered.toString(),
          verified: verified.toString(),
          upcoming: upcoming.toString()
        },
        verifications: {
          total_verifications: total_verifications.toString(),
          pending: pending_verifications.toString(),
          today: today_verifications.toString(),
          avg_quality_rating: avg_quality_rating.toString()
        },
        issues: {
          total_issues: total_issues.toString(),
          open_issues: open_issues.toString(),
          critical_issues: critical_issues.toString()
        }
      };

    } else if (role === 'school') {
      // School dashboard stats
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('id')
        .eq('user_id', req.user?.id)
        .single();

      if (schoolError || !schoolData) {
        return res.status(404).json({ error: 'School not found for this user' });
      }

      const school_id = schoolData.id;

      const [schoolDeliveriesData, schoolVerificationsData, schoolIssuesData] = await Promise.all([
        // Fetch deliveries for this school
        supabase.from('deliveries').select('id, status, delivery_date, portions').eq('school_id', school_id),
        // Fetch verifications for this school
        supabase.from('verifications').select('id, verified_at, quality_rating').eq('school_id', school_id),
        // Fetch issues with delivery info for this school
        supabase.from('issues').select('id, status, delivery_id, deliveries!inner(school_id)').eq('deliveries.school_id', school_id)
      ]);

      // Delivery statistics
      const schoolDeliveries = schoolDeliveriesData.data || [];
      const today = new Date().toISOString().split('T')[0];
      const total_deliveries = schoolDeliveries.length;
      const pending_verifications = schoolDeliveries.filter(d => d.status === 'pending').length;
      const verified = schoolDeliveries.filter(d => d.status === 'verified').length;
      const upcoming = schoolDeliveries.filter(d => d.delivery_date && d.delivery_date >= today).length;
      const total_portions = schoolDeliveries.reduce((sum, d) => sum + (d.portions || 0), 0);

      // Verification statistics
      const schoolVerifications = schoolVerificationsData.data || [];
      const total_verifications = schoolVerifications.length;
      const verified_today = schoolVerifications.filter(v => v.verified_at && v.verified_at >= today).length;

      // Calculate start of current month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const verified_this_month = schoolVerifications.filter(v => v.verified_at && v.verified_at >= monthStart).length;
      const avg_quality_rating = schoolVerifications.length > 0
        ? Math.round((schoolVerifications.reduce((sum, v) => sum + (v.quality_rating || 0), 0) / schoolVerifications.length) * 100) / 100
        : 0;

      // Issue statistics
      const schoolIssues = schoolIssuesData.data || [];
      const total_issues = schoolIssues.length;
      const active_issues = schoolIssues.filter(i => i.status === 'open' || i.status === 'investigating').length;

      stats = {
        deliveries: {
          total_deliveries: total_deliveries.toString(),
          pending_verifications: pending_verifications.toString(),
          verified: verified.toString(),
          upcoming: upcoming.toString(),
          total_portions: total_portions.toString()
        },
        verifications: {
          total_verifications: total_verifications.toString(),
          verified_today: verified_today.toString(),
          verified_this_month: verified_this_month.toString(),
          avg_quality_rating: avg_quality_rating.toString()
        },
        issues: {
          total_issues: total_issues.toString(),
          active_issues: active_issues.toString()
        }
      };

    } else if (role === 'catering') {
      // Catering dashboard stats
      const { data: cateringData, error: cateringError } = await supabase
        .from('caterings')
        .select('id')
        .eq('user_id', req.user?.id)
        .single();

      if (cateringError || !cateringData) {
        return res.status(404).json({ error: 'Catering not found for this user' });
      }

      const catering_id = cateringData.id;

      const [cateringDeliveriesData, cateringVerificationsData, cateringIssuesData] = await Promise.all([
        // Fetch deliveries for this catering
        supabase.from('deliveries').select('id, status, delivery_date, amount').eq('catering_id', catering_id),
        // Fetch verifications with delivery info for this catering
        supabase.from('verifications').select('id, quality_rating, delivery_id, deliveries!inner(catering_id)').eq('deliveries.catering_id', catering_id),
        // Fetch issues with delivery info for this catering
        supabase.from('issues').select('id, status, severity, delivery_id, deliveries!inner(catering_id)').eq('deliveries.catering_id', catering_id)
      ]);

      // Delivery statistics
      const cateringDeliveries = cateringDeliveriesData.data || [];
      const today = new Date().toISOString().split('T')[0];
      const total_deliveries = cateringDeliveries.length;
      const pending = cateringDeliveries.filter(d => d.status === 'pending').length;
      const scheduled = cateringDeliveries.filter(d => d.status === 'scheduled').length;
      const delivered = cateringDeliveries.filter(d => d.status === 'delivered').length;
      const verified = cateringDeliveries.filter(d => d.status === 'verified').length;
      const today_deliveries = cateringDeliveries.filter(d => d.delivery_date && d.delivery_date >= today).length;

      // Payment statistics (from deliveries)
      const total_revenue = cateringDeliveries.reduce((sum, d) => sum + (d.amount || 0), 0);
      const disbursed = cateringDeliveries
        .filter(d => d.status === 'verified')
        .reduce((sum, d) => sum + (d.amount || 0), 0);
      const locked_escrow = cateringDeliveries
        .filter(d => d.status === 'scheduled' || d.status === 'delivered')
        .reduce((sum, d) => sum + (d.amount || 0), 0);
      const pending_payment = cateringDeliveries
        .filter(d => d.status === 'pending')
        .reduce((sum, d) => sum + (d.amount || 0), 0);

      // Verification statistics
      const cateringVerifications = cateringVerificationsData.data || [];
      const total_verifications = cateringVerifications.length;
      const avg_quality_rating = cateringVerifications.length > 0
        ? Math.round((cateringVerifications.reduce((sum, v) => sum + (v.quality_rating || 0), 0) / cateringVerifications.length) * 100) / 100
        : 0;
      const high_ratings = cateringVerifications.filter(v => (v.quality_rating || 0) >= 4).length;

      // Issue statistics
      const cateringIssues = cateringIssuesData.data || [];
      const total_issues = cateringIssues.length;
      const active_issues = cateringIssues.filter(i => i.status === 'open' || i.status === 'investigating').length;
      const critical_issues = cateringIssues.filter(i => i.severity === 'high' || i.severity === 'critical').length;

      stats = {
        deliveries: {
          total_deliveries: total_deliveries.toString(),
          pending: pending.toString(),
          scheduled: scheduled.toString(),
          delivered: delivered.toString(),
          verified: verified.toString(),
          today_deliveries: today_deliveries.toString()
        },
        payments: {
          total_revenue: total_revenue.toString(),
          disbursed: disbursed.toString(),
          locked_escrow: locked_escrow.toString(),
          pending_payment: pending_payment.toString()
        },
        verifications: {
          total_verifications: total_verifications.toString(),
          avg_quality_rating: avg_quality_rating.toString(),
          high_ratings: high_ratings.toString()
        },
        issues: {
          total_issues: total_issues.toString(),
          active_issues: active_issues.toString(),
          critical_issues: critical_issues.toString()
        }
      };
    }

    res.json({ stats });
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/analytics/recent-activity - Get recent activities
router.get('/recent-activity', async (req: AuthRequest, res: Response) => {
  try {
    const { limit = '10' } = req.query;
    const role = req.user?.role;
    const limitNum = parseInt(limit as string);

    let activities: any[] = [];

    if (role === 'admin') {
      // Fetch verifications, issues, and deliveries with joined data
      const [verificationsData, issuesData, deliveriesData] = await Promise.all([
        supabase
          .from('verifications')
          .select('id, created_at, status, deliveries!inner(school_id, catering_id, schools(name), caterings(name))')
          .order('created_at', { ascending: false }),
        supabase
          .from('issues')
          .select('id, created_at, status, deliveries!inner(school_id, catering_id, schools(name), caterings(name))')
          .order('created_at', { ascending: false }),
        supabase
          .from('deliveries')
          .select('id, created_at, status, school_id, catering_id, schools(name), caterings(name)')
          .order('created_at', { ascending: false })
      ]);

      // Transform verifications
      const verifications = (verificationsData.data || []).map(v => ({
        type: 'verification',
        id: v.id,
        timestamp: v.created_at,
        school_name: (v.deliveries as any)?.schools?.name || 'Unknown',
        catering_name: (v.deliveries as any)?.caterings?.name || 'Unknown',
        status: v.status
      }));

      // Transform issues
      const issues = (issuesData.data || []).map(i => ({
        type: 'issue',
        id: i.id,
        timestamp: i.created_at,
        school_name: (i.deliveries as any)?.schools?.name || 'Unknown',
        catering_name: (i.deliveries as any)?.caterings?.name || 'Unknown',
        status: i.status
      }));

      // Transform deliveries
      const deliveries = (deliveriesData.data || []).map(d => ({
        type: 'delivery',
        id: d.id,
        timestamp: d.created_at,
        school_name: (d.schools as any)?.name || 'Unknown',
        catering_name: (d.caterings as any)?.name || 'Unknown',
        status: d.status
      }));

      // Combine and sort all activities
      activities = [...verifications, ...issues, ...deliveries]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limitNum);

    } else if (role === 'school') {
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('id')
        .eq('user_id', req.user?.id)
        .single();

      if (schoolError || !schoolData) {
        return res.status(404).json({ error: 'School not found' });
      }
      const school_id = schoolData.id;

      // Fetch verifications and deliveries for this school
      const [verificationsData, deliveriesData] = await Promise.all([
        supabase
          .from('verifications')
          .select('id, created_at, status')
          .eq('school_id', school_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('deliveries')
          .select('id, created_at, status')
          .eq('school_id', school_id)
          .order('created_at', { ascending: false })
      ]);

      // Transform verifications
      const verifications = (verificationsData.data || []).map(v => ({
        type: 'verification',
        id: v.id,
        timestamp: v.created_at,
        title: 'Verification',
        status: v.status
      }));

      // Transform deliveries
      const deliveries = (deliveriesData.data || []).map(d => ({
        type: 'delivery',
        id: d.id,
        timestamp: d.created_at,
        title: 'Delivery',
        status: d.status
      }));

      // Combine and sort all activities
      activities = [...verifications, ...deliveries]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limitNum);

    } else if (role === 'catering') {
      const { data: cateringData, error: cateringError } = await supabase
        .from('caterings')
        .select('id')
        .eq('user_id', req.user?.id)
        .single();

      if (cateringError || !cateringData) {
        return res.status(404).json({ error: 'Catering not found' });
      }
      const catering_id = cateringData.id;

      // Fetch verifications and deliveries for this catering
      const [verificationsData, deliveriesData] = await Promise.all([
        supabase
          .from('verifications')
          .select('id, created_at, status, deliveries!inner(catering_id)')
          .eq('deliveries.catering_id', catering_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('deliveries')
          .select('id, created_at, status')
          .eq('catering_id', catering_id)
          .order('created_at', { ascending: false })
      ]);

      // Transform verifications
      const verifications = (verificationsData.data || []).map(v => ({
        type: 'verification',
        id: v.id,
        timestamp: v.created_at,
        title: 'Verification',
        status: v.status
      }));

      // Transform deliveries
      const deliveries = (deliveriesData.data || []).map(d => ({
        type: 'delivery',
        id: d.id,
        timestamp: d.created_at,
        title: 'Delivery',
        status: d.status
      }));

      // Combine and sort all activities
      activities = [...verifications, ...deliveries]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limitNum);
    }

    res.json({
      activities
    });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({
      error: 'Failed to fetch recent activity',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/analytics/trends - Get trend data
router.get('/trends', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { period = 'month' } = req.query;

    // Fetch deliveries and verifications
    const [deliveriesData, verificationsData] = await Promise.all([
      supabase.from('deliveries').select('id, delivery_date, amount'),
      supabase.from('verifications').select('id, verified_at')
    ]);

    const deliveries = deliveriesData.data || [];
    const verifications = verificationsData.data || [];

    // Generate date range (last 30 days)
    const today = new Date();
    const daysCount = period === 'year' ? 365 : period === 'week' ? 7 : 30;
    const dateRange: string[] = [];

    for (let i = daysCount; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dateRange.push(date.toISOString().split('T')[0]);
    }

    // Determine date format based on period
    const formatDate = (dateStr: string) => {
      if (period === 'year') {
        // Return YYYY-MM format
        return dateStr.substring(0, 7);
      } else {
        // Return YYYY-MM-DD format
        return dateStr;
      }
    };

    // Group data by date
    const trendsMap = new Map<string, { total_deliveries: number; total_amount: number; total_verifications: number }>();

    // Initialize all dates with zero counts
    dateRange.forEach(date => {
      const period = formatDate(date);
      if (!trendsMap.has(period)) {
        trendsMap.set(period, { total_deliveries: 0, total_amount: 0, total_verifications: 0 });
      }
    });

    // Aggregate deliveries
    deliveries.forEach(d => {
      if (d.delivery_date) {
        const period = formatDate(d.delivery_date);
        if (trendsMap.has(period)) {
          const stats = trendsMap.get(period)!;
          stats.total_deliveries++;
          stats.total_amount += d.amount || 0;
        }
      }
    });

    // Aggregate verifications
    verifications.forEach(v => {
      if (v.verified_at) {
        const period = formatDate(v.verified_at.split('T')[0]);
        if (trendsMap.has(period)) {
          const stats = trendsMap.get(period)!;
          stats.total_verifications++;
        }
      }
    });

    // Convert map to array and sort by period
    const trends = Array.from(trendsMap.entries())
      .map(([period, stats]) => ({
        period,
        total_deliveries: stats.total_deliveries.toString(),
        total_amount: stats.total_amount.toString(),
        total_verifications: stats.total_verifications.toString()
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    res.json({
      trends
    });
  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({
      error: 'Failed to fetch trends',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
