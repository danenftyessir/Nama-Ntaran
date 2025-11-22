// @ts-nocheck
import express from 'express';
import type { Response } from 'express';
import { supabase } from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { uploadSingle, getFileUrl } from '../middleware/upload.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// POST /api/issues - Report an issue (with optional photo)
router.post('/', requireRole('school', 'admin'), uploadSingle('issue_photo'), async (req: AuthRequest, res: Response) => {
  const { delivery_id, issue_type, description, severity } = req.body;

  if (!delivery_id || !issue_type || !description) {
    return res.status(400).json({
      error: 'delivery_id, issue_type, and description are required'
    });
  }

  const validIssueTypes = ['late_delivery', 'wrong_portions', 'quality_issue', 'missing_delivery', 'other'];
  if (!validIssueTypes.includes(issue_type)) {
    return res.status(400).json({
      error: 'Invalid issue_type',
      valid_types: validIssueTypes
    });
  }

  try {
    // Get photo URL if file was uploaded
    let photoUrl = null;
    if (req.file) {
      photoUrl = getFileUrl(req.file.filename, 'issues');
    }

    const { data, error } = await supabase
      .from('issues')
      .insert({
        delivery_id,
        reported_by: req.user?.id,
        issue_type,
        description,
        severity: severity || 'medium',
        status: 'open',
        photo_url: photoUrl
      })
      .select()
      .single();

    if (error || !data) {
      throw error || new Error('Failed to report issue');
    }

    res.status(201).json({
      message: 'Issue reported successfully',
      issue: data
    });
  } catch (error) {
    console.error('Create issue error:', error);
    res.status(500).json({
      error: 'Failed to report issue',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/issues - Get issues with filters
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      status = '',
      issue_type = '',
      severity = '',
      delivery_id = ''
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build Supabase query
    let query = supabase
      .from('issues')
      .select(`
        *,
        deliveries!inner(
          delivery_date,
          portions,
          amount,
          school_id,
          catering_id,
          schools(name, npsn),
          caterings(name)
        ),
        reported_by_user:users!issues_reported_by_fkey(email),
        resolved_by_user:users!issues_resolved_by_fkey(email)
      `, { count: 'exact' });

    // Filter by user role
    if (req.user?.role === 'school') {
      const { data: schoolData } = await supabase
        .from('schools')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (schoolData) {
        query = query.eq('deliveries.school_id', schoolData.id);
      }
    } else if (req.user?.role === 'catering') {
      const { data: cateringData } = await supabase
        .from('caterings')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (cateringData) {
        query = query.eq('deliveries.catering_id', cateringData.id);
      }
    }

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (issue_type) {
      query = query.eq('issue_type', issue_type);
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    if (delivery_id) {
      query = query.eq('delivery_id', delivery_id);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    const { data: issues, error: queryError, count: total } = await query;

    if (queryError) {
      throw queryError;
    }

    // Format the response
    const result = (issues || []).map((issue: any) => ({
      ...issue,
      delivery_date: issue.deliveries?.delivery_date,
      portions: issue.deliveries?.portions,
      amount: issue.deliveries?.amount,
      school_name: issue.deliveries?.schools?.name,
      npsn: issue.deliveries?.schools?.npsn,
      catering_name: issue.deliveries?.caterings?.name,
      reported_by_email: issue.reported_by_user?.email,
      resolved_by_email: issue.resolved_by_user?.email,
      deliveries: undefined,
      reported_by_user: undefined,
      resolved_by_user: undefined
    }));

    res.json({
      success: true,
      issues: result,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: total || 0,
        total_pages: Math.ceil((total || 0) / limitNum)
      }
    });
  } catch (error) {
    console.error('Get issues error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch issues',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/issues/:id - Get single issue
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: issue, error } = await supabase
      .from('issues')
      .select(`
        *,
        deliveries(
          delivery_date,
          portions,
          amount,
          status,
          schools(name, npsn, address),
          caterings(name, company_name)
        ),
        reported_by_user:users!issues_reported_by_fkey(email),
        resolved_by_user:users!issues_resolved_by_fkey(email)
      `)
      .eq('id', id)
      .single();

    if (error || !issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json({
      success: true,
      issue: {
        ...issue,
        delivery_date: issue.deliveries?.delivery_date,
        portions: issue.deliveries?.portions,
        amount: issue.deliveries?.amount,
        delivery_status: issue.deliveries?.status,
        school_name: issue.deliveries?.schools?.name,
        npsn: issue.deliveries?.schools?.npsn,
        school_address: issue.deliveries?.schools?.address,
        catering_name: issue.deliveries?.caterings?.name,
        catering_company: issue.deliveries?.caterings?.company_name,
        reported_by_email: issue.reported_by_user?.email,
        resolved_by_email: issue.resolved_by_user?.email,
        deliveries: undefined,
        reported_by_user: undefined,
        resolved_by_user: undefined
      }
    });
  } catch (error) {
    console.error('Get issue error:', error);
    res.status(500).json({
      error: 'Failed to fetch issue',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PATCH /api/issues/:id/status - Update issue status (Admin only)
router.patch('/:id/status', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, resolution_notes } = req.body;

  const validStatuses = ['open', 'investigating', 'resolved', 'closed'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      error: 'Invalid status',
      valid_statuses: validStatuses
    });
  }

  try {
    const updates: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (resolution_notes) {
      updates.resolution_notes = resolution_notes;
    }

    if (status === 'resolved' || status === 'closed') {
      updates.resolved_by = req.user?.id;
      updates.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('issues')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json({
      message: 'Issue status updated',
      issue: data
    });
  } catch (error) {
    console.error('Update issue status error:', error);
    res.status(500).json({
      error: 'Failed to update issue status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/issues/stats/summary - Get issue statistics
router.get('/stats/summary', async (req: AuthRequest, res: Response) => {
  try {
    // Build query with filters
    let query = supabase
      .from('issues')
      .select(`
        *,
        deliveries!inner(school_id, catering_id)
      `);

    // Filter by user role
    if (req.user?.role === 'school') {
      const { data: schoolData } = await supabase
        .from('schools')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (schoolData) {
        query = query.eq('deliveries.school_id', schoolData.id);
      }
    } else if (req.user?.role === 'catering') {
      const { data: cateringData } = await supabase
        .from('caterings')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (cateringData) {
        query = query.eq('deliveries.catering_id', cateringData.id);
      }
    }

    const { data: issues, error } = await query;

    if (error) {
      throw error;
    }

    const issuesList = issues || [];

    // Calculate stats - map to Indonesian status names
    const stats = {
      total_issues: issuesList.length,
      pending: issuesList.filter((i: any) => i.status === 'open').length,
      investigating: issuesList.filter((i: any) => i.status === 'investigating').length,
      resolved: issuesList.filter((i: any) => i.status === 'resolved' || i.status === 'closed').length,
      rejected: issuesList.filter((i: any) => i.status === 'rejected').length,
      open_issues: issuesList.filter((i: any) => i.status === 'open').length,
      critical: issuesList.filter((i: any) => i.severity === 'critical').length,
      high: issuesList.filter((i: any) => i.severity === 'high').length,
      late_deliveries: issuesList.filter((i: any) => i.issue_type === 'late_delivery').length,
      quality_issues: issuesList.filter((i: any) => i.issue_type === 'quality_issue').length
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get issue stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch issue stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
