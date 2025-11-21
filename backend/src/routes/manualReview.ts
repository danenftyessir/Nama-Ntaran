// @ts-nocheck
/**
 * Manual Review API - Admin dapat review & approve/reject AI decisions
 */

import express from 'express';
import type { Response } from 'express';
import { supabase } from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { releaseEscrowForDelivery } from '../services/blockchain.js';
import { emitToSchool, emitToCatering, emitToAdmins } from '../config/socket.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireRole('admin'));

// ============================================
// GET /api/manual-review/pending
// Get all verifications that need manual review
// ============================================
router.get('/pending', async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('verifications')
      .select(`
        id,
        delivery_id,
        verified_at,
        portions_received,
        quality_rating,
        notes,
        photo_url,
        status,
        deliveries!inner (
          delivery_date,
          portions,
          amount,
          school_id,
          catering_id,
          schools!inner (
            id,
            name,
            npsn
          ),
          caterings!inner (
            id,
            name
          )
        ),
        ai_food_analyses (
          id,
          quality_score,
          freshness_score,
          presentation_score,
          hygiene_score,
          detected_items,
          portion_estimate,
          portion_confidence,
          meets_bgn_standards,
          confidence,
          reasoning,
          issues,
          warnings,
          recommendations,
          needs_manual_review
        )
      `)
      .eq('ai_food_analyses.needs_manual_review', true)
      .eq('status', 'pending_review')
      .order('verified_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Flatten the nested structure for backwards compatibility
    const reviews = (data || []).map(v => ({
      verification_id: v.id,
      delivery_id: v.delivery_id,
      verified_at: v.verified_at,
      portions_received: v.portions_received,
      quality_rating: v.quality_rating,
      notes: v.notes,
      photo_url: v.photo_url,
      verification_status: v.status,
      delivery_date: v.deliveries.delivery_date,
      expected_portions: v.deliveries.portions,
      amount: v.deliveries.amount,
      school_id: v.deliveries.schools.id,
      school_name: v.deliveries.schools.name,
      npsn: v.deliveries.schools.npsn,
      catering_id: v.deliveries.caterings.id,
      catering_name: v.deliveries.caterings.name,
      ai_analysis_id: v.ai_food_analyses?.[0]?.id,
      quality_score: v.ai_food_analyses?.[0]?.quality_score,
      freshness_score: v.ai_food_analyses?.[0]?.freshness_score,
      presentation_score: v.ai_food_analyses?.[0]?.presentation_score,
      hygiene_score: v.ai_food_analyses?.[0]?.hygiene_score,
      detected_items: v.ai_food_analyses?.[0]?.detected_items,
      portion_estimate: v.ai_food_analyses?.[0]?.portion_estimate,
      portion_confidence: v.ai_food_analyses?.[0]?.portion_confidence,
      meets_bgn_standards: v.ai_food_analyses?.[0]?.meets_bgn_standards,
      confidence: v.ai_food_analyses?.[0]?.confidence,
      reasoning: v.ai_food_analyses?.[0]?.reasoning,
      issues: v.ai_food_analyses?.[0]?.issues,
      warnings: v.ai_food_analyses?.[0]?.warnings,
      recommendations: v.ai_food_analyses?.[0]?.recommendations,
      needs_manual_review: v.ai_food_analyses?.[0]?.needs_manual_review
    }));

    res.json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error: any) {
    console.error('[Manual Review] Get pending error:', error);
    res.status(500).json({
      error: 'Failed to fetch pending reviews',
      details: error.message,
    });
  }
});

// ============================================
// POST /api/manual-review/:verificationId/approve
// Admin approves AI-flagged verification
// ============================================
router.post('/:verificationId/approve', async (req: AuthRequest, res: Response) => {
  const { verificationId } = req.params;
  const { adminNotes } = req.body;

  try {
    // Get verification details
    const { data: verificationData, error: verificationError } = await supabase
      .from('verifications')
      .select(`
        *,
        deliveries!inner (
          id,
          catering_id,
          school_id,
          schools!inner (
            name
          ),
          caterings!inner (
            name
          )
        )
      `)
      .eq('id', verificationId)
      .single();

    if (verificationError || !verificationData) {
      return res.status(404).json({ error: 'Verification not found' });
    }

    // Flatten the verification object
    const verification = {
      ...verificationData,
      delivery_id: verificationData.deliveries.id,
      catering_id: verificationData.deliveries.catering_id,
      school_id: verificationData.deliveries.school_id,
      school_name: verificationData.deliveries.schools.name,
      catering_name: verificationData.deliveries.caterings.name
    };

    // Update verification status to approved
    const { error: updateVerificationError } = await supabase
      .from('verifications')
      .update({
        status: 'approved',
        admin_reviewed_by: req.user?.id,
        admin_reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', verificationId);

    if (updateVerificationError) {
      throw updateVerificationError;
    }

    // Update delivery status to verified
    const { error: updateDeliveryError } = await supabase
      .from('deliveries')
      .update({
        status: 'verified',
        updated_at: new Date().toISOString()
      })
      .eq('id', verification.delivery_id);

    if (updateDeliveryError) {
      throw updateDeliveryError;
    }

    // Update AI analysis status
    if (verification.ai_analysis_id) {
      const { error: updateAIError } = await supabase
        .from('ai_food_analyses')
        .update({
          needs_manual_review: false,
          manually_approved: true
        })
        .eq('id', verification.ai_analysis_id);

      if (updateAIError) {
        throw updateAIError;
      }
    }

    // Release escrow funds
    let blockchainRelease = null;
    try {
      blockchainRelease = await releaseEscrowForDelivery(verification.delivery_id);
      console.log('✅ Escrow released after manual approval:', blockchainRelease);
    } catch (blockchainError) {
      console.warn('⚠️  Blockchain release failed:', blockchainError);
    }

    // Send notifications
    try {
      emitToSchool(verification.school_id, 'manual_review:approved', {
        verificationId,
        message: 'Verifikasi Anda telah disetujui oleh admin',
      });

      emitToCatering(verification.catering_id, 'manual_review:approved', {
        verificationId,
        deliveryId: verification.delivery_id,
        message: `Verifikasi untuk ${verification.school_name} disetujui - dana akan segera cair`,
        blockchain: blockchainRelease,
      });

      emitToAdmins('manual_review:completed', {
        verificationId,
        decision: 'approved',
        reviewer: req.user?.email,
      });
    } catch (socketError) {
      console.warn('⚠️  WebSocket notification failed:', socketError);
    }

    res.json({
      success: true,
      message: 'Verification approved successfully',
      blockchain: blockchainRelease,
    });

  } catch (error: any) {
    console.error('[Manual Review] Approve error:', error);
    res.status(500).json({
      error: 'Failed to approve verification',
      details: error.message,
    });
  }
});

// ============================================
// POST /api/manual-review/:verificationId/reject
// Admin rejects AI-flagged verification
// ============================================
router.post('/:verificationId/reject', async (req: AuthRequest, res: Response) => {
  const { verificationId } = req.params;
  const { adminNotes, reason } = req.body;

  if (!reason) {
    return res.status(400).json({ error: 'Rejection reason is required' });
  }

  try {
    // Get verification details
    const { data: verificationData, error: verificationError } = await supabase
      .from('verifications')
      .select(`
        *,
        deliveries!inner (
          id,
          catering_id,
          school_id,
          schools!inner (
            name
          ),
          caterings!inner (
            name
          )
        )
      `)
      .eq('id', verificationId)
      .single();

    if (verificationError || !verificationData) {
      return res.status(404).json({ error: 'Verification not found' });
    }

    // Flatten the verification object
    const verification = {
      ...verificationData,
      delivery_id: verificationData.deliveries.id,
      catering_id: verificationData.deliveries.catering_id,
      school_id: verificationData.deliveries.school_id,
      school_name: verificationData.deliveries.schools.name,
      catering_name: verificationData.deliveries.caterings.name
    };

    // Update verification status to rejected
    const { error: updateVerificationError } = await supabase
      .from('verifications')
      .update({
        status: 'rejected',
        admin_reviewed_by: req.user?.id,
        admin_reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes || null,
        rejection_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', verificationId);

    if (updateVerificationError) {
      throw updateVerificationError;
    }

    // Update delivery status to requires_action
    const { error: updateDeliveryError } = await supabase
      .from('deliveries')
      .update({
        status: 'requires_action',
        updated_at: new Date().toISOString()
      })
      .eq('id', verification.delivery_id);

    if (updateDeliveryError) {
      throw updateDeliveryError;
    }

    // Update AI analysis
    if (verification.ai_analysis_id) {
      const { error: updateAIError } = await supabase
        .from('ai_food_analyses')
        .update({
          needs_manual_review: false,
          manually_approved: false,
          manually_rejected: true
        })
        .eq('id', verification.ai_analysis_id);

      if (updateAIError) {
        throw updateAIError;
      }
    }

    // Create issue automatically
    const { error: createIssueError } = await supabase
      .from('issues')
      .insert({
        delivery_id: verification.delivery_id,
        reported_by: req.user?.id,
        issue_type: 'quality_issue',
        severity: 'high',
        description: `Admin rejected verification: ${reason}. ${adminNotes || ''}`,
        status: 'open',
        created_at: new Date().toISOString()
      });

    if (createIssueError) {
      throw createIssueError;
    }

    // Send notifications
    try {
      emitToSchool(verification.school_id, 'manual_review:rejected', {
        verificationId,
        reason,
        message: 'Verifikasi ditolak oleh admin - mohon hubungi katering untuk perbaikan',
      });

      emitToCatering(verification.catering_id, 'manual_review:rejected', {
        verificationId,
        deliveryId: verification.delivery_id,
        reason,
        message: `Verifikasi untuk ${verification.school_name} ditolak - pembayaran ditahan`,
      });

      emitToAdmins('manual_review:completed', {
        verificationId,
        decision: 'rejected',
        reviewer: req.user?.email,
        reason,
      });
    } catch (socketError) {
      console.warn('⚠️  WebSocket notification failed:', socketError);
    }

    res.json({
      success: true,
      message: 'Verification rejected successfully',
      reason,
    });

  } catch (error: any) {
    console.error('[Manual Review] Reject error:', error);
    res.status(500).json({
      error: 'Failed to reject verification',
      details: error.message,
    });
  }
});

// ============================================
// GET /api/manual-review/history
// Get manual review history
// ============================================
router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Get total count
    const { count, error: countError } = await supabase
      .from('verifications')
      .select('*', { count: 'exact', head: true })
      .in('status', ['approved', 'rejected'])
      .not('admin_reviewed_by', 'is', null);

    if (countError) {
      throw countError;
    }

    // Get verifications with pagination
    const { data, error } = await supabase
      .from('verifications')
      .select(`
        id,
        verified_at,
        admin_reviewed_at,
        status,
        admin_notes,
        rejection_reason,
        deliveries!inner (
          school_id,
          catering_id,
          schools!inner (
            name
          ),
          caterings!inner (
            name
          )
        ),
        users!verifications_admin_reviewed_by_fkey (
          email
        ),
        ai_food_analyses (
          quality_score,
          meets_bgn_standards,
          menu_match,
          portion_match,
          quality_acceptable
        )
      `)
      .in('status', ['approved', 'rejected'])
      .not('admin_reviewed_by', 'is', null)
      .order('admin_reviewed_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      throw error;
    }

    // Flatten the nested structure
    const history = (data || []).map(v => ({
      verification_id: v.id,
      verified_at: v.verified_at,
      admin_reviewed_at: v.admin_reviewed_at,
      status: v.status,
      admin_notes: v.admin_notes,
      rejection_reason: v.rejection_reason,
      school_name: v.deliveries.schools.name,
      catering_name: v.deliveries.caterings.name,
      reviewer_email: v.users?.email,
      quality_score: v.ai_food_analyses?.[0]?.quality_score,
      compliance: v.ai_food_analyses?.[0] ? {
        meetsBGNStandards: v.ai_food_analyses[0].meets_bgn_standards,
        menuMatch: v.ai_food_analyses[0].menu_match,
        portionMatch: v.ai_food_analyses[0].portion_match,
        qualityAcceptable: v.ai_food_analyses[0].quality_acceptable
      } : null
    }));

    res.json({
      success: true,
      history,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limitNum),
      },
    });

  } catch (error: any) {
    console.error('[Manual Review] Get history error:', error);
    res.status(500).json({
      error: 'Failed to fetch review history',
      details: error.message,
    });
  }
});

export default router;
