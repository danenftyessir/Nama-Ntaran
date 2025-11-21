// @ts-nocheck
import express from 'express';
import { supabase } from '../config/database.js';

const router = express.Router();

/**
 * GET /api/blockchain/feed
 * Get recent blockchain transactions (public endpoint)
 */
router.get('/feed', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const { data: transactions, error, count } = await supabase
      .from('escrow_transactions')
      .select(`
        *,
        deliveries(
          portions,
          delivery_date,
          schools(name, npsn, province, city)
        ),
        caterings(name)
      `, { count: 'exact' })
      .in('status', ['locked', 'released'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    const formattedTransactions = (transactions || []).map((row: any) => ({
      id: row.id,
      escrowId: row.escrow_id,
      type: row.status === 'locked' ? 'FundLocked' : 'FundReleased',
      amount: parseFloat(row.amount),
      status: row.status,
      txHash: row.tx_hash,
      blockNumber: row.block_number,
      school: {
        name: row.deliveries?.schools?.name,
        npsn: row.deliveries?.schools?.npsn,
        province: row.deliveries?.schools?.province,
        city: row.deliveries?.schools?.city
      },
      catering: {
        name: row.caterings?.name
      },
      portions: row.deliveries?.portions,
      deliveryDate: row.deliveries?.delivery_date,
      timestamp: row.status === 'released' ? row.released_at : row.locked_at,
      createdAt: row.created_at
    }));

    res.json({
      success: true,
      data: formattedTransactions,
      pagination: {
        limit,
        offset,
        total: count || 0
      }
    });
  } catch (error: any) {
    console.error('Error fetching blockchain feed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blockchain feed',
      details: error.message
    });
  }
});

/**
 * GET /api/blockchain/stats
 * Get blockchain statistics (public endpoint)
 */
router.get('/stats', async (req, res) => {
  try {
    const { data: transactions, error } = await supabase
      .from('escrow_transactions')
      .select('*');

    if (error) {
      throw error;
    }

    const transactionsList = transactions || [];

    // Calculate stats
    const totalLocked = transactionsList.filter((t: any) => t.status === 'locked').length;
    const totalReleased = transactionsList.filter((t: any) => t.status === 'released').length;

    const totalAmountLocked = transactionsList
      .filter((t: any) => t.status === 'locked')
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0);

    const totalAmountReleased = transactionsList
      .filter((t: any) => t.status === 'released')
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0);

    const deliveriesCompleted = new Set(
      transactionsList
        .filter((t: any) => t.status === 'released')
        .map((t: any) => t.delivery_id)
    ).size;

    res.json({
      success: true,
      data: {
        totalLocked,
        totalReleased,
        totalAmountLocked,
        totalAmountReleased,
        deliveriesCompleted
      }
    });
  } catch (error: any) {
    console.error('Error fetching blockchain stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blockchain stats',
      details: error.message
    });
  }
});

/**
 * GET /api/blockchain/transaction/:txHash
 * Get transaction details by hash (public endpoint)
 */
router.get('/transaction/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;

    const { data: tx, error } = await supabase
      .from('escrow_transactions')
      .select(`
        *,
        deliveries(
          portions,
          delivery_date,
          schools(name, npsn, address)
        ),
        caterings(name, wallet_address)
      `)
      .eq('tx_hash', txHash)
      .single();

    if (error || !tx) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: {
        escrowId: tx.escrow_id,
        amount: parseFloat(tx.amount),
        status: tx.status,
        txHash: tx.tx_hash,
        blockNumber: tx.block_number,
        lockedAt: tx.locked_at,
        releasedAt: tx.released_at,
        school: {
          name: tx.deliveries?.schools?.name,
          npsn: tx.deliveries?.schools?.npsn,
          address: tx.deliveries?.schools?.address
        },
        catering: {
          name: tx.caterings?.name,
          walletAddress: tx.caterings?.wallet_address
        },
        delivery: {
          portions: tx.deliveries?.portions,
          date: tx.deliveries?.delivery_date
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction',
      details: error.message
    });
  }
});

export default router;
