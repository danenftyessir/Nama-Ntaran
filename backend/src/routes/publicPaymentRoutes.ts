/**
 * ============================================
 * PUBLIC PAYMENT ROUTES (No Auth Required)
 * ============================================
 * Routes untuk Public Transparency Dashboard
 * Menampilkan payment data yang sudah completed (RELEASED)
 * Tanpa mengexpose data sensitif (wallet address, internal IDs)
 *
 * Endpoints:
 * GET /api/public/payment-feed - Get payment feed dengan pagination
 * GET /api/public/payment-feed/:id - Get payment detail
 * GET /api/public/statistics - Payment statistics (dashboard summary)
 * GET /api/public/schools/:schoolId/payments - Payments untuk school tertentu
 * GET /api/public/catering/:cateringId/payments - Payments untuk catering tertentu
 *
 * Author: NutriChain Dev Team
 */

import express, { Request, Response, Router } from 'express';
import { pool } from '../config/database.js';

const router: Router = express.Router();

// ============================================
// GET /api/public/payment-feed
// ============================================
/**
 * Get public payment feed dengan pagination
 * Menampilkan semua payment yang sudah COMPLETED (released)
 * Data ditampilkan paling baru terlebih dahulu
 *
 * Query Params:
 * - page: number (default: 1)
 * - limit: number (default: 20)
 * - region: string (filter by school region)
 * - status: string (default: COMPLETED)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": 1,
 *       "school_name": "SDN Jakarta Utama",
 *       "school_region": "DKI Jakarta",
 *       "catering_name": "PT Makan Sehat",
 *       "amount": 15000000,
 *       "currency": "IDR",
 *       "portions_count": 100,
 *       "delivery_date": "2024-11-20",
 *       "status": "COMPLETED",
 *       "blockchain_tx_hash": "0x...",
 *       "blockchain_block_number": 12345,
 *       "released_at": "2024-11-20T14:30:00Z"
 *     }
 *   ],
 *   "pagination": {
 *     "page": 1,
 *     "limit": 20,
 *     "total": 156,
 *     "totalPages": 8
 *   }
 * }
 */
router.get(
  '/payment-feed',
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      const region = req.query.region as string;

      let query = `
        SELECT
          id, school_name, school_region, catering_name,
          amount, currency, portions_count, delivery_date,
          status, blockchain_tx_hash, blockchain_block_number,
          released_at, created_at
        FROM public_payment_feed
        WHERE status = 'COMPLETED'
      `;

      let params: any[] = [];

      // Optional: filter by region
      if (region) {
        query += ` AND school_region = $${params.length + 1}`;
        params.push(region);
      }

      // Count total
      let countQuery = `
        SELECT COUNT(*) FROM public_payment_feed
        WHERE status = 'COMPLETED'
      `;

      if (region) {
        countQuery += ` AND school_region = $1`;
      }

      const countParams = region ? [region] : [];
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);

      // Get data with pagination
      query += ` ORDER BY released_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'Blockchain Event Feed',
          transparency: 'Full',
        },
      });
    } catch (error: any) {
      console.error('Error fetching payment feed:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    }
  }
);

// ============================================
// GET /api/public/payment-feed/:id
// ============================================
/**
 * Get detail payment dari feed
 */
router.get(
  '/payment-feed/:id',
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `
        SELECT
          *
        FROM public_payment_feed
        WHERE id = $1 AND status = 'COMPLETED'
        `,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Payment not found',
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error('Error fetching payment detail:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    }
  }
);

// ============================================
// GET /api/public/statistics
// ============================================
/**
 * Dashboard statistics
 * Total payments, regions, caterings, etc.
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "totalPayments": 156,
 *     "totalAmountDistributed": 2340000000,
 *     "totalPortions": 15600,
 *     "averageAmountPerPayment": 15000000,
 *     "regionsServed": 5,
 *     "cateringsParticipated": 12,
 *     "schoolsServed": 45,
 *     "dateRange": {
 *       "earliest": "2024-01-01",
 *       "latest": "2024-11-20"
 *     },
 *     "topRegions": [
 *       {
 *         "region": "DKI Jakarta",
 *         "paymentCount": 45,
 *         "totalAmount": 675000000
 *       }
 *     ]
 *   }
 * }
 */
router.get(
  '/statistics',
  async (req: Request, res: Response) => {
    try {
      // Get basic statistics
      const statsResult = await pool.query(`
        SELECT
          COUNT(*) as total_payments,
          SUM(amount) as total_amount_distributed,
          SUM(portions_count) as total_portions,
          AVG(amount) as avg_amount,
          MIN(released_at) as earliest_date,
          MAX(released_at) as latest_date,
          COUNT(DISTINCT school_region) as regions_served,
          COUNT(DISTINCT catering_name) as caterings_participated,
          COUNT(DISTINCT school_name) as schools_served
        FROM public_payment_feed
        WHERE status = 'COMPLETED'
      `);

      const stats = statsResult.rows[0];

      // Get top regions
      const topRegionsResult = await pool.query(`
        SELECT
          school_region as region,
          COUNT(*) as payment_count,
          SUM(amount) as total_amount,
          SUM(portions_count) as total_portions
        FROM public_payment_feed
        WHERE status = 'COMPLETED'
        GROUP BY school_region
        ORDER BY total_amount DESC
        LIMIT 10
      `);

      // Get top caterings
      const topCateringsResult = await pool.query(`
        SELECT
          catering_name,
          COUNT(*) as payment_count,
          SUM(amount) as total_amount,
          SUM(portions_count) as total_portions
        FROM public_payment_feed
        WHERE status = 'COMPLETED'
        GROUP BY catering_name
        ORDER BY total_amount DESC
        LIMIT 10
      `);

      res.json({
        success: true,
        data: {
          summary: {
            totalPayments: parseInt(stats.total_payments || 0),
            totalAmountDistributed: parseFloat(
              stats.total_amount_distributed || 0
            ),
            totalPortions: parseInt(stats.total_portions || 0),
            averageAmountPerPayment: parseFloat(stats.avg_amount || 0),
            regionsServed: parseInt(stats.regions_served || 0),
            cateringsParticipated: parseInt(stats.caterings_participated || 0),
            schoolsServed: parseInt(stats.schools_served || 0),
            dateRange: {
              earliest: stats.earliest_date,
              latest: stats.latest_date,
            },
          },
          topRegions: topRegionsResult.rows.map((row: any) => ({
            region: row.region,
            paymentCount: parseInt(row.payment_count),
            totalAmount: parseFloat(row.total_amount),
            totalPortions: parseInt(row.total_portions),
          })),
          topCaterings: topCateringsResult.rows.map((row: any) => ({
            cateringName: row.catering_name,
            paymentCount: parseInt(row.payment_count),
            totalAmount: parseFloat(row.total_amount),
            totalPortions: parseInt(row.total_portions),
          })),
        },
        metadata: {
          timestamp: new Date().toISOString(),
          currency: 'IDR',
        },
      });
    } catch (error: any) {
      console.error('Error fetching statistics:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    }
  }
);

// ============================================
// GET /api/public/regions
// ============================================
/**
 * Get list of all regions dengan summary
 */
router.get(
  '/regions',
  async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT
          school_region,
          COUNT(*) as payment_count,
          COUNT(DISTINCT school_name) as schools_count,
          COUNT(DISTINCT catering_name) as caterings_count,
          SUM(amount) as total_amount,
          SUM(portions_count) as total_portions,
          MAX(released_at) as last_payment_date
        FROM public_payment_feed
        WHERE status = 'COMPLETED'
        GROUP BY school_region
        ORDER BY total_amount DESC
      `);

      res.json({
        success: true,
        data: result.rows.map((row: any) => ({
          region: row.school_region,
          paymentCount: parseInt(row.payment_count),
          schoolsCount: parseInt(row.schools_count),
          cateringsCount: parseInt(row.caterings_count),
          totalAmount: parseFloat(row.total_amount),
          totalPortions: parseInt(row.total_portions),
          lastPaymentDate: row.last_payment_date,
        })),
      });
    } catch (error: any) {
      console.error('Error fetching regions:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    }
  }
);

// ============================================
// GET /api/public/blockchain-transactions
// ============================================
/**
 * Get blockchain transaction history
 * Untuk blockchain explorer integration
 */
router.get(
  '/blockchain-transactions',
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const result = await pool.query(
        `
        SELECT
          id,
          blockchain_tx_hash as tx_hash,
          blockchain_block_number as block_number,
          school_name,
          catering_name,
          amount,
          portions_count as portions,
          released_at as timestamp
        FROM public_payment_feed
        WHERE status = 'COMPLETED' AND blockchain_tx_hash IS NOT NULL
        ORDER BY released_at DESC
        LIMIT $1 OFFSET $2
        `,
        [limit, offset]
      );

      // Get total count
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM public_payment_feed
         WHERE status = 'COMPLETED' AND blockchain_tx_hash IS NOT NULL`
      );
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
        metadata: {
          chain: 'Polygon (L2)',
          explorer: 'https://polygonscan.com/',
        },
      });
    } catch (error: any) {
      console.error('Error fetching blockchain transactions:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    }
  }
);

// ============================================
// GET /api/public/health
// ============================================
/**
 * Health check untuk public API
 */
router.get(
  '/health',
  async (req: Request, res: Response) => {
    try {
      // Check database connection
      const dbCheck = await pool.query('SELECT 1');

      // Get last payment timestamp
      const lastPaymentResult = await pool.query(
        'SELECT released_at FROM public_payment_feed ORDER BY released_at DESC LIMIT 1'
      );

      res.json({
        success: true,
        status: 'healthy',
        database: dbCheck.rows.length > 0 ? 'connected' : 'disconnected',
        lastPaymentUpdate: lastPaymentResult.rows[0]?.released_at || null,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;
