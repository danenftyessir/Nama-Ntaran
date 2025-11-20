/**
 * ============================================================================
 * SEEDING SCRIPT 07: ISSUES
 * ============================================================================
 *
 * Purpose: Seed issues table with realistic problem reports from schools
 * Dependencies:
 *   - @supabase/supabase-js
 *   - dotenv
 *   - Requires: deliveries, verifications, schools, users
 *
 * Run: npm run seed:issues
 * Estimated records: 50-150 issues (5-15% of deliveries)
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// Load environment variables
dotenv.config()

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface DeliveryRecord {
  id: number
  school_id: number
  catering_id: number
  delivered_at: string
}

interface VerificationRecord {
  delivery_id: number
  quality_rating: number | null
}

interface SchoolUser {
  user_id: number
  school_id: number
}

interface AdminUser {
  id: number
}

interface IssueInsert {
  delivery_id: number
  reported_by: number
  issue_type: string
  description: string
  severity: string
  status: string
  resolution_notes: string | null
  resolved_by: number | null
  resolved_at: string | null
  created_at: string
}

interface SeedingStats {
  totalDeliveries: number
  totalIssues: number
  successCount: number
  failedCount: number
  byIssueType: Record<string, number>
  bySeverity: Record<string, number>
  byStatus: Record<string, number>
  errors: Array<{ batch?: number; error: string; count?: number }>
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  BATCH_SIZE: 50,

  // Issue generation rate based on verification quality
  ISSUE_RATE_BY_RATING: {
    1: 0.80,  // 80% chance for rating 1
    2: 0.60,  // 60% chance for rating 2
    3: 0.30,  // 30% chance for rating 3
    4: 0.10,  // 10% chance for rating 4
    5: 0.05,  // 5% chance for rating 5
  },

  // Issue type weights
  ISSUE_TYPE_WEIGHTS: {
    'late_delivery': 0.35,      // 35%
    'quality_issue': 0.30,      // 30%
    'wrong_portions': 0.20,     // 20%
    'missing_delivery': 0.10,   // 10%
    'other': 0.05,              // 5%
  },

  // Severity weights
  SEVERITY_WEIGHTS: {
    'low': 0.40,      // 40%
    'medium': 0.35,   // 35%
    'high': 0.20,     // 20%
    'critical': 0.05, // 5%
  },

  // Status weights
  STATUS_WEIGHTS: {
    'resolved': 0.70,       // 70%
    'investigating': 0.15,  // 15%
    'open': 0.10,           // 10%
    'closed': 0.05,         // 5%
  },
}

// ============================================================================
// UTILITIES
// ============================================================================

class Logger {
  private startTime: number = Date.now()

  log(message: string, data?: any) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2)
    console.log(`[${elapsed}s] ${message}`)
    if (data) {
      console.log(JSON.stringify(data, null, 2))
    }
  }

  progress(current: number, total: number, label: string) {
    const percentage = ((current / total) * 100).toFixed(1)
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2)
    console.log(`[${elapsed}s] ${label}: ${current}/${total} (${percentage}%)`)
  }

  error(message: string, error?: any) {
    console.error(`❌ ERROR: ${message}`)
    if (error) {
      console.error(error)
    }
  }

  success(message: string) {
    console.log(`✅ ${message}`)
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Weighted random selection
 */
function weightedRandom<T>(weights: Record<string, number>): T {
  const rand = Math.random()
  let cumulative = 0

  for (const [key, weight] of Object.entries(weights)) {
    cumulative += weight
    if (rand <= cumulative) {
      return key as T
    }
  }

  return Object.keys(weights)[0] as T
}

/**
 * Determine if delivery should have an issue based on verification rating
 */
function shouldGenerateIssue(rating: number | null): boolean {
  if (rating === null) return Math.random() < 0.20  // 20% chance if no rating

  const rate = CONFIG.ISSUE_RATE_BY_RATING[rating as keyof typeof CONFIG.ISSUE_RATE_BY_RATING] || 0.15
  return Math.random() < rate
}

/**
 * Generate description based on issue type
 */
function generateDescription(issueType: string): string {
  const descriptions: Record<string, string[]> = {
    late_delivery: [
      'Pengiriman terlambat 30-45 menit dari jadwal. Mengganggu jadwal makan siswa.',
      'Makanan datang terlambat, sudah melewati jam makan siang sekolah.',
      'Keterlambatan pengiriman mengakibatkan siswa harus menunggu lama.',
      'Driver terlambat tiba, tidak ada informasi sebelumnya tentang keterlambatan.',
    ],
    quality_issue: [
      'Makanan kurang segar, ada beberapa sayur yang sudah layu.',
      'Rasa makanan terlalu asin/tawar, banyak komplain dari siswa.',
      'Nasi sudah agak keras dan tidak hangat saat diterima.',
      'Ada komplain tentang kualitas lauk yang kurang baik.',
      'Makanan terlihat kurang appetizing dan kurang bergizi.',
    ],
    wrong_portions: [
      'Porsi yang diterima tidak sesuai dengan pesanan. Kekurangan beberapa porsi.',
      'Jumlah makanan kurang dari yang dijanjikan dalam kontrak.',
      'Porsi tidak mencukupi untuk semua siswa yang terdaftar.',
      'Ada selisih antara pesanan dan yang diterima.',
    ],
    missing_delivery: [
      'Lauk pauk tidak sesuai dengan menu yang dijanjikan.',
      'Tidak ada buah yang seharusnya termasuk dalam paket.',
      'Beberapa item menu tidak dikirimkan.',
      'Menu tidak lengkap, ada komponen yang hilang.',
    ],
    other: [
      'Kemasan rusak/bocor saat diterima.',
      'Packaging tidak rapi, ada beberapa yang penyok.',
      'Koordinasi dengan pihak katering kurang baik.',
      'Masalah administrasi terkait pengiriman.',
    ],
  }

  const options = descriptions[issueType] || descriptions.other
  return options[Math.floor(Math.random() * options.length)]
}

/**
 * Generate resolution notes for resolved/closed issues
 */
function generateResolutionNotes(status: string, issueType: string): string | null {
  if (status !== 'resolved' && status !== 'closed') {
    return null
  }

  const resolutions = [
    'Telah dikomunikasikan dengan pihak katering, akan diperbaiki di pengiriman berikutnya.',
    'Katering memberikan kompensasi berupa tambahan porsi gratis.',
    'Masalah sudah ditindaklanjuti, katering berjanji meningkatkan quality control.',
    'Issue diselesaikan dengan refund parsial sesuai kesepakatan.',
    'Telah dilakukan koordinasi, masalah tidak akan terulang.',
    'Pihak katering telah memberikan penjelasan dan solusi yang memuaskan.',
    'Tindakan korektif sudah diambil untuk mencegah masalah serupa.',
    'Quality control katering telah ditingkatkan sesuai rekomendasi kami.',
  ]

  return resolutions[Math.floor(Math.random() * resolutions.length)]
}

/**
 * Generate created_at timestamp (1-48 hours after delivery)
 */
function generateCreatedAt(deliveredAt: string): string {
  const delivered = new Date(deliveredAt)
  const minHours = 1
  const maxHours = 48
  const randomHours = Math.floor(Math.random() * (maxHours - minHours + 1)) + minHours

  const created = new Date(delivered.getTime() + randomHours * 3600000)
  return created.toISOString()
}

/**
 * Generate resolved_at timestamp (1-72 hours after created)
 */
function generateResolvedAt(createdAt: string): string {
  const created = new Date(createdAt)
  const minHours = 1
  const maxHours = 72
  const randomHours = Math.floor(Math.random() * (maxHours - minHours + 1)) + minHours

  const resolved = new Date(created.getTime() + randomHours * 3600000)
  return resolved.toISOString()
}

/**
 * Generate issue record
 */
function generateIssue(
  delivery: DeliveryRecord,
  reportedBy: number,
  adminUserId: number | null
): IssueInsert {
  const issueType = weightedRandom<string>(CONFIG.ISSUE_TYPE_WEIGHTS)
  const severity = weightedRandom<string>(CONFIG.SEVERITY_WEIGHTS)
  const status = weightedRandom<string>(CONFIG.STATUS_WEIGHTS)
  const createdAt = generateCreatedAt(delivery.delivered_at)

  const resolvedBy = (status === 'resolved' || status === 'closed') ? adminUserId : null
  const resolvedAt = resolvedBy ? generateResolvedAt(createdAt) : null

  return {
    delivery_id: delivery.id,
    reported_by: reportedBy,
    issue_type: issueType,
    description: generateDescription(issueType),
    severity: severity,
    status: status,
    resolution_notes: generateResolutionNotes(status, issueType),
    resolved_by: resolvedBy,
    resolved_at: resolvedAt,
    created_at: createdAt,
  }
}

// ============================================================================
// MAIN SEEDING FUNCTION
// ============================================================================

async function seedIssues() {
  const logger = new Logger()
  const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY)

  const stats: SeedingStats = {
    totalDeliveries: 0,
    totalIssues: 0,
    successCount: 0,
    failedCount: 0,
    byIssueType: {},
    bySeverity: {},
    byStatus: {},
    errors: [],
  }

  logger.log('================================================================================')
  logger.log('SEEDING SCRIPT 07: ISSUES')
  logger.log('================================================================================')

  try {
    // ========================================================================
    // STEP 1: FETCH DELIVERIES
    // ========================================================================

    logger.log('\nSTEP 1: Fetching deliveries...')

    const { data: deliveries, error: deliveriesError } = await supabase
      .from('deliveries')
      .select('id, school_id, catering_id, delivered_at')
      .eq('status', 'verified')
      .not('delivered_at', 'is', null)
      .order('id', { ascending: true })

    if (deliveriesError) {
      throw new Error(`Failed to fetch deliveries: ${deliveriesError.message}`)
    }

    if (!deliveries || deliveries.length === 0) {
      logger.error('No deliveries found. Please seed deliveries first.')
      return
    }

    stats.totalDeliveries = deliveries.length
    logger.success(`Found ${deliveries.length} deliveries`)

    // ========================================================================
    // STEP 2: FETCH VERIFICATIONS (for quality ratings)
    // ========================================================================

    logger.log('\nSTEP 2: Fetching verifications...')

    const { data: verifications, error: verificationsError } = await supabase
      .from('verifications')
      .select('delivery_id, quality_rating')

    if (verificationsError) {
      throw new Error(`Failed to fetch verifications: ${verificationsError.message}`)
    }

    const verificationMap = new Map<number, number | null>()
    verifications?.forEach((v: any) => {
      verificationMap.set(v.delivery_id, v.quality_rating)
    })

    logger.success(`Mapped ${verificationMap.size} verifications`)

    // ========================================================================
    // STEP 3: BUILD SCHOOL USER MAPPING
    // ========================================================================

    logger.log('\nSTEP 3: Building school user mapping...')

    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, user_id')
      .not('user_id', 'is', null)

    if (schoolsError) {
      throw new Error(`Failed to fetch schools: ${schoolsError.message}`)
    }

    const schoolUserMap = new Map<number, number>()
    schools?.forEach((s: any) => {
      schoolUserMap.set(s.id, s.user_id)
    })

    logger.success(`Mapped ${schoolUserMap.size} schools to users`)

    // ========================================================================
    // STEP 4: GET RANDOM ADMIN USER
    // ========================================================================

    logger.log('\nSTEP 4: Fetching admin users...')

    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(10)

    if (adminError) {
      logger.log(`Warning: Could not fetch admin users: ${adminError.message}`)
    }

    const adminUserId = adminUsers && adminUsers.length > 0
      ? adminUsers[Math.floor(Math.random() * adminUsers.length)].id
      : null

    logger.success(`Found ${adminUsers?.length || 0} admin users`)

    // ========================================================================
    // STEP 5: GENERATE ISSUES
    // ========================================================================

    logger.log('\nSTEP 5: Generating issues...')

    const issuesToInsert: IssueInsert[] = []
    let skippedCount = 0

    for (const delivery of deliveries) {
      const rating = verificationMap.get(delivery.id)
      const reportedBy = schoolUserMap.get(delivery.school_id)

      if (!reportedBy) {
        skippedCount++
        continue
      }

      // Determine if this delivery should have an issue
      if (shouldGenerateIssue(rating ?? null)) {
        const issue = generateIssue(delivery, reportedBy, adminUserId)
        issuesToInsert.push(issue)

        // Track stats
        stats.byIssueType[issue.issue_type] = (stats.byIssueType[issue.issue_type] || 0) + 1
        stats.bySeverity[issue.severity] = (stats.bySeverity[issue.severity] || 0) + 1
        stats.byStatus[issue.status] = (stats.byStatus[issue.status] || 0) + 1
      }
    }

    if (skippedCount > 0) {
      logger.log(`⚠️  Skipped ${skippedCount} deliveries (no user mapping)`)
    }

    stats.totalIssues = issuesToInsert.length
    logger.success(`Generated ${issuesToInsert.length} issues`)

    if (issuesToInsert.length === 0) {
      logger.log('\nNo issues to insert.')
      return
    }

    // ========================================================================
    // STEP 6: INSERT ISSUES IN BATCHES
    // ========================================================================

    logger.log('\nSTEP 6: Inserting issues to database...')
    logger.log(`Batch size: ${CONFIG.BATCH_SIZE}`)

    for (let i = 0; i < issuesToInsert.length; i += CONFIG.BATCH_SIZE) {
      const batch = issuesToInsert.slice(i, i + CONFIG.BATCH_SIZE)
      const batchNum = Math.floor(i / CONFIG.BATCH_SIZE) + 1

      try {
        const { data, error } = await supabase
          .from('issues')
          .insert(batch)
          .select('id')

        if (error) {
          logger.error(`Batch ${batchNum} failed: ${error.message}`)
          stats.failedCount += batch.length
          stats.errors.push({
            batch: batchNum,
            error: error.message,
            count: batch.length,
          })
        } else {
          stats.successCount += batch.length
          logger.progress(
            Math.min(i + CONFIG.BATCH_SIZE, issuesToInsert.length),
            issuesToInsert.length,
            'Progress'
          )
        }
      } catch (error: any) {
        logger.error(`Batch ${batchNum} exception:`, error)
        stats.failedCount += batch.length
        stats.errors.push({
          batch: batchNum,
          error: error.message || 'Unknown error',
          count: batch.length,
        })
      }
    }

    // ========================================================================
    // STEP 7: FINAL SUMMARY
    // ========================================================================

    logger.log('\n================================================================================')
    logger.log('SEEDING SUMMARY')
    logger.log('================================================================================')
    logger.log(`Total deliveries: ${stats.totalDeliveries}`)
    logger.log(`Issues generated: ${stats.totalIssues}`)
    logger.log(`Successfully inserted: ${stats.successCount}`)
    logger.log(`Failed: ${stats.failedCount}`)

    if (stats.successCount > 0) {
      logger.log('\nBreakdown by Issue Type:')
      const sortedTypes = Object.entries(stats.byIssueType).sort((a, b) => b[1] - a[1])
      sortedTypes.forEach(([type, count]) => {
        const percentage = ((count / stats.successCount) * 100).toFixed(1)
        logger.log(`  ${type}: ${count} (${percentage}%)`)
      })

      logger.log('\nBreakdown by Severity:')
      const sortedSeverity = Object.entries(stats.bySeverity).sort((a, b) => b[1] - a[1])
      sortedSeverity.forEach(([severity, count]) => {
        const percentage = ((count / stats.successCount) * 100).toFixed(1)
        logger.log(`  ${severity}: ${count} (${percentage}%)`)
      })

      logger.log('\nBreakdown by Status:')
      const sortedStatus = Object.entries(stats.byStatus).sort((a, b) => b[1] - a[1])
      sortedStatus.forEach(([status, count]) => {
        const percentage = ((count / stats.successCount) * 100).toFixed(1)
        logger.log(`  ${status}: ${count} (${percentage}%)`)
      })
    }

    if (stats.errors.length > 0) {
      logger.log('\n⚠️  Errors encountered:')
      stats.errors.forEach((err, idx) => {
        logger.log(`  ${idx + 1}. Batch ${err.batch}: ${err.error} (${err.count} records)`)
      })
    }

    // ========================================================================
    // STEP 8: SAVE STATS TO FILE
    // ========================================================================

    const statsFilePath = path.join(__dirname, '../seeding-logs/07-issues-stats.json')
    fs.writeFileSync(statsFilePath, JSON.stringify(stats, null, 2))
    logger.success(`Stats saved to: ${statsFilePath}`)

    logger.log('\n✅ Seeding completed!')

  } catch (error: any) {
    logger.error('Fatal error during seeding:', error)
    process.exit(1)
  }
}

// ============================================================================
// EXECUTE
// ============================================================================

seedIssues()
