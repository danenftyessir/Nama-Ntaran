/**
 * ============================================================================
 * SEEDING SCRIPT 42: GOVERNMENT BUDGET ALLOCATIONS
 * ============================================================================
 *
 * Purpose: Seed allocations untuk anggaran pemerintah yang di-lock ke escrow
 * Dependencies:
 *   - @supabase/supabase-js
 *   - dotenv
 *   - Requires: schools, caterings, deliveries
 *
 * Run: npx ts-node database/seeders/42-seed-government-allocations.ts
 *
 * Data yang dibuat:
 * - Allocations untuk setiap delivery (budget locking)
 * - Payments terkait dengan allocations
 * - Payment events untuk audit trail
 * - Public payment feed untuk transparansi
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

dotenv.config()

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Delivery {
  id: number
  school_id: number
  catering_id: number
  delivery_date: string
  portions: number
  amount: number
  total_amount?: number
  status: string
  school_name?: string
  school_province?: string
  school_city?: string
  catering_name?: string
  catering_wallet?: string
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

interface PaymentInsert {
  allocation_id: number
  delivery_id: number
  school_id: number
  catering_id: number
  amount: number
  currency: string
  status: string
  blockchain_tx_hash: string | null
  blockchain_block_number: number | null
  paid_at: string | null
  confirmed_by_school_at: string | null
  released_to_catering_at: string | null
}

interface PaymentEventInsert {
  payment_id?: number
  allocation_id: number
  event_type: string
  blockchain_event_signature: string | null
  blockchain_tx_hash: string | null
  blockchain_block_number: number | null
  event_data: any
  processed: boolean
  processed_at: string | null
}

interface PublicPaymentFeedInsert {
  payment_id: number
  allocation_id: number
  school_name: string
  school_region: string
  catering_name: string
  amount: number
  currency: string
  portions_count: number
  delivery_date: string
  status: string
  blockchain_tx_hash: string | null
  blockchain_block_number: number | null
  locked_at: string | null
  released_at: string | null
}

interface SeedingStats {
  totalDeliveries: number
  totalAllocations: number
  totalPayments: number
  totalPaymentEvents: number
  totalPublicFeed: number
  successAllocations: number
  successPayments: number
  successPaymentEvents: number
  successPublicFeed: number
  failedAllocations: number
  failedPayments: number
  byStatus: Record<string, number>
  errors: Array<{ type: string; error?: string }>
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  BATCH_SIZE: 100,

  // Status Distribution untuk allocations
  STATUS_DISTRIBUTION: {
    RELEASED: 0.60, // 60% - Dana sudah di-release (delivery selesai)
    LOCKED: 0.25, // 25% - Dana masih di-lock (menunggu verifikasi)
    RELEASING: 0.05, // 5% - Sedang proses release
    ON_HOLD: 0.05, // 5% - Ada issue
    CANCELLED: 0.03, // 3% - Dibatalkan
    LOCKING: 0.02, // 2% - Sedang proses lock
  },
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
// HELPER FUNCTIONS
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

function generateBlockNumber(): number {
  // Generate realistic block number (in the millions)
  return Math.floor(15000000 + Math.random() * 5000000)
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

async function fetchDeliveries(supabase: any): Promise<Delivery[]> {
  logger.log('Fetching deliveries with school and catering info...')

  const { data, error } = await supabase
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
      schools!inner(
        name,
        province,
        city
      ),
      caterings!inner(
        name,
        wallet_address
      )
    `)
    .order('id')

  if (error) {
    throw new Error(`Failed to fetch deliveries: ${error.message}`)
  }

  if (!data || data.length === 0) {
    throw new Error('No deliveries found. Please run delivery seeding first.')
  }

  const deliveries: Delivery[] = data.map((d: any) => ({
    id: d.id,
    school_id: d.school_id,
    catering_id: d.catering_id,
    delivery_date: d.delivery_date,
    portions: d.portions,
    amount: d.total_amount || d.amount || 0,
    total_amount: d.total_amount || d.amount || 0,
    status: d.status,
    school_name: d.schools?.name,
    school_province: d.schools?.province,
    school_city: d.schools?.city,
    catering_name: d.caterings?.name,
    catering_wallet: d.caterings?.wallet_address,
  }))

  logger.success(`Found ${deliveries.length} deliveries`)
  return deliveries
}

// ============================================================================
// DATA GENERATION
// ============================================================================

function generateAllocation(delivery: Delivery): AllocationInsert {
  const allocationId = generateAllocationId(
    delivery.school_id,
    delivery.catering_id,
    delivery.delivery_date
  )

  const status = getRandomStatus()
  const deliveryDate = new Date(delivery.delivery_date)

  // Determine timestamps based on status
  let lockedAt: string | null = null
  let releasedAt: string | null = null
  let txHashLock: string | null = null
  let txHashRelease: string | null = null
  let blockchainConfirmed = false

  if (status === 'LOCKED' || status === 'RELEASED' || status === 'RELEASING' || status === 'ON_HOLD') {
    // Lock timestamp: 1-3 days before delivery
    const lockDate = addDays(deliveryDate, -randomInt(1, 3))
    lockedAt = lockDate.toISOString()
    txHashLock = generateTxHash()
    blockchainConfirmed = true
  }

  if (status === 'RELEASED') {
    // Release timestamp: 1-7 days after delivery
    const releaseDate = addDays(deliveryDate, randomInt(1, 7))
    releasedAt = releaseDate.toISOString()
    txHashRelease = generateTxHash()
  }

  if (status === 'RELEASING') {
    // Currently releasing (no release timestamp yet)
    txHashRelease = generateTxHash()
  }

  return {
    school_id: delivery.school_id,
    catering_id: delivery.catering_id,
    allocation_id: allocationId,
    amount: delivery.amount,
    currency: 'IDR',
    status: status,
    tx_hash_lock: txHashLock,
    tx_hash_release: txHashRelease,
    blockchain_confirmed: blockchainConfirmed,
    metadata: {
      deliveryDate: delivery.delivery_date,
      portions: delivery.portions,
      deliveryId: delivery.id,
      notes: `Alokasi dana untuk pengiriman ${delivery.portions} porsi ke ${delivery.school_name}`,
      schoolName: delivery.school_name,
      cateringName: delivery.catering_name,
    },
    locked_at: lockedAt,
    released_at: releasedAt,
  }
}

function generatePayment(allocation: AllocationInsert, allocationDbId: number, delivery: Delivery): PaymentInsert {
  let paymentStatus = 'PENDING'

  // Map allocation status to payment status
  if (allocation.status === 'LOCKED') {
    paymentStatus = 'LOCKED'
  } else if (allocation.status === 'RELEASED') {
    paymentStatus = 'COMPLETED'
  } else if (allocation.status === 'RELEASING') {
    paymentStatus = 'RELEASING'
  } else if (allocation.status === 'ON_HOLD') {
    paymentStatus = 'LOCKED'
  } else if (allocation.status === 'CANCELLED') {
    paymentStatus = 'REFUNDED'
  }

  let paidAt: string | null = null
  let confirmedBySchoolAt: string | null = null
  let releasedToCateringAt: string | null = null
  let blockchainTxHash: string | null = null
  let blockNumber: number | null = null

  if (allocation.status !== 'LOCKING' && allocation.locked_at) {
    paidAt = allocation.locked_at
    blockchainTxHash = allocation.tx_hash_lock
    blockNumber = generateBlockNumber()
  }

  if (paymentStatus === 'COMPLETED' || paymentStatus === 'RELEASING') {
    const deliveryDate = new Date(delivery.delivery_date)
    confirmedBySchoolAt = addDays(deliveryDate, randomInt(0, 2)).toISOString()
  }

  if (paymentStatus === 'COMPLETED') {
    releasedToCateringAt = allocation.released_at
    blockchainTxHash = allocation.tx_hash_release || blockchainTxHash
  }

  return {
    allocation_id: allocationDbId,
    delivery_id: delivery.id,
    school_id: delivery.school_id,
    catering_id: delivery.catering_id,
    amount: allocation.amount,
    currency: 'IDR',
    status: paymentStatus,
    blockchain_tx_hash: blockchainTxHash,
    blockchain_block_number: blockNumber,
    paid_at: paidAt,
    confirmed_by_school_at: confirmedBySchoolAt,
    released_to_catering_at: releasedToCateringAt,
  }
}

function generatePaymentEvents(
  payment: PaymentInsert,
  paymentDbId: number,
  allocation: AllocationInsert,
  allocationDbId: number
): PaymentEventInsert[] {
  const events: PaymentEventInsert[] = []

  // Event 1: ALLOCATION_CREATED (always)
  events.push({
    payment_id: undefined,
    allocation_id: allocationDbId,
    event_type: 'ALLOCATION_CREATED',
    blockchain_event_signature: null,
    blockchain_tx_hash: null,
    blockchain_block_number: null,
    event_data: {
      schoolId: allocation.school_id,
      cateringId: allocation.catering_id,
      amount: allocation.amount,
      portions: allocation.metadata.portions,
      deliveryDate: allocation.metadata.deliveryDate,
    },
    processed: true,
    processed_at: new Date().toISOString(),
  })

  // Event 2: FUND_LOCKED (if locked)
  if (allocation.locked_at && allocation.tx_hash_lock) {
    events.push({
      payment_id: paymentDbId,
      allocation_id: allocationDbId,
      event_type: 'FUND_LOCKED',
      blockchain_event_signature: 'FundLocked(bytes32,address,address,uint256,string)',
      blockchain_tx_hash: allocation.tx_hash_lock,
      blockchain_block_number: payment.blockchain_block_number,
      event_data: {
        escrowId: allocation.allocation_id,
        payer: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        payee: allocation.metadata.cateringName,
        amount: allocation.amount,
        schoolId: allocation.school_id,
      },
      processed: true,
      processed_at: allocation.locked_at,
    })
  }

  // Event 3: DELIVERY_CONFIRMED (if confirmed)
  if (payment.confirmed_by_school_at) {
    events.push({
      payment_id: paymentDbId,
      allocation_id: allocationDbId,
      event_type: 'DELIVERY_CONFIRMED',
      blockchain_event_signature: null,
      blockchain_tx_hash: null,
      blockchain_block_number: null,
      event_data: {
        deliveryId: payment.delivery_id,
        confirmedAt: payment.confirmed_by_school_at,
        portions: allocation.metadata.portions,
      },
      processed: true,
      processed_at: payment.confirmed_by_school_at,
    })
  }

  // Event 4: PAYMENT_RELEASED (if released)
  if (allocation.released_at && allocation.tx_hash_release) {
    events.push({
      payment_id: paymentDbId,
      allocation_id: allocationDbId,
      event_type: 'PAYMENT_RELEASED',
      blockchain_event_signature: 'FundReleased(bytes32,address,uint256)',
      blockchain_tx_hash: allocation.tx_hash_release,
      blockchain_block_number: payment.blockchain_block_number ? payment.blockchain_block_number + randomInt(100, 1000) : null,
      event_data: {
        escrowId: allocation.allocation_id,
        payee: allocation.metadata.cateringName,
        amount: allocation.amount,
        releasedAt: allocation.released_at,
      },
      processed: true,
      processed_at: allocation.released_at,
    })
  }

  // Event 5: PAYMENT_RELEASING (if releasing)
  if (allocation.status === 'RELEASING') {
    events.push({
      payment_id: paymentDbId,
      allocation_id: allocationDbId,
      event_type: 'PAYMENT_RELEASING',
      blockchain_event_signature: null,
      blockchain_tx_hash: allocation.tx_hash_release,
      blockchain_block_number: null,
      event_data: {
        escrowId: allocation.allocation_id,
        initiatedAt: new Date().toISOString(),
      },
      processed: false,
      processed_at: null,
    })
  }

  return events
}

function generatePublicPaymentFeed(
  payment: PaymentInsert,
  paymentDbId: number,
  allocation: AllocationInsert,
  allocationDbId: number,
  delivery: Delivery
): PublicPaymentFeedInsert | null {
  // Only create public feed for completed/released payments
  if (allocation.status !== 'RELEASED') {
    return null
  }

  return {
    payment_id: paymentDbId,
    allocation_id: allocationDbId,
    school_name: delivery.school_name || 'Sekolah',
    school_region: delivery.school_city ? `${delivery.school_city}, ${delivery.school_province}` : delivery.school_province || 'Indonesia',
    catering_name: delivery.catering_name || 'Katering',
    amount: allocation.amount,
    currency: 'IDR',
    portions_count: allocation.metadata.portions,
    delivery_date: allocation.metadata.deliveryDate,
    status: 'COMPLETED',
    blockchain_tx_hash: allocation.tx_hash_release,
    blockchain_block_number: payment.blockchain_block_number,
    locked_at: allocation.locked_at,
    released_at: allocation.released_at,
  }
}

// ============================================================================
// MAIN SEEDING FUNCTION
// ============================================================================

async function seedGovernmentAllocations() {
  logger.log('='.repeat(80))
  logger.log('SEEDING SCRIPT 42: GOVERNMENT BUDGET ALLOCATIONS')
  logger.log('='.repeat(80))

  const stats: SeedingStats = {
    totalDeliveries: 0,
    totalAllocations: 0,
    totalPayments: 0,
    totalPaymentEvents: 0,
    totalPublicFeed: 0,
    successAllocations: 0,
    successPayments: 0,
    successPaymentEvents: 0,
    successPublicFeed: 0,
    failedAllocations: 0,
    failedPayments: 0,
    byStatus: {},
    errors: [],
  }

  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_SERVICE_KEY) {
    logger.error('Missing Supabase credentials in environment variables')
    process.exit(1)
  }

  logger.log('Initializing Supabase client...')
  const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  logger.success('Supabase client initialized')

  try {
    // ========================================================================
    // STEP 1: Fetch Deliveries
    // ========================================================================
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 1: FETCHING DELIVERIES')
    logger.log('='.repeat(80))

    const deliveries = await fetchDeliveries(supabase)
    stats.totalDeliveries = deliveries.length
    stats.totalAllocations = deliveries.length

    // ========================================================================
    // STEP 2: Generate and Insert Allocations
    // ========================================================================
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 2: GENERATING AND INSERTING ALLOCATIONS')
    logger.log('='.repeat(80))

    const allocations: AllocationInsert[] = []
    const allocationIdMap = new Map<number, number>() // delivery_id -> allocation_db_id
    const allocationIdsToCheck: string[] = []

    // Generate all allocations first
    for (const delivery of deliveries) {
      const allocation = generateAllocation(delivery)
      allocations.push(allocation)
      allocationIdsToCheck.push(allocation.allocation_id)
      stats.byStatus[allocation.status] = (stats.byStatus[allocation.status] || 0) + 1
    }

    logger.log(`Generated ${allocations.length} allocations`)

    // Check existing allocations
    logger.log('Checking for existing allocations...')
    const existingAllocationsMap = new Map<string, number>()

    // Query allocations in smaller batches (50 at a time to avoid header overflow)
    for (let i = 0; i < allocationIdsToCheck.length; i += 50) {
      const batchIds = allocationIdsToCheck.slice(i, i + 50)

      const { data, error } = await supabase
        .from('allocations')
        .select('id, allocation_id')
        .in('allocation_id', batchIds)

      if (error) {
        logger.error(`Failed to check existing allocations batch ${Math.floor(i/50) + 1}`, error)
      } else if (data && data.length > 0) {
        data.forEach((alloc: any) => {
          existingAllocationsMap.set(alloc.allocation_id, alloc.id)
        })
      }

      // Small delay to avoid rate limiting
      if (i % 200 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    logger.log(`Found ${existingAllocationsMap.size} existing allocations matching current deliveries`)

    // Map existing allocations to deliveries
    for (let i = 0; i < allocations.length; i++) {
      const allocation = allocations[i]
      const delivery = deliveries[i]
      const existingId = existingAllocationsMap.get(allocation.allocation_id)

      if (existingId) {
        allocationIdMap.set(delivery.id, existingId)
        stats.successAllocations++
      }
    }

    // Filter out allocations that already exist
    const newAllocations: AllocationInsert[] = []
    const newAllocationsDeliveryMap: number[] = []

    for (let i = 0; i < allocations.length; i++) {
      const allocation = allocations[i]
      if (!existingAllocationsMap.has(allocation.allocation_id)) {
        newAllocations.push(allocation)
        newAllocationsDeliveryMap.push(i)
      }
    }

    if (newAllocations.length === 0) {
      logger.log('All allocations already exist. Skipping insert.')
    } else {
      logger.log(`Inserting ${newAllocations.length} new allocations...`)

      // Insert new allocations in batches
      for (let i = 0; i < newAllocations.length; i += CONFIG.BATCH_SIZE) {
        const batch = newAllocations.slice(i, i + CONFIG.BATCH_SIZE)
        const batchNumber = Math.floor(i / CONFIG.BATCH_SIZE) + 1

        try {
          const { data, error } = await supabase
            .from('allocations')
            .insert(batch)
            .select('id, allocation_id')

          if (error) {
            logger.error(`Batch ${batchNumber} failed`, error)
            stats.failedAllocations += batch.length
            stats.errors.push({ type: 'allocation', error: error.message })
          } else {
            stats.successAllocations += data.length

            // Map allocation_id to db id
            data.forEach((alloc: any, idx: number) => {
              const originalIndex = newAllocationsDeliveryMap[i + idx]
              const deliveryId = deliveries[originalIndex].id
              allocationIdMap.set(deliveryId, alloc.id)
            })

            logger.progress(
              Math.min(i + CONFIG.BATCH_SIZE, newAllocations.length),
              newAllocations.length,
              'Inserting new allocations'
            )
          }
        } catch (error) {
          logger.error(`Batch ${batchNumber} exception`, error)
          stats.failedAllocations += batch.length
          stats.errors.push({
            type: 'allocation',
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }

        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // ========================================================================
    // STEP 3: Generate and Insert Payments
    // ========================================================================
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 3: GENERATING AND INSERTING PAYMENTS')
    logger.log('='.repeat(80))

    const payments: PaymentInsert[] = []
    const paymentIdMap = new Map<number, number>() // allocation_db_id -> payment_db_id
    const paymentDataMap = new Map<number, PaymentInsert>() // allocation_db_id -> payment_data
    const allocationDbIds: number[] = []

    for (let i = 0; i < allocations.length; i++) {
      const allocation = allocations[i]
      const delivery = deliveries[i]
      const allocationDbId = allocationIdMap.get(delivery.id)

      if (allocationDbId) {
        allocationDbIds.push(allocationDbId)
        const payment = generatePayment(allocation, allocationDbId, delivery)
        payments.push(payment)
        paymentDataMap.set(allocationDbId, payment) // Store payment data by allocation_id
      }
    }

    stats.totalPayments = payments.length
    logger.log(`Generated ${payments.length} payments`)

    // Check existing payments
    logger.log('Checking for existing payments...')
    const { data: existingPayments, error: paymentCheckError } = await supabase
      .from('payments')
      .select('id, allocation_id')
      .in('allocation_id', allocationDbIds)

    if (paymentCheckError) {
      logger.error('Failed to check existing payments', paymentCheckError)
    } else if (existingPayments && existingPayments.length > 0) {
      existingPayments.forEach((payment: any) => {
        paymentIdMap.set(payment.allocation_id, payment.id)
        stats.successPayments++
      })
      logger.log(`Found ${existingPayments.length} existing payments`)
    } else {
      logger.log('No existing payments found')
    }

    // Filter out payments that already exist
    const newPayments: PaymentInsert[] = []
    const existingPaymentAllocationIds = new Set(existingPayments?.map((p: any) => p.allocation_id) || [])

    payments.forEach((payment) => {
      if (!existingPaymentAllocationIds.has(payment.allocation_id)) {
        newPayments.push(payment)
      }
    })

    if (newPayments.length === 0) {
      logger.log('All payments already exist. Skipping insert.')
    } else {
      logger.log(`Inserting ${newPayments.length} new payments...`)

      // Insert payments in batches
      for (let i = 0; i < newPayments.length; i += CONFIG.BATCH_SIZE) {
        const batch = newPayments.slice(i, i + CONFIG.BATCH_SIZE)
        const batchNumber = Math.floor(i / CONFIG.BATCH_SIZE) + 1

        try {
          const { data, error } = await supabase
            .from('payments')
            .insert(batch)
            .select('id, allocation_id')

          if (error) {
            logger.error(`Payment batch ${batchNumber} failed`, error)
            stats.failedPayments += batch.length
            stats.errors.push({ type: 'payment', error: error.message })
          } else {
            stats.successPayments += data.length

            // Map payment ids
            data.forEach((payment: any) => {
              paymentIdMap.set(payment.allocation_id, payment.id)
            })

            logger.progress(
              Math.min(i + CONFIG.BATCH_SIZE, newPayments.length),
              newPayments.length,
              'Inserting new payments'
            )
          }
        } catch (error) {
          logger.error(`Payment batch ${batchNumber} exception`, error)
          stats.failedPayments += batch.length
          stats.errors.push({
            type: 'payment',
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }

        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // ========================================================================
    // STEP 4: Generate and Insert Payment Events
    // ========================================================================
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 4: GENERATING AND INSERTING PAYMENT EVENTS')
    logger.log('='.repeat(80))

    const paymentEvents: PaymentEventInsert[] = []

    for (let i = 0; i < allocations.length; i++) {
      const allocation = allocations[i]
      const delivery = deliveries[i]
      const allocationDbId = allocationIdMap.get(delivery.id)
      const paymentDbId = allocationDbId ? paymentIdMap.get(allocationDbId) : undefined
      const paymentData = allocationDbId ? paymentDataMap.get(allocationDbId) : undefined

      if (allocationDbId && paymentDbId && paymentData) {
        const events = generatePaymentEvents(paymentData, paymentDbId, allocation, allocationDbId)
        paymentEvents.push(...events)
      }
    }

    stats.totalPaymentEvents = paymentEvents.length
    logger.log(`Generated ${paymentEvents.length} payment events`)

    // Insert payment events in batches
    for (let i = 0; i < paymentEvents.length; i += CONFIG.BATCH_SIZE) {
      const batch = paymentEvents.slice(i, i + CONFIG.BATCH_SIZE)

      try {
        const { data, error } = await supabase
          .from('payment_events')
          .insert(batch)
          .select('id')

        if (error) {
          logger.error(`Payment events batch failed`, error)
          stats.errors.push({ type: 'payment_event', error: error.message })
        } else {
          stats.successPaymentEvents += data.length
          logger.progress(
            Math.min(i + CONFIG.BATCH_SIZE, paymentEvents.length),
            paymentEvents.length,
            'Inserting payment events'
          )
        }
      } catch (error) {
        logger.error(`Payment events batch exception`, error)
        stats.errors.push({
          type: 'payment_event',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }

      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // ========================================================================
    // STEP 5: Generate and Insert Public Payment Feed
    // ========================================================================
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 5: GENERATING AND INSERTING PUBLIC PAYMENT FEED')
    logger.log('='.repeat(80))

    const publicFeedEntries: PublicPaymentFeedInsert[] = []

    for (let i = 0; i < allocations.length; i++) {
      const allocation = allocations[i]
      const delivery = deliveries[i]
      const allocationDbId = allocationIdMap.get(delivery.id)
      const paymentDbId = allocationDbId ? paymentIdMap.get(allocationDbId) : undefined
      const paymentData = allocationDbId ? paymentDataMap.get(allocationDbId) : undefined

      if (allocationDbId && paymentDbId && paymentData) {
        const feedEntry = generatePublicPaymentFeed(
          paymentData,
          paymentDbId,
          allocation,
          allocationDbId,
          delivery
        )

        if (feedEntry) {
          publicFeedEntries.push(feedEntry)
        }
      }
    }

    stats.totalPublicFeed = publicFeedEntries.length
    logger.log(`Generated ${publicFeedEntries.length} public feed entries`)

    // Insert public feed in batches
    for (let i = 0; i < publicFeedEntries.length; i += CONFIG.BATCH_SIZE) {
      const batch = publicFeedEntries.slice(i, i + CONFIG.BATCH_SIZE)

      try {
        const { data, error } = await supabase
          .from('public_payment_feed')
          .insert(batch)
          .select('id')

        if (error) {
          logger.error(`Public feed batch failed`, error)
          stats.errors.push({ type: 'public_feed', error: error.message })
        } else {
          stats.successPublicFeed += data.length
          logger.progress(
            Math.min(i + CONFIG.BATCH_SIZE, publicFeedEntries.length),
            publicFeedEntries.length,
            'Inserting public feed'
          )
        }
      } catch (error) {
        logger.error(`Public feed batch exception`, error)
        stats.errors.push({
          type: 'public_feed',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }

      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // ========================================================================
    // STEP 6: Update deliveries with allocation_id
    // ========================================================================
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 6: UPDATING DELIVERIES WITH ALLOCATION_ID')
    logger.log('='.repeat(80))

    let updatedDeliveries = 0

    for (const [deliveryId, allocationDbId] of allocationIdMap.entries()) {
      try {
        const { error } = await supabase
          .from('deliveries')
          .update({ allocation_id: allocationDbId })
          .eq('id', deliveryId)

        if (!error) {
          updatedDeliveries++
        }
      } catch (error) {
        // Ignore update errors
      }
    }

    logger.success(`Updated ${updatedDeliveries} deliveries with allocation_id`)

    // ========================================================================
    // FINAL SUMMARY
    // ========================================================================
    logger.log('\n' + '='.repeat(80))
    logger.log('SEEDING SUMMARY')
    logger.log('='.repeat(80))

    console.log(`
📊 ALLOCATIONS:
   Total: ${stats.totalAllocations}
   ✅ Success: ${stats.successAllocations}
   ❌ Failed: ${stats.failedAllocations}
   Success Rate: ${((stats.successAllocations / stats.totalAllocations) * 100).toFixed(1)}%

📊 PAYMENTS:
   Total: ${stats.totalPayments}
   ✅ Success: ${stats.successPayments}
   ❌ Failed: ${stats.failedPayments}
   Success Rate: ${((stats.successPayments / stats.totalPayments) * 100).toFixed(1)}%

📊 PAYMENT EVENTS:
   Total: ${stats.totalPaymentEvents}
   ✅ Success: ${stats.successPaymentEvents}

📊 PUBLIC PAYMENT FEED:
   Total: ${stats.totalPublicFeed}
   ✅ Success: ${stats.successPublicFeed}

📊 ALLOCATIONS BY STATUS:`)

    Object.entries(stats.byStatus)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        const percentage = ((count / stats.totalAllocations) * 100).toFixed(1)
        console.log(`   ${status.padEnd(15)}: ${count.toString().padStart(4)} (${percentage}%)`)
      })

    if (stats.errors.length > 0) {
      logger.log('\n❌ ERRORS ENCOUNTERED:')
      stats.errors.slice(0, 10).forEach((err, index) => {
        const errorMsg = err.error || 'Unknown error'
        console.log(`${index + 1}. [${err.type}] ${errorMsg}`)
      })
      if (stats.errors.length > 10) {
        logger.log(`... and ${stats.errors.length - 10} more errors`)
      }
    }

    logger.log('\n' + '='.repeat(80))
    logger.success('SEEDING COMPLETED!')
    logger.log('='.repeat(80))

    // Save stats
    const statsPath = path.join(__dirname, '../seeding-logs/42-government-allocations-stats.json')
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
  seedGovernmentAllocations()
    .then(() => {
      logger.success('Script execution completed')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('Script execution failed', error)
      process.exit(1)
    })
}

export { seedGovernmentAllocations }
