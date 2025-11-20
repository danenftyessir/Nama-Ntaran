/**
 * ============================================================================
 * SEEDING SCRIPT 03: ALLOCATIONS
 * ============================================================================
 *
 * Purpose: Seed allocations table with budget allocation/locking system
 * Dependencies: 01-seed-users.ts, 04-seed-deliveries.ts (deliveries must exist)
 *
 * Run: npx ts-node database/seeders/03-seed-allocations.ts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

dotenv.config()

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface DeliveryForAllocation {
  id: number
  school_id: number
  catering_id: number
  delivery_date: string
  portions: number
  total_amount: number
  status: string
  created_at: string
  delivered_at: string | null
  school_name?: string
  catering_name?: string
}

interface VerificationData {
  delivery_id: number
  verified_at: string
}

interface AllocationInsert {
  school_id: number
  catering_id: number
  allocation_id: string
  amount: number
  currency: string
  status: string
  tx_hash_lock: string | null
  tx_hash_release: string | null
  blockchain_confirmed: boolean
  metadata: {
    deliveryDate: string
    portions: number
    deliveryId: number
    notes: string
    schoolName?: string
    cateringName?: string
  }
  locked_at: string | null
  released_at: string | null
}

interface SeedingStats {
  totalAllocations: number
  successAllocations: number
  failedAllocations: number
  allocationsByStatus: Record<string, number>
  errors: Array<{ type: string; batch?: number; error?: string; count?: number }>
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Test Mode
  TEST_MODE: false,
  TEST_LIMIT: 50, // Limit deliveries in test mode

  // Seeding Options
  BATCH_SIZE: 100,

  // Status Distribution (based on spec)
  STATUS_DISTRIBUTION: {
    RELEASED: 0.65,   // 65%
    LOCKED: 0.30,     // 30%
    RELEASING: 0.02,  // 2%
    ON_HOLD: 0.02,    // 2%
    CANCELLED: 0.01   // 1%
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

class Logger {
  private startTime: number = Date.now()

  log(message: string) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2)
    console.log(`[${elapsed}s] ${message}`)
  }

  error(message: string, error?: any) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2)
    console.error(`[${elapsed}s] ❌ ERROR: ${message}`)
    if (error) console.error(error)
  }

  success(message: string) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2)
    console.log(`[${elapsed}s] ✅ ${message}`)
  }

  progress(current: number, total: number, label: string) {
    const percentage = ((current / total) * 100).toFixed(1)
    const bar = this.generateProgressBar(current, total)
    console.log(`${bar} ${percentage}% - ${label} (${current}/${total})`)
  }

  private generateProgressBar(current: number, total: number, length: number = 30): string {
    const filled = Math.floor((current / total) * length)
    const empty = length - filled
    return `[${'█'.repeat(filled)}${' '.repeat(empty)}]`
  }
}

const logger = new Logger()

// ============================================================================
// HASH & ID GENERATORS
// ============================================================================

function generateAllocationId(schoolId: number, cateringId: number, deliveryDate: string): string {
  const input = `${schoolId}-${cateringId}-${deliveryDate}`
  const hash = crypto.createHash('sha256').update(input).digest('hex')
  return hash.substring(0, 32)
}

function generateTxHash(): string {
  const randomHex = crypto.randomBytes(32).toString('hex')
  return `0x${randomHex}`
}

function getRandomStatus(): string {
  const random = Math.random()
  let cumulative = 0

  for (const [status, probability] of Object.entries(CONFIG.STATUS_DISTRIBUTION)) {
    cumulative += probability
    if (random <= cumulative) {
      return status
    }
  }

  return 'RELEASED' // fallback
}

// ============================================================================
// DATE UTILITIES
// ============================================================================

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function addHours(date: Date, hours: number): Date {
  const result = new Date(date)
  result.setHours(result.getHours() + hours)
  return result
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchDeliveriesForAllocation(supabase: any): Promise<DeliveryForAllocation[]> {
  logger.log('Fetching deliveries with status verified...')

  // Fetch verified deliveries with school and catering info
  const query = supabase
    .from('deliveries')
    .select(`
      id,
      school_id,
      catering_id,
      delivery_date,
      portions,
      amount,
      total_amount,
      status,
      created_at,
      delivered_at,
      schools!inner(name),
      caterings!inner(name)
    `)
    .in('status', ['verified', 'delivered', 'cancelled'])
    .order('id')

  if (CONFIG.TEST_MODE) {
    query.limit(CONFIG.TEST_LIMIT)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch deliveries: ${error.message}`)
  }

  if (!data || data.length === 0) {
    throw new Error('No deliveries found. Please run 04-seed-deliveries.ts first')
  }

  // Transform the data
  const deliveries: DeliveryForAllocation[] = data.map((d: any) => ({
    id: d.id,
    school_id: d.school_id,
    catering_id: d.catering_id,
    delivery_date: d.delivery_date,
    portions: d.portions,
    total_amount: d.total_amount || d.amount || 0, // Handle both column names
    status: d.status,
    created_at: d.created_at,
    delivered_at: d.delivered_at,
    school_name: d.schools?.name,
    catering_name: d.caterings?.name
  }))

  logger.success(`Found ${deliveries.length} deliveries for allocation`)

  if (CONFIG.TEST_MODE) {
    logger.log(`⚠️  TEST MODE - Using only ${deliveries.length} deliveries`)
  }

  return deliveries
}

async function fetchVerifications(supabase: any): Promise<Map<number, VerificationData>> {
  logger.log('Fetching verifications...')

  const { data, error } = await supabase
    .from('verifications')
    .select('delivery_id, verified_at')

  if (error) {
    logger.error('Failed to fetch verifications', error)
    return new Map()
  }

  const verificationsMap = new Map<number, VerificationData>()

  if (data) {
    data.forEach((v: any) => {
      verificationsMap.set(v.delivery_id, {
        delivery_id: v.delivery_id,
        verified_at: v.verified_at
      })
    })
    logger.success(`Found ${verificationsMap.size} verifications`)
  }

  return verificationsMap
}

// ============================================================================
// DATA GENERATION
// ============================================================================

async function generateAllocations(
  deliveries: DeliveryForAllocation[],
  verifications: Map<number, VerificationData>
): Promise<AllocationInsert[]> {
  logger.log('Generating allocations...')

  const allocations: AllocationInsert[] = []

  for (let i = 0; i < deliveries.length; i++) {
    const delivery = deliveries[i]

    // Generate allocation_id
    const allocationId = generateAllocationId(
      delivery.school_id,
      delivery.catering_id,
      delivery.delivery_date
    )

    // Determine status
    let status = getRandomStatus()

    // Override status based on delivery status
    if (delivery.status === 'cancelled') {
      status = 'CANCELLED'
    } else if (delivery.status === 'delivered' && !verifications.has(delivery.id)) {
      status = 'LOCKED' // Not yet verified, so still locked
    }

    // Generate blockchain tx hashes
    let txHashLock: string | null = null
    let txHashRelease: string | null = null
    let blockchainConfirmed = false

    if (['LOCKED', 'RELEASED', 'RELEASING'].includes(status)) {
      txHashLock = generateTxHash()
      blockchainConfirmed = true
    }

    if (status === 'RELEASED') {
      txHashRelease = generateTxHash()
    }

    // Calculate timestamps
    const createdDate = new Date(delivery.created_at)
    const deliveryDate = new Date(delivery.delivery_date)

    // locked_at: delivery.created_at + random(0-2 days), but before delivery_date
    const daysBeforeDelivery = Math.max(
      0,
      Math.floor((deliveryDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
    )
    const lockOffset = randomInt(0, Math.min(2, daysBeforeDelivery))
    const lockedAt = addDays(createdDate, lockOffset)

    let releasedAt: string | null = null

    if (status === 'RELEASED') {
      // released_at: verified_at + random(1-48 hours)
      const verification = verifications.get(delivery.id)
      if (verification) {
        const verifiedDate = new Date(verification.verified_at)
        const releaseHours = randomInt(1, 48)
        releasedAt = addHours(verifiedDate, releaseHours).toISOString()
      } else if (delivery.delivered_at) {
        // Fallback if no verification
        const deliveredDate = new Date(delivery.delivered_at)
        const releaseHours = randomInt(1, 48)
        releasedAt = addHours(deliveredDate, releaseHours).toISOString()
      }
    }

    // Metadata
    const metadata = {
      deliveryDate: delivery.delivery_date,
      portions: delivery.portions,
      deliveryId: delivery.id,
      notes: `Pembayaran untuk pengiriman tanggal ${new Date(delivery.delivery_date).toLocaleDateString('id-ID')}`,
      schoolName: delivery.school_name,
      cateringName: delivery.catering_name
    }

    allocations.push({
      school_id: delivery.school_id,
      catering_id: delivery.catering_id,
      allocation_id: allocationId,
      amount: delivery.total_amount,
      currency: 'IDR',
      status,
      tx_hash_lock: txHashLock,
      tx_hash_release: txHashRelease,
      blockchain_confirmed: blockchainConfirmed,
      metadata,
      locked_at: lockedAt.toISOString(),
      released_at: releasedAt
    })

    if ((i + 1) % 100 === 0) {
      logger.progress(i + 1, deliveries.length, 'Generating allocations')
    }
  }

  logger.success(`Generated ${allocations.length} allocations`)
  return allocations
}

// ============================================================================
// SUPABASE OPERATIONS
// ============================================================================

async function insertAllocationsInBatches(
  supabase: any,
  allocations: AllocationInsert[],
  batchSize: number
): Promise<{ success: number; failed: number; errors: any[] }> {
  let success = 0
  let failed = 0
  const errors: any[] = []

  const totalBatches = Math.ceil(allocations.length / batchSize)
  logger.log(`Inserting ${allocations.length} allocations in ${totalBatches} batches...`)

  for (let i = 0; i < allocations.length; i += batchSize) {
    const batch = allocations.slice(i, i + batchSize)
    const batchNumber = Math.floor(i / batchSize) + 1

    try {
      const { data, error } = await supabase
        .from('allocations')
        .insert(batch)
        .select()

      if (error) {
        logger.error(`Batch ${batchNumber} failed`, error)
        failed += batch.length
        errors.push({
          batch: batchNumber,
          error: error.message,
          count: batch.length
        })
      } else {
        success += data.length
        logger.progress(
          Math.min(i + batchSize, allocations.length),
          allocations.length,
          'Inserting allocations'
        )
      }
    } catch (error) {
      logger.error(`Batch ${batchNumber} exception`, error)
      failed += batch.length
      errors.push({
        batch: batchNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
        count: batch.length
      })
    }

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return { success, failed, errors }
}

// ============================================================================
// MAIN SEEDING FUNCTION
// ============================================================================

async function seedAllocations() {
  logger.log('='.repeat(80))
  logger.log('SEEDING SCRIPT 03: ALLOCATIONS')
  if (CONFIG.TEST_MODE) {
    logger.log('⚠️  TEST MODE ENABLED - Limited data seeding')
  }
  logger.log('='.repeat(80))

  const stats: SeedingStats = {
    totalAllocations: 0,
    successAllocations: 0,
    failedAllocations: 0,
    allocationsByStatus: {},
    errors: []
  }

  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_SERVICE_KEY) {
    logger.error('Missing Supabase credentials in environment variables')
    process.exit(1)
  }

  logger.log('Initializing Supabase client...')
  const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  logger.success('Supabase client initialized')

  try {
    // Fetch deliveries
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 1: FETCHING DELIVERIES')
    logger.log('='.repeat(80))

    const deliveries = await fetchDeliveriesForAllocation(supabase)

    // Fetch verifications
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 2: FETCHING VERIFICATIONS')
    logger.log('='.repeat(80))

    const verifications = await fetchVerifications(supabase)

    // Generate allocations
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 3: GENERATING ALLOCATIONS')
    logger.log('='.repeat(80))

    const allocations = await generateAllocations(deliveries, verifications)
    stats.totalAllocations = allocations.length

    // Count by status
    allocations.forEach((allocation: AllocationInsert) => {
      stats.allocationsByStatus[allocation.status] =
        (stats.allocationsByStatus[allocation.status] || 0) + 1
    })

    // Insert allocations
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 4: INSERTING ALLOCATIONS TO DATABASE')
    logger.log('='.repeat(80))

    const result = await insertAllocationsInBatches(supabase, allocations, CONFIG.BATCH_SIZE)
    stats.successAllocations = result.success
    stats.failedAllocations = result.failed
    stats.errors = result.errors

    // Print summary
    logger.log('\n' + '='.repeat(80))
    logger.log('SEEDING SUMMARY')
    logger.log('='.repeat(80))

    console.log(`
📊 ALLOCATIONS:
   Total: ${stats.totalAllocations}
   ✅ Success: ${stats.successAllocations}
   ❌ Failed: ${stats.failedAllocations}
   Success Rate: ${((stats.successAllocations / stats.totalAllocations) * 100).toFixed(1)}%

📊 BY STATUS:`)

    Object.entries(stats.allocationsByStatus)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        const percentage = ((count / stats.totalAllocations) * 100).toFixed(1)
        console.log(`   ${status.padEnd(15)}: ${count.toString().padStart(5)} (${percentage}%)`)
      })

    if (stats.errors.length > 0) {
      logger.log('\n❌ ERRORS ENCOUNTERED:')
      stats.errors.slice(0, 10).forEach((err: any, index: number) => {
        console.log(`${index + 1}. Batch ${err.batch}: ${err.error}`)
      })
      if (stats.errors.length > 10) {
        logger.log(`... and ${stats.errors.length - 10} more errors`)
      }
    }

    logger.log('\n' + '='.repeat(80))
    logger.success('SEEDING COMPLETED!')
    logger.log('='.repeat(80))

    // Save stats
    const statsPath = path.join(__dirname, '../seeding-logs/03-allocations-stats.json')
    fs.mkdirSync(path.dirname(statsPath), { recursive: true })
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2))
    logger.log(`\nStats saved to: ${statsPath}`)

  } catch (error) {
    logger.error('Fatal error during seeding', error)
    process.exit(1)
  }
}

// ============================================================================
// EXECUTE
// ============================================================================

if (require.main === module) {
  seedAllocations()
    .then(() => {
      logger.success('Script execution completed')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('Script execution failed', error)
      process.exit(1)
    })
}

export { seedAllocations }
