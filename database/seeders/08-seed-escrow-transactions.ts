/**
 * ============================================================================
 * SEEDING SCRIPT 08: ESCROW TRANSACTIONS
 * ============================================================================
 *
 * Purpose: Seed escrow_transactions table with blockchain escrow records
 * Dependencies: 03-seed-allocations.ts (allocations must exist)
 *
 * Run: npx ts-node database/seeders/08-seed-escrow-transactions.ts
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

interface AllocationData {
  id: number
  school_id: number
  catering_id: number
  allocation_id: string
  amount: number
  status: string
  locked_at: string | null
  released_at: string | null
  metadata: {
    deliveryDate: string
    portions: number
    deliveryId: number
    notes: string
    schoolName?: string
    cateringName?: string
  }
}

interface EscrowTransactionInsert {
  allocation_id: number
  transaction_type: string
  amount: number
  currency: string
  blockchain_tx_hash: string
  blockchain_block_number: number
  blockchain_confirmed: boolean
  gas_used: number
  gas_price_gwei: number
  from_address: string
  to_address: string
  smart_contract_address: string
  status: string
  retry_count: number
  error_message: string | null
  metadata: {
    schoolId: number
    cateringId: number
    deliveryId: number
    deliveryDate: string
    portions: number
    pricePerPortion: number
    notes: string
  }
  executed_at: string
  confirmed_at: string | null
}

interface SeedingStats {
  totalTransactions: number
  successTransactions: number
  failedTransactions: number
  transactionsByType: Record<string, number>
  transactionsByStatus: Record<string, number>
  errors: Array<{ type: string; batch?: number; error?: string; count?: number }>
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Seeding Options
  BATCH_SIZE: 50,
  TARGET_TRANSACTIONS: 80, // Total escrow transactions to generate

  // Smart Contract Address (consistent for all)
  SMART_CONTRACT_ADDRESS: '0xA1B2C3D4E5F6789012345678901234567890ABCD',

  // Transaction Type Distribution
  TRANSACTION_TYPE_DISTRIBUTION: {
    LOCK: 0.50,      // 50% - 40 records
    RELEASE: 0.45,   // 45% - 36 records
    FAILED: 0.05     // 5% - 4 records
  },

  // Status Distribution per Type
  STATUS_DISTRIBUTION: {
    LOCK: { CONFIRMED: 0.95, PENDING: 0.05 },
    RELEASE: { CONFIRMED: 0.95, PENDING: 0.05 },
    FAILED: { FAILED: 1.0 }
  },

  // Gas Configuration
  GAS_RANGES: {
    LOCK: { min: 65000, max: 85000 },
    RELEASE: { min: 45000, max: 65000 },
    FAILED: { min: 21000, max: 30000 }
  },

  // Gas Price in Gwei (realistic Ethereum gas prices)
  GAS_PRICE_RANGE: { min: 15.5, max: 150.0 },

  // Block Number Range (recent Ethereum blocks)
  BLOCK_NUMBER_RANGE: { min: 15000000, max: 15500000 },

  // Error Messages for FAILED transactions
  ERROR_MESSAGES: [
    'Insufficient gas',
    'Transaction reverted',
    'Nonce too low',
    'Timeout waiting for confirmation',
    'Gas limit exceeded',
    'Smart contract execution failed'
  ]
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
// HASH & ADDRESS GENERATORS
// ============================================================================

function generateTxHash(): string {
  const randomHex = crypto.randomBytes(32).toString('hex')
  return `0x${randomHex}`
}

function generateEthAddress(): string {
  const randomHex = crypto.randomBytes(20).toString('hex')
  return `0x${randomHex}`
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  const value = Math.random() * (max - min) + min
  return parseFloat(value.toFixed(decimals))
}

function getRandomTransactionType(): string {
  const random = Math.random()
  let cumulative = 0

  for (const [type, probability] of Object.entries(CONFIG.TRANSACTION_TYPE_DISTRIBUTION)) {
    cumulative += probability
    if (random <= cumulative) {
      return type
    }
  }

  return 'LOCK' // fallback
}

function getStatusForType(transactionType: string): string {
  const distribution = CONFIG.STATUS_DISTRIBUTION[transactionType as keyof typeof CONFIG.STATUS_DISTRIBUTION]

  if (!distribution) return 'CONFIRMED'

  const random = Math.random()
  let cumulative = 0

  for (const [status, probability] of Object.entries(distribution)) {
    cumulative += probability
    if (random <= cumulative) {
      return status
    }
  }

  return 'CONFIRMED'
}

function getRandomErrorMessage(): string {
  return CONFIG.ERROR_MESSAGES[randomInt(0, CONFIG.ERROR_MESSAGES.length - 1)]
}

function addSeconds(date: Date, seconds: number): Date {
  const result = new Date(date)
  result.setSeconds(result.getSeconds() + seconds)
  return result
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchAllocations(supabase: any): Promise<AllocationData[]> {
  logger.log('Fetching allocations for escrow transactions...')

  const { data, error } = await supabase
    .from('allocations')
    .select('*')
    .in('status', ['LOCKED', 'RELEASED', 'RELEASING'])
    .order('id')

  if (error) {
    throw new Error(`Failed to fetch allocations: ${error.message}`)
  }

  if (!data || data.length === 0) {
    throw new Error('No allocations found. Please run 03-seed-allocations.ts first')
  }

  logger.success(`Found ${data.length} allocations for escrow transactions`)
  return data
}

// ============================================================================
// DATA GENERATION
// ============================================================================

async function generateEscrowTransactions(
  allocations: AllocationData[]
): Promise<EscrowTransactionInsert[]> {
  logger.log(`Generating ${CONFIG.TARGET_TRANSACTIONS} escrow transactions...`)

  const transactions: EscrowTransactionInsert[] = []
  const typeCounters = { LOCK: 0, RELEASE: 0, FAILED: 0 }
  const typeTargets = {
    LOCK: Math.floor(CONFIG.TARGET_TRANSACTIONS * CONFIG.TRANSACTION_TYPE_DISTRIBUTION.LOCK),
    RELEASE: Math.floor(CONFIG.TARGET_TRANSACTIONS * CONFIG.TRANSACTION_TYPE_DISTRIBUTION.RELEASE),
    FAILED: Math.floor(CONFIG.TARGET_TRANSACTIONS * CONFIG.TRANSACTION_TYPE_DISTRIBUTION.FAILED)
  }

  // Generate government/system wallet address (consistent from_address for all LOCK transactions)
  const systemWallet = generateEthAddress()

  let allocationIndex = 0

  for (let i = 0; i < CONFIG.TARGET_TRANSACTIONS; i++) {
    const allocation = allocations[allocationIndex % allocations.length]
    allocationIndex++

    // Determine transaction type based on remaining quota
    let transactionType: string
    if (typeCounters.LOCK < typeTargets.LOCK) {
      transactionType = 'LOCK'
    } else if (typeCounters.RELEASE < typeTargets.RELEASE) {
      transactionType = 'RELEASE'
    } else if (typeCounters.FAILED < typeTargets.FAILED) {
      transactionType = 'FAILED'
    } else {
      // Fallback to random
      transactionType = getRandomTransactionType()
    }

    typeCounters[transactionType as keyof typeof typeCounters]++

    // Determine status based on transaction type
    const status = getStatusForType(transactionType)

    // Generate blockchain transaction hash (unique)
    const blockchainTxHash = generateTxHash()

    // Generate block number
    const blockchainBlockNumber = randomInt(
      CONFIG.BLOCK_NUMBER_RANGE.min,
      CONFIG.BLOCK_NUMBER_RANGE.max
    )

    // Blockchain confirmed
    const blockchainConfirmed = status === 'CONFIRMED'

    // Gas used
    const gasRange = CONFIG.GAS_RANGES[transactionType as keyof typeof CONFIG.GAS_RANGES]
    const gasUsed = randomInt(gasRange.min, gasRange.max)

    // Gas price in Gwei
    const gasPriceGwei = randomFloat(
      CONFIG.GAS_PRICE_RANGE.min,
      CONFIG.GAS_PRICE_RANGE.max,
      2
    )

    // Addresses
    let fromAddress: string
    let toAddress: string

    if (transactionType === 'LOCK') {
      fromAddress = systemWallet // Government/system wallet
      toAddress = CONFIG.SMART_CONTRACT_ADDRESS // Escrow smart contract
    } else if (transactionType === 'RELEASE') {
      fromAddress = CONFIG.SMART_CONTRACT_ADDRESS // Escrow smart contract
      toAddress = generateEthAddress() // Catering wallet
    } else {
      // FAILED
      fromAddress = systemWallet
      toAddress = CONFIG.SMART_CONTRACT_ADDRESS
    }

    // Retry count
    let retryCount = 0
    if (status === 'FAILED') {
      retryCount = randomInt(3, 5)
    } else if (Math.random() < 0.04) {
      // 4% had retries but succeeded
      retryCount = randomInt(1, 2)
    }

    // Error message
    const errorMessage = status === 'FAILED' ? getRandomErrorMessage() : null

    // Calculate executed_at
    let executedAt: string
    if (transactionType === 'LOCK') {
      executedAt = allocation.locked_at || new Date().toISOString()
    } else if (transactionType === 'RELEASE') {
      executedAt = allocation.released_at || new Date().toISOString()
    } else {
      // FAILED - random time between locked_at and released_at
      const baseDate = allocation.locked_at || new Date().toISOString()
      const randomOffset = randomInt(1, 86400) // 1 second to 1 day
      executedAt = addSeconds(new Date(baseDate), randomOffset).toISOString()
    }

    // Calculate confirmed_at
    let confirmedAt: string | null = null
    if (status === 'CONFIRMED') {
      const confirmDelay = randomInt(15, 600) // 15 seconds to 10 minutes
      confirmedAt = addSeconds(new Date(executedAt), confirmDelay).toISOString()
    }

    // Metadata
    const pricePerPortion = Math.round(allocation.amount / allocation.metadata.portions)
    const metadata = {
      schoolId: allocation.school_id,
      cateringId: allocation.catering_id,
      deliveryId: allocation.metadata.deliveryId,
      deliveryDate: allocation.metadata.deliveryDate,
      portions: allocation.metadata.portions,
      pricePerPortion,
      notes: transactionType === 'LOCK'
        ? `Escrow lock untuk ${allocation.metadata.schoolName || 'sekolah'}`
        : transactionType === 'RELEASE'
        ? `Release pembayaran ke ${allocation.metadata.cateringName || 'catering'}`
        : `Failed transaction untuk allocation ${allocation.allocation_id.substring(0, 8)}`
    }

    transactions.push({
      allocation_id: allocation.id,
      transaction_type: transactionType,
      amount: allocation.amount,
      currency: 'IDR',
      blockchain_tx_hash: blockchainTxHash,
      blockchain_block_number: blockchainBlockNumber,
      blockchain_confirmed: blockchainConfirmed,
      gas_used: gasUsed,
      gas_price_gwei: gasPriceGwei,
      from_address: fromAddress,
      to_address: toAddress,
      smart_contract_address: CONFIG.SMART_CONTRACT_ADDRESS,
      status,
      retry_count: retryCount,
      error_message: errorMessage,
      metadata,
      executed_at: executedAt,
      confirmed_at: confirmedAt
    })

    if ((i + 1) % 20 === 0) {
      logger.progress(i + 1, CONFIG.TARGET_TRANSACTIONS, 'Generating escrow transactions')
    }
  }

  logger.success(`Generated ${transactions.length} escrow transactions`)
  logger.log(`  - LOCK: ${typeCounters.LOCK}`)
  logger.log(`  - RELEASE: ${typeCounters.RELEASE}`)
  logger.log(`  - FAILED: ${typeCounters.FAILED}`)

  return transactions
}

// ============================================================================
// SUPABASE OPERATIONS
// ============================================================================

async function insertTransactionsInBatches(
  supabase: any,
  transactions: EscrowTransactionInsert[],
  batchSize: number
): Promise<{ success: number; failed: number; errors: any[] }> {
  let success = 0
  let failed = 0
  const errors: any[] = []

  const totalBatches = Math.ceil(transactions.length / batchSize)
  logger.log(`Inserting ${transactions.length} transactions in ${totalBatches} batches...`)

  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize)
    const batchNumber = Math.floor(i / batchSize) + 1

    try {
      const { data, error } = await supabase
        .from('escrow_transactions')
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
          Math.min(i + batchSize, transactions.length),
          transactions.length,
          'Inserting escrow transactions'
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

async function seedEscrowTransactions() {
  logger.log('='.repeat(80))
  logger.log('SEEDING SCRIPT 08: ESCROW TRANSACTIONS')
  logger.log('='.repeat(80))

  const stats: SeedingStats = {
    totalTransactions: 0,
    successTransactions: 0,
    failedTransactions: 0,
    transactionsByType: {},
    transactionsByStatus: {},
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
    // Fetch allocations
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 1: FETCHING ALLOCATIONS')
    logger.log('='.repeat(80))

    const allocations = await fetchAllocations(supabase)

    // Generate escrow transactions
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 2: GENERATING ESCROW TRANSACTIONS')
    logger.log('='.repeat(80))

    const transactions = await generateEscrowTransactions(allocations)
    stats.totalTransactions = transactions.length

    // Count by type and status
    transactions.forEach((transaction: EscrowTransactionInsert) => {
      stats.transactionsByType[transaction.transaction_type] =
        (stats.transactionsByType[transaction.transaction_type] || 0) + 1
      stats.transactionsByStatus[transaction.status] =
        (stats.transactionsByStatus[transaction.status] || 0) + 1
    })

    // Insert transactions
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 3: INSERTING ESCROW TRANSACTIONS TO DATABASE')
    logger.log('='.repeat(80))

    const result = await insertTransactionsInBatches(supabase, transactions, CONFIG.BATCH_SIZE)
    stats.successTransactions = result.success
    stats.failedTransactions = result.failed
    stats.errors = result.errors

    // Print summary
    logger.log('\n' + '='.repeat(80))
    logger.log('SEEDING SUMMARY')
    logger.log('='.repeat(80))

    console.log(`
📊 ESCROW TRANSACTIONS:
   Total: ${stats.totalTransactions}
   ✅ Success: ${stats.successTransactions}
   ❌ Failed: ${stats.failedTransactions}
   Success Rate: ${((stats.successTransactions / stats.totalTransactions) * 100).toFixed(1)}%

📊 BY TRANSACTION TYPE:`)

    Object.entries(stats.transactionsByType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        const percentage = ((count / stats.totalTransactions) * 100).toFixed(1)
        console.log(`   ${type.padEnd(15)}: ${count.toString().padStart(5)} (${percentage}%)`)
      })

    console.log(`\n📊 BY STATUS:`)
    Object.entries(stats.transactionsByStatus)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        const percentage = ((count / stats.totalTransactions) * 100).toFixed(1)
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
    const statsPath = path.join(__dirname, '../seeding-logs/08-escrow-transactions-stats.json')
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
  seedEscrowTransactions()
    .then(() => {
      logger.success('Script execution completed')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('Script execution failed', error)
      process.exit(1)
    })
}

export { seedEscrowTransactions }
