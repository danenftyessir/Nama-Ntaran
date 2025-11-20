/**
 * ============================================================================
 * SEEDING SCRIPT 22: WALLET BALANCES SNAPSHOT (EXTRA)
 * ============================================================================
 *
 * Purpose: Seed wallet_balances_snapshot with historical balance tracking
 * Dependencies:
 *   - 01-seed-users.ts (wallet addresses)
 *   - 20-seed-blockchain-transaction-history.ts (for balance changes)
 *
 * Run: npx ts-node database/seeders/22-seed-wallet-balances-snapshot.ts
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

interface BlockchainTransaction {
  id: number
  tx_hash: string
  from_address: string
  to_address: string
  value_wei: string
  value_idr: number
  block_number: number
  block_timestamp: string
  network: string
  tx_status: string
}

interface WalletBalanceSnapshotInsert {
  wallet_address: string
  wallet_type: string
  entity_type: string | null
  entity_id: number | null
  balance_wei: string
  balance_eth: number
  balance_idr: number
  token_balances: any
  network: string
  snapshot_type: string
  block_number: number
  block_timestamp: string
  previous_balance_wei: string | null
  balance_change_wei: string | null
  metadata: {
    entity_name?: string
    snapshot_reason?: string
    transaction_count?: number
    last_tx_hash?: string
  }
}

interface WalletBalance {
  address: string
  type: string
  entityType: string | null
  entityId: number | null
  entityName: string
  balance: bigint
  previousBalance: bigint | null
  txCount: number
  lastTxHash: string | null
}

interface SeedingStats {
  totalSnapshots: number
  successCount: number
  failedCount: number
  byWalletType: Record<string, number>
  bySnapshotType: Record<string, number>
  byNetwork: Record<string, number>
  totalBalanceIDR: number
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
  SNAPSHOTS_PER_WALLET_PER_NETWORK: 50, // 50 historical snapshots per wallet per network

  // Networks
  NETWORKS: ['polygon-mainnet', 'arbitrum-one', 'optimism-mainnet'],

  // Snapshot Types
  SNAPSHOT_TYPES: {
    scheduled: 0.60,        // 60% scheduled (daily/hourly)
    on_transaction: 0.35,   // 35% on transaction
    manual: 0.05            // 5% manual admin checks
  },

  // Initial Balance Ranges (in IDR)
  INITIAL_BALANCES: {
    government: { min: 10000000000, max: 100000000000 },  // 10B - 100B IDR
    school: { min: 100000000, max: 5000000000 },          // 100M - 5B IDR
    catering: { min: 50000000, max: 2000000000 },         // 50M - 2B IDR
    escrow_contract: { min: 5000000000, max: 50000000000 } // 5B - 50B IDR
  },

  // ETH to IDR conversion rates
  ETH_TO_IDR: {
    'polygon-mainnet': 11000000,    // 1 MATIC = 11M IDR
    'arbitrum-one': 32000000,       // 1 ETH = 32M IDR
    'optimism-mainnet': 32000000    // 1 ETH = 32M IDR
  },

  // Government and Contract Addresses
  GOVERNMENT_WALLET: '0x9876543210ABCDEF9876543210ABCDEF98765432',
  ESCROW_CONTRACT: '0xA1B2C3D4E5F6789012345678901234567890ABCD',
  PAYMENT_CONTRACT: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',

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

function randomFloat(min: number, max: number, decimals: number = 8): number {
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

function idrToWei(idr: number, ethToIdr: number): string {
  const eth = idr / ethToIdr
  const wei = BigInt(Math.floor(eth * 1e18))
  return wei.toString()
}

function weiToEth(wei: string): number {
  return Number(BigInt(wei)) / 1e18
}

function weiToIdr(wei: string, ethToIdr: number): number {
  const eth = weiToEth(wei)
  return Math.round(eth * ethToIdr)
}

function generateRandomTimestamp(start: Date, end: Date): Date {
  const startTime = start.getTime()
  const endTime = end.getTime()
  const randomTime = startTime + Math.random() * (endTime - startTime)
  return new Date(randomTime)
}

function generateDeterministicAddress(type: string, id: number): string {
  // Generate deterministic address based on type and id
  const hash = crypto.createHash('sha256').update(`${type}-${id}`).digest('hex')
  return '0x' + hash.slice(0, 40)
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

  logger.success(`Found ${data?.length || 0} caterings`)
  return data || []
}

async function fetchTransactions(supabase: any): Promise<BlockchainTransaction[]> {
  logger.log('Fetching blockchain transactions...')

  const { data, error } = await supabase
    .from('blockchain_transaction_history')
    .select('*')
    .eq('tx_status', 'success')
    .order('block_timestamp', { ascending: true })
    .limit(1000) // Sample 1000 transactions for balance updates

  if (error) {
    throw new Error(`Failed to fetch transactions: ${error.message}`)
  }

  logger.success(`Found ${data?.length || 0} transactions`)
  return data || []
}

// ============================================================================
// DATA GENERATION
// ============================================================================

function initializeWallets(
  schools: SchoolData[],
  caterings: CateringData[]
): Map<string, WalletBalance> {
  const wallets = new Map<string, WalletBalance>()

  // Government wallet
  wallets.set(CONFIG.GOVERNMENT_WALLET, {
    address: CONFIG.GOVERNMENT_WALLET,
    type: 'government',
    entityType: null,
    entityId: null,
    entityName: 'Government Treasury',
    balance: BigInt(0),
    previousBalance: null,
    txCount: 0,
    lastTxHash: null
  })

  // Escrow contract
  wallets.set(CONFIG.ESCROW_CONTRACT, {
    address: CONFIG.ESCROW_CONTRACT,
    type: 'escrow_contract',
    entityType: null,
    entityId: null,
    entityName: 'Escrow Smart Contract',
    balance: BigInt(0),
    previousBalance: null,
    txCount: 0,
    lastTxHash: null
  })

  // School wallets
  for (const school of schools) {
    wallets.set(school.wallet_address, {
      address: school.wallet_address,
      type: 'school',
      entityType: 'school',
      entityId: school.id,
      entityName: school.name,
      balance: BigInt(0),
      previousBalance: null,
      txCount: 0,
      lastTxHash: null
    })
  }

  // Catering wallets
  for (const catering of caterings) {
    wallets.set(catering.wallet_address, {
      address: catering.wallet_address,
      type: 'catering',
      entityType: 'catering',
      entityId: catering.id,
      entityName: catering.name,
      balance: BigInt(0),
      previousBalance: null,
      txCount: 0,
      lastTxHash: null
    })
  }

  return wallets
}

function generateSnapshotsForNetwork(
  wallets: Map<string, WalletBalance>,
  transactions: BlockchainTransaction[],
  network: string
): WalletBalanceSnapshotInsert[] {
  const snapshots: WalletBalanceSnapshotInsert[] = []
  const ethToIdr = CONFIG.ETH_TO_IDR[network as keyof typeof CONFIG.ETH_TO_IDR]

  // Filter transactions for this network
  const networkTxs = transactions.filter(tx => tx.network === network)

  // Reset wallet balances for this network
  const networkWallets = new Map<string, WalletBalance>()
  wallets.forEach((wallet, address) => {
    const balanceRange = CONFIG.INITIAL_BALANCES[wallet.type as keyof typeof CONFIG.INITIAL_BALANCES]
    const initialBalanceIDR = randomInt(balanceRange.min, balanceRange.max)
    const initialBalanceWei = idrToWei(initialBalanceIDR, ethToIdr)

    networkWallets.set(address, {
      ...wallet,
      balance: BigInt(initialBalanceWei),
      previousBalance: null,
      txCount: 0,
      lastTxHash: null
    })
  })

  // Create initial snapshots for all wallets
  const initialTimestamp = CONFIG.TIME_RANGE.startDate
  const initialBlockNumber = randomInt(50000000, 50100000)

  networkWallets.forEach((wallet) => {
    snapshots.push({
      wallet_address: wallet.address,
      wallet_type: wallet.type,
      entity_type: wallet.entityType,
      entity_id: wallet.entityId,
      balance_wei: wallet.balance.toString(),
      balance_eth: weiToEth(wallet.balance.toString()),
      balance_idr: weiToIdr(wallet.balance.toString(), ethToIdr),
      token_balances: null,
      network: network,
      snapshot_type: 'scheduled',
      block_number: initialBlockNumber,
      block_timestamp: initialTimestamp.toISOString(),
      previous_balance_wei: null,
      balance_change_wei: null,
      metadata: {
        entity_name: wallet.entityName,
        snapshot_reason: 'Initial balance snapshot',
        transaction_count: 0
      }
    })
  })

  // Process transactions and create snapshots
  networkTxs.forEach((tx, index) => {
    const fromWallet = networkWallets.get(tx.from_address)
    const toWallet = networkWallets.get(tx.to_address)

    // Update balances
    if (fromWallet) {
      const previousBalance = fromWallet.balance
      const changeWei = BigInt(tx.value_wei)
      fromWallet.previousBalance = previousBalance
      fromWallet.balance = fromWallet.balance - changeWei
      fromWallet.txCount++
      fromWallet.lastTxHash = tx.tx_hash

      // Create snapshot for sender
      if (Math.random() > 0.6) { // 40% of transactions create snapshots
        snapshots.push({
          wallet_address: fromWallet.address,
          wallet_type: fromWallet.type,
          entity_type: fromWallet.entityType,
          entity_id: fromWallet.entityId,
          balance_wei: fromWallet.balance.toString(),
          balance_eth: weiToEth(fromWallet.balance.toString()),
          balance_idr: weiToIdr(fromWallet.balance.toString(), ethToIdr),
          token_balances: null,
          network: network,
          snapshot_type: weightedRandom(CONFIG.SNAPSHOT_TYPES),
          block_number: tx.block_number,
          block_timestamp: tx.block_timestamp,
          previous_balance_wei: previousBalance.toString(),
          balance_change_wei: '-' + changeWei.toString(),
          metadata: {
            entity_name: fromWallet.entityName,
            snapshot_reason: 'Balance decreased after transaction',
            transaction_count: fromWallet.txCount,
            last_tx_hash: tx.tx_hash
          }
        })
      }
    }

    if (toWallet) {
      const previousBalance = toWallet.balance
      const changeWei = BigInt(tx.value_wei)
      toWallet.previousBalance = previousBalance
      toWallet.balance = toWallet.balance + changeWei
      toWallet.txCount++
      toWallet.lastTxHash = tx.tx_hash

      // Create snapshot for receiver
      if (Math.random() > 0.6) {
        snapshots.push({
          wallet_address: toWallet.address,
          wallet_type: toWallet.type,
          entity_type: toWallet.entityType,
          entity_id: toWallet.entityId,
          balance_wei: toWallet.balance.toString(),
          balance_eth: weiToEth(toWallet.balance.toString()),
          balance_idr: weiToIdr(toWallet.balance.toString(), ethToIdr),
          token_balances: null,
          network: network,
          snapshot_type: weightedRandom(CONFIG.SNAPSHOT_TYPES),
          block_number: tx.block_number,
          block_timestamp: tx.block_timestamp,
          previous_balance_wei: previousBalance.toString(),
          balance_change_wei: changeWei.toString(),
          metadata: {
            entity_name: toWallet.entityName,
            snapshot_reason: 'Balance increased after transaction',
            transaction_count: toWallet.txCount,
            last_tx_hash: tx.tx_hash
          }
        })
      }
    }

    if ((index + 1) % 100 === 0) {
      logger.progress(index + 1, networkTxs.length, `Processing ${network} transactions`)
    }
  })

  logger.progress(networkTxs.length, networkTxs.length, `Processing ${network} transactions`)

  // Create additional scheduled snapshots (simulate daily snapshots)
  const daysInRange = Math.floor((CONFIG.TIME_RANGE.endDate.getTime() - CONFIG.TIME_RANGE.startDate.getTime()) / (1000 * 60 * 60 * 24))
  const snapshotInterval = Math.max(1, Math.floor(daysInRange / 30)) // ~30 additional snapshots

  for (let day = 1; day <= 30; day++) {
    const snapshotDate = new Date(CONFIG.TIME_RANGE.startDate)
    snapshotDate.setDate(snapshotDate.getDate() + (day * snapshotInterval))

    networkWallets.forEach((wallet) => {
      // Random balance fluctuation
      const fluctuation = Math.random() > 0.5 ? 1 : -1
      const changeAmount = BigInt(Math.floor(Math.random() * 1e17)) // Small random change
      const previousBalance = wallet.balance
      wallet.balance = wallet.balance + (changeAmount * BigInt(fluctuation))

      if (wallet.balance < 0) wallet.balance = BigInt(0)

      snapshots.push({
        wallet_address: wallet.address,
        wallet_type: wallet.type,
        entity_type: wallet.entityType,
        entity_id: wallet.entityId,
        balance_wei: wallet.balance.toString(),
        balance_eth: weiToEth(wallet.balance.toString()),
        balance_idr: weiToIdr(wallet.balance.toString(), ethToIdr),
        token_balances: null,
        network: network,
        snapshot_type: 'scheduled',
        block_number: randomInt(50000000, 51000000),
        block_timestamp: snapshotDate.toISOString(),
        previous_balance_wei: previousBalance.toString(),
        balance_change_wei: (changeAmount * BigInt(fluctuation)).toString(),
        metadata: {
          entity_name: wallet.entityName,
          snapshot_reason: 'Scheduled daily snapshot',
          transaction_count: wallet.txCount
        }
      })
    })
  }

  return snapshots
}

function generateAllSnapshots(
  wallets: Map<string, WalletBalance>,
  transactions: BlockchainTransaction[]
): WalletBalanceSnapshotInsert[] {
  logger.log('Generating wallet balance snapshots...')

  const allSnapshots: WalletBalanceSnapshotInsert[] = []

  for (const network of CONFIG.NETWORKS) {
    logger.log(`\nGenerating snapshots for ${network}...`)
    const networkSnapshots = generateSnapshotsForNetwork(wallets, transactions, network)
    allSnapshots.push(...networkSnapshots)
    logger.success(`Generated ${networkSnapshots.length} snapshots for ${network}`)
  }

  logger.success(`\nTotal snapshots generated: ${allSnapshots.length}`)
  return allSnapshots
}

// ============================================================================
// SUPABASE OPERATIONS
// ============================================================================

async function insertSnapshotsInBatches(
  supabase: any,
  snapshots: WalletBalanceSnapshotInsert[],
  batchSize: number
): Promise<{ success: number; failed: number; errors: any[] }> {
  let success = 0
  let failed = 0
  const errors: any[] = []

  const totalBatches = Math.ceil(snapshots.length / batchSize)
  logger.log(`\nInserting ${snapshots.length} snapshots in ${totalBatches} batches...`)

  for (let i = 0; i < snapshots.length; i += batchSize) {
    const batch = snapshots.slice(i, i + batchSize)
    const batchNumber = Math.floor(i / batchSize) + 1

    try {
      const { data, error } = await supabase
        .from('wallet_balances_snapshot')
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
          Math.min(i + batchSize, snapshots.length),
          snapshots.length,
          'Inserting snapshots'
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

async function seedWalletBalancesSnapshot() {
  logger.log('='.repeat(80))
  logger.log('SEEDING SCRIPT 22: WALLET BALANCES SNAPSHOT (EXTRA)')
  logger.log('='.repeat(80))

  const stats: SeedingStats = {
    totalSnapshots: 0,
    successCount: 0,
    failedCount: 0,
    byWalletType: {},
    bySnapshotType: {},
    byNetwork: {},
    totalBalanceIDR: 0,
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
    // Step 1: Fetch data
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 1: FETCHING DATA')
    logger.log('='.repeat(80))

    const [schools, caterings, transactions] = await Promise.all([
      fetchSchools(supabase),
      fetchCaterings(supabase),
      fetchTransactions(supabase)
    ])

    if (schools.length === 0 || caterings.length === 0) {
      logger.error('No schools or caterings found. Please run user seeders first.')
      process.exit(1)
    }

    // Step 2: Initialize wallets
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 2: INITIALIZING WALLETS')
    logger.log('='.repeat(80))

    const wallets = initializeWallets(schools, caterings)
    logger.success(`Initialized ${wallets.size} wallets`)

    // Step 3: Generate snapshots
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 3: GENERATING BALANCE SNAPSHOTS')
    logger.log('='.repeat(80))

    const snapshots = generateAllSnapshots(wallets, transactions)
    stats.totalSnapshots = snapshots.length

    // Calculate statistics
    snapshots.forEach((snapshot) => {
      stats.byWalletType[snapshot.wallet_type] = (stats.byWalletType[snapshot.wallet_type] || 0) + 1
      stats.bySnapshotType[snapshot.snapshot_type] = (stats.bySnapshotType[snapshot.snapshot_type] || 0) + 1
      stats.byNetwork[snapshot.network] = (stats.byNetwork[snapshot.network] || 0) + 1
      stats.totalBalanceIDR += snapshot.balance_idr
    })

    // Step 4: Insert to database
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 4: INSERTING SNAPSHOTS TO DATABASE')
    logger.log('='.repeat(80))

    const result = await insertSnapshotsInBatches(supabase, snapshots, CONFIG.BATCH_SIZE)
    stats.successCount = result.success
    stats.failedCount = result.failed
    stats.errors = result.errors

    // Print summary
    logger.log('\n' + '='.repeat(80))
    logger.log('SEEDING SUMMARY')
    logger.log('='.repeat(80))

    console.log(`
📊 WALLET BALANCES SNAPSHOT:
   Total Snapshots Generated: ${stats.totalSnapshots}
   ✅ Success: ${stats.successCount}
   ❌ Failed: ${stats.failedCount}
   Success Rate: ${stats.totalSnapshots > 0 ? ((stats.successCount / stats.totalSnapshots) * 100).toFixed(1) : 0}%

💰 TOTAL TRACKED BALANCE: Rp ${stats.totalBalanceIDR.toLocaleString('id-ID')}

📊 BY WALLET TYPE:`)

    Object.entries(stats.byWalletType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        const percentage = ((count / stats.totalSnapshots) * 100).toFixed(1)
        console.log(`   ${type.padEnd(20)}: ${count.toString().padStart(5)} (${percentage}%)`)
      })

    console.log(`\n📊 BY SNAPSHOT TYPE:`)
    Object.entries(stats.bySnapshotType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        const percentage = ((count / stats.totalSnapshots) * 100).toFixed(1)
        console.log(`   ${type.padEnd(20)}: ${count.toString().padStart(5)} (${percentage}%)`)
      })

    console.log(`\n📊 BY NETWORK:`)
    Object.entries(stats.byNetwork)
      .sort((a, b) => b[1] - a[1])
      .forEach(([network, count]) => {
        const percentage = ((count / stats.totalSnapshots) * 100).toFixed(1)
        console.log(`   ${network.padEnd(20)}: ${count.toString().padStart(5)} (${percentage}%)`)
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
    const statsPath = path.join(logsDir, '22-wallet-balances-snapshot-stats.json')
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
  seedWalletBalancesSnapshot()
    .then(() => {
      logger.success('Script execution completed')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('Script execution failed', error)
      process.exit(1)
    })
}

export { seedWalletBalancesSnapshot }
