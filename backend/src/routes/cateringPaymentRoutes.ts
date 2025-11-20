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
import { pool } from '../config/database.js';
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
  const result = await pool.query(
    'SELECT id FROM caterings WHERE user_id = $1',
    [userId]
  );
  return result.rows.length > 0 ? result.rows[0].id : null;
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
    const fundStatusQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN p.status = 'LOCKED' THEN p.amount ELSE 0 END), 0) as locked_funds,
        COALESCE(SUM(CASE WHEN p.status = 'PENDING' OR p.status = 'PENDING_VERIFICATION' THEN p.amount ELSE 0 END), 0) as pending_verification,
        COALESCE(SUM(CASE WHEN p.status = 'RELEASED' OR p.status = 'COMPLETED' THEN p.amount ELSE 0 END), 0) as released_funds,
        COALESCE(SUM(p.amount), 0) as total_funds
      FROM payments p
      WHERE p.catering_id = $1
    `;
    const fundStatusResult = await pool.query(fundStatusQuery, [cateringId]);
    const fundStatus = fundStatusResult.rows[0];

    // ============================================
    // 2. Get Recent Transactions (grouped by date)
    // ============================================
    const transactionsQuery = `
      SELECT
        p.id,
        COALESCE(s.name, 'Unknown School') as description,
        p.amount,
        'income' as type,
        p.status,
        p.created_at as date
      FROM payments p
      LEFT JOIN allocations a ON p.allocation_id = a.id
      LEFT JOIN schools s ON p.school_id = s.id
      WHERE p.catering_id = $1
      ORDER BY p.created_at DESC
      LIMIT 50
    `;
    const transactionsResult = await pool.query(transactionsQuery, [cateringId]);

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
    transactionsResult.rows.forEach((row) => {
      const dateStr = new Date(row.date).toISOString().split('T')[0];
      if (!transactionsByDate[dateStr]) {
        transactionsByDate[dateStr] = [];
      }
      transactionsByDate[dateStr].push({
        id: `txn-${row.id}`,
        description: `Pembayaran dari ${row.description}`,
        amount: parseInt(row.amount),
        type: row.type,
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
    const cashFlowQuery = `
      SELECT
        TO_CHAR(p.created_at, 'Mon') as month,
        EXTRACT(MONTH FROM p.created_at) as month_num,
        COALESCE(SUM(CASE WHEN p.status IN ('RELEASED', 'COMPLETED') THEN p.amount ELSE 0 END), 0) as income,
        0 as expense
      FROM payments p
      WHERE p.catering_id = $1
        AND p.created_at >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(p.created_at, 'Mon'), EXTRACT(MONTH FROM p.created_at)
      ORDER BY month_num ASC
    `;
    const cashFlowResult = await pool.query(cashFlowQuery, [cateringId]);

    const cashFlowData = cashFlowResult.rows.map((row) => ({
      month: row.month,
      income: parseInt(row.income),
      expense: parseInt(row.expense),
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

    let query = `
      SELECT
        p.id,
        COALESCE(s.name, 'Unknown School') as school_name,
        p.amount,
        p.status,
        p.created_at,
        p.blockchain_tx_hash,
        a.allocation_id
      FROM payments p
      LEFT JOIN allocations a ON p.allocation_id = a.id
      LEFT JOIN schools s ON p.school_id = s.id
      WHERE p.catering_id = $1
    `;

    const params: any[] = [cateringId];
    let paramCounter = 2;

    if (status) {
      query += ` AND p.status = $${paramCounter}`;
      params.push(status);
      paramCounter++;
    }

    if (startDate) {
      query += ` AND p.created_at >= $${paramCounter}`;
      params.push(startDate);
      paramCounter++;
    }

    if (endDate) {
      query += ` AND p.created_at <= $${paramCounter}`;
      params.push(endDate);
      paramCounter++;
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // get total count
    let countQuery = 'SELECT COUNT(*) FROM payments WHERE catering_id = $1';
    const countParams = [cateringId];

    if (status) {
      countQuery += ' AND status = $2';
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
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

    let groupBy = "TO_CHAR(p.created_at, 'Mon')";
    let orderBy = 'EXTRACT(MONTH FROM p.created_at)';

    if (period === 'quarterly') {
      groupBy = "CONCAT('Q', EXTRACT(QUARTER FROM p.created_at))";
      orderBy = 'EXTRACT(QUARTER FROM p.created_at)';
    } else if (period === 'yearly') {
      groupBy = "EXTRACT(YEAR FROM p.created_at)::TEXT";
      orderBy = 'EXTRACT(YEAR FROM p.created_at)';
    }

    const query = `
      SELECT
        ${groupBy} as period,
        ${orderBy} as sort_order,
        COALESCE(SUM(CASE WHEN p.status IN ('RELEASED', 'COMPLETED') THEN p.amount ELSE 0 END), 0) as income,
        0 as expense
      FROM payments p
      WHERE p.catering_id = $1
        AND p.created_at >= NOW() - INTERVAL '${months} months'
      GROUP BY ${groupBy}, ${orderBy}
      ORDER BY sort_order ASC
    `;

    const result = await pool.query(query, [cateringId]);

    const cashFlowData = result.rows.map((row) => ({
      month: row.period,
      income: parseInt(row.income),
      expense: parseInt(row.expense),
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

    const summaryQuery = `
      SELECT
        COUNT(*) as total_transactions,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'COMPLETED' OR status = 'RELEASED' THEN amount ELSE 0 END), 0) as completed_amount,
        COALESCE(SUM(CASE WHEN status = 'LOCKED' THEN amount ELSE 0 END), 0) as locked_amount,
        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) as pending_amount
      FROM payments
      WHERE catering_id = $1
    `;

    const result = await pool.query(summaryQuery, [cateringId]);

    res.json({
      success: true,
      data: result.rows[0],
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
