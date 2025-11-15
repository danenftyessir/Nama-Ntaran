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

import express, { Request, Response, Router } from 'express';
import { pool } from '../config/database.js';
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
    const client = await pool.connect();

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
      const schoolCheck = await client.query(
        'SELECT id FROM schools WHERE id = $1',
        [schoolId]
      );
      const cateringCheck = await client.query(
        'SELECT id, wallet_address FROM caterings WHERE id = $1',
        [cateringId]
      );

      if (schoolCheck.rows.length === 0) {
        return res.status(404).json({ error: 'School not found' });
      }

      if (cateringCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Catering not found' });
      }

      const cateringWallet = cateringCheck.rows[0].wallet_address;

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
      await client.query('BEGIN');

      const allocationId = uuidv4();
      const metadata = JSON.stringify({
        schoolId,
        cateringId,
        portions,
        deliveryDate,
        notes: notes || '',
      });

      const allocResult = await client.query(
        `INSERT INTO allocations
         (school_id, catering_id, allocation_id, amount, currency, status, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING id`,
        [schoolId, cateringId, allocationId, amount, 'IDR', 'PLANNED', metadata]
      );

      const allocIdDb = allocResult.rows[0].id;

      console.log(`   ✅ Allocation created: ${allocationId}`);

      // ============================================
      // STEP 2: Create payment record di database
      // ============================================
      const paymentResult = await client.query(
        `INSERT INTO payments
         (allocation_id, school_id, catering_id, amount, currency, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING id`,
        [allocIdDb, schoolId, cateringId, amount, 'IDR', 'PENDING']
      );

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
        await client.query('ROLLBACK');
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
      await client.query(
        `UPDATE allocations
         SET status = $1, tx_hash_lock = $2, locked_at = NOW(), updated_at = NOW()
         WHERE id = $3`,
        ['LOCKED', blockchainResult.txHash, allocIdDb]
      );

      await client.query(
        `UPDATE payments
         SET status = $1, blockchain_tx_hash = $2, blockchain_block_number = $3, updated_at = NOW()
         WHERE allocation_id = $4`,
        [
          'LOCKED',
          blockchainResult.txHash,
          blockchainResult.blockNumber,
          allocIdDb,
        ]
      );

      console.log(`   ✅ Database updated: status=LOCKED`);

      // ============================================
      // STEP 5 (Optional): Create invoice di Xendit (untuk tracking)
      // ============================================
      let xenditResult = null;

      const school = schoolCheck.rows[0];
      const catering = cateringCheck.rows[0];

      const schoolName = (school as any).name || 'Unknown School';
      const cateringName = (catering as any).name || 'Unknown Catering';

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

        await client.query(
          `UPDATE payments
           SET xendit_invoice_id = $1, updated_at = NOW()
           WHERE allocation_id = $2`,
          [xenditResult.invoiceId, allocIdDb]
        );
      }

      // ============================================
      // STEP 6: Log payment event
      // ============================================
      await client.query(
        `INSERT INTO payment_events
         (payment_id, allocation_id, event_type, blockchain_tx_hash, event_data, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          paymentResult.rows[0].id,
          allocIdDb,
          'FUND_LOCKED',
          blockchainResult.txHash,
          JSON.stringify({
            allocationId,
            schoolId,
            cateringId,
            amount,
            cateringWallet,
          }),
        ]
      );

      await client.query('COMMIT');

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
      await client.query('ROLLBACK');
      console.error('❌ Lock fund error:', error.message);

      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    } finally {
      client.release();
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

      let query = `
        SELECT
          a.id, a.allocation_id, a.school_id, a.catering_id,
          a.amount, a.currency, a.status,
          s.name as school_name, c.name as catering_name,
          a.locked_at, a.released_at, a.created_at
        FROM allocations a
        JOIN schools s ON a.school_id = s.id
        JOIN caterings c ON a.catering_id = c.id
      `;

      let params: any[] = [];

      if (status) {
        query += ` WHERE a.status = $1`;
        params = [status];
      }

      query += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM allocations';
      if (status) {
        countQuery += ` WHERE status = $1`;
      }
      const countParams = status ? [status] : [];
      const countResult = await pool.query(countQuery, countParams);
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

      const result = await pool.query(
        `
        SELECT
          a.*, s.name as school_name, c.name as catering_name,
          p.status as payment_status, p.blockchain_tx_hash
        FROM allocations a
        LEFT JOIN schools s ON a.school_id = s.id
        LEFT JOIN caterings c ON a.catering_id = c.id
        LEFT JOIN payments p ON a.id = p.allocation_id
        WHERE a.allocation_id = $1
        `,
        [allocationId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Allocation not found',
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
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
    const client = await pool.connect();

    try {
      const { allocationId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          error: 'Reason is required',
        });
      }

      await client.query('BEGIN');

      // Get allocation
      const allocResult = await client.query(
        'SELECT * FROM allocations WHERE allocation_id = $1',
        [allocationId]
      );

      if (allocResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          error: 'Allocation not found',
        });
      }

      const alloc = allocResult.rows[0];

      if (alloc.status === 'RELEASED') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Cannot cancel released allocation',
        });
      }

      // Update allocation status
      await client.query(
        'UPDATE allocations SET status = $1, updated_at = NOW() WHERE id = $2',
        ['CANCELLED', alloc.id]
      );

      // Update payment status
      await client.query(
        `UPDATE payments SET status = $1, updated_at = NOW()
         WHERE allocation_id = $2`,
        ['REFUNDED', alloc.id]
      );

      // Create refund record
      const paymentResult = await client.query(
        'SELECT id FROM payments WHERE allocation_id = $1',
        [alloc.id]
      );

      if (paymentResult.rows.length > 0) {
        await client.query(
          `INSERT INTO refunds
           (payment_id, allocation_id, amount, reason, status, requested_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            paymentResult.rows[0].id,
            alloc.id,
            alloc.amount,
            reason,
            'COMPLETED',
          ]
        );
      }

      await client.query('COMMIT');

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
      await client.query('ROLLBACK');
      console.error('Error cancelling allocation:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    } finally {
      client.release();
    }
  }
);

export default router;
