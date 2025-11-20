/**
 * ============================================================================
 * SEEDING SCRIPT 21: SMART CONTRACT EVENTS RAW (EXTRA)
 * ============================================================================
 *
 * Purpose: Seed smart_contract_events_raw with comprehensive blockchain event logs
 * Dependencies: 20-seed-blockchain-transaction-history.ts (transactions must exist)
 *
 * Run: npx ts-node database/seeders/21-seed-smart-contract-events-raw.ts
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

interface BlockchainTransaction {
  id: number
  tx_hash: string
  block_number: number
  block_timestamp: string
  from_address: string
  to_address: string
  contract_address: string | null
  value_idr: number
  network: string
  tx_status: string
  logs_count: number
  metadata: {
    type: string
    entity_type?: string
    entity_id?: number
  }
}

interface SmartContractEventInsert {
  tx_hash: string
  block_number: number
  block_timestamp: string
  contract_address: string
  event_name: string
  event_signature: string
  topic_0: string
  topic_1: string | null
  topic_2: string | null
  topic_3: string | null
  data: string
  decoded_data: {
    [key: string]: any
  }
  log_index: number
  transaction_index: number
  removed: boolean
  network: string
  processed: boolean
  processed_at: string | null
  error_message: string | null
  metadata: {
    event_type: string
    tx_type: string
    entity_type?: string
    entity_id?: number
  }
}

interface SeedingStats {
  totalEvents: number
  successCount: number
  failedCount: number
  byEventName: Record<string, number>
  byNetwork: Record<string, number>
  byProcessedStatus: Record<string, number>
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
  MAX_EVENTS_PER_TX: 8, // Maximum events per transaction

  // Smart Contract Addresses
  ESCROW_CONTRACT: '0xA1B2C3D4E5F6789012345678901234567890ABCD',
  PAYMENT_CONTRACT: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',

  // Event Definitions (with keccak256 signatures)
  EVENTS: {
    // Escrow Events
    ESCROW_LOCKED: {
      name: 'EscrowLocked',
      signature: 'EscrowLocked(address,address,uint256,uint256)',
      topic0: '0xa1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456'
    },
    ESCROW_RELEASED: {
      name: 'EscrowReleased',
      signature: 'EscrowReleased(address,address,uint256,uint256)',
      topic0: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    },
    ESCROW_REFUNDED: {
      name: 'EscrowRefunded',
      signature: 'EscrowRefunded(address,uint256,string)',
      topic0: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    },

    // Payment Events
    PAYMENT_INITIATED: {
      name: 'PaymentInitiated',
      signature: 'PaymentInitiated(address,address,uint256,bytes32)',
      topic0: '0x567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234'
    },
    PAYMENT_COMPLETED: {
      name: 'PaymentCompleted',
      signature: 'PaymentCompleted(bytes32,uint256)',
      topic0: '0xcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab'
    },
    PAYMENT_FAILED: {
      name: 'PaymentFailed',
      signature: 'PaymentFailed(bytes32,string)',
      topic0: '0x890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456'
    },

    // Delivery Events
    DELIVERY_CONFIRMED: {
      name: 'DeliveryConfirmed',
      signature: 'DeliveryConfirmed(uint256,address,uint256,string)',
      topic0: '0x34567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12'
    },
    DELIVERY_DISPUTED: {
      name: 'DeliveryDisputed',
      signature: 'DeliveryDisputed(uint256,address,string)',
      topic0: '0xdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc'
    },

    // Allocation Events
    ALLOCATION_CREATED: {
      name: 'AllocationCreated',
      signature: 'AllocationCreated(uint256,address,address,uint256)',
      topic0: '0x7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345'
    },
    ALLOCATION_UPDATED: {
      name: 'AllocationUpdated',
      signature: 'AllocationUpdated(uint256,uint256,string)',
      topic0: '0xbcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890a'
    },

    // Transfer Events (ERC20-like)
    TRANSFER: {
      name: 'Transfer',
      signature: 'Transfer(address,address,uint256)',
      topic0: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    },

    // Approval Events
    APPROVAL: {
      name: 'Approval',
      signature: 'Approval(address,address,uint256)',
      topic0: '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925'
    }
  },

  // Event Distribution by Transaction Type
  EVENT_DISTRIBUTION: {
    ESCROW_LOCK: ['ESCROW_LOCKED', 'TRANSFER', 'ALLOCATION_CREATED'],
    ESCROW_RELEASE: ['ESCROW_RELEASED', 'PAYMENT_COMPLETED', 'TRANSFER'],
    DIRECT_PAYMENT: ['PAYMENT_INITIATED', 'PAYMENT_COMPLETED', 'TRANSFER'],
    REFUND: ['ESCROW_REFUNDED', 'TRANSFER'],
    WALLET_FUNDING: ['TRANSFER', 'ALLOCATION_CREATED'],
    CONTRACT_DEPLOYMENT: [],
    GAS_FEE_PAYMENT: []
  },

  // Processing Status Distribution
  PROCESSING_STATUS: {
    processed: 0.85,      // 85% processed
    unprocessed: 0.12,    // 12% not processed yet
    failed: 0.03          // 3% processing failed
  },

  // Error Messages for Failed Processing
  ERROR_MESSAGES: [
    'Failed to decode event data',
    'Invalid event signature',
    'ABI mismatch',
    'Unexpected parameter types',
    'Topic decoding error',
    'Data length mismatch'
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

function generateRandomHex(length: number): string {
  return '0x' + crypto.randomBytes(length / 2).toString('hex')
}

function addressToTopic(address: string): string {
  // Pad address to 32 bytes for topic
  return '0x' + '0'.repeat(24) + address.slice(2).toLowerCase()
}

function uint256ToTopic(value: number): string {
  // Convert number to 32-byte hex
  const hex = value.toString(16).padStart(64, '0')
  return '0x' + hex
}

function addSeconds(date: Date, seconds: number): Date {
  const result = new Date(date)
  result.setSeconds(result.getSeconds() + seconds)
  return result
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchBlockchainTransactions(supabase: any): Promise<BlockchainTransaction[]> {
  logger.log('Fetching blockchain transactions...')

  const { data, error } = await supabase
    .from('blockchain_transaction_history')
    .select('*')
    .eq('tx_status', 'success')
    .not('contract_address', 'is', null)
    .gt('logs_count', 0)
    .order('block_timestamp', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch transactions: ${error.message}`)
  }

  logger.success(`Found ${data?.length || 0} transactions with contract events`)
  return data || []
}

// ============================================================================
// DATA GENERATION
// ============================================================================

function generateEventsForTransaction(tx: BlockchainTransaction): SmartContractEventInsert[] {
  const events: SmartContractEventInsert[] = []
  const txType = tx.metadata.type
  const eventTypes = CONFIG.EVENT_DISTRIBUTION[txType as keyof typeof CONFIG.EVENT_DISTRIBUTION] || []

  if (eventTypes.length === 0) {
    return []
  }

  const numEvents = Math.min(tx.logs_count, eventTypes.length)

  for (let i = 0; i < numEvents; i++) {
    const eventType = eventTypes[i % eventTypes.length]
    const eventConfig = CONFIG.EVENTS[eventType as keyof typeof CONFIG.EVENTS]

    if (!eventConfig) continue

    const processingStatus = weightedRandom(CONFIG.PROCESSING_STATUS)
    const isProcessed = processingStatus === 'processed'
    const isFailed = processingStatus === 'failed'

    // Generate topics and data based on event type
    let topic1: string | null = null
    let topic2: string | null = null
    let topic3: string | null = null
    let data: string = '0x'
    let decodedData: any = {}

    switch (eventType) {
      case 'ESCROW_LOCKED':
        topic1 = addressToTopic(tx.from_address)
        topic2 = addressToTopic(tx.to_address)
        data = generateRandomHex(128) // uint256, uint256
        decodedData = {
          from: tx.from_address,
          to: tx.to_address,
          allocationId: randomInt(1, 1000),
          amount: tx.value_idr.toString()
        }
        break

      case 'ESCROW_RELEASED':
        topic1 = addressToTopic(tx.from_address)
        topic2 = addressToTopic(tx.to_address)
        data = generateRandomHex(128)
        decodedData = {
          escrowAddress: tx.from_address,
          recipient: tx.to_address,
          allocationId: randomInt(1, 1000),
          amount: tx.value_idr.toString()
        }
        break

      case 'TRANSFER':
        topic1 = addressToTopic(tx.from_address)
        topic2 = addressToTopic(tx.to_address)
        data = uint256ToTopic(tx.value_idr)
        decodedData = {
          from: tx.from_address,
          to: tx.to_address,
          value: tx.value_idr.toString()
        }
        break

      case 'PAYMENT_INITIATED':
        topic1 = addressToTopic(tx.from_address)
        topic2 = generateRandomHex(64) // bytes32 payment ID
        data = generateRandomHex(128)
        decodedData = {
          payer: tx.from_address,
          payee: tx.to_address,
          paymentId: topic2,
          amount: tx.value_idr.toString()
        }
        break

      case 'PAYMENT_COMPLETED':
        topic1 = generateRandomHex(64) // bytes32 payment ID
        data = uint256ToTopic(tx.value_idr)
        decodedData = {
          paymentId: topic1,
          amount: tx.value_idr.toString(),
          completedAt: Math.floor(new Date(tx.block_timestamp).getTime() / 1000)
        }
        break

      case 'DELIVERY_CONFIRMED':
        topic1 = uint256ToTopic(randomInt(1, 1000)) // delivery ID
        data = generateRandomHex(192)
        decodedData = {
          deliveryId: topic1,
          confirmedBy: tx.from_address,
          portions: randomInt(50, 500),
          notes: 'Delivery confirmed on blockchain'
        }
        break

      case 'ALLOCATION_CREATED':
        topic1 = uint256ToTopic(randomInt(1, 1000)) // allocation ID
        data = generateRandomHex(256)
        decodedData = {
          allocationId: topic1,
          school: tx.from_address,
          catering: tx.to_address,
          amount: tx.value_idr.toString(),
          createdAt: Math.floor(new Date(tx.block_timestamp).getTime() / 1000)
        }
        break

      default:
        data = generateRandomHex(128)
        decodedData = { rawData: data }
    }

    // Processing timestamp
    let processedAt: string | null = null
    if (isProcessed) {
      processedAt = addSeconds(new Date(tx.block_timestamp), randomInt(10, 300)).toISOString()
    } else if (isFailed) {
      processedAt = addSeconds(new Date(tx.block_timestamp), randomInt(30, 600)).toISOString()
    }

    events.push({
      tx_hash: tx.tx_hash,
      block_number: tx.block_number,
      block_timestamp: tx.block_timestamp,
      contract_address: tx.contract_address!,
      event_name: eventConfig.name,
      event_signature: eventConfig.signature,
      topic_0: eventConfig.topic0,
      topic_1: topic1,
      topic_2: topic2,
      topic_3: topic3,
      data: data,
      decoded_data: decodedData,
      log_index: i,
      transaction_index: randomInt(0, 200),
      removed: false,
      network: tx.network,
      processed: isProcessed,
      processed_at: processedAt,
      error_message: isFailed ? CONFIG.ERROR_MESSAGES[randomInt(0, CONFIG.ERROR_MESSAGES.length - 1)] : null,
      metadata: {
        event_type: eventType,
        tx_type: txType,
        entity_type: tx.metadata.entity_type,
        entity_id: tx.metadata.entity_id
      }
    })
  }

  return events
}

function generateAllEvents(transactions: BlockchainTransaction[]): SmartContractEventInsert[] {
  logger.log('Generating smart contract events...')

  const allEvents: SmartContractEventInsert[] = []
  let processed = 0

  for (const tx of transactions) {
    const events = generateEventsForTransaction(tx)
    allEvents.push(...events)

    processed++
    if (processed % 100 === 0) {
      logger.progress(processed, transactions.length, 'Generating events')
    }
  }

  logger.progress(transactions.length, transactions.length, 'Generating events')
  logger.success(`Generated ${allEvents.length} smart contract events`)

  return allEvents
}

// ============================================================================
// SUPABASE OPERATIONS
// ============================================================================

async function insertEventsInBatches(
  supabase: any,
  events: SmartContractEventInsert[],
  batchSize: number
): Promise<{ success: number; failed: number; errors: any[] }> {
  let success = 0
  let failed = 0
  const errors: any[] = []

  const totalBatches = Math.ceil(events.length / batchSize)
  logger.log(`Inserting ${events.length} events in ${totalBatches} batches...`)

  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize)
    const batchNumber = Math.floor(i / batchSize) + 1

    try {
      const { data, error } = await supabase
        .from('smart_contract_events_raw')
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
          Math.min(i + batchSize, events.length),
          events.length,
          'Inserting events'
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

async function seedSmartContractEventsRaw() {
  logger.log('='.repeat(80))
  logger.log('SEEDING SCRIPT 21: SMART CONTRACT EVENTS RAW (EXTRA)')
  logger.log('='.repeat(80))

  const stats: SeedingStats = {
    totalEvents: 0,
    successCount: 0,
    failedCount: 0,
    byEventName: {},
    byNetwork: {},
    byProcessedStatus: {},
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
    // Step 1: Fetch blockchain transactions
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 1: FETCHING BLOCKCHAIN TRANSACTIONS')
    logger.log('='.repeat(80))

    const transactions = await fetchBlockchainTransactions(supabase)

    if (transactions.length === 0) {
      logger.log('\n⚠️ No transactions found. Please run blockchain-transaction-history seeder first.')
      process.exit(0)
    }

    // Step 2: Generate events
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 2: GENERATING SMART CONTRACT EVENTS')
    logger.log('='.repeat(80))

    const events = generateAllEvents(transactions)
    stats.totalEvents = events.length

    // Calculate statistics
    events.forEach((event) => {
      stats.byEventName[event.event_name] = (stats.byEventName[event.event_name] || 0) + 1
      stats.byNetwork[event.network] = (stats.byNetwork[event.network] || 0) + 1
      const processedStatus = event.processed ? 'processed' : (event.error_message ? 'failed' : 'pending')
      stats.byProcessedStatus[processedStatus] = (stats.byProcessedStatus[processedStatus] || 0) + 1
    })

    // Step 3: Insert to database
    logger.log('\n' + '='.repeat(80))
    logger.log('STEP 3: INSERTING EVENTS TO DATABASE')
    logger.log('='.repeat(80))

    const result = await insertEventsInBatches(supabase, events, CONFIG.BATCH_SIZE)
    stats.successCount = result.success
    stats.failedCount = result.failed
    stats.errors = result.errors

    // Print summary
    logger.log('\n' + '='.repeat(80))
    logger.log('SEEDING SUMMARY')
    logger.log('='.repeat(80))

    console.log(`
📊 SMART CONTRACT EVENTS RAW:
   Total Events Generated: ${stats.totalEvents}
   ✅ Success: ${stats.successCount}
   ❌ Failed: ${stats.failedCount}
   Success Rate: ${stats.totalEvents > 0 ? ((stats.successCount / stats.totalEvents) * 100).toFixed(1) : 0}%

📊 BY EVENT NAME:`)

    Object.entries(stats.byEventName)
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, count]) => {
        const percentage = ((count / stats.totalEvents) * 100).toFixed(1)
        console.log(`   ${name.padEnd(25)}: ${count.toString().padStart(5)} (${percentage}%)`)
      })

    console.log(`\n📊 BY NETWORK:`)
    Object.entries(stats.byNetwork)
      .sort((a, b) => b[1] - a[1])
      .forEach(([network, count]) => {
        const percentage = ((count / stats.totalEvents) * 100).toFixed(1)
        console.log(`   ${network.padEnd(20)}: ${count.toString().padStart(5)} (${percentage}%)`)
      })

    console.log(`\n📊 BY PROCESSING STATUS:`)
    Object.entries(stats.byProcessedStatus)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        const percentage = ((count / stats.totalEvents) * 100).toFixed(1)
        console.log(`   ${status.padEnd(15)}: ${count.toString().padStart(5)} (${percentage}%)`)
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
    const statsPath = path.join(logsDir, '21-smart-contract-events-raw-stats.json')
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
  seedSmartContractEventsRaw()
    .then(() => {
      logger.success('Script execution completed')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('Script execution failed', error)
      process.exit(1)
    })
}

export { seedSmartContractEventsRaw }
