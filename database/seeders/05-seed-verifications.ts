/**
 * ============================================================================
 * SEEDING SCRIPT 05: VERIFICATIONS
 * ============================================================================
 *
 * Purpose: Seed verifications table with realistic food delivery verification data
 * Dependencies:
 *   - @supabase/supabase-js
 *   - dotenv
 *   - Requires: deliveries (status='verified'), schools, users
 *
 * Run: npm run seed:verifications
 * Estimated records: 15,000-30,000 (60% of deliveries)
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
  portions: number
  delivered_at: string
}

interface SchoolUser {
  user_id: number
  school_id: number
}

interface VerificationInsert {
  delivery_id: number
  school_id: number
  verified_by: number
  status: string  // 'pending' | 'approved' | 'rejected'
  portions_received: number | null
  quality_rating: number | null
  notes: string | null
  photo_url: string | null
  verified_at: string
}

interface SeedingStats {
  totalDeliveries: number
  totalVerifications: number
  successCount: number
  failedCount: number
  byQualityRating: Record<number, number>
  byStatus: Record<string, number>
  errors: Array<{ batch?: number; error: string; count?: number }>
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  BATCH_SIZE: 100,

  // Distribution weights
  QUALITY_RATING_WEIGHTS: {
    5: 0.50,  // 50% - Sangat Baik
    4: 0.35,  // 35% - Baik
    3: 0.10,  // 10% - Cukup
    2: 0.04,  // 4% - Kurang
    1: 0.01,  // 1% - Buruk
  },

  STATUS_WEIGHTS: {
    'approved': 0.90,  // 90% - Approved
    'pending': 0.08,   // 8% - Still pending
    'rejected': 0.02,  // 2% - Rejected
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
 * Weighted random selection from distribution
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

  // Fallback to first key
  return Object.keys(weights)[0] as T
}

/**
 * Generate portions received based on expected
 */
function generatePortionsReceived(expected: number): number {
  const rand = Math.random()

  if (rand < 0.85) {
    // 85% - Perfect match
    return expected
  } else if (rand < 0.95) {
    // 10% - Slight shortage (-1 to -5)
    const shortage = Math.floor(Math.random() * 5) + 1
    return Math.max(expected - shortage, 0)
  } else {
    // 5% - Significant shortage (-6 to -20)
    const shortage = Math.floor(Math.random() * 15) + 6
    return Math.max(expected - shortage, 0)
  }
}

/**
 * Generate status kualitas based on rating
 */
function getStatusKualitas(rating: number): string {
  const statusMap: Record<number, string> = {
    5: 'Sangat Baik',
    4: 'Baik',
    3: 'Cukup',
    2: 'Kurang',
    1: 'Buruk',
  }
  return statusMap[rating] || 'Cukup'
}

/**
 * Generate notes based on quality rating
 */
function generateNotes(rating: number): string | null {
  const notesOptions: Record<number, (string | null)[]> = {
    5: [
      'Makanan sangat enak dan bergizi',
      'Porsi pas, siswa puas',
      'Kualitas sangat baik',
      'Makanan diterima dalam kondisi sempurna',
      'Siswa sangat antusias menerima makanan',
      'Kemasan rapi dan higienis',
      null, null, null,  // 30% chance of NULL
    ],
    4: [
      'Makanan enak, siswa suka',
      'Kualitas baik secara keseluruhan',
      'Penyajian menarik',
      'Porsi cukup untuk semua siswa',
      null, null, null, null,  // 40% chance of NULL
    ],
    3: [
      'Rasa cukup, bisa ditingkatkan',
      'Porsi pas tapi rasa standar',
      'Kualitas sesuai harga',
      'Masih perlu perbaikan di beberapa aspek',
      null, null, null,  // 30% chance of NULL
    ],
    2: [
      'Makanan kurang fresh',
      'Ada komplain dari siswa',
      'Porsi kurang dari yang dijanjikan',
      'Perlu peningkatan kualitas',
      'Suhu makanan tidak optimal',
    ],
    1: [
      'Makanan tidak fresh',
      'Banyak komplain dari siswa',
      'Packaging rusak, ada yang tumpah',
      'Kualitas sangat mengecewakan',
      'Perlu tindakan segera untuk perbaikan',
    ],
  }

  const options = notesOptions[rating] || notesOptions[3]
  return options[Math.floor(Math.random() * options.length)]
}

/**
 * Generate verified_at timestamp (10 min - 4 hours after delivered_at)
 */
function generateVerifiedAt(deliveredAt: string): string {
  const delivered = new Date(deliveredAt)
  const minMinutes = 10
  const maxMinutes = 240  // 4 hours
  const randomMinutes = Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes

  const verified = new Date(delivered.getTime() + randomMinutes * 60000)
  return verified.toISOString()
}

/**
 * Generate verification record
 */
function generateVerification(
  delivery: DeliveryRecord,
  verifiedBy: number
): VerificationInsert {
  const qualityRating = parseInt(weightedRandom<string>(CONFIG.QUALITY_RATING_WEIGHTS))
  const status = weightedRandom<string>(CONFIG.STATUS_WEIGHTS)
  const portionsExpected = delivery.portions
  const portionsReceived = generatePortionsReceived(portionsExpected)

  return {
    delivery_id: delivery.id,
    school_id: delivery.school_id,
    verified_by: verifiedBy,
    status: status,
    portions_received: portionsReceived,
    quality_rating: qualityRating,
    notes: generateNotes(qualityRating),
    photo_url: null,  // NULL for initial seeding
    verified_at: generateVerifiedAt(delivery.delivered_at),
  }
}

// ============================================================================
// MAIN SEEDING FUNCTION
// ============================================================================

async function seedVerifications() {
  const logger = new Logger()
  const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY)

  const stats: SeedingStats = {
    totalDeliveries: 0,
    totalVerifications: 0,
    successCount: 0,
    failedCount: 0,
    byQualityRating: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    byStatus: { approved: 0, pending: 0, rejected: 0 },
    errors: [],
  }

  logger.log('================================================================================')
  logger.log('SEEDING SCRIPT 05: VERIFICATIONS')
  logger.log('================================================================================')

  try {
    // ========================================================================
    // STEP 1: FETCH VERIFIED DELIVERIES
    // ========================================================================

    logger.log('\nSTEP 1: Fetching verified deliveries...')

    const { data: deliveries, error: deliveriesError } = await supabase
      .from('deliveries')
      .select('id, school_id, portions, delivered_at')
      .eq('status', 'verified')
      .order('id', { ascending: true })

    if (deliveriesError) {
      throw new Error(`Failed to fetch deliveries: ${deliveriesError.message}`)
    }

    if (!deliveries || deliveries.length === 0) {
      logger.error('No verified deliveries found. Please seed deliveries first.')
      return
    }

    stats.totalDeliveries = deliveries.length
    logger.success(`Found ${deliveries.length} verified deliveries`)

    // ========================================================================
    // STEP 2: BUILD SCHOOL USER MAPPING
    // ========================================================================

    logger.log('\nSTEP 2: Building school user mapping...')

    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, user_id')
      .not('user_id', 'is', null)

    if (schoolsError) {
      throw new Error(`Failed to fetch schools: ${schoolsError.message}`)
    }

    const schoolUserMap = new Map<number, number>()
    schools?.forEach((school: any) => {
      schoolUserMap.set(school.id, school.user_id)
    })

    logger.success(`Mapped ${schoolUserMap.size} schools to users`)

    // ========================================================================
    // STEP 3: CHECK FOR EXISTING VERIFICATIONS
    // ========================================================================

    logger.log('\nSTEP 3: Checking for existing verifications...')

    const { data: existingVerifications } = await supabase
      .from('verifications')
      .select('delivery_id')

    const existingDeliveryIds = new Set(
      existingVerifications?.map((v: any) => v.delivery_id) || []
    )

    logger.log(`Found ${existingDeliveryIds.size} existing verifications`)

    // Filter out deliveries that already have verifications
    const deliveriesToVerify = deliveries.filter(
      (d: DeliveryRecord) => !existingDeliveryIds.has(d.id)
    )

    if (deliveriesToVerify.length === 0) {
      logger.success('All verified deliveries already have verifications!')
      logger.log('\nSeeding completed - nothing to add.')
      return
    }

    logger.log(`Will create ${deliveriesToVerify.length} new verifications`)

    // ========================================================================
    // STEP 4: GENERATE VERIFICATIONS
    // ========================================================================

    logger.log('\nSTEP 4: Generating verification records...')

    const verificationsToInsert: VerificationInsert[] = []
    let skippedCount = 0

    for (const delivery of deliveriesToVerify) {
      const verifiedBy = schoolUserMap.get(delivery.school_id)

      if (!verifiedBy) {
        skippedCount++
        continue
      }

      const verification = generateVerification(delivery, verifiedBy)
      verificationsToInsert.push(verification)

      // Track stats
      if (verification.quality_rating !== null) {
        stats.byQualityRating[verification.quality_rating]++
      }
      stats.byStatus[verification.status] = (stats.byStatus[verification.status] || 0) + 1
    }

    if (skippedCount > 0) {
      logger.log(`⚠️  Skipped ${skippedCount} deliveries (no user mapping)`)
    }

    stats.totalVerifications = verificationsToInsert.length
    logger.success(`Generated ${verificationsToInsert.length} verification records`)

    // ========================================================================
    // STEP 5: INSERT VERIFICATIONS IN BATCHES
    // ========================================================================

    logger.log('\nSTEP 5: Inserting verifications to database...')
    logger.log(`Batch size: ${CONFIG.BATCH_SIZE}`)

    const totalBatches = Math.ceil(verificationsToInsert.length / CONFIG.BATCH_SIZE)

    for (let i = 0; i < verificationsToInsert.length; i += CONFIG.BATCH_SIZE) {
      const batch = verificationsToInsert.slice(i, i + CONFIG.BATCH_SIZE)
      const batchNum = Math.floor(i / CONFIG.BATCH_SIZE) + 1

      try {
        const { data, error } = await supabase
          .from('verifications')
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
            Math.min(i + CONFIG.BATCH_SIZE, verificationsToInsert.length),
            verificationsToInsert.length,
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
    // STEP 6: FINAL SUMMARY
    // ========================================================================

    logger.log('\n================================================================================')
    logger.log('SEEDING SUMMARY')
    logger.log('================================================================================')
    logger.log(`Total verified deliveries: ${stats.totalDeliveries}`)
    logger.log(`Verifications to create: ${stats.totalVerifications}`)
    logger.log(`Successfully inserted: ${stats.successCount}`)
    logger.log(`Failed: ${stats.failedCount}`)

    if (stats.successCount > 0) {
      logger.log('\nBreakdown by Quality Rating:')
      for (let rating = 5; rating >= 1; rating--) {
        const count = stats.byQualityRating[rating]
        const percentage = ((count / stats.successCount) * 100).toFixed(1)
        logger.log(`  ${rating} stars: ${count} (${percentage}%)`)
      }

      logger.log('\nBreakdown by Status:')
      Object.entries(stats.byStatus).forEach(([status, count]) => {
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
    // STEP 7: SAVE STATS TO FILE
    // ========================================================================

    const statsFilePath = path.join(__dirname, '../seeding-logs/05-verifications-stats.json')
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

seedVerifications()
