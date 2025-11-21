// @ts-nocheck
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

import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { supabase } from '../config/database.js';

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

      let query = supabase
        .from('public_payment_feed')
        .select(`
          id, school_name, school_region, catering_name,
          amount, currency, portions_count, delivery_date,
          status, blockchain_tx_hash, blockchain_block_number,
          released_at, created_at
        `, { count: 'exact' })
        .eq('status', 'COMPLETED')
        .order('released_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Optional: filter by region
      if (region) {
        query = query.eq('school_region', region);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
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

      const { data, error } = await supabase
        .from('public_payment_feed')
        .select('*')
        .eq('id', id)
        .eq('status', 'COMPLETED')
        .single();

      if (error || !data) {
        return res.status(404).json({
          error: 'Payment not found',
        });
      }

      res.json({
        success: true,
        data: data,
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
      // Get all completed payments for calculations
      const { data: payments, error } = await supabase
        .from('public_payment_feed')
        .select('*')
        .eq('status', 'COMPLETED');

      if (error) {
        throw error;
      }

      // Calculate basic statistics
      const totalPayments = payments?.length || 0;
      const totalAmount = payments?.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || 0;
      const totalPortions = payments?.reduce((sum, p) => sum + (parseInt(p.portions_count) || 0), 0) || 0;
      const avgAmount = totalPayments > 0 ? totalAmount / totalPayments : 0;

      const releasedDates = payments?.map(p => new Date(p.released_at)).filter(d => !isNaN(d.getTime())) || [];
      const earliestDate = releasedDates.length > 0 ? new Date(Math.min(...releasedDates.map(d => d.getTime()))) : null;
      const latestDate = releasedDates.length > 0 ? new Date(Math.max(...releasedDates.map(d => d.getTime()))) : null;

      const uniqueRegions = new Set(payments?.map(p => p.school_region).filter(Boolean));
      const uniqueCaterings = new Set(payments?.map(p => p.catering_name).filter(Boolean));
      const uniqueSchools = new Set(payments?.map(p => p.school_name).filter(Boolean));

      const stats = {
        total_payments: totalPayments,
        total_amount_distributed: totalAmount,
        total_portions: totalPortions,
        avg_amount: avgAmount,
        earliest_date: earliestDate,
        latest_date: latestDate,
        regions_served: uniqueRegions.size,
        caterings_participated: uniqueCaterings.size,
        schools_served: uniqueSchools.size,
      };

      // Calculate top regions
      const regionMap = new Map<string, { count: number; amount: number; portions: number }>();
      payments?.forEach(p => {
        if (p.school_region) {
          const existing = regionMap.get(p.school_region) || { count: 0, amount: 0, portions: 0 };
          regionMap.set(p.school_region, {
            count: existing.count + 1,
            amount: existing.amount + (parseFloat(p.amount) || 0),
            portions: existing.portions + (parseInt(p.portions_count) || 0),
          });
        }
      });

      const topRegionsResult = Array.from(regionMap.entries())
        .map(([region, data]) => ({
          region,
          payment_count: data.count,
          total_amount: data.amount,
          total_portions: data.portions,
        }))
        .sort((a, b) => b.total_amount - a.total_amount)
        .slice(0, 10);

      // Calculate top caterings
      const cateringMap = new Map<string, { count: number; amount: number; portions: number }>();
      payments?.forEach(p => {
        if (p.catering_name) {
          const existing = cateringMap.get(p.catering_name) || { count: 0, amount: 0, portions: 0 };
          cateringMap.set(p.catering_name, {
            count: existing.count + 1,
            amount: existing.amount + (parseFloat(p.amount) || 0),
            portions: existing.portions + (parseInt(p.portions_count) || 0),
          });
        }
      });

      const topCateringsResult = Array.from(cateringMap.entries())
        .map(([catering_name, data]) => ({
          catering_name,
          payment_count: data.count,
          total_amount: data.amount,
          total_portions: data.portions,
        }))
        .sort((a, b) => b.total_amount - a.total_amount)
        .slice(0, 10);

      res.json({
        success: true,
        data: {
          summary: {
            totalPayments: stats.total_payments,
            totalAmountDistributed: stats.total_amount_distributed,
            totalPortions: stats.total_portions,
            averageAmountPerPayment: stats.avg_amount,
            regionsServed: stats.regions_served,
            cateringsParticipated: stats.caterings_participated,
            schoolsServed: stats.schools_served,
            dateRange: {
              earliest: stats.earliest_date,
              latest: stats.latest_date,
            },
          },
          topRegions: topRegionsResult.map((row: any) => ({
            region: row.region,
            paymentCount: row.payment_count,
            totalAmount: row.total_amount,
            totalPortions: row.total_portions,
          })),
          topCaterings: topCateringsResult.map((row: any) => ({
            cateringName: row.catering_name,
            paymentCount: row.payment_count,
            totalAmount: row.total_amount,
            totalPortions: row.total_portions,
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
      const { data: payments, error } = await supabase
        .from('public_payment_feed')
        .select('*')
        .eq('status', 'COMPLETED');

      if (error) {
        throw error;
      }

      // Group by region
      const regionMap = new Map<string, any>();
      payments?.forEach(p => {
        if (p.school_region) {
          const existing = regionMap.get(p.school_region) || {
            payment_count: 0,
            schools: new Set(),
            caterings: new Set(),
            total_amount: 0,
            total_portions: 0,
            last_payment_date: null,
          };

          existing.payment_count++;
          if (p.school_name) existing.schools.add(p.school_name);
          if (p.catering_name) existing.caterings.add(p.catering_name);
          existing.total_amount += parseFloat(p.amount) || 0;
          existing.total_portions += parseInt(p.portions_count) || 0;

          const releaseDate = new Date(p.released_at);
          if (!existing.last_payment_date || releaseDate > new Date(existing.last_payment_date)) {
            existing.last_payment_date = p.released_at;
          }

          regionMap.set(p.school_region, existing);
        }
      });

      const result = Array.from(regionMap.entries())
        .map(([region, data]) => ({
          region: region,
          paymentCount: data.payment_count,
          schoolsCount: data.schools.size,
          cateringsCount: data.caterings.size,
          totalAmount: data.total_amount,
          totalPortions: data.total_portions,
          lastPaymentDate: data.last_payment_date,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount);

      res.json({
        success: true,
        data: result,
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

      const { data, error, count } = await supabase
        .from('public_payment_feed')
        .select(`
          id,
          blockchain_tx_hash,
          blockchain_block_number,
          school_name,
          catering_name,
          amount,
          portions_count,
          released_at
        `, { count: 'exact' })
        .eq('status', 'COMPLETED')
        .not('blockchain_tx_hash', 'is', null)
        .order('released_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      // Transform the response
      const transformedData = data?.map(row => ({
        id: row.id,
        tx_hash: row.blockchain_tx_hash,
        block_number: row.blockchain_block_number,
        school_name: row.school_name,
        catering_name: row.catering_name,
        amount: row.amount,
        portions: row.portions_count,
        timestamp: row.released_at,
      }));

      res.json({
        success: true,
        data: transformedData || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
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
      // Check database connection by querying
      const { error: dbError } = await supabase
        .from('public_payment_feed')
        .select('id')
        .limit(1);

      // Get last payment timestamp
      const { data: lastPayment } = await supabase
        .from('public_payment_feed')
        .select('released_at')
        .order('released_at', { ascending: false })
        .limit(1)
        .single();

      res.json({
        success: true,
        status: 'healthy',
        database: dbError ? 'disconnected' : 'connected',
        lastPaymentUpdate: lastPayment?.released_at || null,
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
