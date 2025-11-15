/**
 * Cohere AI Service - Fast Classification, Embeddings & Text Generation
 *
 * Cohere digunakan untuk:
 * - Anomaly severity classification (Classify API)
 * - Fraud pattern detection (Embeddings API)
 * - Natural language report generation (Generate API)
 * - Demand forecasting improvements
 *
 * Mengapa Cohere:
 * - Lebih cepat untuk classification tasks
 * - Lebih murah untuk text generation
 * - Excellent embeddings untuk similarity detection
 * - Specialized untuk production ML use cases
 */

import { CohereClient } from 'cohere-ai';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface AnomalyClassificationResult {
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  reasoning: string;
  suggestedAction: 'monitor' | 'investigate' | 'block' | 'alert_admin';
}

export interface FraudPatternMatch {
  similarAnomalyId: number;
  similarityScore: number; // 0-1
  description: string;
}

export interface VendorRiskReport {
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  riskLevel: string;
}

export interface DemandForecastResult {
  predictedValue: number;
  confidence: number;
  seasonalFactors: string[];
  reasoning: string;
}

// ============================================
// COHERE CLIENT INITIALIZATION
// ============================================

let cohereClient: CohereClient | null = null;

function getCohereClient(): CohereClient {
  if (!cohereClient) {
    const apiKey = process.env.COHERE_API_KEY;

    if (!apiKey) {
      throw new Error(
        'COHERE_API_KEY not found in environment variables. ' +
        'Please add it to your .env file. Get your key at: https://dashboard.cohere.com/'
      );
    }

    cohereClient = new CohereClient({
      token: apiKey,
    });
  }

  return cohereClient;
}

// ============================================
// ANOMALY CLASSIFICATION
// ============================================

/**
 * Classify anomaly severity using Cohere Classify API
 *
 * Lebih akurat daripada rule-based classification karena:
 * - Belajar dari context & patterns
 * - Dapat handle edge cases
 * - Adaptive terhadap new fraud patterns
 */
export async function classifyAnomalySeverity(
  anomalyDescription: string,
  dataPoints: any
): Promise<AnomalyClassificationResult> {
  try {
    const client = getCohereClient();

    // Build context untuk classification
    const context = `
Anomaly Details:
${anomalyDescription}

Data Points:
${JSON.stringify(dataPoints, null, 2)}

Based on this information, classify the severity level and recommend action.
`;

    const response = await client.chat({
      model: 'command-r',
      message: `Classify this anomaly and provide severity assessment:

${context}

Provide your response in JSON format:
{
  "severity": "low|medium|high|critical",
  "confidence": 0.X,
  "reasoning": "brief explanation",
  "suggestedAction": "monitor|investigate|block|alert_admin"
}`,
      temperature: 0.3, // Low temperature for consistent classification
    });

    // Parse response
    const responseText = response.text;
    let jsonText = responseText.trim();

    // Remove markdown code blocks if present
    if (jsonText.includes('```json')) {
      jsonText = jsonText.substring(
        jsonText.indexOf('```json') + 7,
        jsonText.lastIndexOf('```')
      ).trim();
    } else if (jsonText.includes('{')) {
      jsonText = jsonText.substring(
        jsonText.indexOf('{'),
        jsonText.lastIndexOf('}') + 1
      );
    }

    const parsed = JSON.parse(jsonText);

    return {
      severity: parsed.severity || 'medium',
      confidence: parsed.confidence || 0.7,
      reasoning: parsed.reasoning || 'Classified by Cohere AI',
      suggestedAction: parsed.suggestedAction || 'monitor',
    };

  } catch (error: any) {
    console.error('[Cohere] Classification failed:', error);

    // Fallback ke simple classification
    return {
      severity: 'medium',
      confidence: 0.5,
      reasoning: 'Cohere classification unavailable, using fallback',
      suggestedAction: 'monitor',
    };
  }
}

// ============================================
// FRAUD PATTERN DETECTION (EMBEDDINGS)
// ============================================

/**
 * Detect similar fraud patterns using Cohere Embeddings
 *
 * Use case:
 * - Find similar anomalies dari history
 * - Detect collusion patterns
 * - Cluster vendors by behavior
 */
export async function findSimilarAnomalies(
  newAnomalyText: string,
  historicalAnomalies: Array<{ id: number; description: string }>
): Promise<FraudPatternMatch[]> {
  try {
    const client = getCohereClient();

    // Get embedding for new anomaly
    const texts = [
      newAnomalyText,
      ...historicalAnomalies.map(a => a.description),
    ];

    const response = await client.embed({
      model: 'embed-english-v3.0',
      texts: texts,
      inputType: 'search_document',
    });

    const embeddings = response.embeddings;

    if (!embeddings || embeddings.length === 0) {
      return [];
    }

    const newEmbedding = embeddings[0];
    const matches: FraudPatternMatch[] = [];

    // Calculate cosine similarity dengan historical anomalies
    for (let i = 1; i < embeddings.length; i++) {
      const similarity = cosineSimilarity(newEmbedding, embeddings[i]);

      if (similarity > 0.7) { // Threshold untuk "similar"
        matches.push({
          similarAnomalyId: historicalAnomalies[i - 1].id,
          similarityScore: similarity,
          description: historicalAnomalies[i - 1].description,
        });
      }
    }

    // Sort by similarity (highest first)
    matches.sort((a, b) => b.similarityScore - a.similarityScore);

    return matches.slice(0, 5); // Top 5 matches

  } catch (error: any) {
    console.error('[Cohere] Similarity detection failed:', error);
    return [];
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }

  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);

  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }

  return dotProduct / (mag1 * mag2);
}

// ============================================
// REPORT GENERATION
// ============================================

/**
 * Generate natural language report untuk vendor risk assessment
 *
 * Cohere Generate lebih cepat & murah daripada Claude untuk simple text generation
 */
export async function generateVendorRiskReport(
  cateringName: string,
  riskData: any
): Promise<VendorRiskReport> {
  try {
    const client = getCohereClient();

    const prompt = `Generate a concise vendor risk assessment report for:

**Vendor**: ${cateringName}

**Risk Metrics**:
- Risk Score: ${riskData.riskScore}/100
- Risk Level: ${riskData.riskLevel}
- Late Delivery Rate: ${(riskData.factors.lateDeliveryRate * 100).toFixed(1)}%
- Quality Issue Rate: ${(riskData.factors.qualityIssueRate * 100).toFixed(1)}%
- Compliance Rate: ${(riskData.factors.complianceRate * 100).toFixed(1)}%
- Avg Quality Score: ${riskData.factors.averageQualityScore.toFixed(1)}/100

**History**:
- Total Deliveries: ${riskData.history.totalDeliveries}
- Successful: ${riskData.history.successfulDeliveries}
- Issues Reported: ${riskData.history.issuesReported}

**Prediction**:
- Likely to Default Next Month: ${(riskData.predictions.likelyToDefaultNextMonth * 100).toFixed(1)}%

Create a professional report with:
1. Executive Summary (2-3 sentences)
2. Key Findings (3-5 bullet points)
3. Recommendations (3-5 actionable items)

Return in JSON format:
{
  "summary": "...",
  "keyFindings": ["...", "..."],
  "recommendations": ["...", "..."],
  "riskLevel": "${riskData.riskLevel}"
}`;

    const response = await client.chat({
      model: 'command-r',
      message: prompt,
      temperature: 0.5,
    });

    const responseText = response.text;
    let jsonText = responseText.trim();

    // Extract JSON
    if (jsonText.includes('```json')) {
      jsonText = jsonText.substring(
        jsonText.indexOf('```json') + 7,
        jsonText.lastIndexOf('```')
      ).trim();
    } else if (jsonText.includes('{')) {
      jsonText = jsonText.substring(
        jsonText.indexOf('{'),
        jsonText.lastIndexOf('}') + 1
      );
    }

    const parsed = JSON.parse(jsonText);

    return {
      summary: parsed.summary || 'Report generation failed',
      keyFindings: parsed.keyFindings || [],
      recommendations: parsed.recommendations || [],
      riskLevel: parsed.riskLevel || riskData.riskLevel,
    };

  } catch (error: any) {
    console.error('[Cohere] Report generation failed:', error);

    // Fallback ke simple template
    return {
      summary: `${cateringName} has a ${riskData.riskLevel} risk level with ${riskData.riskScore}/100 risk score.`,
      keyFindings: [
        `Late delivery rate: ${(riskData.factors.lateDeliveryRate * 100).toFixed(1)}%`,
        `Quality issue rate: ${(riskData.factors.qualityIssueRate * 100).toFixed(1)}%`,
        `Compliance rate: ${(riskData.factors.complianceRate * 100).toFixed(1)}%`,
      ],
      recommendations: [
        riskData.predictions.recommendedAction,
      ],
      riskLevel: riskData.riskLevel,
    };
  }
}

// ============================================
// DEMAND FORECASTING
// ============================================

/**
 * Improved demand forecasting using Cohere
 *
 * Lebih akurat daripada simple moving average karena:
 * - Dapat detect seasonal patterns
 * - Consider external factors
 * - Adaptive learning
 */
export async function forecastDemandWithCohere(
  province: string,
  historicalData: Array<{ month: string; portions: number; budget: number }>,
  targetMonth: string
): Promise<DemandForecastResult> {
  try {
    const client = getCohereClient();

    const prompt = `You are a demand forecasting expert for Indonesia's School Nutrition Program.

**Province**: ${province}
**Target Month**: ${targetMonth}

**Historical Data** (last ${historicalData.length} months):
${historicalData.map((d, i) => `${i + 1}. ${d.month}: ${d.portions} portions, Rp ${d.budget.toLocaleString()}`).join('\n')}

**Task**: Forecast the demand for ${targetMonth}

**Considerations**:
- Seasonal patterns (school holidays, new semesters)
- Growth trends
- Budget constraints
- Indonesian school calendar

Provide forecast in JSON format:
{
  "predictedPortions": <number>,
  "predictedBudget": <number>,
  "confidence": <0-1>,
  "seasonalFactors": ["factor1", "factor2"],
  "reasoning": "brief explanation"
}`;

    const response = await client.chat({
      model: 'command-r',
      message: prompt,
      temperature: 0.4,
    });

    const responseText = response.text;
    let jsonText = responseText.trim();

    // Extract JSON
    if (jsonText.includes('```json')) {
      jsonText = jsonText.substring(
        jsonText.indexOf('```json') + 7,
        jsonText.lastIndexOf('```')
      ).trim();
    } else if (jsonText.includes('{')) {
      jsonText = jsonText.substring(
        jsonText.indexOf('{'),
        jsonText.lastIndexOf('}') + 1
      );
    }

    const parsed = JSON.parse(jsonText);

    return {
      predictedValue: parsed.predictedPortions || 0,
      confidence: parsed.confidence || 0.6,
      seasonalFactors: parsed.seasonalFactors || [],
      reasoning: parsed.reasoning || 'Forecasted by Cohere AI',
    };

  } catch (error: any) {
    console.error('[Cohere] Demand forecasting failed:', error);

    // Fallback ke simple average
    const avgPortions = historicalData.length > 0
      ? historicalData.reduce((sum, d) => sum + d.portions, 0) / historicalData.length
      : 0;

    return {
      predictedValue: Math.round(avgPortions * 1.05),
      confidence: 0.5,
      seasonalFactors: ['Using simple average fallback'],
      reasoning: 'Cohere forecasting unavailable, using historical average',
    };
  }
}

// ============================================
// HELPER: CHECK IF COHERE IS AVAILABLE
// ============================================

export function isCohereAvailable(): boolean {
  return !!process.env.COHERE_API_KEY && process.env.COHERE_API_KEY.length > 0;
}

// ============================================
// EXPORT
// ============================================

export default {
  classifyAnomalySeverity,
  findSimilarAnomalies,
  generateVendorRiskReport,
  forecastDemandWithCohere,
  isCohereAvailable,
};
