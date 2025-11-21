/**
 * ============================================
 * BLOCKCHAIN PAYMENT SERVICE
 * ============================================
 * Service untuk integrasi dengan Smart Contract NutriChainEscrow
 * Menggunakan Ethers.js v6
 *
 * FLOW:
 * 1. Lock Fund: Admin -> lockFund() di SC -> emit FundLocked
 * 2. Release Escrow: Backend -> releaseEscrow() di SC -> emit PaymentReleased
 * 3. Event Listener: Monitor blockchain events -> update DB -> notify users
 *
 * Author: NutriChain Dev Team
 */

import { ethers, Contract } from 'ethers';
import { supabase } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

// ============================================
// TYPES & INTERFACES
// ============================================

interface AllocationData {
  allocationId: string;
  payerAddress: string;
  payeeAddress: string;
  amount: bigint;
  metadata: string;
}

interface LockFundResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  allocationId?: string;
  error?: string;
}

interface ReleaseEscrowResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  error?: string;
}

interface BlockchainEvent {
  event: string;
  args: any;
  transactionHash: string;
  blockNumber: number;
  logIndex: number;
}

// ============================================
// SMART CONTRACT ABI (Minimal)
// ============================================
const ESCROW_ABI = [
  // lockFund function
  {
    inputs: [
      { name: '_payee', type: 'address' },
      { name: '_allocationId', type: 'bytes32' },
      { name: '_metadata', type: 'string' },
    ],
    name: 'lockFund',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  // releaseEscrow function
  {
    inputs: [{ name: '_allocationId', type: 'bytes32' }],
    name: 'releaseEscrow',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // getAllocation function
  {
    inputs: [{ name: '_allocationId', type: 'bytes32' }],
    name: 'getAllocation',
    outputs: [
      { name: 'allocationId', type: 'bytes32' },
      { name: 'payer', type: 'address' },
      { name: 'payee', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'lockedAt', type: 'uint256' },
      { name: 'releasedAt', type: 'uint256' },
      { name: 'isLocked', type: 'bool' },
      { name: 'isReleased', type: 'bool' },
      { name: 'metadata', type: 'string' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'allocationId', type: 'bytes32' },
      { indexed: true, name: 'payer', type: 'address' },
      { indexed: true, name: 'payee', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
      { indexed: false, name: 'metadata', type: 'string' },
    ],
    name: 'FundLocked',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'allocationId', type: 'bytes32' },
      { indexed: true, name: 'payer', type: 'address' },
      { indexed: true, name: 'payee', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
      { indexed: false, name: 'txHash', type: 'bytes32' },
    ],
    name: 'PaymentReleased',
    type: 'event',
  },
];

// ============================================
// BLOCKCHAIN PAYMENT SERVICE CLASS
// ============================================

class BlockchainPaymentService {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private contract: Contract;
  private escrowContractAddress: string;

  constructor() {
    // Validasi environment variables
    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const privateKey = process.env.ADMIN_PRIVATE_KEY;

    if (!rpcUrl || !contractAddress || !privateKey) {
      throw new Error(
        'Missing required blockchain environment variables: BLOCKCHAIN_RPC_URL, CONTRACT_ADDRESS, ADMIN_PRIVATE_KEY'
      );
    }

    this.escrowContractAddress = contractAddress;

    // Initialize provider (RPC connection)
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    // Initialize signer (wallet untuk send transactions)
    this.signer = new ethers.Wallet(privateKey, this.provider);

    // Initialize contract instance
    this.contract = new ethers.Contract(
      contractAddress,
      ESCROW_ABI,
      this.signer
    );

    console.log('✅ Blockchain Payment Service initialized');
    console.log(`   Contract Address: ${contractAddress}`);
    console.log(`   Signer Address: ${(this.signer as ethers.Wallet).address}`);
  }

  /**
   * ============================================
   * STEP 1: LOCK FUND
   * ============================================
   * Flow: Admin Dinas/Pemerintah -> Lock Dana ke Smart Contract
   *
   * @param allocationData Data alokasi dana
   * @returns Promise dengan result lock operation
   */
  async lockFund(allocationData: AllocationData): Promise<LockFundResult> {
    try {
      console.log('\n📌 [Blockchain] Locking fund...');
      console.log(`   Allocation ID: ${allocationData.allocationId}`);
      console.log(
        `   Amount: ${ethers.utils.formatEther(allocationData.amount)} ETH`
      );
      console.log(`   Payee: ${allocationData.payeeAddress}`);

      // Prepare parameters
      const payeeAddress = allocationData.payeeAddress;
      const allocationId = allocationData.allocationId;
      const amount = allocationData.amount;
      const metadata = allocationData.metadata;

      // Convert string allocation ID to bytes32
      const allocationIdBytes32 = ethers.utils.id(allocationId); // Convert ke bytes32

      // Send transaction
      const tx = await this.contract.lockFund(
        payeeAddress,
        allocationIdBytes32,
        metadata,
        { value: amount }
      );

      console.log(`   TX Hash: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();

      if (!receipt) {
        return {
          success: false,
          error: 'Transaction failed - no receipt',
        };
      }

      console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        allocationId: allocationId,
      };
    } catch (error: any) {
      console.error('❌ Lock fund error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * ============================================
   * STEP 2: RELEASE ESCROW
   * ============================================
   * Flow: Backend (setelah sekolah konfirmasi) -> Release Dana ke Katering
   * Hanya backend service account yang bisa call function ini
   *
   * @param allocationId Allocation ID yang akan di-release
   * @returns Promise dengan result release operation
   */
  async releaseEscrow(allocationId: string): Promise<ReleaseEscrowResult> {
    try {
      console.log('\n💰 [Blockchain] Releasing escrow...');
      console.log(`   Allocation ID: ${allocationId}`);

      // Convert string allocation ID to bytes32
      const allocationIdBytes32 = ethers.utils.id(allocationId);

      // Send transaction
      const tx = await this.contract.releaseEscrow(allocationIdBytes32);

      console.log(`   TX Hash: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();

      if (!receipt) {
        return {
          success: false,
          error: 'Transaction failed - no receipt',
        };
      }

      console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error: any) {
      console.error('❌ Release escrow error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * ============================================
   * QUERY: GET ALLOCATION DATA
   * ============================================
   * Get status alokasi dari smart contract
   */
  async getAllocationData(allocationId: string) {
    try {
      const allocationIdBytes32 = ethers.utils.id(allocationId);
      const allocation = await this.contract.getAllocation(
        allocationIdBytes32
      );

      return {
        allocationId: allocation[0],
        payer: allocation[1],
        payee: allocation[2],
        amount: allocation[3].toString(),
        lockedAt: allocation[4].toString(),
        releasedAt: allocation[5].toString(),
        isLocked: allocation[6],
        isReleased: allocation[7],
        metadata: allocation[8],
      };
    } catch (error: any) {
      console.error('Error getting allocation data:', error.message);
      throw error;
    }
  }

  /**
   * ============================================
   * EVENT LISTENER: LISTEN FundLocked
   * ============================================
   * Backend listen event dari smart contract
   * Saat admin lock dana, smart contract emit event ini
   * Backend catch -> Update DB allocations.status = LOCKED
   */
  async listenFundLockedEvents(callback: (event: BlockchainEvent) => void) {
    try {
      console.log('\n👂 [Blockchain] Listening to FundLocked events...');

      // Setup event listener
      this.contract.on(
        'FundLocked',
        (
          allocationId: string,
          payer: string,
          payee: string,
          amount: bigint,
          timestamp: bigint,
          metadata: string,
          event: any
        ) => {
          console.log('📢 FundLocked Event received:');
          console.log(`   Allocation ID: ${allocationId}`);
          console.log(`   Payer: ${payer}`);
          console.log(`   Payee: ${payee}`);
          console.log(`   Amount: ${ethers.utils.formatEther(amount)} ETH`);

          callback({
            event: 'FundLocked',
            args: {
              allocationId,
              payer,
              payee,
              amount: amount.toString(),
              timestamp: timestamp.toString(),
              metadata,
            },
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber,
            logIndex: event.index,
          });
        }
      );
    } catch (error: any) {
      console.error('Error setting up FundLocked listener:', error.message);
    }
  }

  /**
   * ============================================
   * EVENT LISTENER: LISTEN PaymentReleased
   * ============================================
   * Backend listen event dari smart contract
   * Saat backend release escrow, smart contract emit event ini
   * Backend catch -> Update DB payments.status = COMPLETED -> Public Dashboard
   */
  async listenPaymentReleasedEvents(
    callback: (event: BlockchainEvent) => void
  ) {
    try {
      console.log(
        '\n👂 [Blockchain] Listening to PaymentReleased events...'
      );

      // Setup event listener
      this.contract.on(
        'PaymentReleased',
        (
          allocationId: string,
          payer: string,
          payee: string,
          amount: bigint,
          timestamp: bigint,
          txHash: string,
          event: any
        ) => {
          console.log('📢 PaymentReleased Event received:');
          console.log(`   Allocation ID: ${allocationId}`);
          console.log(`   Payee: ${payee}`);
          console.log(`   Amount: ${ethers.utils.formatEther(amount)} ETH`);

          callback({
            event: 'PaymentReleased',
            args: {
              allocationId,
              payer,
              payee,
              amount: amount.toString(),
              timestamp: timestamp.toString(),
              txHash,
            },
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber,
            logIndex: event.index,
          });
        }
      );
    } catch (error: any) {
      console.error(
        'Error setting up PaymentReleased listener:',
        error.message
      );
    }
  }

  /**
   * ============================================
   * HELPER: Generate Allocation ID
   * ============================================
   * Generate allocation ID dari school, catering, dan date
   * Format: hash(schoolId + cateringId + date)
   */
  generateAllocationId(
    schoolId: string,
    cateringId: string,
    deliveryDate: string
  ): string {
    const combined = `${schoolId}-${cateringId}-${deliveryDate}`;
    return ethers.utils.id(combined); // Keccak256 hash
  }

  /**
   * ============================================
   * HELPER: Validate Allocation
   * ============================================
   */
  async validateAllocation(
    allocationId: string
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      const data = await this.getAllocationData(allocationId);

      if (!data.isLocked) {
        return { valid: false, reason: 'Allocation not locked' };
      }

      if (data.isReleased) {
        return { valid: false, reason: 'Allocation already released' };
      }

      return { valid: true };
    } catch (error: any) {
      return { valid: false, reason: error.message };
    }
  }

  /**
   * ============================================
   * HEALTH CHECK
   * ============================================
   */
  async healthCheck(): Promise<boolean> {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      console.log(`✅ Blockchain health check OK (Block: ${blockNumber})`);
      return true;
    } catch (error) {
      console.error('❌ Blockchain health check failed');
      return false;
    }
  }

  /**
   * ============================================
   * CLEANUP: Remove All Listeners
   * ============================================
   */
  removeAllListeners() {
    try {
      this.contract.removeAllListeners();
      console.log('✅ All event listeners removed');
    } catch (error: any) {
      console.error('Error removing listeners:', error.message);
    }
  }
}

// Export singleton instance
export default new BlockchainPaymentService();
