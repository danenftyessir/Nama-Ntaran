import express from 'express';
import type { Response } from 'express';
import { pool } from '../config/database.js';
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
      const schoolResult = await pool.query(
        'SELECT id FROM schools WHERE user_id = $1',
        [req.user.id]
      );
      if (schoolResult.rows.length > 0) {
        school_id = schoolResult.rows[0].id;
      } else {
        return res.status(403).json({ error: 'School not found for this user' });
      }
    }

    // Verify the delivery exists and belongs to the school
    const deliveryCheck = await pool.query(
      `SELECT d.*, c.name as catering_name, s.name as school_name
       FROM deliveries d
       JOIN caterings c ON d.catering_id = c.id
       JOIN schools s ON d.school_id = s.id
       WHERE d.id = $1 AND d.school_id = $2`,
      [delivery_id, school_id]
    );

    if (deliveryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery not found or does not belong to this school' });
    }

    const delivery = deliveryCheck.rows[0];

    // Create verification
    const result = await pool.query(
      `INSERT INTO verifications (
        delivery_id,
        school_id,
        verified_by,
        portions_received,
        quality_rating,
        notes,
        photo_url,
        status,
        verified_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved', CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        delivery_id,
        school_id,
        req.user?.id,
        portions_received,
        quality_rating,
        notes || null,
        photo_url || null
      ]
    );

    const verification = result.rows[0];

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
          expectedMenu: delivery.notes ? delivery.notes.split(',').map((s: string) => s.trim()) : ['Nasi', 'Lauk', 'Sayur'],
          expectedPortions: delivery.portions,
          deliveryId: delivery_id,
          schoolName: delivery.school_name,
          cateringName: delivery.catering_name,
        };

        // Call Claude Vision API
        aiAnalysis = await analyzeFoodPhoto(analysisRequest);

        // Save AI analysis to database
        const aiResult = await pool.query(
          `INSERT INTO ai_food_analyses (
            verification_id,
            delivery_id,
            detected_items,
            portion_estimate,
            portion_confidence,
            quality_score,
            freshness_score,
            presentation_score,
            hygiene_score,
            estimated_calories,
            estimated_protein,
            estimated_carbs,
            has_vegetables,
            menu_match,
            portion_match,
            quality_acceptable,
            meets_bgn_standards,
            confidence,
            reasoning,
            issues,
            warnings,
            recommendations,
            needs_manual_review,
            analyzed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, CURRENT_TIMESTAMP)
          RETURNING id`,
          [
            verification.id,
            delivery_id,
            aiAnalysis.detectedItems,
            aiAnalysis.portionEstimate,
            aiAnalysis.portionConfidence,
            aiAnalysis.qualityScore,
            aiAnalysis.freshnessScore,
            aiAnalysis.presentationScore,
            aiAnalysis.hygieneScore,
            aiAnalysis.nutritionEstimate.calories,
            aiAnalysis.nutritionEstimate.protein,
            aiAnalysis.nutritionEstimate.carbs,
            aiAnalysis.nutritionEstimate.vegetables,
            aiAnalysis.compliance.menuMatch,
            aiAnalysis.compliance.portionMatch,
            aiAnalysis.compliance.qualityAcceptable,
            aiAnalysis.compliance.meetsBGNStandards,
            aiAnalysis.confidence,
            aiAnalysis.reasoning,
            aiAnalysis.issues,
            aiAnalysis.warnings,
            aiAnalysis.recommendations,
            needsManualReview(aiAnalysis),
          ]
        );

        aiAnalysisId = aiResult.rows[0].id;

        // Update verification with AI analysis reference
        await pool.query(
          'UPDATE verifications SET ai_analysis_id = $1 WHERE id = $2',
          [aiAnalysisId, verification.id]
        );

        console.log(`✅ AI Analysis complete - Quality Score: ${aiAnalysis.qualityScore}/100`);

        // Check if manual review needed
        if (needsManualReview(aiAnalysis)) {
          console.warn('⚠️  AI flagged for manual review');

          // Notify admins about manual review needed
          emitToAdmins('ai:manual_review_needed', {
            verificationId: verification.id,
            deliveryId: delivery_id,
            aiAnalysis: aiAnalysis,
            school: delivery.school_name,
            catering: delivery.catering_name,
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
    await pool.query(
      `UPDATE deliveries SET status = 'verified', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [delivery_id]
    );

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
      emitToCatering(delivery.catering_id, 'verification:created', {
        verification: verification,
        delivery: delivery,
        blockchain: blockchainRelease,
        aiAnalysis: aiAnalysis ? {
          qualityScore: aiAnalysis.qualityScore,
          compliance: aiAnalysis.compliance,
          needsReview: needsManualReview(aiAnalysis),
        } : null,
        message: `Pengiriman ke ${delivery.school_name} telah diverifikasi`,
      });

      // Notify admins
      emitToAdmins('verification:created', {
        verification: verification,
        delivery: delivery,
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

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCounter = 1;

    // Filter by user role
    if (req.user?.role === 'school') {
      const schoolResult = await pool.query(
        'SELECT id FROM schools WHERE user_id = $1',
        [req.user.id]
      );
      if (schoolResult.rows.length > 0) {
        conditions.push(`v.school_id = $${paramCounter}`);
        params.push(schoolResult.rows[0].id);
        paramCounter++;
      }
    }

    if (status) {
      conditions.push(`v.status = $${paramCounter}`);
      params.push(status);
      paramCounter++;
    }

    if (school_id) {
      conditions.push(`v.school_id = $${paramCounter}`);
      params.push(school_id);
      paramCounter++;
    }

    if (delivery_id) {
      conditions.push(`v.delivery_id = $${paramCounter}`);
      params.push(delivery_id);
      paramCounter++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM verifications v ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get verifications with delivery, school, and catering info
    const query = `
      SELECT
        v.*,
        d.delivery_date,
        d.portions as delivery_portions,
        d.amount,
        s.name as school_name,
        s.npsn,
        c.name as catering_name,
        u.email as verified_by_email
      FROM verifications v
      LEFT JOIN deliveries d ON v.delivery_id = d.id
      LEFT JOIN schools s ON v.school_id = s.id
      LEFT JOIN caterings c ON d.catering_id = c.id
      LEFT JOIN users u ON v.verified_by = u.id
      ${whereClause}
      ORDER BY v.verified_at DESC NULLS LAST, v.created_at DESC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;

    params.push(limitNum, offset);

    const result = await pool.query(query, params);

    res.json({
      verifications: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum)
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

    const result = await pool.query(
      `SELECT
        v.*,
        d.delivery_date,
        d.portions as delivery_portions,
        d.amount,
        d.status as delivery_status,
        s.name as school_name,
        s.npsn,
        s.address as school_address,
        c.name as catering_name,
        c.company_name as catering_company,
        u.email as verified_by_email
      FROM verifications v
      LEFT JOIN deliveries d ON v.delivery_id = d.id
      LEFT JOIN schools s ON v.school_id = s.id
      LEFT JOIN caterings c ON d.catering_id = c.id
      LEFT JOIN users u ON v.verified_by = u.id
      WHERE v.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Verification not found' });
    }

    res.json({
      verification: result.rows[0]
    });
  } catch (error) {
    console.error('Get verification error:', error);
    res.status(500).json({
      error: 'Failed to fetch verification',
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
      const schoolResult = await pool.query(
        'SELECT id FROM schools WHERE user_id = $1',
        [req.user.id]
      );
      if (schoolResult.rows.length > 0) {
        school_id = schoolResult.rows[0].id;
      }
    }

    const whereClause = school_id ? `WHERE v.school_id = $1` : '';
    const params = school_id ? [school_id] : [];

    const statsQuery = `
      SELECT
        COUNT(*) as total_verifications,
        COUNT(*) FILTER (WHERE v.status = 'approved') as approved,
        COUNT(*) FILTER (WHERE v.status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE v.status = 'pending') as pending,
        COUNT(*) FILTER (WHERE v.verified_at >= CURRENT_DATE) as today,
        COUNT(*) FILTER (WHERE v.verified_at >= DATE_TRUNC('month', CURRENT_DATE)) as this_month,
        ROUND(AVG(v.quality_rating), 2) as avg_quality_rating
      FROM verifications v
      ${whereClause}
    `;

    const result = await pool.query(statsQuery, params);

    res.json({
      stats: result.rows[0]
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
