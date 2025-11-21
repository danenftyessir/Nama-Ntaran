// @ts-nocheck
import { ethers } from 'ethers';
import { escrowContract, wallet } from '../config/blockchain.js';
import { supabase } from '../config/database.js';

/**
 * Release escrow funds to catering after school verification
 * @param deliveryId - Delivery ID yang sudah diverifikasi
 * @returns Transaction hash atau error
 */
export async function releaseEscrowForDelivery(deliveryId: number) {
  try {
    if (!escrowContract || !wallet) {
      throw new Error('Blockchain not configured. Check BLOCKCHAIN_RPC_URL and SERVICE_WALLET_PRIVATE_KEY in .env');
    }

    // Get escrow transaction for this delivery
    const { data: escrow, error: escrowError } = await supabase
      .from('escrow_transactions')
      .select(`
        *,
        deliveries!inner(catering_id),
        caterings!inner(wallet_address)
      `)
      .eq('delivery_id', deliveryId)
      .eq('status', 'locked')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (escrowError || !escrow) {
      throw new Error('No locked escrow found for this delivery');
    }

    // Generate escrow ID (same format as when locking)
    const escrowId = ethers.utils.id(`delivery-${deliveryId}-${escrow.id}`);

    console.log(`📤 Releasing escrow for delivery ${deliveryId}...`);
    console.log(`   Escrow ID: ${escrowId}`);
    console.log(`   Amount: ${escrow.amount}`);
    console.log(`   Payee: ${escrow.caterings.wallet_address}`);

    // Call releaseFund on smart contract
    const tx = await escrowContract.releaseFund(escrowId);
    console.log(`   Transaction sent: ${tx.hash}`);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log(`✅ Escrow released! Block: ${receipt.blockNumber}`);

    // Update escrow transaction in database
    const { error: updateError } = await supabase
      .from('escrow_transactions')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
        tx_hash: receipt.transactionHash,
        block_number: receipt.blockNumber,
        updated_at: new Date().toISOString()
      })
      .eq('id', escrow.id);

    if (updateError) {
      throw updateError;
    }

    return {
      success: true,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      escrowId: escrowId,
      amount: escrow.amount
    };

  } catch (error) {
    console.error('❌ Release escrow error:', error);

    // Update escrow status to failed if there's an error
    await supabase
      .from('escrow_transactions')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('delivery_id', deliveryId)
      .eq('status', 'locked')
      .then(({ error: err }) => {
        if (err) console.error('Failed to update escrow status:', err);
      });

    throw error;
  }
}

/**
 * Lock escrow funds for a delivery
 * @param deliveryId - Delivery ID
 * @param cateringId - Catering ID
 * @param amount - Amount in IDR (will be converted to wei)
 * @returns Transaction hash
 */
export async function lockEscrowForDelivery(
  deliveryId: number,
  cateringId: number,
  schoolId: number,
  amount: number
) {
  try {
    if (!escrowContract || !wallet) {
      throw new Error('Blockchain not configured');
    }

    // Get catering wallet address
    const { data: catering, error: cateringError } = await supabase
      .from('caterings')
      .select('wallet_address')
      .eq('id', cateringId)
      .single();

    if (cateringError || !catering) {
      throw new Error('Catering not found');
    }

    // Get school NPSN
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('npsn')
      .eq('id', schoolId)
      .single();

    if (schoolError || !school) {
      throw new Error('School not found');
    }

    const { wallet_address: payee } = catering;
    const { npsn } = school;

    // Create escrow transaction record first
    const { data: escrowRecord, error: insertError } = await supabase
      .from('escrow_transactions')
      .insert({
        delivery_id: deliveryId,
        school_id: schoolId,
        catering_id: cateringId,
        amount: amount,
        status: 'locked',
        locked_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (insertError || !escrowRecord) {
      throw new Error('Failed to create escrow transaction record');
    }

    const escrowRecordId = escrowRecord.id;

    // Generate unique escrow ID
    const escrowId = ethers.utils.id(`delivery-${deliveryId}-${escrowRecordId}`);

    // Convert amount to wei (for demo, 1 IDR = 1 wei, adjust as needed)
    const amountInWei = ethers.utils.parseEther((amount / 1000000).toString()); // Convert to smaller unit

    console.log(`🔒 Locking escrow for delivery ${deliveryId}...`);
    console.log(`   Escrow ID: ${escrowId}`);
    console.log(`   Payee: ${payee}`);
    console.log(`   Amount: ${amount} IDR (${amountInWei} wei)`);
    console.log(`   School NPSN: ${npsn}`);

    // Call lockFund on smart contract
    const tx = await escrowContract.lockFund(escrowId, payee, npsn, {
      value: amountInWei
    });

    console.log(`   Transaction sent: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`✅ Escrow locked! Block: ${receipt.blockNumber}`);

    // Update escrow transaction with blockchain details
    const { error: updateError } = await supabase
      .from('escrow_transactions')
      .update({
        tx_hash: receipt.transactionHash,
        block_number: receipt.blockNumber,
        updated_at: new Date().toISOString()
      })
      .eq('id', escrowRecordId);

    if (updateError) {
      throw updateError;
    }

    return {
      success: true,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      escrowId: escrowId
    };

  } catch (error) {
    console.error('❌ Lock escrow error:', error);
    throw error;
  }
}

/**
 * Get escrow details from blockchain
 * @param escrowId - Escrow ID (bytes32)
 */
export async function getEscrowDetails(escrowId: string) {
  try {
    if (!escrowContract) {
      throw new Error('Blockchain not configured');
    }

    const escrow = await escrowContract.getEscrow(escrowId);

    return {
      payer: escrow[0],
      payee: escrow[1],
      amount: escrow[2].toString(),
      isLocked: escrow[3],
      isReleased: escrow[4],
      schoolId: escrow[5]
    };

  } catch (error) {
    console.error('Get escrow details error:', error);
    throw error;
  }
}
