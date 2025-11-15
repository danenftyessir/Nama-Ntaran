/**
 * ============================================
 * SCHOOL PAYMENT ROUTES
 * ============================================
 * Routes untuk Sekolah (Verifier)
 * Sekolah confirm penerimaan makanan, kemudian trigger release escrow
 *
 * CRITICAL FLOW:
 * 1. Katering kirim makanan ke sekolah
 * 2. Sekolah login portal, cek delivery status
 * 3. Sekolah klik "Konfirmasi Penerimaan" jika porsi & kualitas OK
 * 4. Backend trigger releaseEscrow() -> dana ke Katering
 * 5. Event listener capture PaymentReleased -> update DB -> Dashboard update
 *
 * Endpoints:
 * GET /api/school/deliveries - List deliveries untuk sekolah ini
 * GET /api/school/deliveries/:id - Get delivery detail
 * POST /api/school/deliveries/:id/confirm - Confirm penerimaan
 * POST /api/school/deliveries/:id/reject - Reject delivery (issue)
 * GET /api/school/payments - Payment history
 *
 * Author: NutriChain Dev Team
 */

import express, { Request, Response, Router } from 'express';
import { pool } from '../config/database.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import blockchainPaymentService from '../services/blockchainPaymentService.js';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';

const router: Router = express.Router();

// ============================================
// MIDDLEWARE: School Only
// ============================================
const requireSchool = [
  authenticateToken,
  authorizeRole(['school', 'SEKOLAH']),
];

// Setup multer untuk upload foto
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `delivery_${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`
    );
  },
});
const upload = multer({
  storage: storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') },
});

// ============================================
// TYPES
// ============================================

interface ConfirmDeliveryRequest extends Request {
  body: {
    isOk: boolean; // true = terima, false = tolak
    portionsReceived: number;
    qualityRating: number; // 1-5
    notes: string;
  };
  user?: {
    id: number;
    email: string;
    role: string;
    linkedSchoolId: number;
  };
  file?: Express.Multer.File;
}

// ============================================
// GET /api/school/deliveries
// ============================================
/**
 * List deliveries untuk sekolah ini yang belum di-confirm
 * Menampilkan delivery yang sudah locked di escrow tapi belum confirmed
 */
router.get(
  '/deliveries',
  requireSchool,
  async (req: Request, res: Response) => {
    try {
      const schoolId = (req.user as any).linkedSchoolId;

      if (!schoolId) {
        return res.status(400).json({
          error: 'School not linked to user',
        });
      }

      const result = await pool.query(
        `
        SELECT
          d.id, d.allocation_id, d.delivery_date, d.portions,
          d.amount, d.status,
          a.allocation_id as blockchain_alloc_id,
          a.status as allocation_status,
          c.name as catering_name, c.phone as catering_phone,
          dc.status as confirmation_status,
          dc.confirmed_at
        FROM deliveries d
        LEFT JOIN allocations a ON d.allocation_id = a.id
        LEFT JOIN caterings c ON a.catering_id = c.id
        LEFT JOIN delivery_confirmations dc ON d.id = dc.delivery_id
        WHERE a.school_id = $1 AND a.status = 'LOCKED'
        ORDER BY d.delivery_date DESC
        `,
        [schoolId]
      );

      res.json({
        success: true,
        count: result.rows.length,
        data: result.rows,
      });
    } catch (error: any) {
      console.error('Error fetching deliveries:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    }
  }
);

// ============================================
// GET /api/school/deliveries/:id
// ============================================
/**
 * Get detail delivery untuk sekolah confirm
 */
router.get(
  '/deliveries/:deliveryId',
  requireSchool,
  async (req: Request, res: Response) => {
    try {
      const { deliveryId } = req.params;
      const schoolId = (req.user as any).linkedSchoolId;

      const result = await pool.query(
        `
        SELECT
          d.*, s.name as school_name,
          a.allocation_id as blockchain_alloc_id,
          a.status as allocation_status, a.amount, a.metadata,
          c.name as catering_name, c.phone as catering_phone, c.email as catering_email,
          dc.status as confirmation_status, dc.quality_rating, dc.notes as confirmation_notes,
          dc.confirmed_at
        FROM deliveries d
        JOIN allocations a ON d.allocation_id = a.id
        JOIN schools s ON a.school_id = s.id
        JOIN caterings c ON a.catering_id = c.id
        LEFT JOIN delivery_confirmations dc ON d.id = dc.delivery_id
        WHERE d.id = $1 AND a.school_id = $2
        `,
        [deliveryId, schoolId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Delivery not found',
        });
      }

      const delivery = result.rows[0];

      // Parse metadata
      if (delivery.metadata) {
        delivery.metadata = JSON.parse(delivery.metadata);
      }

      res.json({
        success: true,
        data: delivery,
      });
    } catch (error: any) {
      console.error('Error fetching delivery:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    }
  }
);

// ============================================
// POST /api/school/deliveries/:id/confirm
// ============================================
/**
 * CRITICAL ENDPOINT: Sekolah confirm penerimaan makanan
 *
 * FLOW:
 * 1. Sekolah submit form dengan foto & quality rating
 * 2. Backend validasi
 * 3. Backend CREATE delivery_confirmations record
 * 4. Backend CALL releaseEscrow() ke smart contract
 * 5. Smart contract transfer dana -> Katering wallet
 * 6. Event listener capture PaymentReleased event
 * 7. Backend UPDATE allocations & payments status = RELEASED
 * 8. Public Dashboard mereflect perubahan ini (live update)
 *
 * Request Body:
 * {
 *   "isOk": true,
 *   "portionsReceived": 100,
 *   "qualityRating": 5,
 *   "notes": "Makanan enak dan segar"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Delivery confirmed, escrow released",
 *   "data": {
 *     "deliveryId": 123,
 *     "allocationId": "...",
 *     "releasedAmount": 15000000,
 *     "blockchainTxHash": "0x..."
 *   }
 * }
 */
router.post(
  '/deliveries/:deliveryId/confirm',
  requireSchool,
  upload.single('photo'),
  async (req: ConfirmDeliveryRequest, res: Response) => {
    const client = await pool.connect();

    try {
      console.log('\n📬 [School API] Delivery confirmation received');

      const { deliveryId } = req.params;
      const schoolId = (req.user as any).linkedSchoolId;
      const userId = (req.user as any).id;

      const {
        isOk,
        portionsReceived,
        qualityRating,
        notes,
      } = req.body;

      // ============================================
      // VALIDATION
      // ============================================
      if (isOk === undefined) {
        return res.status(400).json({
          error: 'isOk field is required',
        });
      }

      if (!schoolId) {
        return res.status(400).json({
          error: 'School not linked to user',
        });
      }

      // Get delivery data
      const deliveryResult = await client.query(
        `
        SELECT
          d.*, a.id as alloc_db_id, a.allocation_id, a.status as allocation_status,
          a.catering_id, a.amount
        FROM deliveries d
        JOIN allocations a ON d.allocation_id = a.id
        WHERE d.id = $1 AND a.school_id = $2
        `,
        [deliveryId, schoolId]
      );

      if (deliveryResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Delivery not found',
        });
      }

      const delivery = deliveryResult.rows[0];
      const blockchainAllocId = delivery.allocation_id;
      const allocIdDb = delivery.alloc_db_id;
      const allocStatus = delivery.allocation_status;

      console.log(`   Delivery ID: ${deliveryId}`);
      console.log(`   Allocation ID: ${blockchainAllocId}`);
      console.log(`   Status: ${allocStatus}`);

      // Check allocation status harus LOCKED
      if (allocStatus !== 'LOCKED') {
        return res.status(400).json({
          error: `Allocation status is ${allocStatus}, expected LOCKED`,
        });
      }

      // Check if already confirmed
      const existingConfirm = await client.query(
        'SELECT id FROM delivery_confirmations WHERE delivery_id = $1',
        [deliveryId]
      );

      if (existingConfirm.rows.length > 0) {
        return res.status(400).json({
          error: 'Delivery already confirmed',
        });
      }

      await client.query('BEGIN');

      // ============================================
      // STEP 1: Create delivery confirmation record
      // ============================================
      const photoUrl = req.file ? req.file.path : null;

      const confirmResult = await client.query(
        `
        INSERT INTO delivery_confirmations
        (delivery_id, allocation_id, school_id, verified_by, status,
         portions_received, quality_rating, notes, photo_urls, confirmed_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING id
        `,
        [
          deliveryId,
          allocIdDb,
          schoolId,
          userId,
          isOk ? 'APPROVED' : 'REJECTED',
          portionsReceived,
          qualityRating,
          notes,
          photoUrl ? JSON.stringify([photoUrl]) : null,
        ]
      );

      console.log(`   ✅ Confirmation record created`);

      // ============================================
      // STEP 2: Update delivery status
      // ============================================
      await client.query(
        'UPDATE deliveries SET status = $1, updated_at = NOW() WHERE id = $2',
        [isOk ? 'CONFIRMED' : 'REJECTED', deliveryId]
      );

      console.log(`   ✅ Delivery status updated`);

      // ============================================
      // STEP 3 (CRITICAL): Call releaseEscrow() jika isOk=true
      // ============================================
      let releaseResult = null;

      if (isOk) {
        console.log(`\n💰 [School API] Triggering blockchain releaseEscrow...`);

        releaseResult = await blockchainPaymentService.releaseEscrow(
          blockchainAllocId
        );

        if (!releaseResult.success) {
          await client.query('ROLLBACK');
          console.error('❌ Release escrow failed:', releaseResult.error);

          return res.status(500).json({
            error: 'Failed to release escrow',
            detail: releaseResult.error,
          });
        }

        console.log(`   ✅ Blockchain releaseEscrow successful`);
        console.log(`   TX Hash: ${releaseResult.txHash}`);

        // ============================================
        // STEP 4: Update allocation & payment status
        // ============================================
        await client.query(
          `UPDATE allocations
           SET status = $1, tx_hash_release = $2, released_at = NOW(), updated_at = NOW()
           WHERE id = $3`,
          ['RELEASED', releaseResult.txHash, allocIdDb]
        );

        await client.query(
          `UPDATE payments
           SET status = $1, blockchain_tx_hash = $2, blockchain_block_number = $3,
               released_to_catering_at = NOW(), updated_at = NOW()
           WHERE allocation_id = $4`,
          [
            'COMPLETED',
            releaseResult.txHash,
            releaseResult.blockNumber,
            allocIdDb,
          ]
        );

        console.log(`   ✅ Database allocations & payments updated`);

        // ============================================
        // STEP 5: Insert to public_payment_feed (transparency)
        // ============================================
        const schoolResult = await client.query(
          'SELECT name, city FROM schools WHERE id = $1',
          [schoolId]
        );
        const cateringResult = await client.query(
          'SELECT name FROM caterings WHERE id = $1',
          [delivery.catering_id]
        );

        const school = schoolResult.rows[0];
        const catering = cateringResult.rows[0];

        await client.query(
          `INSERT INTO public_payment_feed
           (payment_id, allocation_id, school_name, school_region,
            catering_name, amount, currency, portions_count, delivery_date,
            status, blockchain_tx_hash, locked_at, released_at, created_at)
           SELECT p.id, a.id, $2, $3, $4, $5, $6, $7, $8, $9, $10, a.locked_at, NOW(), NOW()
           FROM payments p
           JOIN allocations a ON p.allocation_id = a.id
           WHERE a.id = $1`,
          [
            allocIdDb,
            school.name,
            school.city,
            catering.name,
            delivery.amount,
            'IDR',
            portionsReceived,
            delivery.delivery_date,
            'COMPLETED',
            releaseResult.txHash,
          ]
        );

        console.log(`   ✅ Public payment feed updated`);

        // ============================================
        // STEP 6: Log payment event
        // ============================================
        const paymentResult = await client.query(
          'SELECT id FROM payments WHERE allocation_id = $1',
          [allocIdDb]
        );

        if (paymentResult.rows.length > 0) {
          await client.query(
            `INSERT INTO payment_events
             (payment_id, allocation_id, event_type, blockchain_tx_hash,
              event_data, processed, processed_at, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
            [
              paymentResult.rows[0].id,
              allocIdDb,
              'PAYMENT_RELEASED',
              releaseResult.txHash,
              JSON.stringify({
                deliveryId,
                blockchainAllocId,
                cateringId: delivery.catering_id,
                amount: delivery.amount,
                portionsReceived,
                qualityRating,
              }),
              true,
            ]
          );
        }
      } else {
        // If rejected, create issue record
        await client.query(
          `INSERT INTO issues
           (delivery_id, reported_by, issue_type, description, severity, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            deliveryId,
            userId,
            'quality_issue',
            notes || 'Delivery rejected by school',
            'medium',
            'open',
          ]
        );

        console.log(`   ✅ Issue record created for rejected delivery`);
      }

      await client.query('COMMIT');

      // ============================================
      // RETURN SUCCESS RESPONSE
      // ============================================
      console.log(`\n✅ Delivery confirmation completed\n`);

      res.status(200).json({
        success: true,
        message: isOk
          ? 'Delivery confirmed and escrow released'
          : 'Delivery rejected, issue reported',
        data: {
          deliveryId: deliveryId,
          allocationId: blockchainAllocId,
          confirmationStatus: isOk ? 'APPROVED' : 'REJECTED',
          releasedAmount: isOk ? delivery.amount : null,
          blockchainTxHash: releaseResult?.txHash || null,
          blockchainBlockNumber: releaseResult?.blockNumber || null,
          confirmedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('❌ Delivery confirmation error:', error.message);

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
// GET /api/school/payments
// ============================================
/**
 * Payment history untuk sekolah ini
 */
router.get(
  '/payments',
  requireSchool,
  async (req: Request, res: Response) => {
    try {
      const schoolId = (req.user as any).linkedSchoolId;

      if (!schoolId) {
        return res.status(400).json({
          error: 'School not linked to user',
        });
      }

      const result = await pool.query(
        `
        SELECT
          p.id, p.allocation_id, p.amount, p.currency, p.status,
          a.allocation_id as blockchain_alloc_id,
          c.name as catering_name,
          d.delivery_date,
          dc.confirmed_at,
          p.created_at
        FROM payments p
        JOIN allocations a ON p.allocation_id = a.id
        JOIN caterings c ON a.catering_id = c.id
        LEFT JOIN deliveries d ON a.id = d.allocation_id
        LEFT JOIN delivery_confirmations dc ON d.id = dc.delivery_id
        WHERE a.school_id = $1
        ORDER BY p.created_at DESC
        `,
        [schoolId]
      );

      res.json({
        success: true,
        count: result.rows.length,
        data: result.rows,
      });
    } catch (error: any) {
      console.error('Error fetching school payments:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    }
  }
);

export default router;
