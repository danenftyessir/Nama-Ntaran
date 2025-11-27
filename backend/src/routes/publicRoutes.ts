// @ts-nocheck
import express from 'express';
import type { Response, Request } from 'express';
import { supabase } from '../config/database.js';

const router = express.Router();

// GET /api/public/allocation-chart - Get allocation and distribution data for chart (last 6 months)
router.get('/allocation-chart', async (req: Request, res: Response) => {
  try {
    // First, get the date range of available data
    const { data: dateRange, error: rangeError } = await supabase
      .from('deliveries')
      .select('delivery_date')
      .order('delivery_date', { ascending: false })
      .limit(1);

    if (rangeError) throw rangeError;

    // If no data, return empty
    if (!dateRange || dateRange.length === 0) {
      return res.json({ chartData: [] });
    }

    // Calculate 6 months before the latest delivery date
    const latestDate = new Date(dateRange[0].delivery_date);
    const sixMonthsBefore = new Date(latestDate);
    sixMonthsBefore.setMonth(sixMonthsBefore.getMonth() - 5); // -5 to include current month = 6 months total
    const sixMonthsBeforeStr = sixMonthsBefore.toISOString().split('T')[0];

    // Fetch all deliveries within this range
    const { data: allDeliveries, error } = await supabase
      .from('deliveries')
      .select('amount, delivery_date, status, created_at')
      .gte('delivery_date', sixMonthsBeforeStr)
      .order('delivery_date', { ascending: true });

    if (error) throw error;

    const deliveries = allDeliveries || [];

    // Group data by month
    const monthlyData = new Map<string, { alokasi: number; distribusi: number }>();

    // Get 6 months from the data range (from sixMonthsBefore to latestDate)
    const months: string[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    // Generate months from sixMonthsBefore to latestDate
    const currentMonth = new Date(sixMonthsBefore);
    currentMonth.setDate(1); // Set to first day of month

    while (currentMonth <= latestDate) {
      const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      months.push(monthKey);
      monthlyData.set(monthKey, { alokasi: 0, distribusi: 0 });
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    // Limit to 6 months
    const last6Months = months.slice(-6);

    // Process deliveries to separate allocation and distribution
    deliveries.forEach(delivery => {
      const date = new Date(delivery.delivery_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (monthlyData.has(monthKey)) {
        const data = monthlyData.get(monthKey)!;
        const amountInMillions = Math.round((delivery.amount || 0) / 1_000_000);

        // All deliveries count as allocation
        data.alokasi += amountInMillions;

        // Only delivered/verified count as distribution
        if (delivery.status === 'delivered' || delivery.status === 'verified') {
          data.distribusi += amountInMillions;
        }
      }
    });

    // Convert to array format for chart (use only last 6 months)
    const chartData = last6Months.map(monthKey => {
      const date = new Date(monthKey + '-01');
      const monthLabel = monthNames[date.getMonth()];
      const data = monthlyData.get(monthKey) || { alokasi: 0, distribusi: 0 };

      return {
        month: monthLabel,
        alokasi: data.alokasi,
        distribusi: data.distribusi
      };
    });

    res.json({ chartData });
  } catch (error) {
    console.error('Get allocation chart error:', error);
    res.status(500).json({
      error: 'Failed to fetch allocation chart data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/public/priority-schools - Get top priority schools with their allocation
router.get('/priority-schools', async (req: Request, res: Response) => {
  try {
    const { limit = '6' } = req.query;
    const limitNum = parseInt(limit as string);

    // Fetch top priority schools with their total deliveries
    const { data: schools, error } = await supabase
      .from('schools')
      .select('id, npsn, name, city, province, status, priority_score')
      .order('priority_score', { ascending: false })
      .limit(limitNum);

    if (error) throw error;

    // For each school, get the total budget from deliveries
    const schoolsWithBudget = await Promise.all(
      (schools || []).map(async (school) => {
        const { data: deliveries } = await supabase
          .from('deliveries')
          .select('amount')
          .eq('school_id', school.id);

        const totalBudget = (deliveries || []).reduce(
          (sum, delivery) => sum + (delivery.amount || 0),
          0
        );

        // Format budget to Rupiah
        const formattedBudget =
          totalBudget >= 1_000_000_000
            ? `Rp ${(totalBudget / 1_000_000_000).toFixed(1)} M`
            : totalBudget >= 1_000_000
            ? `Rp ${(totalBudget / 1_000_000).toFixed(1)} Jt`
            : totalBudget > 0
            ? `Rp ${(totalBudget / 1_000).toFixed(0)} Rb`
            : 'Rp 0';

        // Map status to display format
        let statusDisplay = 'Aktif';
        let statusColor = 'text-green-600 bg-green-50';

        if (school.status === 'inactive') {
          statusDisplay = 'Tidak Aktif';
          statusColor = 'text-gray-600 bg-gray-50';
        } else if (school.status === 'completed') {
          statusDisplay = 'Selesai';
          statusColor = 'text-blue-600 bg-blue-50';
        }

        return {
          nama: school.name,
          kota: school.city || school.province || 'N/A',
          anggaran: formattedBudget,
          status: statusDisplay,
          statusColor
        };
      })
    );

    res.json({ prioritySchools: schoolsWithBudget });
  } catch (error) {
    console.error('Get priority schools error:', error);
    res.status(500).json({
      error: 'Failed to fetch priority schools',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/public/statistics - Get summary statistics for transparency dashboard
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    // Get total amount distributed
    const { data: deliveries, error: deliveriesError } = await supabase
      .from('deliveries')
      .select('amount, status, school_id')
      .in('status', ['delivered', 'verified']);

    if (deliveriesError) throw deliveriesError;

    const totalAmountDistributed = (deliveries || []).reduce(
      (sum, delivery) => sum + (delivery.amount || 0),
      0
    );

    // Get total schools served
    const { data: schools, error: schoolsError, count } = await supabase
      .from('schools')
      .select('*', { count: 'exact', head: true });

    if (schoolsError) throw schoolsError;

    // Get schools with province information
    const { data: schoolsData, error: regionError } = await supabase
      .from('schools')
      .select('id, province');

    if (regionError) throw regionError;

    // Create a map of school_id to province
    const schoolProvinceMap = new Map<number, string>();
    (schoolsData || []).forEach(school => {
      schoolProvinceMap.set(school.id, school.province || 'Unknown');
    });

    // Calculate deliveries by province using the deliveries we already fetched
    const provinceMap = new Map<string, number>();

    (deliveries || []).forEach(delivery => {
      const province = schoolProvinceMap.get(delivery.school_id) || 'Unknown';
      provinceMap.set(province, (provinceMap.get(province) || 0) + (delivery.amount || 0));
    });

    // Get top 5 regions
    const topRegions = Array.from(provinceMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([region, amount], index) => {
        const colors = ['#8b5cf6', '#f59e0b', '#3b82f6', '#ec4899', '#10b981'];
        return {
          region,
          amount,
          color: colors[index % colors.length]
        };
      });

    res.json({
      success: true,
      data: {
        summary: {
          totalAmountDistributed,
          schoolsServed: count || 0
        },
        topRegions
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/public/blockchain-transactions - Get recent blockchain transactions
router.get('/blockchain-transactions', async (req: Request, res: Response) => {
  try {
    const { limit = '10' } = req.query;
    const limitNum = parseInt(limit as string);

    // Fetch recent deliveries
    const { data: deliveries, error } = await supabase
      .from('deliveries')
      .select('id, amount, delivery_date, status, school_id')
      .order('delivery_date', { ascending: false })
      .limit(limitNum);

    if (error) throw error;

    // Get school IDs from deliveries
    const schoolIds = [...new Set((deliveries || []).map(d => d.school_id))];

    // Fetch school names
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name')
      .in('id', schoolIds);

    if (schoolsError) throw schoolsError;

    // Create school map
    const schoolMap = new Map<number, string>();
    (schools || []).forEach(school => {
      schoolMap.set(school.id, school.name);
    });

    // Format transactions for display
    const transactions = (deliveries || []).map(delivery => {
      const date = new Date(delivery.delivery_date);
      const timeStr = date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
      });

      const amountInMillions = delivery.amount / 1_000_000;
      const formattedAmount = amountInMillions >= 1
        ? `Rp ${amountInMillions.toFixed(1)} Juta`
        : `Rp ${(delivery.amount / 1_000).toFixed(0)} Ribu`;

      return {
        time: timeStr,
        amount: formattedAmount,
        receiver: schoolMap.get(delivery.school_id) || 'Unknown School',
        status: delivery.status === 'verified' || delivery.status === 'delivered'
          ? 'Selesai'
          : 'Pending',
        txHash: `tx-${delivery.id}`
      };
    });

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Get blockchain transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blockchain transactions',
      details: error instanceof Error ? error.message : JSON.stringify(error)
    });
  }
});

// GET /api/public/regions - Get school priority score distribution by region
router.get('/regions', async (req: Request, res: Response) => {
  try {
    // Fetch all schools with priority scores
    const { data: schools, error } = await supabase
      .from('schools')
      .select('priority_score');

    if (error) throw error;

    // Categorize schools by priority score ranges
    const categories = [
      { category: 'Sangat Tinggi', min: 80, max: 100, count: 0, color: '#ef4444' },
      { category: 'Tinggi', min: 60, max: 79, count: 0, color: '#f59e0b' },
      { category: 'Sedang', min: 40, max: 59, count: 0, color: '#eab308' },
      { category: 'Rendah', min: 20, max: 39, count: 0, color: '#3b82f6' },
      { category: 'Sangat Rendah', min: 0, max: 19, count: 0, color: '#10b981' }
    ];

    (schools || []).forEach(school => {
      const score = school.priority_score || 0;
      const category = categories.find(cat => score >= cat.min && score <= cat.max);
      if (category) {
        category.count++;
      }
    });

    // Convert counts to visual heights (max 200px)
    const maxCount = Math.max(...categories.map(cat => cat.count), 1);
    const scoreData = categories.map(cat => ({
      category: cat.category,
      value: Math.round((cat.count / maxCount) * 200),
      count: cat.count,
      color: cat.color
    }));

    res.json({
      success: true,
      data: scoreData
    });
  } catch (error) {
    console.error('Get regions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch regions data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
