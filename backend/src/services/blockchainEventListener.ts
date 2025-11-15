/**
 * ============================================
 * BLOCKCHAIN EVENT LISTENER SERVICE
 * ============================================
 * Background service yang listen blockchain events dan update database real-time
 *
 * Events yang di-listen:
 * 1. FundLocked - Emitted saat admin lock dana ke escrow
 * 2. PaymentReleased - Emitted saat backend release escrow ke katering
 *
 * FLOW:
 * 1. Service start saat application startup
 * 2. Setup event listener ke smart contract
 * 3. Saat event terjadi, listener trigger callback
 * 4. Callback update database (allocations, payments, events log)
 * 5. Frontend/Dashboard subscribe ke WebSocket event updates
 *
 * Author: NutriChain Dev Team
 */

import { pool } from '../config/database.js';
import blockchainPaymentService from './blockchainPaymentService.js';
import io, { Socket } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

// ============================================
// TYPES
// ============================================

interface BlockchainEvent {
  event: string;
  args: any;
  transactionHash: string;
  blockNumber: number;
  logIndex: number;
}

interface ListenerConfig {
  httpServer?: any; // Express HTTP server untuk Socket.IO
  enableSocketIO?: boolean;
}

// ============================================
// BLOCKCHAIN EVENT LISTENER CLASS
// ============================================

class BlockchainEventListener {
  private isRunning: boolean = false;
  private socketIO: Socket | null = null;
  private eventQueue: BlockchainEvent[] = [];
  private isProcessingQueue: boolean = false;

  constructor(config?: ListenerConfig) {
    if (config?.enableSocketIO && config?.httpServer) {
      // Setup Socket.IO untuk real-time updates ke frontend
      this.socketIO = io(config.httpServer, {
        cors: {
          origin: process.env.FRONTEND_URL || 'http://localhost:3000',
          methods: ['GET', 'POST'],
        },
      });

      console.log('✅ Socket.IO initialized for real-time updates');
    }
  }

  /**
   * ============================================
   * START LISTENER
   * ============================================
   * Dijalankan saat application startup
   */
  async start() {
    try {
      console.log('\n🚀 [Event Listener] Starting blockchain event listener...\n');

      // Check blockchain health
      const isHealthy = await blockchainPaymentService.healthCheck();

      if (!isHealthy) {
        console.error('❌ Blockchain not healthy, listener startup aborted');
        return;
      }

      // Setup listeners
      this.setupFundLockedListener();
      this.setupPaymentReleasedListener();

      this.isRunning = true;
      console.log('✅ Event listener started successfully\n');

      // Start queue processor
      this.processEventQueue();
    } catch (error: any) {
      console.error('❌ Failed to start event listener:', error.message);
    }
  }

  /**
   * ============================================
   * LISTENER 1: FundLocked Event
   * ============================================
   * Triggered ketika Admin lock dana ke escrow
   *
   * Smart contract emit:
   * event FundLocked(
   *   bytes32 indexed allocationId,
   *   address indexed payer,
   *   address indexed payee,
   *   uint256 amount,
   *   uint256 timestamp,
   *   string metadata
   * );
   */
  private setupFundLockedListener() {
    console.log('👂 Setting up FundLocked listener...');

    blockchainPaymentService.listenFundLockedEvents(
      async (event: BlockchainEvent) => {
        this.eventQueue.push(event);
        console.log(
          `📬 FundLocked event queued (Queue size: ${this.eventQueue.length})`
        );
      }
    );
  }

  /**
   * ============================================
   * LISTENER 2: PaymentReleased Event
   * ============================================
   * Triggered ketika Backend release escrow ke katering
   * INI EVENT PALING PENTING untuk transparency dashboard
   *
   * Smart contract emit:
   * event PaymentReleased(
   *   bytes32 indexed allocationId,
   *   address indexed payer,
   *   address indexed payee,
   *   uint256 amount,
   *   uint256 timestamp,
   *   bytes32 txHash
   * );
   */
  private setupPaymentReleasedListener() {
    console.log('👂 Setting up PaymentReleased listener...');

    blockchainPaymentService.listenPaymentReleasedEvents(
      async (event: BlockchainEvent) => {
        this.eventQueue.push(event);
        console.log(
          `📬 PaymentReleased event queued (Queue size: ${this.eventQueue.length})`
        );
      }
    );
  }

  /**
   * ============================================
   * EVENT QUEUE PROCESSOR
   * ============================================
   * Process events dari queue secara sequential
   * Mencegah race condition saat update database
   */
  private async processEventQueue() {
    const processNextEvent = async () => {
      if (this.isProcessingQueue || this.eventQueue.length === 0) {
        // Retry dalam 1 detik
        setTimeout(processNextEvent, 1000);
        return;
      }

      this.isProcessingQueue = true;

      try {
        const event = this.eventQueue.shift();

        if (!event) {
          this.isProcessingQueue = false;
          setTimeout(processNextEvent, 1000);
          return;
        }

        console.log(`\n⏳ Processing event: ${event.event}`);

        // Route ke handler yang sesuai
        if (event.event === 'FundLocked') {
          await this.handleFundLockedEvent(event);
        } else if (event.event === 'PaymentReleased') {
          await this.handlePaymentReleasedEvent(event);
        }

        this.isProcessingQueue = false;
        setTimeout(processNextEvent, 1000);
      } catch (error: any) {
        console.error('❌ Error processing event:', error.message);
        this.isProcessingQueue = false;
        setTimeout(processNextEvent, 5000); // Retry setelah 5 detik
      }
    };

    // Start processor
    processNextEvent();
  }

  /**
   * ============================================
   * HANDLER: FundLocked Event
   * ============================================
   * Update database saat admin lock dana
   */
  private async handleFundLockedEvent(event: BlockchainEvent) {
    const client = await pool.connect();

    try {
      console.log(`\n📋 Handling FundLocked event`);
      console.log(`   TX Hash: ${event.transactionHash}`);
      console.log(`   Block: ${event.blockNumber}`);

      const {
        allocationId,
        payer,
        payee,
        amount,
        timestamp,
        metadata,
      } = event.args;

      await client.query('BEGIN');

      // Update allocations table
      const allocResult = await client.query(
        `UPDATE allocations
         SET status = $1, blockchain_confirmed = $2, updated_at = NOW()
         WHERE allocation_id = $3
         RETURNING id`,
        ['LOCKED', true, allocationId]
      );

      if (allocResult.rows.length === 0) {
        console.warn(
          `⚠️  Allocation ${allocationId} not found in database`
        );
        await client.query('ROLLBACK');
        return;
      }

      const allocIdDb = allocResult.rows[0].id;

      // Update payments table
      await client.query(
        `UPDATE payments
         SET blockchain_tx_hash = $1, blockchain_block_number = $2, updated_at = NOW()
         WHERE allocation_id = $3`,
        [event.transactionHash, event.blockNumber, allocIdDb]
      );

      // Insert event log
      await client.query(
        `INSERT INTO payment_events
         (payment_id, allocation_id, event_type, blockchain_event_signature,
          blockchain_tx_hash, blockchain_block_number, event_data, created_at)
         SELECT p.id, a.id, $1, $2, $3, $4, $5, NOW()
         FROM payments p
         JOIN allocations a ON p.allocation_id = a.id
         WHERE a.id = $6`,
        [
          'FUND_LOCKED',
          'FundLocked(bytes32,address,address,uint256,uint256,string)',
          event.transactionHash,
          event.blockNumber,
          JSON.stringify({
            allocationId,
            payer,
            payee,
            amount: amount.toString(),
            timestamp: timestamp.toString(),
            metadata,
          }),
          allocIdDb,
        ]
      );

      await client.query('COMMIT');

      console.log(`   ✅ Database updated successfully`);

      // Broadcast event via Socket.IO ke frontend
      if (this.socketIO) {
        this.broadcastEvent('fund_locked', {
          allocationId,
          amount: amount.toString(),
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: new Date().toISOString(),
        });
      }

      // Log to console
      console.log(`   📢 Event broadcasted to connected clients\n`);
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('❌ Error handling FundLocked:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * ============================================
   * HANDLER: PaymentReleased Event
   * ============================================
   * CRITICAL HANDLER: Update database saat dana di-release ke katering
   * Ini yang trigger public dashboard update
   */
  private async handlePaymentReleasedEvent(event: BlockchainEvent) {
    const client = await pool.connect();

    try {
      console.log(`\n💰 Handling PaymentReleased event`);
      console.log(`   TX Hash: ${event.transactionHash}`);
      console.log(`   Block: ${event.blockNumber}`);

      const {
        allocationId,
        payer,
        payee,
        amount,
        timestamp,
        txHash,
      } = event.args;

      await client.query('BEGIN');

      // Find allocation
      const allocResult = await client.query(
        `SELECT id FROM allocations WHERE allocation_id = $1`,
        [allocationId]
      );

      if (allocResult.rows.length === 0) {
        console.warn(
          `⚠️  Allocation ${allocationId} not found in database`
        );
        await client.query('ROLLBACK');
        return;
      }

      const allocIdDb = allocResult.rows[0].id;

      // Update allocations table
      await client.query(
        `UPDATE allocations
         SET status = $1, tx_hash_release = $2, released_at = NOW(), updated_at = NOW()
         WHERE id = $3`,
        ['RELEASED', event.transactionHash, allocIdDb]
      );

      // Update payments table
      await client.query(
        `UPDATE payments
         SET status = $1, blockchain_tx_hash = $2, blockchain_block_number = $3,
             released_to_catering_at = NOW(), updated_at = NOW()
         WHERE allocation_id = $4`,
        [
          'COMPLETED',
          event.transactionHash,
          event.blockNumber,
          allocIdDb,
        ]
      );

      // Get data untuk public_payment_feed
      const paymentResult = await client.query(
        `
        SELECT
          p.id as payment_id,
          s.name as school_name, s.city as school_region,
          c.name as catering_name,
          a.amount, d.portions, d.delivery_date
        FROM payments p
        JOIN allocations a ON p.allocation_id = a.id
        JOIN schools s ON a.school_id = s.id
        JOIN caterings c ON a.catering_id = c.id
        LEFT JOIN deliveries d ON a.id = d.allocation_id
        WHERE a.id = $1
        `,
        [allocIdDb]
      );

      if (paymentResult.rows.length > 0) {
        const payment = paymentResult.rows[0];

        // Insert to public_payment_feed (TRANSPARENCY DASHBOARD)
        await client.query(
          `INSERT INTO public_payment_feed
           (payment_id, allocation_id, school_name, school_region,
            catering_name, amount, currency, portions_count, delivery_date,
            status, blockchain_tx_hash, blockchain_block_number,
            locked_at, released_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                   NOW() - INTERVAL '1 hour', NOW(), NOW())`,
          [
            payment.payment_id,
            allocIdDb,
            payment.school_name,
            payment.school_region,
            payment.catering_name,
            payment.amount,
            'IDR',
            payment.portions || 0,
            payment.delivery_date,
            'COMPLETED',
            event.transactionHash,
            event.blockNumber,
          ]
        );

        console.log(`   ✅ Public payment feed updated`);
      }

      // Insert event log
      const paymentIdResult = await client.query(
        'SELECT id FROM payments WHERE allocation_id = $1',
        [allocIdDb]
      );

      if (paymentIdResult.rows.length > 0) {
        await client.query(
          `INSERT INTO payment_events
           (payment_id, allocation_id, event_type, blockchain_event_signature,
            blockchain_tx_hash, blockchain_block_number, event_data,
            processed, processed_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
          [
            paymentIdResult.rows[0].id,
            allocIdDb,
            'PAYMENT_RELEASED',
            'PaymentReleased(bytes32,address,address,uint256,uint256,bytes32)',
            event.transactionHash,
            event.blockNumber,
            JSON.stringify({
              allocationId,
              payer,
              payee,
              amount: amount.toString(),
              timestamp: timestamp.toString(),
              txHash,
            }),
            true,
          ]
        );
      }

      await client.query('COMMIT');

      console.log(`   ✅ Database updated successfully`);

      // Broadcast event via Socket.IO ke frontend
      // Frontend bisa immediately update dashboard tanpa refresh
      if (this.socketIO) {
        this.broadcastEvent('payment_released', {
          allocationId,
          payee,
          amount: amount.toString(),
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: new Date().toISOString(),
        });
      }

      console.log(`   📢 Event broadcasted to dashboard (real-time update)\n`);
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('❌ Error handling PaymentReleased:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * ============================================
   * BROADCAST EVENT via Socket.IO
   * ============================================
   * Kirim event ke semua connected clients (frontend)
   * Frontend bisa listen dan update UI secara real-time
   */
  private broadcastEvent(eventName: string, data: any) {
    if (!this.socketIO) return;

    try {
      // Broadcast ke semua client yang subscribe
      this.socketIO.emit(`payment:${eventName}`, data);

      console.log(`   Broadcasted: payment:${eventName}`);
    } catch (error: any) {
      console.error('Error broadcasting event:', error.message);
    }
  }

  /**
   * ============================================
   * STOP LISTENER
   * ============================================
   */
  async stop() {
    try {
      console.log('\n🛑 Stopping blockchain event listener...');

      blockchainPaymentService.removeAllListeners();

      this.isRunning = false;
      console.log('✅ Event listener stopped\n');
    } catch (error: any) {
      console.error('Error stopping listener:', error.message);
    }
  }

  /**
   * ============================================
   * GET STATUS
   * ============================================
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      queueSize: this.eventQueue.length,
      isProcessing: this.isProcessingQueue,
    };
  }
}

// Export singleton instance
export default new BlockchainEventListener();
