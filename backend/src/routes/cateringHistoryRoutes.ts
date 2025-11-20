import express, { type Request, type Response } from 'express';
import { pool } from '../config/database.js';
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
    const cateringResult = await pool.query(
      'SELECT id FROM caterings WHERE user_id = $1',
      [userId]
    );

    if (cateringResult.rows.length === 0) {
      return res.status(404).json({ error: 'Catering tidak ditemukan' });
    }

    const cateringId = cateringResult.rows[0].id;

    // TO DO: query ke database untuk mendapatkan riwayat pengiriman
    // contoh query (sesuaikan dengan schema database)
    const deliveriesResult = await pool.query(
      `SELECT
        a.id,
        s.name as school_name,
        a.allocation_date as date,
        a.quantity as portions,
        a.status,
        s.id as school_id
      FROM allocations a
      JOIN schools s ON a.school_id = s.id
      WHERE a.catering_id = $1
      ORDER BY a.allocation_date DESC
      LIMIT 50`,
      [cateringId]
    );

    // map ke format frontend
    const deliveries: DeliveryHistoryItem[] = deliveriesResult.rows.map((row, index) => ({
      id: row.id.toString(),
      schoolName: row.school_name || `Sekolah ${index + 1}`,
      date: row.date ? new Date(row.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      portions: row.portions || 0,
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
    const cateringResult = await pool.query(
      'SELECT id FROM caterings WHERE user_id = $1',
      [userId]
    );

    if (cateringResult.rows.length === 0) {
      return res.status(404).json({ error: 'Catering tidak ditemukan' });
    }

    const cateringId = cateringResult.rows[0].id;
    const offset = (page - 1) * limit;

    // build query dengan filter
    let queryParams: any[] = [cateringId, limit, offset];
    let whereClause = 'WHERE a.catering_id = $1';
    let paramIndex = 4;

    if (status && status !== 'all') {
      whereClause += ` AND a.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
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
        whereClause += ` AND EXTRACT(MONTH FROM a.allocation_date) = $${paramIndex}`;
        queryParams.push(monthNum);
        paramIndex++;
      }
    }

    // TO DO: sesuaikan query dengan schema database
    const deliveriesResult = await pool.query(
      `SELECT
        a.id,
        s.name as school_name,
        a.allocation_date as date,
        a.quantity as portions,
        a.status,
        s.id as school_id
      FROM allocations a
      JOIN schools s ON a.school_id = s.id
      ${whereClause}
      ORDER BY a.allocation_date DESC
      LIMIT $2 OFFSET $3`,
      queryParams
    );

    // count total untuk pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM allocations a ${whereClause.replace('$2', '$1').replace('$3', '')}`,
      [cateringId]
    );

    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    // map ke format frontend
    const deliveries: DeliveryHistoryItem[] = deliveriesResult.rows.map((row, index) => ({
      id: row.id.toString(),
      schoolName: row.school_name || `Sekolah ${index + 1}`,
      date: row.date ? new Date(row.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      portions: row.portions || 0,
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
    const result = await pool.query(
      `SELECT
        a.id,
        s.name as school_name,
        a.allocation_date as date,
        a.quantity as portions,
        a.status,
        a.amount,
        s.address as school_address,
        v.verified_at,
        v.notes as verification_notes
      FROM allocations a
      JOIN schools s ON a.school_id = s.id
      LEFT JOIN verifications v ON a.id = v.allocation_id
      JOIN caterings c ON a.catering_id = c.id
      WHERE a.id = $1 AND c.user_id = $2`,
      [deliveryId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Data pengiriman tidak ditemukan' });
    }

    const row = result.rows[0];

    res.json({
      id: row.id.toString(),
      schoolName: row.school_name,
      schoolAddress: row.school_address,
      date: row.date,
      portions: row.portions,
      amount: row.amount,
      status: mapStatus(row.status),
      verifiedAt: row.verified_at,
      verificationNotes: row.verification_notes,
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
