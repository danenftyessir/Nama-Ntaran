// @ts-nocheck
import express from 'express';
import type { Response } from 'express';
import { supabase } from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { releaseEscrowForDelivery } from '../services/blockchain.js';
import { emitToSchool, emitToCatering, emitToAdmins } from '../config/socket.js';
import {
  analyzeFoodPhoto,
  needsManualReview,
  generateVerificationDecision,
  type FoodAnalysisRequest
} from '../services/computerVision.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// POST /api/verifications - Create verification (School verifies delivery)
// NOW WITH AI COMPUTER VISION ANALYSIS! 🤖📸
router.post('/', requireRole('school', 'admin'), async (req: AuthRequest, res: Response) => {
  const {
    delivery_id,
    portions_received,
    quality_rating,
    notes,
    photo_url
  } = req.body;

  if (!delivery_id) {
    return res.status(400).json({ error: 'delivery_id is required' });
  }

  try {
    // Get school_id from user
    let school_id = null;
    if (req.user?.role === 'school') {
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (schoolError || !schoolData) {
        return res.status(403).json({ error: 'School not found for this user' });
      }
      school_id = schoolData.id;
    }

    // Verify the delivery exists and belongs to the school
    const { data: delivery, error: deliveryError } = await supabase
      .from('deliveries')
      .select(`
        *,
        caterings!inner (
          name
        ),
        schools!inner (
          name
        )
      `)
      .eq('id', delivery_id)
      .eq('school_id', school_id)
      .single();

    if (deliveryError || !delivery) {
      return res.status(404).json({ error: 'Delivery not found or does not belong to this school' });
    }

    // Flatten the delivery object
    const deliveryFlat = {
      ...delivery,
      catering_name: delivery.caterings.name,
      school_name: delivery.schools.name
    };

    // Create verification
    const { data: verification, error: verificationError } = await supabase
      .from('verifications')
      .insert({
        delivery_id,
        school_id,
        verified_by: req.user?.id,
        portions_received,
        quality_rating,
        notes: notes || null,
        photo_url: photo_url || null,
        status: 'approved',
        verified_at: new Date().toISOString()
      })
      .select()
      .single();

    if (verificationError || !verification) {
      throw verificationError || new Error('Failed to create verification');
    }

    // ========================================
    // 🤖 AI COMPUTER VISION ANALYSIS
    // ========================================
    let aiAnalysis = null;
    let aiAnalysisId = null;

    if (photo_url && process.env.ANTHROPIC_API_KEY) {
      console.log('🤖 Starting AI food quality analysis...');

      try {
        // Prepare analysis request
        const analysisRequest: FoodAnalysisRequest = {
          imageUrl: photo_url,
          expectedMenu: deliveryFlat.notes ? deliveryFlat.notes.split(',').map((s: string) => s.trim()) : ['Nasi', 'Lauk', 'Sayur'],
          expectedPortions: deliveryFlat.portions,
          deliveryId: delivery_id,
          schoolName: deliveryFlat.school_name,
          cateringName: deliveryFlat.catering_name,
        };

        // Call Claude Vision API
        aiAnalysis = await analyzeFoodPhoto(analysisRequest);

        // Save AI analysis to database
        const { data: aiResult, error: aiError } = await supabase
          .from('ai_food_analyses')
          .insert({
            verification_id: verification.id,
            delivery_id,
            detected_items: aiAnalysis.detectedItems,
            portion_estimate: aiAnalysis.portionEstimate,
            portion_confidence: aiAnalysis.portionConfidence,
            quality_score: aiAnalysis.qualityScore,
            freshness_score: aiAnalysis.freshnessScore,
            presentation_score: aiAnalysis.presentationScore,
            hygiene_score: aiAnalysis.hygieneScore,
            estimated_calories: aiAnalysis.nutritionEstimate.calories,
            estimated_protein: aiAnalysis.nutritionEstimate.protein,
            estimated_carbs: aiAnalysis.nutritionEstimate.carbs,
            has_vegetables: aiAnalysis.nutritionEstimate.vegetables,
            menu_match: aiAnalysis.compliance.menuMatch,
            portion_match: aiAnalysis.compliance.portionMatch,
            quality_acceptable: aiAnalysis.compliance.qualityAcceptable,
            meets_bgn_standards: aiAnalysis.compliance.meetsBGNStandards,
            confidence: aiAnalysis.confidence,
            reasoning: aiAnalysis.reasoning,
            issues: aiAnalysis.issues,
            warnings: aiAnalysis.warnings,
            recommendations: aiAnalysis.recommendations,
            needs_manual_review: needsManualReview(aiAnalysis),
            analyzed_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (aiError || !aiResult) {
          throw aiError || new Error('Failed to save AI analysis');
        }

        aiAnalysisId = aiResult.id;

        // Update verification with AI analysis reference
        const { error: updateVerificationError } = await supabase
          .from('verifications')
          .update({ ai_analysis_id: aiAnalysisId })
          .eq('id', verification.id);

        if (updateVerificationError) {
          throw updateVerificationError;
        }

        console.log(`✅ AI Analysis complete - Quality Score: ${aiAnalysis.qualityScore}/100`);

        // Check if manual review needed
        if (needsManualReview(aiAnalysis)) {
          console.warn('⚠️  AI flagged for manual review');

          // Notify admins about manual review needed
          emitToAdmins('ai:manual_review_needed', {
            verificationId: verification.id,
            deliveryId: delivery_id,
            aiAnalysis: aiAnalysis,
            school: deliveryFlat.school_name,
            catering: deliveryFlat.catering_name,
          });
        }

      } catch (aiError) {
        console.error('❌ AI Analysis failed:', aiError);
        // Don't fail the verification if AI analysis fails
        // Log the error but continue with the process
      }
    } else if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('⚠️  ANTHROPIC_API_KEY not configured - skipping AI analysis');
    }

    // Update delivery status to verified
    const { error: updateDeliveryError } = await supabase
      .from('deliveries')
      .update({
        status: 'verified',
        updated_at: new Date().toISOString()
      })
      .eq('id', delivery_id);

    if (updateDeliveryError) {
      throw updateDeliveryError;
    }

    // ========================================
    // 💰 BLOCKCHAIN ESCROW RELEASE
    // ========================================
    let blockchainRelease = null;

    // Only release if AI analysis passed or not configured
    const shouldRelease = !aiAnalysis || aiAnalysis.compliance.qualityAcceptable;

    if (shouldRelease) {
      try {
        blockchainRelease = await releaseEscrowForDelivery(delivery_id);
        console.log('✅ Blockchain escrow released:', blockchainRelease);
      } catch (blockchainError) {
        console.warn('⚠️  Blockchain release failed (verification still recorded):', blockchainError);
      }
    } else {
      console.warn('⚠️  Escrow release blocked - AI quality check failed');
    }

    // ========================================
    // 📢 WEBSOCKET NOTIFICATIONS
    // ========================================
    try {
      // Notify the catering about the verification
      emitToCatering(deliveryFlat.catering_id, 'verification:created', {
        verification: verification,
        delivery: deliveryFlat,
        blockchain: blockchainRelease,
        aiAnalysis: aiAnalysis ? {
          qualityScore: aiAnalysis.qualityScore,
          compliance: aiAnalysis.compliance,
          needsReview: needsManualReview(aiAnalysis),
        } : null,
        message: `Pengiriman ke ${deliveryFlat.school_name} telah diverifikasi`,
      });

      // Notify admins
      emitToAdmins('verification:created', {
        verification: verification,
        delivery: deliveryFlat,
        blockchain: blockchainRelease,
        aiAnalysis: aiAnalysis,
      });

      console.log('📢 WebSocket notifications sent for verification');
    } catch (socketError) {
      console.warn('⚠️  WebSocket notification failed:', socketError);
    }

    // ========================================
    // 📤 RESPONSE
    // ========================================
    res.status(201).json({
      message: 'Verification created successfully',
      verification: verification,
      aiAnalysis: aiAnalysis ? {
        id: aiAnalysisId,
        qualityScore: aiAnalysis.qualityScore,
        freshnessScore: aiAnalysis.freshnessScore,
        presentationScore: aiAnalysis.presentationScore,
        hygieneScore: aiAnalysis.hygieneScore,
        detectedItems: aiAnalysis.detectedItems,
        portionEstimate: aiAnalysis.portionEstimate,
        compliance: aiAnalysis.compliance,
        confidence: aiAnalysis.confidence,
        needsManualReview: needsManualReview(aiAnalysis),
        issues: aiAnalysis.issues,
        warnings: aiAnalysis.warnings,
        recommendations: aiAnalysis.recommendations,
        reasoning: aiAnalysis.reasoning,
      } : null,
      blockchain: blockchainRelease ? {
        released: true,
        transactionHash: blockchainRelease.transactionHash,
        blockNumber: blockchainRelease.blockNumber
      } : {
        released: false,
        reason: shouldRelease ? 'Blockchain not configured or release failed' : 'Quality check failed - manual review required'
      }
    });
  } catch (error) {
    console.error('Create verification error:', error);
    res.status(500).json({
      error: 'Failed to create verification',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/verifications - Get verifications with filters
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      status = '',
      school_id = '',
      delivery_id = ''
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build query with filters
    let query = supabase
      .from('verifications')
      .select(`
        *,
        deliveries (
          delivery_date,
          portions,
          amount,
          catering_id,
          caterings (
            name
          )
        ),
        schools (
          name,
          npsn
        ),
        users!verifications_verified_by_fkey (
          email
        )
      `, { count: 'exact' });

    // Filter by user role
    if (req.user?.role === 'school') {
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (schoolData && !schoolError) {
        query = query.eq('school_id', schoolData.id);
      }
    }

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (school_id) {
      query = query.eq('school_id', school_id);
    }

    if (delivery_id) {
      query = query.eq('delivery_id', delivery_id);
    }

    // Apply sorting and pagination
    const { data, error, count } = await query
      .order('verified_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      throw error;
    }

    // Flatten the nested structure
    const verifications = (data || []).map(v => ({
      ...v,
      delivery_date: v.deliveries?.delivery_date,
      delivery_portions: v.deliveries?.portions,
      amount: v.deliveries?.amount,
      school_name: v.schools?.name,
      npsn: v.schools?.npsn,
      catering_name: v.deliveries?.caterings?.name,
      verified_by_email: v.users?.email
    }));

    res.json({
      verifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limitNum)
      }
    });
  } catch (error) {
    console.error('Get verifications error:', error);
    res.status(500).json({
      error: 'Failed to fetch verifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/verifications/:id - Get single verification
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('verifications')
      .select(`
        *,
        deliveries (
          delivery_date,
          portions,
          amount,
          status,
          caterings (
            name,
            company_name
          )
        ),
        schools (
          name,
          npsn,
          address
        ),
        users!verifications_verified_by_fkey (
          email
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Verification not found' });
    }

    // Flatten the nested structure
    const verification = {
      ...data,
      delivery_date: data.deliveries?.delivery_date,
      delivery_portions: data.deliveries?.portions,
      amount: data.deliveries?.amount,
      delivery_status: data.deliveries?.status,
      school_name: data.schools?.name,
      npsn: data.schools?.npsn,
      school_address: data.schools?.address,
      catering_name: data.deliveries?.caterings?.name,
      catering_company: data.deliveries?.caterings?.company_name,
      verified_by_email: data.users?.email
    };

    res.json({
      verification
    });
  } catch (error) {
    console.error('Get verification error:', error);
    res.status(500).json({
      error: 'Failed to fetch verification',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/verifications/:id/ai-analysis - Get AI analysis for verification
router.get('/:id/ai-analysis', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('ai_food_analyses')
      .select('*')
      .eq('verification_id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'AI analysis not found for this verification' });
    }

    res.json({
      analysis: data
    });
  } catch (error) {
    console.error('Get AI analysis error:', error);
    res.status(500).json({
      error: 'Failed to fetch AI analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/verifications/stats - Get verification statistics
router.get('/stats/summary', async (req: AuthRequest, res: Response) => {
  try {
    let school_id = null;

    // Get school_id if user is a school
    if (req.user?.role === 'school') {
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (schoolData && !schoolError) {
        school_id = schoolData.id;
      }
    }

    // Build query
    let query = supabase.from('verifications').select('*');

    if (school_id) {
      query = query.eq('school_id', school_id);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Calculate stats manually
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      total_verifications: data?.length || 0,
      approved: data?.filter(v => v.status === 'approved').length || 0,
      rejected: data?.filter(v => v.status === 'rejected').length || 0,
      pending: data?.filter(v => v.status === 'pending').length || 0,
      today: data?.filter(v => v.verified_at && new Date(v.verified_at) >= today).length || 0,
      this_month: data?.filter(v => v.verified_at && new Date(v.verified_at) >= monthStart).length || 0,
      avg_quality_rating: data && data.length > 0
        ? Math.round((data.reduce((sum, v) => sum + (v.quality_rating || 0), 0) / data.length) * 100) / 100
        : 0
    };

    res.json({
      stats
    });
  } catch (error) {
    console.error('Get verification stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch verification stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
