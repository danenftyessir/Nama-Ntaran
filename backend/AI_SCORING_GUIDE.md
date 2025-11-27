# AI-Enhanced Priority Scoring Guide

## Overview

The system now supports **Hybrid Priority Scoring** that combines mathematical formulas with AI analysis to determine school priority levels.

```
Final Priority Score = (Base Score × 70%) + (AI Urgency Score × 30%)
```

### Base Score (70% weight)
Mathematical formula based on:
- **Poverty Rate** (40%) - from BPS API
- **Stunting Rate** (40%) - from database
- **Education Level** (20%) - SD/MI gets highest priority

### AI Urgency Score (30% weight)
Claude AI analyzes:
- Number and severity of reported issues
- Frequency of recent reports (last 30 days)
- Response time patterns
- Historical trends

## Setup

### 1. Install Dependencies

```bash
npm install @anthropic-ai/sdk node-cron
```

### 2. Environment Variables

Add to your `.env` file:

```env
# AI Scoring Configuration
ANTHROPIC_API_KEY=your_claude_api_key_here
ENABLE_AI_SCORING=true
RUN_ON_STARTUP=false
```

Get your Anthropic API key from: https://console.anthropic.com/

### 3. Database Setup (Optional)

Create a table to log recalculation runs:

```sql
CREATE TABLE priority_score_logs (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50),
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  total_processed INTEGER,
  total_updated INTEGER,
  total_failed INTEGER,
  ai_enabled BOOLEAN DEFAULT false,
  duration_minutes DECIMAL(10,2),
  status VARCHAR(20),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Usage

### Option 1: Automatic Monthly Recalculation

The system automatically recalculates scores at 2 AM on the 1st of every month.

To enable/disable:
```env
ENABLE_AI_SCORING=true  # Enable AI analysis
ENABLE_AI_SCORING=false # Disable AI (only mathematical formula)
```

### Option 2: Manual Recalculation via API

**Endpoint:** `POST /api/admin/recalculate-hybrid-scores`

**Headers:**
```
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Body:**
```json
{
  "limit": 1000,
  "offset": 0,
  "useAI": true
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3001/api/admin/recalculate-hybrid-scores \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 1000,
    "offset": 0,
    "useAI": true
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Hybrid priority scores recalculated successfully",
  "result": {
    "processed": 1000,
    "updated": 998,
    "failed": 2,
    "summary": {
      "avgFinalScore": 58.42,
      "avgBaseScore": 52.10,
      "avgAiScore": 22.40,
      "minScore": 15.30,
      "maxScore": 95.70,
      "highPriority": 150,
      "mediumPriority": 450,
      "lowPriority": 400
    },
    "aiStats": {
      "enabled": true,
      "schoolsAnalyzed": 998,
      "avgUrgencyScore": 22.40
    }
  }
}
```

### Option 3: Manual Script Execution

Create a script at `backend/src/scripts/runHybridScoring.ts`:

```typescript
import { supabase } from '../config/database.js';
import { runMonthlyRecalculation } from '../services/monthlyScoreScheduler.js';

runMonthlyRecalculation()
  .then(() => {
    console.log('✅ Recalculation complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Recalculation failed:', error);
    process.exit(1);
  });
```

Run with:
```bash
npx tsx src/scripts/runHybridScoring.ts
```

## Cost Estimates

### AI Analysis Costs (Anthropic Claude)

- **Model:** Claude 3.5 Sonnet
- **Cost per request:** ~$0.003 per school
- **Monthly cost for 27,000 schools:** ~$81

**Recommendations:**
1. **For Budget-Conscious:** Set `ENABLE_AI_SCORING=false` - Uses only mathematical formula (free)
2. **For Enhanced Accuracy:** Set `ENABLE_AI_SCORING=true` - Includes AI urgency analysis (~$81/month)
3. **Hybrid Approach:** Enable AI only for high-priority provinces or schools with many issues

## How It Works

### 1. Mathematical Base Score Calculation

```typescript
// Province-based data
const povertyRate = getPovertyRate(province);  // from BPS API
const stuntingRate = getStuntingRate(province); // from database

// Normalize to 0-100 scale
const normalizedPoverty = normalize(povertyRate);
const normalizedStunting = normalize(stuntingRate);

// Education level weight
const jenjangWeight = {
  'SD': 100,  // Elementary - highest priority
  'SMP': 70,  // Junior High
  'SMA': 40   // Senior High
};

// Calculate base score
baseScore =
  (normalizedPoverty × 0.40) +
  (normalizedStunting × 0.40) +
  (jenjangWeight × 0.20);
```

### 2. AI Urgency Analysis

```typescript
// Fetch school issues
const issues = await getSchoolIssues(schoolId);

// Analyze with Claude AI
const analysis = await claude.analyze({
  issueCount: issues.length,
  severity: issues.filter(i => i.severity === 'high').length,
  unresolved: issues.filter(i => i.status !== 'resolved').length,
  recentIssues: issues.filter(i => isLast30Days(i.created_at)).length,
  avgResponseTime: calculateAvgResponseTime(issues)
});

// AI returns urgency score 0-100
aiUrgencyScore = analysis.urgencyScore;
```

### 3. Final Score Combination

```typescript
finalScore = (baseScore × 0.70) + (aiUrgencyScore × 0.30);
```

## Monitoring

### Check Scheduler Status

The scheduler logs to console on startup:

```
📅 Monthly Score Scheduler Configuration:
   Schedule: 0 2 1 * * (2 AM on 1st of each month)
   AI Scoring: ENABLED ⚡
   Batch Size: 1000 schools
✅ Monthly scheduler started successfully!
```

### View Recalculation Logs

Query the database:

```sql
SELECT * FROM priority_score_logs
ORDER BY created_at DESC
LIMIT 10;
```

### Monitor AI Usage

Check Anthropic console: https://console.anthropic.com/usage

## Troubleshooting

### Issue: AI analysis fails

**Error:** `ANTHROPIC_API_KEY not configured`

**Solution:** Add your API key to `.env`:
```env
ANTHROPIC_API_KEY=sk-ant-...
```

### Issue: Scores not updating

**Possible causes:**
1. Scheduler not running - Check server logs
2. Database connection issue
3. API key invalid or expired

**Debug:**
```bash
# Check if scheduler is loaded
grep "Monthly scheduler" server.log

# Test API key
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01"
```

### Issue: High AI costs

**Solutions:**
1. Disable AI: `ENABLE_AI_SCORING=false`
2. Reduce frequency: Change cron schedule
3. Selective analysis: Only analyze schools with issues

## Best Practices

1. **Start with AI disabled** - Test base scoring first
2. **Enable AI gradually** - Start with 100-200 schools
3. **Monitor costs** - Check Anthropic console regularly
4. **Review scores** - Compare AI vs non-AI results
5. **Adjust weights** - Tune 70/30 split if needed

## API Reference

### Hybrid Scoring Service

```typescript
import { batchCalculateHybridScores } from './services/hybridPriorityScoring';

const result = await batchCalculateHybridScores(
  supabase,
  limit,    // number of schools
  offset,   // pagination offset
  useAI     // true = AI enabled, false = base only
);
```

### AI Urgency Service

```typescript
import { analyzeSchoolUrgency } from './services/aiUrgencyScoring';

const analysis = await analyzeSchoolUrgency(
  schoolId,
  schoolName,
  issues
);

console.log(analysis.urgencyScore);  // 0-100
console.log(analysis.reasoning);     // AI explanation
console.log(analysis.factors);       // Issue metrics
```

## Support

For issues or questions:
1. Check logs: `backend/logs/`
2. Review this guide
3. Contact: team@example.com

---

Last updated: 2025-11-24
