// @ts-nocheck
/**
 * AI URGENCY SCORING SERVICE
 *
 * Uses Claude AI to analyze school urgency based on:
 * - Number and severity of issues
 * - Frequency of reports
 * - Response time patterns
 * - Historical trends
 *
 * Returns urgency score 0-100 (higher = more urgent)
 */

import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

export interface IssueData {
  id: number;
  title: string;
  description: string;
  severity: string;
  status: string;
  created_at: string;
  resolved_at?: string;
}

export interface UrgencyAnalysis {
  urgencyScore: number; // 0-100
  reasoning: string;
  factors: {
    issueCount: number;
    highSeverityCount: number;
    unresolvedCount: number;
    avgResponseTime: number; // days
    recentIssues: number; // last 30 days
  };
  aiAnalysis: string;
}

/**
 * Analyze school urgency using Claude AI
 */
export async function analyzeSchoolUrgency(
  schoolId: number,
  schoolName: string,
  issues: IssueData[]
): Promise<UrgencyAnalysis> {
  try {
    // Calculate basic metrics
    const factors = calculateIssueMetrics(issues);

    // Prepare context for AI
    const context = prepareAIContext(schoolName, issues, factors);

    // Call Claude AI for analysis
    const aiAnalysis = await callClaudeForAnalysis(context);

    // Parse AI response to extract score and reasoning
    const { score, reasoning } = parseAIResponse(aiAnalysis);

    return {
      urgencyScore: score,
      reasoning,
      factors,
      aiAnalysis,
    };
  } catch (error) {
    console.error(`Error analyzing urgency for school ${schoolId}:`, error);

    // Fallback to rule-based scoring if AI fails
    return {
      urgencyScore: calculateFallbackScore(issues),
      reasoning: 'AI analysis unavailable, using rule-based scoring',
      factors: calculateIssueMetrics(issues),
      aiAnalysis: 'Fallback mode',
    };
  }
}

/**
 * Calculate issue metrics
 */
function calculateIssueMetrics(issues: IssueData[]) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const issueCount = issues.length;
  const highSeverityCount = issues.filter(i => i.severity === 'high' || i.severity === 'critical').length;
  const unresolvedCount = issues.filter(i => i.status !== 'resolved').length;

  // Calculate average response time for resolved issues
  const resolvedIssues = issues.filter(i => i.resolved_at);
  const avgResponseTime = resolvedIssues.length > 0
    ? resolvedIssues.reduce((sum, issue) => {
        const created = new Date(issue.created_at);
        const resolved = new Date(issue.resolved_at!);
        const days = (resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0) / resolvedIssues.length
    : 0;

  // Recent issues (last 30 days)
  const recentIssues = issues.filter(i => new Date(i.created_at) > thirtyDaysAgo).length;

  return {
    issueCount,
    highSeverityCount,
    unresolvedCount,
    avgResponseTime: Math.round(avgResponseTime * 10) / 10,
    recentIssues,
  };
}

/**
 * Prepare context for AI analysis
 */
function prepareAIContext(schoolName: string, issues: IssueData[], factors: any): string {
  // Get recent issues (last 5 most critical)
  const recentCriticalIssues = issues
    .filter(i => i.severity === 'high' || i.severity === 'critical')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const issuesSummary = recentCriticalIssues.length > 0
    ? recentCriticalIssues.map(i =>
        `- [${i.severity.toUpperCase()}] ${i.title} (Status: ${i.status})`
      ).join('\n')
    : 'No critical issues reported';

  return `
School: ${schoolName}

Issue Statistics:
- Total Issues: ${factors.issueCount}
- High/Critical Severity: ${factors.highSeverityCount}
- Unresolved Issues: ${factors.unresolvedCount}
- Recent Issues (30 days): ${factors.recentIssues}
- Average Response Time: ${factors.avgResponseTime} days

Recent Critical Issues:
${issuesSummary}

Please analyze the urgency of this school's situation and provide:
1. An urgency score from 0-100 (where 100 is most urgent)
2. Brief reasoning for the score

Consider:
- Number and severity of issues
- Resolution patterns
- Recent trends
- Response time efficiency
`;
}

/**
 * Call Claude AI for analysis
 */
async function callClaudeForAnalysis(context: string): Promise<string> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: context + '\n\nProvide your analysis in this format:\nSCORE: [number 0-100]\nREASONING: [your analysis]',
        },
      ],
    });

    // Extract text from response
    const textContent = message.content.find(c => c.type === 'text');
    return textContent?.text || '';
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
}

/**
 * Parse AI response
 */
function parseAIResponse(response: string): { score: number; reasoning: string } {
  try {
    // Extract score
    const scoreMatch = response.match(/SCORE:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;

    // Extract reasoning
    const reasoningMatch = response.match(/REASONING:\s*(.+)/is);
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : response;

    return {
      score: Math.max(0, Math.min(100, score)), // Clamp to 0-100
      reasoning,
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    return {
      score: 50,
      reasoning: 'Unable to parse AI response',
    };
  }
}

/**
 * Calculate fallback score using rules
 */
function calculateFallbackScore(issues: IssueData[]): number {
  const factors = calculateIssueMetrics(issues);

  let score = 0;

  // Issue count contribution (0-30 points)
  score += Math.min(30, factors.issueCount * 3);

  // High severity contribution (0-30 points)
  score += Math.min(30, factors.highSeverityCount * 10);

  // Unresolved issues contribution (0-25 points)
  score += Math.min(25, factors.unresolvedCount * 5);

  // Recent issues contribution (0-15 points)
  score += Math.min(15, factors.recentIssues * 5);

  return Math.min(100, score);
}

/**
 * Process schools in parallel with concurrency limit
 */
async function processInParallel<T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  concurrencyLimit: number
): Promise<void> {
  const results: Promise<void>[] = [];

  for (let i = 0; i < items.length; i += concurrencyLimit) {
    const batch = items.slice(i, i + concurrencyLimit);
    const batchPromises = batch.map(processor);
    await Promise.allSettled(batchPromises);
  }
}

/**
 * Batch analyze urgency for multiple schools (OPTIMIZED with Parallel Processing)
 *
 * Performance: Processes 20 schools concurrently → 20x faster than sequential
 * - Sequential: ~42 min per 1000 schools
 * - Parallel: ~2-3 min per 1000 schools
 */
export async function batchAnalyzeUrgency(
  supabase: any,
  schoolIds: number[],
  useAI: boolean = true
): Promise<Map<number, UrgencyAnalysis>> {
  const results = new Map<number, UrgencyAnalysis>();
  const CONCURRENCY_LIMIT = 20; // Process 20 schools simultaneously

  console.log(`\n[AI Urgency] 🚀 PARALLEL analyzing ${schoolIds.length} schools (AI: ${useAI ? 'enabled' : 'disabled'})...`);
  console.log(`[AI Urgency] Concurrency: ${CONCURRENCY_LIMIT} parallel requests\n`);

  const startTime = Date.now();
  let processed = 0;

  // Process schools in parallel batches
  await processInParallel(
    schoolIds,
    async (schoolId) => {
      try {
        // Get school info
        const { data: school, error: schoolError } = await supabase
          .from('schools')
          .select('name')
          .eq('id', schoolId)
          .single();

        if (schoolError || !school) {
          console.warn(`⚠️  School ${schoolId} not found`);
          return;
        }

        // Get issues for this school via deliveries
        // Schema: issues → deliveries → schools
        let issues: any[] = [];
        try {
          const { data, error: issuesError } = await supabase
            .from('issues')
            .select(`
              id,
              issue_type,
              description,
              severity,
              status,
              created_at,
              resolved_at,
              deliveries!inner(school_id)
            `)
            .eq('deliveries.school_id', schoolId)
            .order('created_at', { ascending: false });

          if (!issuesError && data) {
            // Transform to match IssueData interface (use issue_type as title)
            issues = data.map(issue => ({
              id: issue.id,
              title: issue.issue_type || 'Unknown Issue',
              description: issue.description,
              severity: issue.severity,
              status: issue.status,
              created_at: issue.created_at,
              resolved_at: issue.resolved_at,
            }));
          }
        } catch (error) {
          // If query fails, use empty array (AI score = 0)
          issues = [];
        }

        // Analyze urgency
        const analysis = useAI
          ? await analyzeSchoolUrgency(schoolId, school.name, issues || [])
          : {
              urgencyScore: calculateFallbackScore(issues || []),
              reasoning: 'Rule-based scoring (AI disabled)',
              factors: calculateIssueMetrics(issues || []),
              aiAnalysis: 'AI disabled',
            };

        results.set(schoolId, analysis);
        processed++;

        // Progress logging every 50 schools
        if (processed % 50 === 0 || processed === schoolIds.length) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const rate = (processed / (Date.now() - startTime) * 1000).toFixed(1);
          console.log(`   📊 Analyzed ${processed}/${schoolIds.length} schools (${elapsed}s, ${rate} schools/sec)`);
        }
      } catch (error: any) {
        console.error(`❌ Error analyzing school ${schoolId}:`, error.message);
      }
    },
    CONCURRENCY_LIMIT
  );

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const rate = (results.size / (Date.now() - startTime) * 1000).toFixed(2);

  console.log(`\n[AI Urgency] ✅ Completed: ${results.size}/${schoolIds.length} schools analyzed`);
  console.log(`[AI Urgency] Duration: ${duration}s (${rate} schools/sec)\n`);

  return results;
}
