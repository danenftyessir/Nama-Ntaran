// @ts-nocheck
/**
 * ============================================
 * ADMIN PAYMENT ROUTES
 * ============================================
 * Routes untuk Admin Dinas/Pemerintah
 * Hanya admin yang bisa lock dana ke escrow
 *
 * Endpoints:
 * POST /api/admin/escrow/lock - Lock dana ke escrow
 * GET /api/admin/allocations - List allocations
 * GET /api/admin/allocations/:id - Get allocation detail
 * POST /api/admin/allocations/:id/cancel - Cancel allocation
 *
 * Author: NutriChain Dev Team
 */

import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { supabase } from '../config/database.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import blockchainPaymentService from '../services/blockchainPaymentService.js';
import xenditPaymentService from '../services/xenditPaymentService.js';
import { v4 as uuidv4 } from 'uuid';

const router: Router = express.Router();

// ============================================
// MIDDLEWARE: Admin Only
// ============================================
const requireAdmin = [
  authenticateToken,
  authorizeRole(['admin', 'ADMIN_PEMERINTAH']),
];

// ============================================
// INTERFACE/TYPES
// ============================================

interface LockFundRequest extends Request {
  body: {
    schoolId: number;
    cateringId: number;
    amount: number; // IDR
    portions: number;
    deliveryDate: string; // YYYY-MM-DD
    notes?: string;
  };
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

// ============================================
// POST /api/admin/escrow/lock
// ============================================
/**
 * FLOW: Admin Dinas lock dana ke smart contract escrow
 *
 * Body:
 * {
 *   "schoolId": 1,
 *   "cateringId": 5,
 *   "amount": 15000000,        // IDR
 *   "portions": 100,
 *   "deliveryDate": "2024-11-20"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "allocationId": "alloc_uuid",
 *   "blockchainTxHash": "0x...",
 *   "status": "LOCKED"
 * }
 */
router.post(
  '/escrow/lock',
  requireAdmin,
  async (req: LockFundRequest, res: Response) => {
    try {
      console.log('\n📝 [Admin API] Lock Fund request received');
      const { schoolId, cateringId, amount, portions, deliveryDate, notes } =
        req.body;

      // ============================================
      // VALIDATION
      // ============================================
      if (!schoolId || !cateringId || !amount || !portions || !deliveryDate) {
        return res.status(400).json({
          error: 'Missing required fields: schoolId, cateringId, amount, portions, deliveryDate',
        });
      }

      if (amount < 0) {
        return res.status(400).json({
          error: 'Amount must be positive',
        });
      }

      // Cek apakah school dan catering exist
      const { data: schoolCheck, error: schoolError } = await supabase
        .from('schools')
        .select('id')
        .eq('id', schoolId)
        .single();

      const { data: cateringCheck, error: cateringError } = await supabase
        .from('caterings')
        .select('id, wallet_address')
        .eq('id', cateringId)
        .single();

      if (schoolError || !schoolCheck) {
        return res.status(404).json({ error: 'School not found' });
      }

      if (cateringError || !cateringCheck) {
        return res.status(404).json({ error: 'Catering not found' });
      }

      const cateringWallet = cateringCheck.wallet_address;

      if (!cateringWallet) {
        return res.status(400).json({
          error: 'Catering does not have wallet address',
        });
      }

      console.log(`   School ID: ${schoolId}`);
      console.log(`   Catering ID: ${cateringId}`);
      console.log(`   Amount: Rp ${amount.toLocaleString('id-ID')}`);

      // ============================================
      // STEP 1: Create allocation record di database
      // ============================================
      const allocationId = uuidv4();
      const metadata = JSON.stringify({
        schoolId,
        cateringId,
        portions,
        deliveryDate,
        notes: notes || '',
      });

      const { data: allocResult, error: allocError } = await supabase
        .from('allocations')
        .insert({
          school_id: schoolId,
          catering_id: cateringId,
          allocation_id: allocationId,
          amount: amount,
          currency: 'IDR',
          status: 'PLANNED',
          metadata: metadata,
        })
        .select('id')
        .single();

      if (allocError || !allocResult) {
        return res.status(500).json({
          error: 'Failed to create allocation',
          detail: allocError?.message,
        });
      }

      const allocIdDb = allocResult.id;

      console.log(`   ✅ Allocation created: ${allocationId}`);

      // ============================================
      // STEP 2: Create payment record di database
      // ============================================
      const { data: paymentResult, error: paymentError } = await supabase
        .from('payments')
        .insert({
          allocation_id: allocIdDb,
          school_id: schoolId,
          catering_id: cateringId,
          amount: amount,
          currency: 'IDR',
          status: 'PENDING',
        })
        .select('id')
        .single();

      if (paymentError || !paymentResult) {
        // Rollback allocation
        await supabase.from('allocations').delete().eq('id', allocIdDb);
        return res.status(500).json({
          error: 'Failed to create payment',
          detail: paymentError?.message,
        });
      }

      console.log(`   ✅ Payment record created`);

      // ============================================
      // STEP 3: Call blockchain lockFund()
      // ============================================
      // Convert amount IDR to wei (assume 18 decimal)
      const amountWei = BigInt(amount.toString()) * BigInt(10 ** 18);

      const blockchainResult = await blockchainPaymentService.lockFund({
        allocationId: allocationId,
        payerAddress: (req.user as any).walletAddress || process.env.ADMIN_ADDRESS || '',
        payeeAddress: cateringWallet,
        amount: amountWei,
        metadata: metadata,
      });

      if (!blockchainResult.success) {
        // Rollback payment and allocation
        await supabase.from('payments').delete().eq('allocation_id', allocIdDb);
        await supabase.from('allocations').delete().eq('id', allocIdDb);
        return res.status(500).json({
          error: 'Blockchain lock fund failed',
          detail: blockchainResult.error,
        });
      }

      console.log(`   ✅ Blockchain lock successful`);
      console.log(`   TX Hash: ${blockchainResult.txHash}`);

      // ============================================
      // STEP 4: Update allocation status ke LOCKED
      // ============================================
      const { error: allocUpdateError } = await supabase
        .from('allocations')
        .update({
          status: 'LOCKED',
          tx_hash_lock: blockchainResult.txHash,
          locked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', allocIdDb);

      const { error: paymentUpdateError } = await supabase
        .from('payments')
        .update({
          status: 'LOCKED',
          blockchain_tx_hash: blockchainResult.txHash,
          blockchain_block_number: blockchainResult.blockNumber,
          updated_at: new Date().toISOString(),
        })
        .eq('allocation_id', allocIdDb);

      if (allocUpdateError || paymentUpdateError) {
        console.error('Failed to update status:', allocUpdateError || paymentUpdateError);
      }

      console.log(`   ✅ Database updated: status=LOCKED`);

      // ============================================
      // STEP 5 (Optional): Create invoice di Xendit (untuk tracking)
      // ============================================
      let xenditResult = null;

      // Get school and catering names
      const { data: schoolData } = await supabase
        .from('schools')
        .select('name')
        .eq('id', schoolId)
        .single();

      const { data: cateringData } = await supabase
        .from('caterings')
        .select('name')
        .eq('id', cateringId)
        .single();

      const schoolName = schoolData?.name || 'Unknown School';
      const cateringName = cateringData?.name || 'Unknown Catering';

      xenditResult = await xenditPaymentService.createInvoice({
        allocationId: allocationId,
        description: `Delivery untuk ${schoolName}`,
        amount: amount,
        schoolName: schoolName,
        cateringName: cateringName,
        deliveryDate: deliveryDate,
        portions: portions,
      });

      if (xenditResult.success) {
        console.log(`   ✅ Xendit invoice created: ${xenditResult.invoiceId}`);

        await supabase
          .from('payments')
          .update({
            xendit_invoice_id: xenditResult.invoiceId,
            updated_at: new Date().toISOString(),
          })
          .eq('allocation_id', allocIdDb);
      }

      // ============================================
      // STEP 6: Log payment event
      // ============================================
      await supabase
        .from('payment_events')
        .insert({
          payment_id: paymentResult.id,
          allocation_id: allocIdDb,
          event_type: 'FUND_LOCKED',
          blockchain_tx_hash: blockchainResult.txHash,
          event_data: JSON.stringify({
            allocationId,
            schoolId,
            cateringId,
            amount,
            cateringWallet,
          }),
        });

      // ============================================
      // RETURN SUCCESS RESPONSE
      // ============================================
      console.log(`\n✅ Lock Fund completed successfully\n`);

      res.status(201).json({
        success: true,
        message: 'Fund locked to escrow successfully',
        data: {
          allocationId: allocationId,
          status: 'LOCKED',
          amount: amount,
          currency: 'IDR',
          blockchainTxHash: blockchainResult.txHash,
          blockchainBlockNumber: blockchainResult.blockNumber,
          xenditInvoiceId: xenditResult?.invoiceId || null,
          xenditInvoiceUrl: xenditResult?.invoiceUrl || null,
          lockedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error('❌ Lock fund error:', error.message);

      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    }
  }
);

// ============================================
// GET /api/admin/allocations
// ============================================
/**
 * List semua allocations dengan pagination
 */
router.get(
  '/allocations',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      const status = req.query.status as string;

      let query = supabase
        .from('allocations')
        .select(`
          id, allocation_id, school_id, catering_id,
          amount, currency, status,
          schools!inner(name),
          caterings!inner(name),
          locked_at, released_at, created_at
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      // Transform the nested response format
      const transformedData = data?.map((item: any) => ({
        id: item.id,
        allocation_id: item.allocation_id,
        school_id: item.school_id,
        catering_id: item.catering_id,
        amount: item.amount,
        currency: item.currency,
        status: item.status,
        school_name: item.schools?.name,
        catering_name: item.caterings?.name,
        locked_at: item.locked_at,
        released_at: item.released_at,
        created_at: item.created_at,
      }));

      res.json({
        success: true,
        data: transformedData,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      });
    } catch (error: any) {
      console.error('Error fetching allocations:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    }
  }
);

// ============================================
// GET /api/admin/allocations/:allocationId
// ============================================
/**
 * Get allocation detail
 */
router.get(
  '/allocations/:allocationId',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { allocationId } = req.params;

      const { data, error } = await supabase
        .from('allocations')
        .select(`
          *,
          schools!inner(name),
          caterings!inner(name),
          payments!inner(status, blockchain_tx_hash)
        `)
        .eq('allocation_id', allocationId)
        .single();

      if (error || !data) {
        return res.status(404).json({
          error: 'Allocation not found',
        });
      }

      // Flatten the nested structure
      const flattenedData = {
        ...data,
        school_name: data.schools?.name,
        catering_name: data.caterings?.name,
        payment_status: Array.isArray(data.payments) ? data.payments[0]?.status : data.payments?.status,
        blockchain_tx_hash: Array.isArray(data.payments) ? data.payments[0]?.blockchain_tx_hash : data.payments?.blockchain_tx_hash,
      };
      delete flattenedData.schools;
      delete flattenedData.caterings;
      delete flattenedData.payments;

      res.json({
        success: true,
        data: flattenedData,
      });
    } catch (error: any) {
      console.error('Error fetching allocation:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    }
  }
);

// ============================================
// POST /api/admin/allocations/:allocationId/cancel
// ============================================
/**
 * Cancel allocation dan refund dana
 */
router.post(
  '/allocations/:allocationId/cancel',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { allocationId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          error: 'Reason is required',
        });
      }

      // Get allocation
      const { data: alloc, error: allocError } = await supabase
        .from('allocations')
        .select('*')
        .eq('allocation_id', allocationId)
        .single();

      if (allocError || !alloc) {
        return res.status(404).json({
          error: 'Allocation not found',
        });
      }

      if (alloc.status === 'RELEASED') {
        return res.status(400).json({
          error: 'Cannot cancel released allocation',
        });
      }

      // Update allocation status
      const { error: allocUpdateError } = await supabase
        .from('allocations')
        .update({
          status: 'CANCELLED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', alloc.id);

      if (allocUpdateError) {
        throw allocUpdateError;
      }

      // Update payment status
      const { error: paymentUpdateError } = await supabase
        .from('payments')
        .update({
          status: 'REFUNDED',
          updated_at: new Date().toISOString(),
        })
        .eq('allocation_id', alloc.id);

      if (paymentUpdateError) {
        throw paymentUpdateError;
      }

      // Get payment for refund record
      const { data: payment } = await supabase
        .from('payments')
        .select('id')
        .eq('allocation_id', alloc.id)
        .single();

      if (payment) {
        await supabase
          .from('refunds')
          .insert({
            payment_id: payment.id,
            allocation_id: alloc.id,
            amount: alloc.amount,
            reason: reason,
            status: 'COMPLETED',
            requested_at: new Date().toISOString(),
          });
      }

      res.json({
        success: true,
        message: 'Allocation cancelled and refunded',
        data: {
          allocationId: allocationId,
          status: 'CANCELLED',
          refundAmount: alloc.amount,
        },
      });
    } catch (error: any) {
      console.error('Error cancelling allocation:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    }
  }
);

export default router;
