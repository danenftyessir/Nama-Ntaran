// @ts-nocheck
import express from 'express';
import type { Response } from 'express';
import { supabase } from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// POST /api/deliveries - Create new delivery
router.post('/', async (req: AuthRequest, res: Response) => {
  const { school_id, catering_id, delivery_date, portions, amount, notes } = req.body;

  // Validation
  if (!school_id || !catering_id || !delivery_date || !portions || !amount) {
    return res.status(400).json({
      error: 'school_id, catering_id, delivery_date, portions, and amount are required'
    });
  }

  try {
    const { data: delivery, error } = await supabase
      .from('deliveries')
      .insert({
        school_id,
        catering_id,
        delivery_date,
        portions,
        amount,
        notes: notes || null,
        status: 'pending'
      })
      .select()
      .single();

    if (error || !delivery) {
      throw error || new Error('Failed to create delivery');
    }

    res.status(201).json({
      message: 'Delivery created successfully',
      delivery
    });
  } catch (error) {
    console.error('Create delivery error:', error);
    res.status(500).json({
      error: 'Failed to create delivery',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/deliveries - Get deliveries with filters
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      status = '',
      school_id = '',
      catering_id = '',
      date_from = '',
      date_to = ''
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build query
    let query = supabase
      .from('deliveries')
      .select(`
        *,
        schools!inner(name, npsn, province, city),
        caterings!inner(company_name, name)
      `, { count: 'exact' });

    // Filter by user role
    if (req.user?.role === 'school') {
      // Get user's school_id
      const { data: schoolData } = await supabase
        .from('schools')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (schoolData) {
        query = query.eq('school_id', schoolData.id);
      }
    } else if (req.user?.role === 'catering') {
      // Get user's catering_id
      const { data: cateringData } = await supabase
        .from('caterings')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (cateringData) {
        query = query.eq('catering_id', cateringData.id);
      }
    }

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (school_id) {
      query = query.eq('school_id', school_id);
    }

    if (catering_id) {
      query = query.eq('catering_id', catering_id);
    }

    if (date_from) {
      query = query.gte('delivery_date', date_from);
    }

    if (date_to) {
      query = query.lte('delivery_date', date_to);
    }

    // Apply sorting and pagination
    query = query
      .order('delivery_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    // Flatten nested structure for consistency with original response
    const flattenedDeliveries = data?.map(d => ({
      ...d,
      school_name: d.schools?.name,
      npsn: d.schools?.npsn,
      province: d.schools?.province,
      city: d.schools?.city,
      catering_company: d.caterings?.company_name,
      catering_name: d.caterings?.name
    })) || [];

    const total = count || 0;

    res.json({
      deliveries: flattenedDeliveries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get deliveries error:', error);
    res.status(500).json({
      error: 'Failed to fetch deliveries',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/deliveries/:id - Get single delivery
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('deliveries')
      .select(`
        *,
        schools(name, npsn, address, province, city),
        caterings(company_name, name, phone, email)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    // Flatten nested structure for consistency
    const flattenedDelivery = {
      ...data,
      school_name: data.schools?.name,
      npsn: data.schools?.npsn,
      school_address: data.schools?.address,
      province: data.schools?.province,
      city: data.schools?.city,
      catering_company: data.caterings?.company_name,
      catering_name: data.caterings?.name,
      catering_phone: data.caterings?.phone,
      catering_email: data.caterings?.email
    };

    res.json({
      delivery: flattenedDelivery
    });
  } catch (error) {
    console.error('Get delivery error:', error);
    res.status(500).json({
      error: 'Failed to fetch delivery',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PATCH /api/deliveries/:id/status - Update delivery status
router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'scheduled', 'delivered', 'verified', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      error: 'Invalid status',
      valid_statuses: validStatuses
    });
  }

  try {
    const { data: delivery, error } = await supabase
      .from('deliveries')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    res.json({
      message: 'Delivery status updated',
      delivery
    });
  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({
      error: 'Failed to update delivery status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
