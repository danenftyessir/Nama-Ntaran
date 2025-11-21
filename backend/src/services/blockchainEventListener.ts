// @ts-nocheck
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

import { supabase } from '../config/database.js';
import blockchainPaymentService from './blockchainPaymentService.js';
import { Server as SocketIOServer } from 'socket.io';
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
  private socketIO: SocketIOServer | null = null;
  private eventQueue: BlockchainEvent[] = [];
  private isProcessingQueue: boolean = false;

  constructor(config?: ListenerConfig) {
    if (config?.enableSocketIO && config?.httpServer) {
      // Setup Socket.IO untuk real-time updates ke frontend
      this.socketIO = new SocketIOServer(config.httpServer, {
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

      // Update allocations table
      const { data: allocData, error: allocError } = await supabase
        .from('allocations')
        .update({
          status: 'LOCKED',
          blockchain_confirmed: true,
          updated_at: new Date().toISOString()
        })
        .eq('allocation_id', allocationId)
        .select('id')
        .single();

      if (allocError || !allocData) {
        console.warn(
          `⚠️  Allocation ${allocationId} not found in database`
        );
        return;
      }

      const allocIdDb = allocData.id;

      // Update payments table
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          blockchain_tx_hash: event.transactionHash,
          blockchain_block_number: event.blockNumber,
          updated_at: new Date().toISOString()
        })
        .eq('allocation_id', allocIdDb);

      if (paymentError) {
        console.error('Failed to update payments:', paymentError);
      }

      // Get payment_id for event log
      const { data: paymentData, error: paymentSelectError } = await supabase
        .from('payments')
        .select('id')
        .eq('allocation_id', allocIdDb)
        .single();

      if (!paymentSelectError && paymentData) {
        // Insert event log
        const { error: eventError } = await supabase
          .from('payment_events')
          .insert({
            payment_id: paymentData.id,
            allocation_id: allocIdDb,
            event_type: 'FUND_LOCKED',
            blockchain_event_signature: 'FundLocked(bytes32,address,address,uint256,uint256,string)',
            blockchain_tx_hash: event.transactionHash,
            blockchain_block_number: event.blockNumber,
            event_data: JSON.stringify({
              allocationId,
              payer,
              payee,
              amount: amount.toString(),
              timestamp: timestamp.toString(),
              metadata,
            }),
            created_at: new Date().toISOString()
          });

        if (eventError) {
          console.error('Failed to insert payment event:', eventError);
        }
      }

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
      console.error('❌ Error handling FundLocked:', error.message);
      throw error;
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

      // Find allocation
      const { data: allocData, error: allocError } = await supabase
        .from('allocations')
        .select('id')
        .eq('allocation_id', allocationId)
        .single();

      if (allocError || !allocData) {
        console.warn(
          `⚠️  Allocation ${allocationId} not found in database`
        );
        return;
      }

      const allocIdDb = allocData.id;

      // Update allocations table
      const { error: updateAllocError } = await supabase
        .from('allocations')
        .update({
          status: 'RELEASED',
          tx_hash_release: event.transactionHash,
          released_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', allocIdDb);

      if (updateAllocError) {
        console.error('Failed to update allocations:', updateAllocError);
      }

      // Update payments table
      const { error: updatePaymentError } = await supabase
        .from('payments')
        .update({
          status: 'COMPLETED',
          blockchain_tx_hash: event.transactionHash,
          blockchain_block_number: event.blockNumber,
          released_to_catering_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('allocation_id', allocIdDb);

      if (updatePaymentError) {
        console.error('Failed to update payments:', updatePaymentError);
      }

      // Get data untuk public_payment_feed
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select(`
          id,
          allocations!inner(
            amount,
            schools!inner(name, city),
            caterings!inner(name)
          ),
          deliveries(portions, delivery_date)
        `)
        .eq('allocation_id', allocIdDb)
        .single();

      if (!paymentError && paymentData) {
        const payment = {
          payment_id: paymentData.id,
          school_name: paymentData.allocations.schools.name,
          school_region: paymentData.allocations.schools.city,
          catering_name: paymentData.allocations.caterings.name,
          amount: paymentData.allocations.amount,
          portions: paymentData.deliveries?.[0]?.portions || 0,
          delivery_date: paymentData.deliveries?.[0]?.delivery_date || null
        };

        // Insert to public_payment_feed (TRANSPARENCY DASHBOARD)
        const lockedAt = new Date();
        lockedAt.setHours(lockedAt.getHours() - 1);

        const { error: feedError } = await supabase
          .from('public_payment_feed')
          .insert({
            payment_id: payment.payment_id,
            allocation_id: allocIdDb,
            school_name: payment.school_name,
            school_region: payment.school_region,
            catering_name: payment.catering_name,
            amount: payment.amount,
            currency: 'IDR',
            portions_count: payment.portions,
            delivery_date: payment.delivery_date,
            status: 'COMPLETED',
            blockchain_tx_hash: event.transactionHash,
            blockchain_block_number: event.blockNumber,
            locked_at: lockedAt.toISOString(),
            released_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          });

        if (feedError) {
          console.error('Failed to insert public payment feed:', feedError);
        } else {
          console.log(`   ✅ Public payment feed updated`);
        }
      }

      // Insert event log
      const { data: paymentIdData, error: paymentIdError } = await supabase
        .from('payments')
        .select('id')
        .eq('allocation_id', allocIdDb)
        .single();

      if (!paymentIdError && paymentIdData) {
        const { error: eventError } = await supabase
          .from('payment_events')
          .insert({
            payment_id: paymentIdData.id,
            allocation_id: allocIdDb,
            event_type: 'PAYMENT_RELEASED',
            blockchain_event_signature: 'PaymentReleased(bytes32,address,address,uint256,uint256,bytes32)',
            blockchain_tx_hash: event.transactionHash,
            blockchain_block_number: event.blockNumber,
            event_data: JSON.stringify({
              allocationId,
              payer,
              payee,
              amount: amount.toString(),
              timestamp: timestamp.toString(),
              txHash,
            }),
            processed: true,
            processed_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          });

        if (eventError) {
          console.error('Failed to insert payment event:', eventError);
        }
      }

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
      console.error('❌ Error handling PaymentReleased:', error.message);
      throw error;
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
