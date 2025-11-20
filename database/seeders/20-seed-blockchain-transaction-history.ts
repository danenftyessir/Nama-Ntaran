/**
 * ============================================================================
 * SEEDING SCRIPT 20: BLOCKCHAIN TRANSACTION HISTORY (EXTRA)
 * ============================================================================
 *
 * Purpose: Seed blockchain_transaction_history with comprehensive transaction analytics
 * Dependencies: 01-seed-users.ts (wallet addresses from schools and caterings)
 *
 * Run: npx ts-node database/seeders/20-seed-blockchain-transaction-history.ts
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

interface SchoolData {
  id: number
  name: string
  wallet_address: string
}

interface CateringData {
  id: number
  name: string
  wallet_address: string
}

interface BlockchainTransactionInsert {
  tx_hash: string
  from_address: string
  to_address: string
  value_wei: string
  value_idr: number
  gas_used: number
  gas_price_gwei: number
  total_fee_wei: string
  total_fee_idr: number
  block_number: number
  block_timestamp: string
  tx_status: string
  network: string
  nonce: number
  transaction_index: number
  contract_address: string | null
  logs_count: number
  metadata: {
    type: string
    entity_type?: string
    entity_id?: number
    entity_name?: string
    purpose?: string
    relatedTxHash?: string
  }
}

interface SeedingStats {
  totalTransactions: number
  successCount: number
  failedCount: number
  byStatus: Record<string, number>
  byNetwork: Record<string, number>
  byType: Record<string, number>
  totalValueIDR: number
  totalFeesIDR: number
  errors: Array<{ batch?: number; error: string; count?: number }>
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Seeding Options
  BATCH_SIZE: 200,
  TARGET_TRANSACTIONS: 5000, // Generate 5000+ transactions for comprehensive analytics

  // Networks (Polygon for cost-efficiency)
  NETWORKS: ['polygon-mainnet', 'arbitrum-one', 'optimism-mainnet'],
  NETWORK_DISTRIBUTION: {
    'polygon-mainnet': 0.70,    // 70% Polygon (cheapest)
    'arbitrum-one': 0.20,       // 20% Arbitrum
    'optimism-mainnet': 0.10    // 10% Optimism
  },

  // Transaction Types
  TX_TYPES: [
    'ESCROW_LOCK',
    'ESCROW_RELEASE',
    'DIRECT_PAYMENT',
    'REFUND',
    'WALLET_FUNDING',
    'GAS_FEE_PAYMENT',
    'CONTRACT_DEPLOYMENT'
  ],
  TX_TYPE_DISTRIBUTION: {
    ESCROW_LOCK: 0.30,
    ESCROW_RELEASE: 0.28,
    DIRECT_PAYMENT: 0.20,
    REFUND: 0.08,
    WALLET_FUNDING: 0.10,
    GAS_FEE_PAYMENT: 0.03,
    CONTRACT_DEPLOYMENT: 0.01
  },

  // Transaction Status
  TX_STATUS_DISTRIBUTION: {
    success: 0.92,    // 92% success
    failed: 0.06,     // 6% failed
    pending: 0.02     // 2% pending
  },

  // Smart Contracts
  ESCROW_CONTRACT: '0xA1B2C3D4E5F6789012345678901234567890ABCD',
  PAYMENT_CONTRACT: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
  GOVERNMENT_WALLET: '0x9876543210ABCDEF9876543210ABCDEF98765432',

  // Gas Configuration (realistic for each network)
  GAS_CONFIG: {
    'polygon-mainnet': {
      gasUsed: { min: 21000, max: 250000 },
      gasPriceGwei: { min: 30, max: 200 },        // MATIC gas prices
      ethToIdr: 11000000                          // ~1 MATIC = 11,000 IDR
    },
    'arbitrum-one': {
      gasUsed: { min: 21000, max: 200000 },
      gasPriceGwei: { min: 0.1, max: 2 },         // Very cheap
      ethToIdr: 32000000                          // ~1 ETH = 32M IDR
    },
    'optimism-mainnet': {
      gasUsed: { min: 21000, max: 180000 },
      gasPriceGwei: { min: 0.001, max: 0.1 },     // Extremely cheap
      ethToIdr: 32000000
    }
  },

  // Payment Value Ranges (in IDR)
  VALUE_RANGES: {
    ESCROW_LOCK: { min: 5000000, max: 50000000 },       // 5M - 50M IDR
    ESCROW_RELEASE: { min: 5000000, max: 50000000 },
    DIRECT_PAYMENT: { min: 1000000, max: 20000000 },    // 1M - 20M IDR
    REFUND: { min: 500000, max: 10000000 },
    WALLET_FUNDING: { min: 50000000, max: 500000000 },  // 50M - 500M IDR
    GAS_FEE_PAYMENT: { min: 50000, max: 500000 },       // 50K - 500K IDR
    CONTRACT_DEPLOYMENT: { min: 0, max: 0 }             // No value transfer
  },

  // Block Number Ranges (recent blocks)
  BLOCK_RANGES: {
    'polygon-mainnet': { min: 50000000, max: 51000000 },
    'arbitrum-one': { min: 150000000, max: 151000000 },
    'optimism-mainnet': { min: 110000000, max: 111000000 }
  },

  // Time Range (last 6 months)
  TIME_RANGE: {
    startDate: new Date('2024-06-01'),
    endDate: new Date('2024-12-31')
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
    process.stdout.write(`\r${bar} ${percentage}% - ${label} (${current}/${total})`)
    if (current === total) console.log()
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

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

function weightedRandom(distribution: Record<string, number>): string {
  const random = Math.random()
  let cumulative = 0

  for (const [key, probability] of Object.entries(distribution)) {
    cumulative += probability
    if (random <= cumulative) {
      return key
    }
  }

  return Object.keys(distribution)[0]
}

function generateTxHash(): string {
  return '0x' + crypto.randomBytes(32).toString('hex')
}

function generateDeterministicAddress(type: string, id: number): string {
  // Generate deterministic address based on type and id
  const hash = crypto.createHash('sha256').update(`${type}-${id}`).digest('hex')
  return '0x' + hash.slice(0, 40)
}

function generateRandomTimestamp(start: Date, end: Date): Date {
  const startTime = start.getTime()
  const endTime = end.getTime()
  const randomTime = startTime + Math.random() * (endTime - startTime)
  return new Date(randomTime)
}

function weiToEth(wei: bigint): number {
  return Number(wei) / 1e18
}

function idrToWei(idr: number, idrToEthRate: number): string {
  const eth = idr / idrToEthRate
  const wei = BigInt(Math.floor(eth * 1e18))
  return wei.toString()
}

function calculateGasFeeWei(gasUsed: number, gasPriceGwei: number): string {
  const gasPriceWei = BigInt(Math.floor(gasPriceGwei * 1e9))
  const totalFeeWei = BigInt(gasUsed) * gasPriceWei
  return totalFeeWei.toString()
}

function calculateGasFeeIDR(gasUsed: number, gasPriceGwei: number, ethToIdr: number): number {
  const gasPriceEth = gasPriceGwei / 1e9
  const totalFeeEth = gasUsed * gasPriceEth
  return Math.round(totalFeeEth * ethToIdr)
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchSchools(supabase: any): Promise<SchoolData[]> {
  logger.log('Fetching schools...')

  const { data, error } = await supabase
    .from('schools')
    .select('id, name')
    .order('id')
    .limit(100) // Limit for performance

  if (error) {
    throw new Error(`Failed to fetch schools: ${error.message}`)
  }

  // Generate deterministic wallet addresses for schools
  const schoolsWithWallets = data.map((school: any) => ({
    id: school.id,
    name: school.name,
    wallet_address: generateDeterministicAddress('school', school.id)
  }))

  logger.success(`Found ${schoolsWithWallets.length} schools (generated wallet addresses)`)
  return schoolsWithWallets || []
}

async function fetchCaterings(supabase: any): Promise<CateringData[]> {
  logger.log('Fetching caterings...')

  const { data, error } = await supabase
    .from('caterings')
    .select('id, name, wallet_address')
    .not('wallet_address', 'is', null)
    .order('id')

  if (error) {
    throw new Error(`Failed to fetch caterings: ${error.message}`)
  }

  logger.success(`Found ${data?.length || 0} caterings with wallet addresses`)
  return data || []
}

// ============================================================================
// DATA GENERATION
// ============================================================================

function generateBlockchainTransactions(
  schools: SchoolData[],
  caterings: CateringData[],
  targetCount: number
): BlockchainTransactionInsert[] {
  logger.log(`Generating ${targetCount} blockchain transactions...`)

  const transactions: BlockchainTransactionInsert[] = []
  const allWallets = [
    ...schools.map(s => ({ address: s.wallet_address, type: 'school', id: s.id, name: s.name })),
    ...caterings.map(c => ({ address: c.wallet_address, type: 'catering', id: c.id, name: c.name })),
    { address: CONFIG.GOVERNMENT_WALLET, type: 'government', id: 0, name: 'Government Treasury' }
  ]

  const usedTxHashes = new Set<string>()
  let nonce = 0

  for (let i = 0; i < targetCount; i++) {
    const network = weightedRandom(CONFIG.NETWORK_DISTRIBUTION)
    const txType = weightedRandom(CONFIG.TX_TYPE_DISTRIBUTION)
    const txStatus = weightedRandom(CONFIG.TX_STATUS_DISTRIBUTION)

    // Generate unique tx hash
    let txHash: string
    do {
      txHash = generateTxHash()
    } while (usedTxHashes.has(txHash))
    usedTxHashes.add(txHash)

    // Select from/to addresses based on tx type
    let fromWallet, toWallet
    let contractAddress: string | null = null

    switch (txType) {
      case 'ESCROW_LOCK':
        fromWallet = CONFIG.GOVERNMENT_WALLET
        toWallet = CONFIG.ESCROW_CONTRACT
        contractAddress = CONFIG.ESCROW_CONTRACT
        break
      case 'ESCROW_RELEASE':
        fromWallet = CONFIG.ESCROW_CONTRACT
        toWallet = caterings[randomInt(0, caterings.length - 1)].wallet_address
        contractAddress = CONFIG.ESCROW_CONTRACT
        break
      case 'DIRECT_PAYMENT':
        fromWallet = schools[randomInt(0, schools.length - 1)].wallet_address
        toWallet = caterings[randomInt(0, caterings.length - 1)].wallet_address
        contractAddress = CONFIG.PAYMENT_CONTRACT
        break
      case 'REFUND':
        fromWallet = caterings[randomInt(0, caterings.length - 1)].wallet_address
        toWallet = schools[randomInt(0, schools.length - 1)].wallet_address
        break
      case 'WALLET_FUNDING':
        fromWallet = CONFIG.GOVERNMENT_WALLET
        toWallet = allWallets[randomInt(0, allWallets.length - 1)].address
        break
      case 'GAS_FEE_PAYMENT':
        fromWallet = allWallets[randomInt(0, allWallets.length - 1)].address
        toWallet = '0x0000000000000000000000000000000000000000' // Burn address for gas
        break
      case 'CONTRACT_DEPLOYMENT':
        fromWallet = CONFIG.GOVERNMENT_WALLET
        toWallet = '0x0000000000000000000000000000000000000000'
        contractAddress = generateTxHash().slice(0, 42) // New contract address
        break
      default:
        fromWallet = allWallets[randomInt(0, allWallets.length - 1)].address
        toWallet = allWallets[randomInt(0, allWallets.length - 1)].address
    }

    // Get entity info for metadata
    const fromEntity = allWallets.find(w => w.address === fromWallet)
    const toEntity = allWallets.find(w => w.address === toWallet)

    // Gas configuration for network
    const gasConfig = CONFIG.GAS_CONFIG[network as keyof typeof CONFIG.GAS_CONFIG]
    const gasUsed = randomInt(gasConfig.gasUsed.min, gasConfig.gasUsed.max)
    const gasPriceGwei = randomFloat(gasConfig.gasPriceGwei.min, gasConfig.gasPriceGwei.max, 2)

    // Value calculation
    const valueRange = CONFIG.VALUE_RANGES[txType as keyof typeof CONFIG.VALUE_RANGES]
    const valueIDR = txStatus === 'failed' ? 0 : randomInt(valueRange.min, valueRange.max)
    const valueWei = idrToWei(valueIDR, gasConfig.ethToIdr)

    // Gas fee calculation
    const totalFeeWei = calculateGasFeeWei(gasUsed, gasPriceGwei)
    const totalFeeIDR = calculateGasFeeIDR(gasUsed, gasPriceGwei, gasConfig.ethToIdr)

    // Block details
    const blockRange = CONFIG.BLOCK_RANGES[network as keyof typeof CONFIG.BLOCK_RANGES]
    const blockNumber = randomInt(blockRange.min, blockRange.max)
    const blockTimestamp = generateRandomTimestamp(
      CONFIG.TIME_RANGE.startDate,
      CONFIG.TIME_RANGE.endDate
    )

    // Logs count (events emitted)
    const logsCount = txStatus === 'success' && contractAddress ? randomInt(1, 8) : 0

    transactions.push({
      tx_hash: txHash,
      from_address: fromWallet,
      to_address: toWallet,
      value_wei: valueWei,
      value_idr: valueIDR,
      gas_used: gasUsed,
      gas_price_gwei: gasPriceGwei,
      total_fee_wei: totalFeeWei,
      total_fee_idr: totalFeeIDR,
      block_number: blockNumber,
      block_timestamp: blockTimestamp.toISOString(),
      tx_status: txStatus,
      network: network,
      nonce: nonce++,
      transaction_index: randomInt(0, 200),
      contract_address: contractAddress,
      logs_count: logsCount,
      metadata: {
        type: txType,
        entity_type: fromEntity?.type || 'unknown',
        entity_id: fromEntity?.id,
        entity_name: fromEntity?.name,
        purpose: `${txType} transaction on ${network}`,
        relatedTxHash: i > 0 && Math.random() > 0.7 ? transactions[i - 1].tx_hash : undefined
      }
    })

    if ((i + 1) % 500 === 0) {
      logger.progress(i + 1, targetCount, 'Generating transactions')
    }
  }

  logger.progress(targetCount, targetCount, 'Generating transactions')
  logger.success(`Generated ${transactions.length} blockchain transactions`)

  return transactions
}

// ============================================================================
// SUPABASE OPERATIONS
// ============================================================================

async function insertTransactionsInBatches(
  supabase: any,
  transactions: BlockchainTransactionInsert[],
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
        .from('blockchain_transaction_history')
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
          'Inserting transactions'
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
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  console.log()
  return { success, failed, errors }
}

// ============================================================================
// MAIN SEEDING FUNCTION
// ============================================================================

async function seedBlockchainTransactionHistory() {
  logger.log('='.repeat(80))
  logger.log('SEEDING SCRIPT 20: BLOCKCHAIN TRANSACTION HISTORY (EXTRA)')
  logger.log('='.repeat(80))

  const stats: SeedingStats = {
    totalTransactions: 0,
    successCount: 0,
    failedCount: 0,
    byStatus: {},
    byNetwork: {},
    byType: {},
    totalValueIDR: 0,
    totalFeesIDR: 0,
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
    // Step 1: Fetch schools and caterings
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 1: FETCHING WALLET ADDRESSES')
    logger.log('='.repeat(80))

    const [schools, caterings] = await Promise.all([
      fetchSchools(supabase),
      fetchCaterings(supabase)
    ])

    if (schools.length === 0 || caterings.length === 0) {
      logger.error('No schools or caterings found. Please run user seeders first.')
      process.exit(1)
    }

    // Step 2: Generate transactions
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 2: GENERATING BLOCKCHAIN TRANSACTIONS')
    logger.log('='.repeat(80))

    const transactions = generateBlockchainTransactions(
      schools,
      caterings,
      CONFIG.TARGET_TRANSACTIONS
    )
    stats.totalTransactions = transactions.length

    // Calculate statistics
    transactions.forEach((tx) => {
      stats.byStatus[tx.tx_status] = (stats.byStatus[tx.tx_status] || 0) + 1
      stats.byNetwork[tx.network] = (stats.byNetwork[tx.network] || 0) + 1
      stats.byType[tx.metadata.type] = (stats.byType[tx.metadata.type] || 0) + 1
      if (tx.tx_status === 'success') {
        stats.totalValueIDR += tx.value_idr
        stats.totalFeesIDR += tx.total_fee_idr
      }
    })

    // Step 3: Insert to database
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 3: INSERTING TRANSACTIONS TO DATABASE')
    logger.log('='.repeat(80))

    const result = await insertTransactionsInBatches(supabase, transactions, CONFIG.BATCH_SIZE)
    stats.successCount = result.success
    stats.failedCount = result.failed
    stats.errors = result.errors

    // Print summary
    logger.log('\n' + '='.repeat(80))
    logger.log('SEEDING SUMMARY')
    logger.log('='.repeat(80))

    console.log(`
📊 BLOCKCHAIN TRANSACTION HISTORY:
   Total Transactions Generated: ${stats.totalTransactions}
   ✅ Success: ${stats.successCount}
   ❌ Failed: ${stats.failedCount}
   Success Rate: ${stats.totalTransactions > 0 ? ((stats.successCount / stats.totalTransactions) * 100).toFixed(1) : 0}%

💰 FINANCIAL SUMMARY:
   Total Value (IDR): Rp ${stats.totalValueIDR.toLocaleString('id-ID')}
   Total Gas Fees (IDR): Rp ${stats.totalFeesIDR.toLocaleString('id-ID')}
   Average TX Value: Rp ${stats.successCount > 0 ? Math.round(stats.totalValueIDR / stats.successCount).toLocaleString('id-ID') : 0}

📊 BY TRANSACTION STATUS:`)

    Object.entries(stats.byStatus)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        const percentage = ((count / stats.totalTransactions) * 100).toFixed(1)
        console.log(`   ${status.padEnd(15)}: ${count.toString().padStart(5)} (${percentage}%)`)
      })

    console.log(`\n📊 BY NETWORK:`)
    Object.entries(stats.byNetwork)
      .sort((a, b) => b[1] - a[1])
      .forEach(([network, count]) => {
        const percentage = ((count / stats.totalTransactions) * 100).toFixed(1)
        console.log(`   ${network.padEnd(20)}: ${count.toString().padStart(5)} (${percentage}%)`)
      })

    console.log(`\n📊 BY TRANSACTION TYPE:`)
    Object.entries(stats.byType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        const percentage = ((count / stats.totalTransactions) * 100).toFixed(1)
        console.log(`   ${type.padEnd(25)}: ${count.toString().padStart(5)} (${percentage}%)`)
      })

    if (stats.errors.length > 0) {
      logger.log('\n❌ ERRORS ENCOUNTERED:')
      stats.errors.slice(0, 5).forEach((err: any, index: number) => {
        console.log(`${index + 1}. Batch ${err.batch}: ${err.error}`)
      })
      if (stats.errors.length > 5) {
        logger.log(`... and ${stats.errors.length - 5} more errors`)
      }
    }

    logger.log('\n' + '='.repeat(80))
    logger.success('SEEDING COMPLETED!')
    logger.log('='.repeat(80))

    // Save stats
    const logsDir = path.join(__dirname, '../seeding-logs')
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }
    const statsPath = path.join(logsDir, '20-blockchain-transaction-history-stats.json')
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
  seedBlockchainTransactionHistory()
    .then(() => {
      logger.success('Script execution completed')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('Script execution failed', error)
      process.exit(1)
    })
}

export { seedBlockchainTransactionHistory }
