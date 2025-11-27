// @ts-nocheck
import express from 'express';
import type { Response } from 'express';
import { supabase } from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// GET /api/schools - Get schools with search, filter, pagination
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      search = '',
      province = '',
      city = '',
      jenjang = '',
      status = '',
      sort_by = 'priority_score',
      order = 'DESC'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Validate sort_by to prevent SQL injection
    const allowedSortFields = ['priority_score', 'name', 'created_at', 'province', 'city'];
    const sortField = allowedSortFields.includes(sort_by as string) ? sort_by : 'priority_score';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

    // Build Supabase query
    let query = supabase
      .from('schools')
      .select('id, npsn, name, address, kelurahan, status, province, city, district, jenjang, priority_score, created_at', { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,npsn.ilike.%${search}%,address.ilike.%${search}%`);
    }

    if (province) {
      query = query.eq('province', province);
    }

    if (city) {
      query = query.eq('city', city);
    }

    if (jenjang) {
      query = query.eq('jenjang', jenjang);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Apply sorting and pagination
    query = query
      .order(sortField as any, { ascending: sortOrder === 'ASC' })
      .range(offset, offset + limitNum - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const total = count || 0;

    res.json({
      schools: data || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum)
      },
      filters: {
        search,
        province,
        city,
        jenjang,
        status
      }
    });
  } catch (error) {
    console.error('Get schools error:', error);
    res.status(500).json({
      error: 'Failed to fetch schools',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/schools/stats - Get statistics
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    // Total schools
    const { count: total, error: totalError } = await supabase
      .from('schools')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      throw totalError;
    }

    // By jenjang - Note: Supabase doesn't support GROUP BY directly, need to use RPC or fetch and aggregate
    // Using a workaround: fetch all and count in memory for now
    const { data: allSchools, error: schoolsError } = await supabase
      .from('schools')
      .select('jenjang, status, province');

    if (schoolsError) {
      throw schoolsError;
    }

    // Group by jenjang
    const jenjangMap = new Map<string, number>();
    const statusMap = new Map<string, number>();
    const provinceMap = new Map<string, number>();

    allSchools?.forEach(school => {
      // Count by jenjang
      jenjangMap.set(school.jenjang, (jenjangMap.get(school.jenjang) || 0) + 1);
      // Count by status
      statusMap.set(school.status, (statusMap.get(school.status) || 0) + 1);
      // Count by province
      if (school.province) {
        provinceMap.set(school.province, (provinceMap.get(school.province) || 0) + 1);
      }
    });

    const by_jenjang = Array.from(jenjangMap.entries())
      .map(([jenjang, count]) => ({ jenjang, count }))
      .sort((a, b) => b.count - a.count);

    const by_status = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    const top_provinces = Array.from(provinceMap.entries())
      .map(([province, count]) => ({ province, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({
      total: total || 0,
      by_jenjang,
      by_status,
      top_provinces
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/schools/:id - Get single school
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: school, error } = await supabase
      .from('schools')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !school) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.json({
      school
    });
  } catch (error) {
    console.error('Get school error:', error);
    res.status(500).json({
      error: 'Failed to fetch school',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/schools/provinces - Get list of provinces
router.get('/filters/provinces', async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('schools')
      .select('province')
      .not('province', 'is', null)
      .order('province');

    if (error) {
      throw error;
    }

    // Get unique provinces
    const provincesSet = new Set(data?.map(row => row.province));
    const uniqueProvinces = Array.from(provincesSet);

    res.json({
      provinces: uniqueProvinces
    });
  } catch (error) {
    console.error('Get provinces error:', error);
    res.status(500).json({
      error: 'Failed to fetch provinces',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/schools/cities/:province - Get cities in a province
router.get('/filters/cities/:province', async (req: AuthRequest, res: Response) => {
  try {
    const { province } = req.params;

    const { data, error } = await supabase
      .from('schools')
      .select('city')
      .eq('province', province)
      .not('city', 'is', null)
      .order('city');

    if (error) {
      throw error;
    }

    // Get unique cities
    const citiesSet = new Set(data?.map(row => row.city));
    const uniqueCities = Array.from(citiesSet);

    res.json({
      cities: uniqueCities
    });
  } catch (error) {
    console.error('Get cities error:', error);
    res.status(500).json({
      error: 'Failed to fetch cities',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PATCH /api/schools/:id - Update school information
router.patch('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Debug logging
    console.log('[Schools PATCH] Request:', {
      userId: req.user?.id,
      userRole: req.user?.role,
      userSchoolId: req.user?.school_id,
      targetSchoolId: parseInt(id),
      match: req.user?.school_id === parseInt(id)
    });

    // Validate that user has permission (only school role can update their own school)
    if (req.user?.role === 'school' && req.user?.school_id !== parseInt(id)) {
      console.error('[Schools PATCH] Permission denied - school_id mismatch');
      return res.status(403).json({
        error: 'You can only update your own school',
        debug: {
          your_school_id: req.user?.school_id,
          requested_school_id: parseInt(id)
        }
      });
    }

    // Allowed fields to update
    const allowedFields = [
      'name',
      'npsn',
      'address',
      'kelurahan',
      'logo_url',
      'latitude',
      'longitude',
      'province',
      'city',
      'district',
      'jenjang',
      'status'
    ];

    // Filter updateData to only include allowed fields
    const filteredData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }

    if (Object.keys(filteredData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Add updated_at timestamp
    filteredData.updated_at = new Date().toISOString();

    console.log('Updating school:', id, filteredData);

    // Update school in database
    const { data: school, error } = await supabase
      .from('schools')
      .update(filteredData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update school error:', error);
      throw error;
    }

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.json({
      message: 'School updated successfully',
      school
    });
  } catch (error) {
    console.error('Update school error:', error);
    res.status(500).json({
      error: 'Failed to update school',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
