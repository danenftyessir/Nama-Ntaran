/**
 * ============================================================================
 * SEEDING SCRIPT 06: PAYMENTS
 * ============================================================================
 *
 * Purpose: Seed payments table with realistic payment tracking data
 * Dependencies:
 *   - @supabase/supabase-js
 *   - dotenv
 *   - Requires: allocations, deliveries, schools, caterings, verifications
 *
 * Run: npm run seed:payments
 * Estimated records: 15,000-30,000 (1 per allocation)
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

interface AllocationRecord {
  id: number
  school_id: number
  catering_id: number
  amount: number
  status: string
  tx_hash_lock: string | null
  tx_hash_release: string | null
  locked_at: string | null
  released_at: string | null
}

interface DeliveryRecord {
  id: number
  allocation_id: number
}

interface VerificationRecord {
  delivery_id: number
  verified_at: string | null
}

interface PaymentInsert {
  allocation_id: number
  delivery_id: number | null
  school_id: number
  catering_id: number
  amount: number
  currency: string
  status: string
  blockchain_tx_hash: string | null
  blockchain_block_number: number | null
  xendit_invoice_id: string | null
  xendit_payment_id: string | null
  paid_at: string | null
  confirmed_by_school_at: string | null
  released_to_catering_at: string | null
}

interface SeedingStats {
  totalAllocations: number
  totalPayments: number
  successCount: number
  failedCount: number
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

  // Status mapping from allocation to payment
  STATUS_MAPPING: {
    'RELEASED': 'COMPLETED',
    'LOCKED': 'LOCKED',
    'RELEASING': 'RELEASING',
    'ON_HOLD': 'CONFIRMED',
    'CANCELLED': 'REFUNDED',
    'PLANNED': 'PENDING',
    'LOCKING': 'PENDING',
  } as Record<string, string>,

  // Blockchain block range (Ethereum/Polygon simulation)
  BLOCK_NUMBER_MIN: 10000000,
  BLOCK_NUMBER_MAX: 20000000,
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
 * Generate random blockchain block number
 */
function generateBlockNumber(): number {
  return Math.floor(
    Math.random() * (CONFIG.BLOCK_NUMBER_MAX - CONFIG.BLOCK_NUMBER_MIN + 1) +
      CONFIG.BLOCK_NUMBER_MIN
  )
}

/**
 * Map allocation status to payment status
 */
function mapStatus(allocationStatus: string): string {
  return CONFIG.STATUS_MAPPING[allocationStatus] || 'PENDING'
}

/**
 * Determine blockchain tx hash based on status
 */
function getBlockchainTxHash(
  allocation: AllocationRecord,
  paymentStatus: string
): string | null {
  if (paymentStatus === 'COMPLETED') {
    return allocation.tx_hash_release
  } else if (paymentStatus === 'LOCKED') {
    return allocation.tx_hash_lock
  }
  return null
}

/**
 * Determine blockchain block number based on status
 */
function getBlockchainBlockNumber(paymentStatus: string): number | null {
  if (paymentStatus === 'COMPLETED' || paymentStatus === 'LOCKED') {
    return generateBlockNumber()
  }
  return null
}

/**
 * Determine paid_at timestamp
 */
function getPaidAt(
  allocation: AllocationRecord,
  paymentStatus: string
): string | null {
  if (paymentStatus === 'COMPLETED' || paymentStatus === 'LOCKED') {
    return allocation.locked_at
  }
  return null
}

/**
 * Determine released_to_catering_at timestamp
 */
function getReleasedAt(
  allocation: AllocationRecord,
  paymentStatus: string
): string | null {
  if (paymentStatus === 'COMPLETED') {
    return allocation.released_at
  }
  return null
}

/**
 * Generate payment record from allocation
 */
function generatePayment(
  allocation: AllocationRecord,
  deliveryId: number | null,
  confirmedAt: string | null
): PaymentInsert {
  const paymentStatus = mapStatus(allocation.status)
  const blockchainTxHash = getBlockchainTxHash(allocation, paymentStatus)
  const blockchainBlockNumber = getBlockchainBlockNumber(paymentStatus)

  return {
    allocation_id: allocation.id,
    delivery_id: deliveryId,
    school_id: allocation.school_id,
    catering_id: allocation.catering_id,
    amount: allocation.amount,
    currency: 'IDR',
    status: paymentStatus,
    blockchain_tx_hash: blockchainTxHash,
    blockchain_block_number: blockchainBlockNumber,
    xendit_invoice_id: null, // Future integration
    xendit_payment_id: null, // Future integration
    paid_at: getPaidAt(allocation, paymentStatus),
    confirmed_by_school_at:
      paymentStatus === 'COMPLETED' || paymentStatus === 'CONFIRMED'
        ? confirmedAt
        : null,
    released_to_catering_at: getReleasedAt(allocation, paymentStatus),
  }
}

// ============================================================================
// MAIN SEEDING FUNCTION
// ============================================================================

async function seedPayments() {
  const logger = new Logger()
  const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY)

  const stats: SeedingStats = {
    totalAllocations: 0,
    totalPayments: 0,
    successCount: 0,
    failedCount: 0,
    byStatus: {},
    errors: [],
  }

  logger.log('================================================================================')
  logger.log('SEEDING SCRIPT 06: PAYMENTS')
  logger.log('================================================================================')

  try {
    // ========================================================================
    // STEP 1: FETCH ALLOCATIONS
    // ========================================================================

    logger.log('\nSTEP 1: Fetching allocations...')

    const { data: allocations, error: allocationsError } = await supabase
      .from('allocations')
      .select('id, school_id, catering_id, amount, status, tx_hash_lock, tx_hash_release, locked_at, released_at')
      .order('id', { ascending: true })

    if (allocationsError) {
      throw new Error(`Failed to fetch allocations: ${allocationsError.message}`)
    }

    if (!allocations || allocations.length === 0) {
      logger.error('No allocations found. Please seed allocations first.')
      return
    }

    stats.totalAllocations = allocations.length
    logger.success(`Found ${allocations.length} allocations`)

    // ========================================================================
    // STEP 2: BUILD DELIVERY MAPPING
    // ========================================================================

    logger.log('\nSTEP 2: Building allocation-delivery mapping...')

    const { data: deliveries, error: deliveriesError } = await supabase
      .from('deliveries')
      .select('id, allocation_id')
      .not('allocation_id', 'is', null)

    if (deliveriesError) {
      throw new Error(`Failed to fetch deliveries: ${deliveriesError.message}`)
    }

    const allocationDeliveryMap = new Map<number, number>()
    deliveries?.forEach((d: any) => {
      allocationDeliveryMap.set(d.allocation_id, d.id)
    })

    logger.success(`Mapped ${allocationDeliveryMap.size} allocations to deliveries`)

    // ========================================================================
    // STEP 3: BUILD VERIFICATION MAPPING
    // ========================================================================

    logger.log('\nSTEP 3: Building delivery-verification mapping...')

    const { data: verifications, error: verificationsError } = await supabase
      .from('verifications')
      .select('delivery_id, verified_at')
      .not('verified_at', 'is', null)

    if (verificationsError) {
      throw new Error(`Failed to fetch verifications: ${verificationsError.message}`)
    }

    const verificationMap = new Map<number, string>()
    verifications?.forEach((v: any) => {
      verificationMap.set(v.delivery_id, v.verified_at)
    })

    logger.success(`Mapped ${verificationMap.size} verifications`)

    // ========================================================================
    // STEP 4: CHECK FOR EXISTING PAYMENTS
    // ========================================================================

    logger.log('\nSTEP 4: Checking for existing payments...')

    const { data: existingPayments } = await supabase
      .from('payments')
      .select('allocation_id')

    const existingAllocationIds = new Set(
      existingPayments?.map((p: any) => p.allocation_id) || []
    )

    logger.log(`Found ${existingAllocationIds.size} existing payments`)

    // Filter out allocations that already have payments
    const allocationsToProcess = allocations.filter(
      (a: AllocationRecord) => !existingAllocationIds.has(a.id)
    )

    if (allocationsToProcess.length === 0) {
      logger.success('All allocations already have payments!')
      logger.log('\nSeeding completed - nothing to add.')
      return
    }

    logger.log(`Will create ${allocationsToProcess.length} new payments`)

    // ========================================================================
    // STEP 5: GENERATE PAYMENTS
    // ========================================================================

    logger.log('\nSTEP 5: Generating payment records...')

    const paymentsToInsert: PaymentInsert[] = []

    for (const allocation of allocationsToProcess) {
      const deliveryId = allocationDeliveryMap.get(allocation.id) || null
      const confirmedAt = deliveryId
        ? verificationMap.get(deliveryId) || null
        : null

      const payment = generatePayment(allocation, deliveryId, confirmedAt)
      paymentsToInsert.push(payment)

      // Track stats
      stats.byStatus[payment.status] = (stats.byStatus[payment.status] || 0) + 1
    }

    stats.totalPayments = paymentsToInsert.length
    logger.success(`Generated ${paymentsToInsert.length} payment records`)

    // ========================================================================
    // STEP 6: INSERT PAYMENTS IN BATCHES
    // ========================================================================

    logger.log('\nSTEP 6: Inserting payments to database...')
    logger.log(`Batch size: ${CONFIG.BATCH_SIZE}`)

    for (let i = 0; i < paymentsToInsert.length; i += CONFIG.BATCH_SIZE) {
      const batch = paymentsToInsert.slice(i, i + CONFIG.BATCH_SIZE)
      const batchNum = Math.floor(i / CONFIG.BATCH_SIZE) + 1

      try {
        const { data, error } = await supabase
          .from('payments')
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
            Math.min(i + CONFIG.BATCH_SIZE, paymentsToInsert.length),
            paymentsToInsert.length,
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
    logger.log(`Total allocations: ${stats.totalAllocations}`)
    logger.log(`Payments to create: ${stats.totalPayments}`)
    logger.log(`Successfully inserted: ${stats.successCount}`)
    logger.log(`Failed: ${stats.failedCount}`)

    if (stats.successCount > 0) {
      logger.log('\nBreakdown by Status:')
      const sortedStatuses = Object.entries(stats.byStatus)
        .sort((a, b) => b[1] - a[1])
      sortedStatuses.forEach(([status, count]) => {
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

    const statsFilePath = path.join(__dirname, '../seeding-logs/06-payments-stats.json')
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

seedPayments()
