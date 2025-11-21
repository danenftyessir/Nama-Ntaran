// @ts-nocheck
import express from 'express';
import type { Response } from 'express';
import { supabase } from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// POST /api/caterings - Create new catering (Admin only)
router.post('/', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { name, company_name, wallet_address, phone, email, address, user_id } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  try {
    const { data, error } = await supabase
      .from('caterings')
      .insert({
        name,
        company_name: company_name || null,
        wallet_address: wallet_address || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        user_id: user_id || null
      })
      .select()
      .single();

    if (error || !data) {
      throw error || new Error('Failed to create catering');
    }

    res.status(201).json({
      message: 'Catering created successfully',
      catering: data
    });
  } catch (error) {
    console.error('Create catering error:', error);
    res.status(500).json({
      error: 'Failed to create catering',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/caterings - Get caterings with filters
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      search = '',
      sort_by = 'created_at',
      order = 'DESC'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCounter = 1;

    // Filter by user role
    if (req.user?.role === 'catering') {
      const { data: cateringData, error: cateringError } = await supabase
        .from('caterings')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (cateringData && !cateringError) {
        conditions.push(`c.id = $${paramCounter}`);
        params.push(cateringData.id);
        paramCounter++;
      }
    }

    // Search filter
    if (search) {
      conditions.push(`(c.name ILIKE $${paramCounter} OR c.company_name ILIKE $${paramCounter})`);
      params.push(`%${search}%`);
      paramCounter++;
    }

    // Build Supabase query
    let query = supabase
      .from('caterings')
      .select(`
        *,
        users!caterings_user_id_fkey(email),
        deliveries(id, status)
      `, { count: 'exact' });

    // Apply filters
    if (req.user?.role === 'catering') {
      const { data: cateringData } = await supabase
        .from('caterings')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (cateringData) {
        query = query.eq('id', cateringData.id);
      }
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,company_name.ilike.%${search}%`);
    }

    // Validate sort_by to prevent SQL injection
    const allowedSortFields = ['name', 'rating', 'total_deliveries', 'created_at'];
    const sortField = allowedSortFields.includes(sort_by as string) ? sort_by : 'created_at';
    const sortOrder = order === 'ASC';

    query = query
      .order(sortField as any, { ascending: sortOrder })
      .range(offset, offset + limitNum - 1);

    const { data: caterings, error: queryError, count: total } = await query;

    if (queryError) {
      throw queryError;
    }

    // Process deliveries to add stats
    const result = (caterings || []).map((catering: any) => ({
      ...catering,
      contact_email: catering.users?.email,
      active_deliveries: catering.deliveries?.length || 0,
      completed_deliveries: catering.deliveries?.filter((d: any) => d.status === 'verified').length || 0,
      users: undefined,
      deliveries: undefined
    }));

    res.json({
      caterings: result,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: total || 0,
        total_pages: Math.ceil((total || 0) / limitNum)
      }
    });
  } catch (error) {
    console.error('Get caterings error:', error);
    res.status(500).json({
      error: 'Failed to fetch caterings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/caterings/:id - Get single catering
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: catering, error } = await supabase
      .from('caterings')
      .select(`
        *,
        users!caterings_user_id_fkey(email),
        deliveries(
          id,
          status,
          verifications(quality_rating)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !catering) {
      return res.status(404).json({ error: 'Catering not found' });
    }

    // Calculate aggregations
    const deliveries = catering.deliveries || [];
    const total_deliveries_count = deliveries.length;
    const verified_deliveries = deliveries.filter((d: any) => d.status === 'verified').length;

    // Calculate average quality rating
    const ratings = deliveries
      .flatMap((d: any) => d.verifications || [])
      .map((v: any) => v.quality_rating)
      .filter((r: any) => r !== null);
    const avg_quality_rating = ratings.length > 0
      ? Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) * 100) / 100
      : null;

    res.json({
      catering: {
        ...catering,
        contact_email: catering.users?.email,
        total_deliveries_count,
        verified_deliveries,
        avg_quality_rating,
        users: undefined,
        deliveries: undefined
      }
    });
  } catch (error) {
    console.error('Get catering error:', error);
    res.status(500).json({
      error: 'Failed to fetch catering',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PATCH /api/caterings/:id - Update catering
router.patch('/:id', requireRole('admin', 'catering'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, company_name, wallet_address, phone, email, address } = req.body;

  try {
    // Check authorization for catering role
    if (req.user?.role === 'catering') {
      const { data: cateringCheck, error: checkError } = await supabase
        .from('caterings')
        .select('id')
        .eq('id', id)
        .eq('user_id', req.user.id)
        .single();

      if (checkError || !cateringCheck) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const updates: any = {};

    if (name !== undefined) updates.name = name;
    if (company_name !== undefined) updates.company_name = company_name;
    if (wallet_address !== undefined) updates.wallet_address = wallet_address;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (address !== undefined) updates.address = address;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('caterings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Catering not found' });
    }

    res.json({
      message: 'Catering updated successfully',
      catering: data
    });
  } catch (error) {
    console.error('Update catering error:', error);
    res.status(500).json({
      error: 'Failed to update catering',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/caterings/:id/deliveries - Get catering's deliveries
router.get('/:id/deliveries', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status = '', limit = '20' } = req.query;

    let query = supabase
      .from('deliveries')
      .select(`
        *,
        schools(name, npsn),
        verifications(status, verified_at)
      `)
      .eq('catering_id', id)
      .order('delivery_date', { ascending: false })
      .limit(parseInt(limit as string));

    if (status) {
      query = query.eq('status', status);
    }

    const { data: deliveries, error } = await query;

    if (error) {
      throw error;
    }

    // Format the response
    const result = (deliveries || []).map((d: any) => ({
      ...d,
      school_name: d.schools?.name,
      npsn: d.schools?.npsn,
      verification_status: d.verifications?.[0]?.status,
      verified_at: d.verifications?.[0]?.verified_at,
      schools: undefined,
      verifications: undefined
    }));

    res.json({
      deliveries: result
    });
  } catch (error) {
    console.error('Get catering deliveries error:', error);
    res.status(500).json({
      error: 'Failed to fetch catering deliveries',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/caterings/:id/stats - Get catering statistics
router.get('/:id/stats', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if catering exists
    const { data: catering, error: cateringError } = await supabase
      .from('caterings')
      .select('id')
      .eq('id', id)
      .single();

    if (cateringError || !catering) {
      return res.status(404).json({ error: 'Catering not found' });
    }

    // Fetch deliveries with related data
    const { data: deliveries, error: deliveriesError } = await supabase
      .from('deliveries')
      .select(`
        *,
        verifications(quality_rating),
        issues(id)
      `)
      .eq('catering_id', id);

    if (deliveriesError) {
      throw deliveriesError;
    }

    const deliveriesList = deliveries || [];

    // Calculate stats
    const today = new Date().toISOString().split('T')[0];
    const total_deliveries = deliveriesList.length;
    const verified_deliveries = deliveriesList.filter((d: any) => d.status === 'verified').length;
    const pending_deliveries = deliveriesList.filter((d: any) => d.status === 'pending').length;
    const upcoming_deliveries = deliveriesList.filter((d: any) => d.delivery_date >= today).length;

    const total_revenue = deliveriesList.reduce((sum: number, d: any) => sum + parseFloat(d.amount || 0), 0);
    const verified_revenue = deliveriesList
      .filter((d: any) => d.status === 'verified')
      .reduce((sum: number, d: any) => sum + parseFloat(d.amount || 0), 0);

    const ratings = deliveriesList
      .flatMap((d: any) => d.verifications || [])
      .map((v: any) => v.quality_rating)
      .filter((r: any) => r !== null);
    const avg_quality_rating = ratings.length > 0
      ? Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) * 100) / 100
      : null;

    const total_issues = deliveriesList.reduce((sum: number, d: any) => sum + (d.issues?.length || 0), 0);

    res.json({
      stats: {
        total_deliveries,
        verified_deliveries,
        pending_deliveries,
        upcoming_deliveries,
        total_revenue,
        verified_revenue,
        avg_quality_rating,
        total_issues
      }
    });
  } catch (error) {
    console.error('Get catering stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch catering stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
