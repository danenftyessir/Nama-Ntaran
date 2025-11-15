/**
 * AI Analytics Service - Advanced Analytics & Predictive Insights
 *
 * Features:
 * - Anomaly Detection (fraud patterns, delivery issues)
 * - Predictive Analytics (budget forecasting, demand prediction)
 * - Trend Analysis (stunting, poverty trends over time)
 * - Performance Prediction (vendor risk assessment)
 *
 * OPTIMIZATION STRATEGY:
 * - Uses COHERE for text classification, embeddings, and generation (faster & cheaper)
 * - Uses CLAUDE only for computer vision tasks (no Cohere alternative)
 * - Fallback mechanism: Cohere → Claude → Rule-based
 */

import pool from '../config/database.js';
import Anthropic from '@anthropic-ai/sdk';
import {
  classifyAnomalySeverity,
  findSimilarAnomalies,
  generateVendorRiskReport,
  forecastDemandWithCohere,
  isCohereAvailable,
} from './cohereService.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface AnomalyAlert {
  id?: number;
  type: 'collusion' | 'fake_verification' | 'budget_overrun' | 'quality_drop' | 'late_delivery_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  suspiciousPatterns: string[];
  involvedParties: {
    schoolId?: number;
    schoolName?: string;
    cateringId?: number;
    cateringName?: string;
  };
  confidenceScore: number; // 0-1
  recommendation: 'investigate' | 'block' | 'monitor' | 'alert_admin';
  detectedAt: Date;
  dataPoints: any;
}

export interface BudgetOptimization {
  province: string;
  currentAllocation: number;
  recommendedAllocation: number;
  reasoning: string;
  expectedImpact: {
    additionalStudents: number;
    stuntingReductionPercent: number;
    efficiencyGain: number;
  };
  confidence: number;
}

export interface VendorRiskAssessment {
  cateringId: number;
  cateringName: string;
  riskScore: number; // 0-100 (higher = more risky)
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    lateDeliveryRate: number;
    qualityIssueRate: number;
    complianceRate: number;
    averageQualityScore: number;
  };
  predictions: {
    likelyToDefaultNextMonth: number; // probability 0-1
    recommendedAction: string;
  };
  history: {
    totalDeliveries: number;
    successfulDeliveries: number;
    issuesReported: number;
  };
}

export interface TrendAnalysis {
  metric: 'stunting' | 'poverty' | 'delivery_success' | 'quality_score';
  province?: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  dataPoints: Array<{
    date: Date;
    value: number;
  }>;
  trend: 'improving' | 'stable' | 'declining';
  changePercent: number;
  forecast: Array<{
    date: Date;
    predicted: number;
    confidence: number;
  }>;
}

export interface DemandForecast {
  province: string;
  month: string; // YYYY-MM
  predictedStudents: number;
  predictedBudgetNeeded: number;
  confidence: number;
  seasonalFactors: string[];
}

// ============================================
// ANOMALY DETECTION
// ============================================

/**
 * Detect suspicious verification patterns (possible collusion)
 */
export async function detectVerificationAnomalies(): Promise<AnomalyAlert[]> {
  const alerts: AnomalyAlert[] = [];

  try {
    // Pattern 1: Verifications happening too quickly (< 5 minutes after delivery)
    const quickVerifications = await pool.query(`
      SELECT
        v.id as verification_id,
        v.delivery_id,
        v.verified_at,
        d.delivery_date,
        d.created_at as delivery_created_at,
        s.id as school_id,
        s.name as school_name,
        c.id as catering_id,
        c.name as catering_name,
        EXTRACT(EPOCH FROM (v.verified_at - d.created_at)) / 60 as minutes_elapsed
      FROM verifications v
      JOIN deliveries d ON v.delivery_id = d.id
      JOIN schools s ON d.school_id = s.id
      JOIN caterings c ON d.catering_id = c.id
      WHERE v.verified_at < d.created_at + INTERVAL '5 minutes'
        AND v.verified_at >= NOW() - INTERVAL '30 days'
      ORDER BY minutes_elapsed ASC
    `);

    if (quickVerifications.rows.length > 0) {
      for (const row of quickVerifications.rows) {
        // Use Cohere AI to classify severity (more accurate than hardcoded)
        const description = `School "${row.school_name}" verified delivery from "${row.catering_name}" in ${Math.round(row.minutes_elapsed)} minutes. This is too fast to be genuine.`;

        let severity: 'low' | 'medium' | 'high' | 'critical' = 'high';
        let confidenceScore = 0.85;
        let recommendation: 'investigate' | 'block' | 'monitor' | 'alert_admin' = 'investigate';

        // Try Cohere classification first
        if (isCohereAvailable()) {
          try {
            const classification = await classifyAnomalySeverity(description, {
              minutesElapsed: row.minutes_elapsed,
              schoolId: row.school_id,
              cateringId: row.catering_id,
            });
            severity = classification.severity;
            confidenceScore = classification.confidence;
            recommendation = classification.suggestedAction;
            console.log(`[AI Analytics] Cohere classified anomaly as ${severity} (confidence: ${confidenceScore})`);
          } catch (error) {
            console.warn('[AI Analytics] Cohere classification failed, using fallback');
          }
        }

        alerts.push({
          type: 'fake_verification',
          severity,
          title: 'Suspiciously Quick Verification',
          description,
          suspiciousPatterns: [
            `Verification time: ${Math.round(row.minutes_elapsed)} minutes after delivery scheduled`,
            'Pattern matches pre-arranged collusion',
          ],
          involvedParties: {
            schoolId: row.school_id,
            schoolName: row.school_name,
            cateringId: row.catering_id,
            cateringName: row.catering_name,
          },
          confidenceScore,
          recommendation,
          detectedAt: new Date(),
          dataPoints: {
            verificationId: row.verification_id,
            deliveryId: row.delivery_id,
            minutesElapsed: row.minutes_elapsed,
          },
        });
      }
    }

    // Pattern 2: Same school-catering pair with consistently perfect scores
    const perfectPairs = await pool.query(`
      SELECT
        s.id as school_id,
        s.name as school_name,
        c.id as catering_id,
        c.name as catering_name,
        COUNT(*) as verification_count,
        AVG(v.quality_rating) as avg_quality,
        COUNT(CASE WHEN v.quality_rating = 5 THEN 1 END) as perfect_count,
        COUNT(CASE WHEN v.quality_rating = 5 THEN 1 END)::float / COUNT(*)::float as perfect_ratio
      FROM verifications v
      JOIN deliveries d ON v.delivery_id = d.id
      JOIN schools s ON d.school_id = s.id
      JOIN caterings c ON d.catering_id = c.id
      WHERE v.verified_at >= NOW() - INTERVAL '90 days'
      GROUP BY s.id, s.name, c.id, c.name
      HAVING COUNT(*) >= 10
        AND COUNT(CASE WHEN v.quality_rating = 5 THEN 1 END)::float / COUNT(*)::float > 0.95
      ORDER BY perfect_ratio DESC
    `);

    if (perfectPairs.rows.length > 0) {
      for (const row of perfectPairs.rows) {
        alerts.push({
          type: 'collusion',
          severity: 'medium',
          title: 'Suspiciously Perfect Partnership',
          description: `School "${row.school_name}" and catering "${row.catering_name}" have ${row.perfect_count}/${row.verification_count} perfect scores (${(row.perfect_ratio * 100).toFixed(1)}%). This is statistically unusual.`,
          suspiciousPatterns: [
            `Perfect score rate: ${(row.perfect_ratio * 100).toFixed(1)}%`,
            'Lack of normal variation suggests possible favoritism',
          ],
          involvedParties: {
            schoolId: row.school_id,
            schoolName: row.school_name,
            cateringId: row.catering_id,
            cateringName: row.catering_name,
          },
          confidenceScore: 0.75,
          recommendation: 'monitor',
          detectedAt: new Date(),
          dataPoints: {
            verificationCount: row.verification_count,
            perfectCount: row.perfect_count,
            avgQuality: row.avg_quality,
          },
        });
      }
    }

    // Pattern 3: Late delivery pattern
    const lateDeliveryVendors = await pool.query(`
      SELECT
        c.id as catering_id,
        c.name as catering_name,
        COUNT(*) as total_deliveries,
        COUNT(CASE WHEN i.issue_type = 'late_delivery' THEN 1 END) as late_count,
        COUNT(CASE WHEN i.issue_type = 'late_delivery' THEN 1 END)::float / COUNT(*)::float as late_ratio
      FROM deliveries d
      JOIN caterings c ON d.catering_id = c.id
      LEFT JOIN issues i ON d.id = i.delivery_id
      WHERE d.created_at >= NOW() - INTERVAL '60 days'
      GROUP BY c.id, c.name
      HAVING COUNT(*) >= 10
        AND COUNT(CASE WHEN i.issue_type = 'late_delivery' THEN 1 END)::float / COUNT(*)::float > 0.3
      ORDER BY late_ratio DESC
    `);

    if (lateDeliveryVendors.rows.length > 0) {
      for (const row of lateDeliveryVendors.rows) {
        alerts.push({
          type: 'late_delivery_pattern',
          severity: row.late_ratio > 0.5 ? 'high' : 'medium',
          title: 'Chronic Late Delivery Issue',
          description: `Catering "${row.catering_name}" has ${row.late_count}/${row.total_deliveries} late deliveries (${(row.late_ratio * 100).toFixed(1)}%). Performance declining.`,
          suspiciousPatterns: [
            `Late delivery rate: ${(row.late_ratio * 100).toFixed(1)}%`,
            'Consistently failing to meet delivery schedule',
          ],
          involvedParties: {
            cateringId: row.catering_id,
            cateringName: row.catering_name,
          },
          confidenceScore: 0.9,
          recommendation: row.late_ratio > 0.5 ? 'investigate' : 'alert_admin',
          detectedAt: new Date(),
          dataPoints: {
            totalDeliveries: row.total_deliveries,
            lateCount: row.late_count,
          },
        });
      }
    }

    console.log(`[AI Analytics] Detected ${alerts.length} anomalies`);
    return alerts;

  } catch (error) {
    console.error('[AI Analytics] Anomaly detection failed:', error);
    throw error;
  }
}

// ============================================
// VENDOR RISK ASSESSMENT
// ============================================

/**
 * Assess vendor performance and predict risk
 * NOW USES COHERE for natural language report generation
 */
export async function assessVendorRisk(cateringId: number): Promise<VendorRiskAssessment> {
  try {
    const result = await pool.query(`
      SELECT
        c.id,
        c.name,
        COUNT(DISTINCT d.id) as total_deliveries,
        COUNT(DISTINCT CASE WHEN v.id IS NOT NULL THEN d.id END) as successful_deliveries,
        COUNT(DISTINCT i.id) as issues_reported,
        COUNT(DISTINCT CASE WHEN i.issue_type = 'late_delivery' THEN i.id END) as late_deliveries,
        COUNT(DISTINCT CASE WHEN i.issue_type = 'quality_issue' THEN i.id END) as quality_issues,
        AVG(v.quality_rating) as avg_quality_rating,
        AVG(CASE WHEN v.portions_received::float / d.portions >= 0.95 THEN 1.0 ELSE 0.0 END) as portion_compliance
      FROM caterings c
      LEFT JOIN deliveries d ON c.id = d.catering_id
      LEFT JOIN verifications v ON d.id = v.delivery_id
      LEFT JOIN issues i ON d.id = i.delivery_id
      WHERE c.id = $1
        AND d.created_at >= NOW() - INTERVAL '90 days'
      GROUP BY c.id, c.name
    `, [cateringId]);

    if (result.rows.length === 0) {
      throw new Error(`Catering with ID ${cateringId} not found`);
    }

    const data = result.rows[0];

    // Calculate metrics
    const totalDeliveries = data.total_deliveries || 0;
    const successfulDeliveries = data.successful_deliveries || 0;
    const issuesReported = data.issues_reported || 0;

    const lateDeliveryRate = totalDeliveries > 0 ? (data.late_deliveries || 0) / totalDeliveries : 0;
    const qualityIssueRate = totalDeliveries > 0 ? (data.quality_issues || 0) / totalDeliveries : 0;
    const complianceRate = totalDeliveries > 0 ? successfulDeliveries / totalDeliveries : 0;
    const avgQualityScore = data.avg_quality_rating ? (data.avg_quality_rating / 5) * 100 : 0;

    // Calculate risk score (0-100, higher = worse)
    let riskScore = 0;
    riskScore += lateDeliveryRate * 30; // Max 30 points from late deliveries
    riskScore += qualityIssueRate * 30; // Max 30 points from quality issues
    riskScore += (1 - complianceRate) * 20; // Max 20 points from non-compliance
    riskScore += (1 - (avgQualityScore / 100)) * 20; // Max 20 points from low quality

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (riskScore >= 75) riskLevel = 'critical';
    else if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 25) riskLevel = 'medium';
    else riskLevel = 'low';

    // Predict likelihood of default next month
    const likelyToDefault = Math.min(0.95, riskScore / 100 * 1.2);

    // Generate recommendation using Cohere AI (better natural language)
    let recommendedAction = '';
    if (riskLevel === 'critical') {
      recommendedAction = 'Consider immediate contract termination and vendor replacement';
    } else if (riskLevel === 'high') {
      recommendedAction = 'Issue formal warning and implement weekly performance monitoring';
    } else if (riskLevel === 'medium') {
      recommendedAction = 'Schedule performance review meeting and provide improvement guidelines';
    } else {
      recommendedAction = 'Continue regular monitoring';
    }

    // Try to enhance recommendation with Cohere AI
    if (isCohereAvailable()) {
      try {
        const riskData = {
          riskScore: Math.round(riskScore),
          riskLevel,
          factors: {
            lateDeliveryRate,
            qualityIssueRate,
            complianceRate,
            averageQualityScore: avgQualityScore,
          },
          predictions: {
            likelyToDefaultNextMonth: likelyToDefault,
            recommendedAction,
          },
          history: {
            totalDeliveries,
            successfulDeliveries,
            issuesReported,
          },
        };

        const aiReport = await generateVendorRiskReport(data.name, riskData);
        recommendedAction = aiReport.recommendations.join(' ');
        console.log(`[AI Analytics] Cohere generated enhanced risk report for ${data.name}`);
      } catch (error) {
        console.warn('[AI Analytics] Cohere report generation failed, using fallback');
      }
    }

    return {
      cateringId: data.id,
      cateringName: data.name,
      riskScore: Math.round(riskScore),
      riskLevel,
      factors: {
        lateDeliveryRate,
        qualityIssueRate,
        complianceRate,
        averageQualityScore: avgQualityScore,
      },
      predictions: {
        likelyToDefaultNextMonth: likelyToDefault,
        recommendedAction,
      },
      history: {
        totalDeliveries,
        successfulDeliveries,
        issuesReported,
      },
    };

  } catch (error) {
    console.error('[AI Analytics] Vendor risk assessment failed:', error);
    throw error;
  }
}

// ============================================
// BUDGET OPTIMIZATION
// ============================================

/**
 * Optimize budget allocation across provinces
 * OPTIMIZATION: Uses COHERE first (36x cheaper), Claude as fallback
 */
export async function optimizeBudgetAllocation(
  totalBudget: number
): Promise<BudgetOptimization[]> {
  try {
    // Fetch current allocation and priority data
    const provinceData = await pool.query(`
      SELECT
        s.province,
        COUNT(DISTINCT s.id) as school_count,
        AVG(s.priority_score) as avg_priority,
        SUM(d.amount) as current_allocation
      FROM schools s
      LEFT JOIN deliveries d ON s.id = d.school_id
        AND d.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY s.province
      ORDER BY avg_priority DESC
    `);

    const prompt = `You are a budget optimization expert for Indonesia's School Nutrition Program.

**AVAILABLE BUDGET:** Rp ${totalBudget.toLocaleString()}

**CURRENT PROVINCIAL DATA:**
${provinceData.rows.map((row, i) => `
${i + 1}. ${row.province}
   - Schools: ${row.school_count}
   - Avg Priority Score: ${row.avg_priority?.toFixed(2) || 'N/A'}
   - Current Monthly Allocation: Rp ${row.current_allocation?.toLocaleString() || '0'}
`).join('')}

**YOUR TASK:**
Optimize budget allocation to maximize impact on child nutrition and stunting reduction.

**CONSTRAINTS:**
- Priority provinces (higher scores) should receive more
- No province should get less than 5% of total budget
- Consider economies of scale (larger allocations may have better per-student efficiency)
- Ensure equitable distribution while prioritizing need

**OUTPUT FORMAT:**
Return ONLY a JSON array with this structure:
[
  {
    "province": "Province Name",
    "currentAllocation": <number>,
    "recommendedAllocation": <number>,
    "reasoning": "<brief explanation>",
    "expectedImpact": {
      "additionalStudents": <number>,
      "stuntingReductionPercent": <number>,
      "efficiencyGain": <number>
    },
    "confidence": <0-1>
  },
  ...
]`;

    // PRIORITY 1: Try Cohere first (much cheaper!)
    if (isCohereAvailable()) {
      try {
        console.log('[AI Analytics] Using Cohere for budget optimization (cost-effective)');

        // Dynamic import to avoid TypeScript errors
        const { CohereClient } = await import('cohere-ai');
        const cohere = new CohereClient({ token: process.env.COHERE_API_KEY! });

        const response = await cohere.chat({
          model: 'command-r',
          message: prompt,
          temperature: 0.4,
        });

        let jsonText = response.text.trim();
        if (jsonText.includes('```json')) {
          jsonText = jsonText.substring(
            jsonText.indexOf('```json') + 7,
            jsonText.lastIndexOf('```')
          ).trim();
        } else if (jsonText.includes('[')) {
          jsonText = jsonText.substring(
            jsonText.indexOf('['),
            jsonText.lastIndexOf(']') + 1
          );
        }

        const recommendations: BudgetOptimization[] = JSON.parse(jsonText);
        console.log('[AI Analytics] Cohere optimization successful - saved ~90% cost vs Claude');
        return recommendations;

      } catch (error) {
        console.warn('[AI Analytics] Cohere optimization failed, falling back to Claude:', error);
      }
    }

    // FALLBACK 1: Try Claude if Cohere unavailable
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        console.log('[AI Analytics] Using Claude for budget optimization (fallback)');
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

        const message = await client.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }],
        });

        const textContent = message.content.find(block => block.type === 'text');
        if (!textContent || textContent.type !== 'text') {
          throw new Error('No response from Claude');
        }

        let jsonText = textContent.text.trim();
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
        } else if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
        }

        const recommendations: BudgetOptimization[] = JSON.parse(jsonText);
        console.log('[AI Analytics] Claude optimization successful');
        return recommendations;

      } catch (error) {
        console.warn('[AI Analytics] Claude optimization failed, using simple allocation:', error);
      }
    }

    // FALLBACK 2: Simple rule-based allocation
    console.log('[AI Analytics] No AI available, using simple proportional allocation');
    return simpleProportionalAllocation(totalBudget, provinceData.rows);

  } catch (error) {
    console.error('[AI Analytics] Budget optimization failed:', error);
    // Final fallback
    const provinceData = await pool.query(`
      SELECT province, COUNT(*) as school_count, AVG(priority_score) as avg_priority
      FROM schools GROUP BY province
    `);
    return simpleProportionalAllocation(totalBudget, provinceData.rows);
  }
}

/**
 * Fallback: Simple proportional allocation based on priority scores
 */
function simpleProportionalAllocation(
  totalBudget: number,
  provinceData: any[]
): BudgetOptimization[] {
  const totalPriorityWeight = provinceData.reduce((sum, p) => sum + (p.avg_priority || 50), 0);

  return provinceData.map(province => {
    const priorityWeight = province.avg_priority || 50;
    const allocation = (priorityWeight / totalPriorityWeight) * totalBudget;

    return {
      province: province.province,
      currentAllocation: parseFloat(province.current_allocation || 0),
      recommendedAllocation: Math.round(allocation),
      reasoning: `Allocated based on priority score: ${priorityWeight.toFixed(2)}`,
      expectedImpact: {
        additionalStudents: Math.round((allocation / 15000) * 30), // Rough estimate
        stuntingReductionPercent: priorityWeight / 100 * 5,
        efficiencyGain: 1.0,
      },
      confidence: 0.7,
    };
  });
}

// ============================================
// DEMAND FORECASTING
// ============================================

/**
 * Forecast student demand for next month
 * NOW USES COHERE for AI-powered forecasting (more accurate)
 */
export async function forecastDemand(province: string, month: string): Promise<DemandForecast> {
  try {
    // Get historical data
    const historical = await pool.query(`
      SELECT
        DATE_TRUNC('month', d.delivery_date) as month,
        SUM(d.portions) as total_portions,
        SUM(d.amount) as total_budget
      FROM deliveries d
      JOIN schools s ON d.school_id = s.id
      WHERE s.province = $1
        AND d.delivery_date >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', d.delivery_date)
      ORDER BY month DESC
    `, [province]);

    if (historical.rows.length < 2) {
      // Not enough data for forecasting
      return {
        province,
        month,
        predictedStudents: 0,
        predictedBudgetNeeded: 0,
        confidence: 0.3,
        seasonalFactors: ['Insufficient historical data'],
      };
    }

    // Prepare historical data for AI
    const historicalData = historical.rows.map(row => ({
      month: row.month.toISOString().substring(0, 7),
      portions: parseInt(row.total_portions),
      budget: parseFloat(row.total_budget),
    }));

    // Try Cohere AI forecasting first
    if (isCohereAvailable() && historical.rows.length >= 3) {
      try {
        const cohereResult = await forecastDemandWithCohere(province, historicalData, month);

        return {
          province,
          month,
          predictedStudents: cohereResult.predictedValue,
          predictedBudgetNeeded: Math.round(cohereResult.predictedValue * 15000), // Rp 15k per portion
          confidence: cohereResult.confidence,
          seasonalFactors: cohereResult.seasonalFactors,
        };
      } catch (error) {
        console.warn('[AI Analytics] Cohere forecasting failed, using fallback:', error);
      }
    }

    // Fallback: Simple moving average forecast
    const avgPortions = historical.rows.reduce((sum, row) => sum + parseInt(row.total_portions), 0) / historical.rows.length;
    const avgBudget = historical.rows.reduce((sum, row) => sum + parseFloat(row.total_budget), 0) / historical.rows.length;

    // Detect seasonality (e.g., school holidays)
    const targetMonth = new Date(month + '-01').getMonth();
    const seasonalFactors: string[] = [];

    if (targetMonth === 6 || targetMonth === 11) {
      seasonalFactors.push('School holiday season - reduced demand expected');
    }
    if (targetMonth === 0 || targetMonth === 7) {
      seasonalFactors.push('New semester start - increased demand expected');
    }

    return {
      province,
      month,
      predictedStudents: Math.round(avgPortions * 1.05), // 5% growth
      predictedBudgetNeeded: Math.round(avgBudget * 1.05),
      confidence: 0.75,
      seasonalFactors,
    };

  } catch (error) {
    console.error('[AI Analytics] Demand forecasting failed:', error);
    throw error;
  }
}

// ============================================
// EXPORT
// ============================================

export default {
  detectVerificationAnomalies,
  assessVendorRisk,
  optimizeBudgetAllocation,
  forecastDemand,
};
