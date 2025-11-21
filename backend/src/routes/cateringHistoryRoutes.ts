// @ts-nocheck
import express, { type Request, type Response } from 'express';
import { supabase } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// tipe untuk status delivery
type DeliveryStatus = 'verified' | 'pending' | 'issue';

// interface untuk delivery item
interface DeliveryHistoryItem {
  id: string;
  schoolName: string;
  date: string;
  portions: number;
  status: DeliveryStatus;
  imageUrl: string;
}

// mapping status dari database ke frontend
const mapStatus = (dbStatus: string): DeliveryStatus => {
  switch (dbStatus?.toLowerCase()) {
    case 'completed':
    case 'verified':
      return 'verified';
    case 'pending':
    case 'scheduled':
    case 'delivered':
      return 'pending';
    case 'cancelled':
    case 'rejected':
    case 'issue':
      return 'issue';
    default:
      return 'pending';
  }
};

// GET /api/catering/history/dashboard - get dashboard data untuk history
router.get('/dashboard', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // get catering id dari user
    const { data: cateringData, error: cateringError } = await supabase
      .from('caterings')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (cateringError || !cateringData) {
      return res.status(404).json({ error: 'Catering tidak ditemukan' });
    }

    const cateringId = (cateringData as any).id;

    // TO DO: query ke database untuk mendapatkan riwayat pengiriman
    // contoh query (sesuaikan dengan schema database)
    const { data: deliveriesData, error: deliveriesError } = await supabase
      .from('allocations')
      .select(`
        id,
        allocation_date,
        quantity,
        status,
        schools!inner(id, name)
      `)
      .eq('catering_id', cateringId)
      .order('allocation_date', { ascending: false })
      .limit(50);

    if (deliveriesError) {
      throw deliveriesError;
    }

    // map ke format frontend
    const deliveries: DeliveryHistoryItem[] = (deliveriesData || []).map((row: any, index: number) => ({
      id: row.id.toString(),
      schoolName: row.schools?.name || `Sekolah ${index + 1}`,
      date: (row.allocation_date ? new Date(row.allocation_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]) as string,
      portions: row.quantity || 0,
      status: mapStatus(row.status),
      // TO DO: implementasi image URL dari database atau gunakan placeholder
      imageUrl: getImageUrl(index),
    }));

    res.json({
      deliveries,
      totalCount: deliveries.length,
      currentPage: 1,
      totalPages: 1,
    });
  } catch (error) {
    console.error('Error fetching history dashboard:', error);
    res.status(500).json({ error: 'Gagal mengambil data riwayat' });
  }
});

// GET /api/catering/history/deliveries - get list deliveries dengan pagination
router.get('/deliveries', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const status = req.query.status as string;
    const month = req.query.month as string;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // get catering id dari user
    const { data: cateringData, error: cateringError } = await supabase
      .from('caterings')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (cateringError || !cateringData) {
      return res.status(404).json({ error: 'Catering tidak ditemukan' });
    }

    const cateringId = (cateringData as any).id;
    const offset = (page - 1) * limit;

    // build query dengan filter
    let query = supabase
      .from('allocations')
      .select(`
        id,
        allocation_date,
        quantity,
        status,
        schools!inner(id, name)
      `, { count: 'exact' })
      .eq('catering_id', cateringId);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (month && month !== 'all') {
      // filter berdasarkan bulan (format: 'oktober', 'september', dll)
      const monthMap: Record<string, number> = {
        januari: 1, februari: 2, maret: 3, april: 4,
        mei: 5, juni: 6, juli: 7, agustus: 8,
        september: 9, oktober: 10, november: 11, desember: 12,
      };
      const monthNum = monthMap[month.toLowerCase()];
      if (monthNum) {
        // Fetch data and filter in JavaScript since Supabase doesn't support EXTRACT directly
        // This is a trade-off - for better performance, consider using RPC function
      }
    }

    const { data: deliveriesData, error: deliveriesError, count } = await query
      .order('allocation_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (deliveriesError) {
      throw deliveriesError;
    }

    // Filter by month in JavaScript if needed
    let filteredData = deliveriesData || [];
    if (month && month !== 'all') {
      const monthMap: Record<string, number> = {
        januari: 1, februari: 2, maret: 3, april: 4,
        mei: 5, juni: 6, juli: 7, agustus: 8,
        september: 9, oktober: 10, november: 11, desember: 12,
      };
      const monthNum = monthMap[month.toLowerCase()];
      if (monthNum) {
        filteredData = filteredData.filter((row: any) => {
          const date = new Date(row.allocation_date);
          return date.getMonth() + 1 === monthNum;
        });
      }
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // map ke format frontend
    const deliveries: DeliveryHistoryItem[] = filteredData.map((row: any, index: number) => ({
      id: row.id.toString(),
      schoolName: row.schools?.name || `Sekolah ${index + 1}`,
      date: (row.allocation_date ? new Date(row.allocation_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]) as string,
      portions: row.quantity || 0,
      status: mapStatus(row.status),
      imageUrl: getImageUrl(index),
    }));

    res.json({
      deliveries,
      totalCount,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ error: 'Gagal mengambil data pengiriman' });
  }
});

// GET /api/catering/history/:id - get detail delivery
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const deliveryId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // TO DO: implementasi query untuk detail delivery
    // contoh query (sesuaikan dengan schema database)
    const { data: allocation, error: allocationError } = await supabase
      .from('allocations')
      .select(`
        id,
        allocation_date,
        quantity,
        status,
        amount,
        schools!inner(name, address),
        caterings!inner(user_id),
        verifications(verified_at, notes)
      `)
      .eq('id', deliveryId)
      .single();

    if (allocationError || !allocation) {
      return res.status(404).json({ error: 'Data pengiriman tidak ditemukan' });
    }

    const allocData = allocation as any;

    // Check if this allocation belongs to the user's catering
    if (allocData.caterings?.user_id !== userId) {
      return res.status(403).json({ error: 'Tidak memiliki akses ke data ini' });
    }

    // Extract verification data (could be array or single object)
    const verification = Array.isArray(allocData.verifications)
      ? allocData.verifications[0]
      : allocData.verifications;

    res.json({
      id: allocData.id.toString(),
      schoolName: allocData.schools?.name || '',
      schoolAddress: allocData.schools?.address || '',
      date: allocData.allocation_date,
      portions: allocData.quantity,
      amount: allocData.amount,
      status: mapStatus(allocData.status),
      verifiedAt: verification?.verified_at || null,
      verificationNotes: verification?.notes || null,
    });
  } catch (error) {
    console.error('Error fetching delivery detail:', error);
    res.status(500).json({ error: 'Gagal mengambil detail pengiriman' });
  }
});

// helper function untuk mendapatkan image URL
// TO DO: implementasi logic untuk mendapatkan gambar dari database atau storage
function getImageUrl(index: number): string {
  const images = [
    '/aesthetic view.jpg',
    '/aesthetic view 2.jpg',
    '/aesthetic view 3.jpg',
    '/aesthetic view 4.jpg',
    '/aesthetic view 5.jpg',
    '/jagung.jpg',
    '/tempe.jpg',
    '/otak-otak.jpg',
  ];
  return images[index % images.length];
}

export default router;
