/**
 * Computer Vision Service - AI-powered Food Quality Analysis
 *
 * Menggunakan Claude 3.5 Sonnet Vision API untuk:
 * - Deteksi menu makanan dari foto
 * - Estimasi jumlah porsi
 * - Penilaian kualitas (kesegaran, kebersihan, presentasi)
 * - Compliance check dengan menu kontrak
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface FoodAnalysisResult {
  // Detected items in the image
  detectedItems: string[];

  // Portion estimation
  portionEstimate: number;
  portionConfidence: number; // 0-1

  // Quality assessment (0-100 score)
  qualityScore: number;
  freshnessScore: number;
  presentationScore: number;
  hygieneScore: number;

  // Nutrition estimation (rough estimates)
  nutritionEstimate: {
    calories: number;
    protein: number;
    carbs: number;
    vegetables: boolean;
  };

  // Compliance check
  compliance: {
    menuMatch: boolean;
    portionMatch: boolean;
    qualityAcceptable: boolean;
    meetsBGNStandards: boolean; // Badan Gizi Nasional standards
  };

  // AI confidence & reasoning
  confidence: number; // Overall confidence 0-1
  reasoning: string;

  // Issues detected
  issues: string[];
  warnings: string[];

  // Recommendations
  recommendations: string[];
}

export interface FoodAnalysisRequest {
  imageUrl: string;
  expectedMenu: string[];
  expectedPortions: number;
  deliveryId: number;
  schoolName: string;
  cateringName: string;
}

// ============================================
// ANTHROPIC CLIENT INITIALIZATION
// ============================================

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY not found in environment variables. ' +
        'Please add it to your .env file.'
      );
    }

    anthropicClient = new Anthropic({
      apiKey: apiKey,
    });
  }

  return anthropicClient;
}

// ============================================
// IMAGE PROCESSING UTILITIES
// ============================================

/**
 * Remove EXIF metadata untuk privacy
 */
async function removeMetadata(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .rotate() // Auto-rotate based on EXIF
    .resize(1024, 1024, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 85 })
    .toBuffer();
}

/**
 * Convert image to base64 for Claude API
 */
async function imageToBase64(imagePath: string): Promise<string> {
  // Read original file
  const imageBuffer = await fs.readFile(imagePath);

  // Process: remove metadata, optimize size
  const processedBuffer = await removeMetadata(imageBuffer);

  // Convert to base64
  return processedBuffer.toString('base64');
}

// ============================================
// AI PROMPT ENGINEERING
// ============================================

function buildAnalysisPrompt(request: FoodAnalysisRequest): string {
  return `You are an expert food quality inspector for Indonesia's School Nutrition Program (Makan Bergizi Gratis).

**CONTEXT:**
- School: ${request.schoolName}
- Catering: ${request.cateringName}
- Delivery ID: ${request.deliveryId}
- Expected Menu: ${request.expectedMenu.join(', ')}
- Expected Portions: ${request.expectedPortions} servings

**YOUR TASK:**
Analyze this school meal photo and provide a comprehensive quality assessment.

**ANALYSIS CRITERIA:**

1. **MENU DETECTION**
   - Identify all food items visible in the image
   - Compare with expected menu: ${request.expectedMenu.join(', ')}
   - Note any missing items or unexpected items

2. **PORTION ESTIMATION**
   - Count visible servings/plates/portions
   - Compare with expected: ${request.expectedPortions} portions
   - Consider: Are portions adequate for school children?

3. **QUALITY ASSESSMENT** (Score each 0-100)
   - **Freshness**: Are vegetables crisp? Is protein properly cooked?
   - **Presentation**: Is food arranged appealingly? Clean plates?
   - **Hygiene**: Are containers clean? Any contamination signs?
   - **Overall Quality**: General impression

4. **NUTRITION CHECK**
   - Does the meal include: Carbs, Protein, Vegetables?
   - Estimate calories per portion (rough estimate)
   - Does it meet Badan Gizi Nasional standards for school meals?

5. **COMPLIANCE**
   - Menu Match: Do items match the contract?
   - Portion Match: Is quantity within 5% of expected?
   - Quality Acceptable: Is quality above 70/100?
   - BGN Standards: Does it meet nutritional guidelines?

6. **ISSUES & RECOMMENDATIONS**
   - List any problems found
   - Provide actionable recommendations

**INDONESIAN CONTEXT:**
- Typical school meal: Nasi (rice), Protein (chicken/fish/egg), Sayur (vegetables)
- Portion size: Appropriate for children aged 6-12 years
- Standards: Clean, nutritious, culturally appropriate

**OUTPUT FORMAT:**
Return ONLY a valid JSON object with this structure:

{
  "detectedItems": ["item1", "item2", ...],
  "portionEstimate": <number>,
  "portionConfidence": <0-1>,
  "qualityScore": <0-100>,
  "freshnessScore": <0-100>,
  "presentationScore": <0-100>,
  "hygieneScore": <0-100>,
  "nutritionEstimate": {
    "calories": <number>,
    "protein": <grams>,
    "carbs": <grams>,
    "vegetables": <true/false>
  },
  "compliance": {
    "menuMatch": <true/false>,
    "portionMatch": <true/false>,
    "qualityAcceptable": <true/false>,
    "meetsBGNStandards": <true/false>
  },
  "confidence": <0-1>,
  "reasoning": "<your detailed explanation>",
  "issues": ["issue1", "issue2", ...],
  "warnings": ["warning1", "warning2", ...],
  "recommendations": ["rec1", "rec2", ...]
}

Be STRICT but FAIR. Focus on child nutrition and safety.`;
}

// ============================================
// CLAUDE API INTERACTION
// ============================================

async function callClaudeVision(
  imageBase64: string,
  prompt: string
): Promise<string> {
  const client = getAnthropicClient();

  try {
    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });

    // Extract text from response
    const textContent = message.content.find(block => block.type === 'text');

    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude API');
    }

    return textContent.text;
  } catch (error: any) {
    console.error('Claude API Error:', error);

    // Handle specific API errors
    if (error.status === 401) {
      throw new Error('Invalid Anthropic API key. Please check your .env file.');
    } else if (error.status === 429) {
      throw new Error('Claude API rate limit exceeded. Please try again later.');
    } else if (error.status === 529) {
      throw new Error('Claude API is temporarily overloaded. Please retry.');
    }

    throw new Error(`Claude API error: ${error.message || 'Unknown error'}`);
  }
}

// ============================================
// RESPONSE PARSING
// ============================================

function parseAIResponse(responseText: string): FoodAnalysisResult {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonText = responseText.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    // Parse JSON
    const parsed = JSON.parse(jsonText);

    // Validate required fields
    const result: FoodAnalysisResult = {
      detectedItems: parsed.detectedItems || [],
      portionEstimate: parsed.portionEstimate || 0,
      portionConfidence: parsed.portionConfidence || 0.5,
      qualityScore: parsed.qualityScore || 0,
      freshnessScore: parsed.freshnessScore || 0,
      presentationScore: parsed.presentationScore || 0,
      hygieneScore: parsed.hygieneScore || 0,
      nutritionEstimate: {
        calories: parsed.nutritionEstimate?.calories || 0,
        protein: parsed.nutritionEstimate?.protein || 0,
        carbs: parsed.nutritionEstimate?.carbs || 0,
        vegetables: parsed.nutritionEstimate?.vegetables || false,
      },
      compliance: {
        menuMatch: parsed.compliance?.menuMatch || false,
        portionMatch: parsed.compliance?.portionMatch || false,
        qualityAcceptable: parsed.compliance?.qualityAcceptable || false,
        meetsBGNStandards: parsed.compliance?.meetsBGNStandards || false,
      },
      confidence: parsed.confidence || 0.5,
      reasoning: parsed.reasoning || 'No reasoning provided',
      issues: parsed.issues || [],
      warnings: parsed.warnings || [],
      recommendations: parsed.recommendations || [],
    };

    return result;
  } catch (error: any) {
    console.error('Failed to parse AI response:', error);
    console.error('Raw response:', responseText);

    throw new Error(`Failed to parse AI response: ${error.message}`);
  }
}

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

/**
 * Analyze food photo using Claude Vision API
 */
export async function analyzeFoodPhoto(
  request: FoodAnalysisRequest
): Promise<FoodAnalysisResult> {
  console.log(`[Computer Vision] Analyzing food photo for delivery #${request.deliveryId}`);

  const startTime = Date.now();

  try {
    // 1. Resolve full image path
    const uploadsDir = process.env.UPLOAD_DIR || './uploads';
    const imagePath = path.join(uploadsDir, request.imageUrl.replace(/^\/uploads\//, ''));

    console.log(`[Computer Vision] Reading image from: ${imagePath}`);

    // 2. Check if file exists
    try {
      await fs.access(imagePath);
    } catch {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    // 3. Convert image to base64 (with privacy processing)
    const imageBase64 = await imageToBase64(imagePath);
    console.log(`[Computer Vision] Image processed, size: ${imageBase64.length} bytes`);

    // 4. Build analysis prompt
    const prompt = buildAnalysisPrompt(request);

    // 5. Call Claude Vision API
    console.log(`[Computer Vision] Calling Claude API...`);
    const responseText = await callClaudeVision(imageBase64, prompt);

    // 6. Parse response
    const result = parseAIResponse(responseText);

    const duration = Date.now() - startTime;
    console.log(`[Computer Vision] Analysis completed in ${duration}ms`);
    console.log(`[Computer Vision] Quality Score: ${result.qualityScore}/100`);
    console.log(`[Computer Vision] Confidence: ${(result.confidence * 100).toFixed(1)}%`);

    return result;

  } catch (error: any) {
    console.error('[Computer Vision] Analysis failed:', error);
    throw error;
  }
}

// ============================================
// HELPER: CONFIDENCE THRESHOLD CHECK
// ============================================

/**
 * Determine if AI analysis needs manual review
 */
export function needsManualReview(analysis: FoodAnalysisResult): boolean {
  // Low overall confidence
  if (analysis.confidence < 0.7) {
    return true;
  }

  // Low portion confidence
  if (analysis.portionConfidence < 0.6) {
    return true;
  }

  // Quality too low
  if (analysis.qualityScore < 60) {
    return true;
  }

  // Any compliance failure
  if (!analysis.compliance.menuMatch ||
      !analysis.compliance.portionMatch ||
      !analysis.compliance.qualityAcceptable) {
    return true;
  }

  // Critical issues detected
  if (analysis.issues.length > 2) {
    return true;
  }

  return false;
}

// ============================================
// HELPER: GENERATE VERIFICATION DECISION
// ============================================

export interface VerificationDecision {
  shouldApprove: boolean;
  reason: string;
  requiresManualReview: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Generate recommendation for verification approval
 */
export function generateVerificationDecision(
  analysis: FoodAnalysisResult
): VerificationDecision {
  const manualReview = needsManualReview(analysis);

  // High risk: Don't approve, needs review
  if (analysis.qualityScore < 50 || !analysis.compliance.meetsBGNStandards) {
    return {
      shouldApprove: false,
      reason: 'Quality score too low or BGN standards not met',
      requiresManualReview: true,
      riskLevel: 'high',
    };
  }

  // Medium risk: Approve with caution, recommend review
  if (manualReview) {
    return {
      shouldApprove: true,
      reason: 'Acceptable but has concerns - flagged for admin review',
      requiresManualReview: true,
      riskLevel: 'medium',
    };
  }

  // Low risk: Safe to approve
  return {
    shouldApprove: true,
    reason: 'All checks passed',
    requiresManualReview: false,
    riskLevel: 'low',
  };
}

// ============================================
// EXPORT
// ============================================

export default {
  analyzeFoodPhoto,
  needsManualReview,
  generateVerificationDecision,
};
