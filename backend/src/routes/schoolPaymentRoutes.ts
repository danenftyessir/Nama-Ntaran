// @ts-nocheck
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

import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { supabase } from '../config/database.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
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
      const schoolId = ((req as AuthRequest).user as any)?.linkedSchoolId;

      if (!schoolId) {
        return res.status(400).json({
          error: 'School not linked to user',
        });
      }

      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          id, allocation_id, delivery_date, portions,
          amount, status,
          allocations!inner(
            allocation_id,
            status,
            caterings!inner(name, phone)
          ),
          delivery_confirmations(status, confirmed_at)
        `)
        .eq('allocations.school_id', schoolId)
        .eq('allocations.status', 'LOCKED')
        .order('delivery_date', { ascending: false });

      if (error) {
        throw error;
      }

      // Transform the nested structure
      const transformedData = data?.map((d: any) => ({
        id: d.id,
        allocation_id: d.allocation_id,
        delivery_date: d.delivery_date,
        portions: d.portions,
        amount: d.amount,
        status: d.status,
        blockchain_alloc_id: d.allocations?.allocation_id,
        allocation_status: d.allocations?.status,
        catering_name: d.allocations?.caterings?.name,
        catering_phone: d.allocations?.caterings?.phone,
        confirmation_status: Array.isArray(d.delivery_confirmations) ? d.delivery_confirmations[0]?.status : d.delivery_confirmations?.status,
        confirmed_at: Array.isArray(d.delivery_confirmations) ? d.delivery_confirmations[0]?.confirmed_at : d.delivery_confirmations?.confirmed_at,
      }));

      res.json({
        success: true,
        count: transformedData?.length || 0,
        data: transformedData || [],
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
      const schoolId = ((req as AuthRequest).user as any)?.linkedSchoolId;

      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          *,
          allocations!inner(
            allocation_id,
            status,
            amount,
            metadata,
            schools!inner(name),
            caterings!inner(name, phone, email)
          ),
          delivery_confirmations(status, quality_rating, notes, confirmed_at)
        `)
        .eq('id', deliveryId)
        .eq('allocations.school_id', schoolId)
        .single();

      if (error || !data) {
        return res.status(404).json({
          error: 'Delivery not found',
        });
      }

      // Transform and flatten the nested structure
      const delivery = {
        ...data,
        school_name: data.allocations?.schools?.name,
        blockchain_alloc_id: data.allocations?.allocation_id,
        allocation_status: data.allocations?.status,
        amount: data.allocations?.amount,
        metadata: data.allocations?.metadata ? (typeof data.allocations.metadata === 'string' ? JSON.parse(data.allocations.metadata) : data.allocations.metadata) : null,
        catering_name: data.allocations?.caterings?.name,
        catering_phone: data.allocations?.caterings?.phone,
        catering_email: data.allocations?.caterings?.email,
        confirmation_status: Array.isArray(data.delivery_confirmations) ? data.delivery_confirmations[0]?.status : data.delivery_confirmations?.status,
        quality_rating: Array.isArray(data.delivery_confirmations) ? data.delivery_confirmations[0]?.quality_rating : data.delivery_confirmations?.quality_rating,
        confirmation_notes: Array.isArray(data.delivery_confirmations) ? data.delivery_confirmations[0]?.notes : data.delivery_confirmations?.notes,
        confirmed_at: Array.isArray(data.delivery_confirmations) ? data.delivery_confirmations[0]?.confirmed_at : data.delivery_confirmations?.confirmed_at,
      };
      delete (delivery as any).allocations;
      delete (delivery as any).delivery_confirmations;

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
  async (req: Request, res: Response) => {
    try {
      console.log('\n📬 [School API] Delivery confirmation received');

      const { deliveryId } = req.params;
      const authReq = req as AuthRequest;
      const schoolId = (authReq.user as any)?.linkedSchoolId;
      const userId = (authReq.user as any)?.id;

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
      const { data: deliveryData, error: deliveryError } = await supabase
        .from('deliveries')
        .select(`
          *,
          allocations!inner(
            id,
            allocation_id,
            status,
            catering_id,
            amount
          )
        `)
        .eq('id', deliveryId)
        .eq('allocations.school_id', schoolId)
        .single();

      if (deliveryError || !deliveryData) {
        return res.status(404).json({
          error: 'Delivery not found',
        });
      }

      const delivery = deliveryData;
      const blockchainAllocId = deliveryData.allocations.allocation_id;
      const allocIdDb = deliveryData.allocations.id;
      const allocStatus = deliveryData.allocations.status;

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
      const { data: existingConfirm } = await supabase
        .from('delivery_confirmations')
        .select('id')
        .eq('delivery_id', deliveryId)
        .single();

      if (existingConfirm) {
        return res.status(400).json({
          error: 'Delivery already confirmed',
        });
      }

      // ============================================
      // STEP 1: Create delivery confirmation record
      // ============================================
      const photoUrl = req.file ? req.file.path : null;

      const { data: confirmResult, error: confirmError } = await supabase
        .from('delivery_confirmations')
        .insert({
          delivery_id: deliveryId,
          allocation_id: allocIdDb,
          school_id: schoolId,
          verified_by: userId,
          status: isOk ? 'APPROVED' : 'REJECTED',
          portions_received: portionsReceived,
          quality_rating: qualityRating,
          notes: notes,
          photo_urls: photoUrl ? JSON.stringify([photoUrl]) : null,
          confirmed_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (confirmError || !confirmResult) {
        return res.status(500).json({
          error: 'Failed to create confirmation',
          detail: confirmError?.message,
        });
      }

      console.log(`   ✅ Confirmation record created`);

      // ============================================
      // STEP 2: Update delivery status
      // ============================================
      const { error: deliveryUpdateError } = await supabase
        .from('deliveries')
        .update({
          status: isOk ? 'CONFIRMED' : 'REJECTED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', deliveryId);

      if (deliveryUpdateError) {
        // Rollback confirmation
        await supabase.from('delivery_confirmations').delete().eq('id', confirmResult.id);
        return res.status(500).json({
          error: 'Failed to update delivery status',
          detail: deliveryUpdateError.message,
        });
      }

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
          console.error('❌ Release escrow failed:', releaseResult.error);
          // Rollback delivery and confirmation
          await supabase.from('deliveries').update({ status: 'PENDING' }).eq('id', deliveryId);
          await supabase.from('delivery_confirmations').delete().eq('id', confirmResult.id);

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
        const { error: allocUpdateError } = await supabase
          .from('allocations')
          .update({
            status: 'RELEASED',
            tx_hash_release: releaseResult.txHash,
            released_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', allocIdDb);

        const { error: paymentUpdateError } = await supabase
          .from('payments')
          .update({
            status: 'COMPLETED',
            blockchain_tx_hash: releaseResult.txHash,
            blockchain_block_number: releaseResult.blockNumber,
            released_to_catering_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('allocation_id', allocIdDb);

        if (allocUpdateError || paymentUpdateError) {
          console.error('Failed to update allocation/payment:', allocUpdateError || paymentUpdateError);
        }

        console.log(`   ✅ Database allocations & payments updated`);

        // ============================================
        // STEP 5: Insert to public_payment_feed (transparency)
        // ============================================
        const { data: school } = await supabase
          .from('schools')
          .select('name, city')
          .eq('id', schoolId)
          .single();

        const { data: catering } = await supabase
          .from('caterings')
          .select('name')
          .eq('id', deliveryData.allocations.catering_id)
          .single();

        // Get payment and allocation data for feed
        const { data: payment } = await supabase
          .from('payments')
          .select('id')
          .eq('allocation_id', allocIdDb)
          .single();

        const { data: allocation } = await supabase
          .from('allocations')
          .select('locked_at')
          .eq('id', allocIdDb)
          .single();

        if (payment && allocation && school && catering) {
          await supabase
            .from('public_payment_feed')
            .insert({
              payment_id: payment.id,
              allocation_id: allocIdDb,
              school_name: school.name,
              school_region: school.city,
              catering_name: catering.name,
              amount: deliveryData.amount,
              currency: 'IDR',
              portions_count: portionsReceived,
              delivery_date: deliveryData.delivery_date,
              status: 'COMPLETED',
              blockchain_tx_hash: releaseResult.txHash,
              locked_at: allocation.locked_at,
              released_at: new Date().toISOString(),
            });
        }

        console.log(`   ✅ Public payment feed updated`);

        // ============================================
        // STEP 6: Log payment event
        // ============================================
        if (payment) {
          await supabase
            .from('payment_events')
            .insert({
              payment_id: payment.id,
              allocation_id: allocIdDb,
              event_type: 'PAYMENT_RELEASED',
              blockchain_tx_hash: releaseResult.txHash,
              event_data: JSON.stringify({
                deliveryId,
                blockchainAllocId,
                cateringId: deliveryData.allocations.catering_id,
                amount: deliveryData.amount,
                portionsReceived,
                qualityRating,
              }),
              processed: true,
              processed_at: new Date().toISOString(),
            });
        }
      } else {
        // If rejected, create issue record
        await supabase
          .from('issues')
          .insert({
            delivery_id: deliveryId,
            reported_by: userId,
            issue_type: 'quality_issue',
            description: notes || 'Delivery rejected by school',
            severity: 'medium',
            status: 'open',
          });

        console.log(`   ✅ Issue record created for rejected delivery`);
      }

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
      console.error('❌ Delivery confirmation error:', error.message);

      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
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
      const schoolId = ((req as AuthRequest).user as any)?.linkedSchoolId;

      if (!schoolId) {
        return res.status(400).json({
          error: 'School not linked to user',
        });
      }

      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          allocation_id,
          amount,
          currency,
          status,
          created_at,
          allocations!inner(
            allocation_id,
            school_id,
            catering_id,
            caterings!inner(name)
          ),
          deliveries:allocations(
            id,
            delivery_date,
            delivery_confirmations(confirmed_at)
          )
        `)
        .eq('allocations.school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Transform the nested structure to flat format
      const transformedData = data?.map((p: any) => ({
        id: p.id,
        allocation_id: p.allocation_id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        blockchain_alloc_id: p.allocations?.allocation_id,
        catering_name: p.allocations?.caterings?.name,
        delivery_date: Array.isArray(p.deliveries) && p.deliveries[0] ? p.deliveries[0].delivery_date : null,
        confirmed_at: Array.isArray(p.deliveries) && p.deliveries[0]?.delivery_confirmations?.[0]
          ? p.deliveries[0].delivery_confirmations[0].confirmed_at
          : null,
        created_at: p.created_at,
      })) || [];

      res.json({
        success: true,
        count: transformedData.length,
        data: transformedData,
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
