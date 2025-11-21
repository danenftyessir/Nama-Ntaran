// @ts-nocheck
/**
 * ============================================
 * CATERING PAYMENT ROUTES
 * ============================================
 * Routes untuk dashboard pembayaran catering
 * Menyediakan data fund status, transaksi, dan arus kas
 *
 * Endpoints:
 * GET /api/catering/payments/dashboard - Get payment dashboard data
 * GET /api/catering/payments/transactions - Get transaction history
 * GET /api/catering/payments/cashflow - Get cash flow data
 *
 * Author: NutriChain Dev Team
 */

import express, { Router } from 'express';
import type { Response } from 'express';
import { supabase } from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const router: Router = express.Router();

// semua routes memerlukan authentication dan role catering
router.use(authenticateToken);
router.use(requireRole('catering'));

// ============================================
// HELPER: Get Catering ID from User
// ============================================
async function getCateringIdFromUser(userId: number): Promise<number | null> {
  const { data, error } = await supabase
    .from('caterings')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.id;
}

// ============================================
// GET /api/catering/payments/dashboard
// ============================================
/**
 * Get all payment dashboard data in one call
 * Returns: fund status, recent transactions, cash flow data
 */
router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cateringId = await getCateringIdFromUser(userId);
    if (!cateringId) {
      return res.status(404).json({ error: 'Catering not found for user' });
    }

    // ============================================
    // 1. Get Fund Status
    // ============================================
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount, status')
      .eq('catering_id', cateringId);

    if (paymentsError) {
      throw paymentsError;
    }

    // Calculate fund status aggregations
    const fundStatus = {
      locked_funds: 0,
      pending_verification: 0,
      released_funds: 0,
      total_funds: 0,
    };

    payments?.forEach((p) => {
      const amount = parseFloat(p.amount) || 0;
      fundStatus.total_funds += amount;

      if (p.status === 'LOCKED') {
        fundStatus.locked_funds += amount;
      } else if (p.status === 'PENDING' || p.status === 'PENDING_VERIFICATION') {
        fundStatus.pending_verification += amount;
      } else if (p.status === 'RELEASED' || p.status === 'COMPLETED') {
        fundStatus.released_funds += amount;
      }
    });

    // ============================================
    // 2. Get Recent Transactions (grouped by date)
    // ============================================
    const { data: transactionsData, error: transactionsError } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        status,
        created_at,
        school_id,
        schools!left(name)
      `)
      .eq('catering_id', cateringId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (transactionsError) {
      throw transactionsError;
    }

    // map status ke format frontend
    const statusMap: Record<string, string> = {
      PENDING: 'sent',
      PENDING_VERIFICATION: 'sent',
      LOCKED: 'paid',
      RELEASED: 'completed',
      COMPLETED: 'completed',
      REFUNDED: 'returned',
      CANCELLED: 'returned',
    };

    // group transactions by date
    const transactionsByDate: Record<string, any[]> = {};
    transactionsData?.forEach((row) => {
      const dateStr = new Date(row.created_at).toISOString().split('T')[0];
      const schoolName = row.schools?.name || 'Unknown School';

      if (!transactionsByDate[dateStr]) {
        transactionsByDate[dateStr] = [];
      }
      transactionsByDate[dateStr].push({
        id: `txn-${row.id}`,
        description: `Pembayaran dari ${schoolName}`,
        amount: parseInt(row.amount),
        type: 'income',
        status: statusMap[row.status] || 'completed',
        date: dateStr,
      });
    });

    const transactions = Object.entries(transactionsByDate)
      .map(([date, txns]) => ({
        date,
        transactions: txns,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // ============================================
    // 3. Get Cash Flow Data (last 6 months)
    // ============================================
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: cashFlowPayments, error: cashFlowError } = await supabase
      .from('payments')
      .select('created_at, amount, status')
      .eq('catering_id', cateringId)
      .gte('created_at', sixMonthsAgo.toISOString());

    if (cashFlowError) {
      throw cashFlowError;
    }

    // Group by month and calculate income
    const monthlyData = new Map<string, { month: string; monthNum: number; income: number }>();

    cashFlowPayments?.forEach((p) => {
      const date = new Date(p.created_at);
      const monthName = date.toLocaleString('en-US', { month: 'short' });
      const monthNum = date.getMonth() + 1;
      const key = `${monthNum}-${monthName}`;

      if (!monthlyData.has(key)) {
        monthlyData.set(key, { month: monthName, monthNum, income: 0 });
      }

      const existing = monthlyData.get(key)!;
      if (p.status === 'RELEASED' || p.status === 'COMPLETED') {
        existing.income += parseFloat(p.amount) || 0;
      }
    });

    const cashFlowData = Array.from(monthlyData.values())
      .sort((a, b) => a.monthNum - b.monthNum)
      .map((item) => ({
        month: item.month,
        income: parseInt(item.income.toString()),
        expense: 0,
      }));

    // Return actual data (empty array if no historical data exists)
    // Frontend should handle empty state gracefully

    // ============================================
    // Return Combined Response
    // ============================================
    res.json({
      success: true,
      data: {
        fundStatus: {
          lockedFunds: parseInt(fundStatus.locked_funds),
          pendingVerification: parseInt(fundStatus.pending_verification),
          releasedFunds: parseInt(fundStatus.released_funds),
          totalFunds: parseInt(fundStatus.total_funds),
        },
        transactions,
        cashFlowData,
      },
    });
  } catch (error: any) {
    console.error('Error fetching payment dashboard:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// ============================================
// GET /api/catering/payments/transactions
// ============================================
/**
 * Get transaction history with pagination
 */
router.get('/transactions', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cateringId = await getCateringIdFromUser(userId);
    if (!cateringId) {
      return res.status(404).json({ error: 'Catering not found for user' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    // Build query with filters
    let query = supabase
      .from('payments')
      .select(`
        id,
        amount,
        status,
        created_at,
        blockchain_tx_hash,
        allocations!left(allocation_id),
        schools!left(name)
      `, { count: 'exact' })
      .eq('catering_id', cateringId);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Apply ordering and pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    // Transform data to match expected format
    const transformedData = data?.map((row: any) => ({
      id: row.id,
      school_name: row.schools?.name || 'Unknown School',
      amount: row.amount,
      status: row.status,
      created_at: row.created_at,
      blockchain_tx_hash: row.blockchain_tx_hash,
      allocation_id: row.allocations?.allocation_id,
    }));

    const total = count || 0;

    res.json({
      success: true,
      data: transformedData || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching transactions:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// ============================================
// GET /api/catering/payments/cashflow
// ============================================
/**
 * Get cash flow data for chart
 */
router.get('/cashflow', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cateringId = await getCateringIdFromUser(userId);
    if (!cateringId) {
      return res.status(404).json({ error: 'Catering not found for user' });
    }

    const period = (req.query.period as string) || 'monthly';
    const months = parseInt(req.query.months as string) || 6;

    // Get payments for the specified period
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select('created_at, amount, status')
      .eq('catering_id', cateringId)
      .gte('created_at', startDate.toISOString());

    if (paymentsError) {
      throw paymentsError;
    }

    // Group data based on period
    const periodData = new Map<string, { period: string; sortOrder: number; income: number }>();

    paymentsData?.forEach((p) => {
      const date = new Date(p.created_at);
      let periodKey: string;
      let sortOrder: number;

      if (period === 'quarterly') {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        periodKey = `Q${quarter}`;
        sortOrder = quarter;
      } else if (period === 'yearly') {
        periodKey = date.getFullYear().toString();
        sortOrder = date.getFullYear();
      } else {
        // monthly (default)
        periodKey = date.toLocaleString('en-US', { month: 'short' });
        sortOrder = date.getMonth() + 1;
      }

      const key = `${sortOrder}-${periodKey}`;
      if (!periodData.has(key)) {
        periodData.set(key, { period: periodKey, sortOrder, income: 0 });
      }

      const existing = periodData.get(key)!;
      if (p.status === 'RELEASED' || p.status === 'COMPLETED') {
        existing.income += parseFloat(p.amount) || 0;
      }
    });

    const cashFlowData = Array.from(periodData.values())
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({
        month: item.period,
        income: parseInt(item.income.toString()),
        expense: 0,
      }));

    res.json({
      success: true,
      data: cashFlowData,
    });
  } catch (error: any) {
    console.error('Error fetching cash flow:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// ============================================
// GET /api/catering/payments/summary
// ============================================
/**
 * Get payment summary/stats
 */
router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cateringId = await getCateringIdFromUser(userId);
    if (!cateringId) {
      return res.status(404).json({ error: 'Catering not found for user' });
    }

    const { data: summaryPayments, error: summaryError } = await supabase
      .from('payments')
      .select('amount, status')
      .eq('catering_id', cateringId);

    if (summaryError) {
      throw summaryError;
    }

    // Calculate summary aggregations
    const summary = {
      total_transactions: summaryPayments?.length || 0,
      total_amount: 0,
      completed_amount: 0,
      locked_amount: 0,
      pending_amount: 0,
    };

    summaryPayments?.forEach((p) => {
      const amount = parseFloat(p.amount) || 0;
      summary.total_amount += amount;

      if (p.status === 'COMPLETED' || p.status === 'RELEASED') {
        summary.completed_amount += amount;
      } else if (p.status === 'LOCKED') {
        summary.locked_amount += amount;
      } else if (p.status === 'PENDING') {
        summary.pending_amount += amount;
      }
    });

    res.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error('Error fetching payment summary:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

export default router;
