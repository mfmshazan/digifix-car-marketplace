import prisma from '../lib/prisma.js';

// Get high-level system overview stats
const getOverviewStats = async (req, res) => {
  try {
    const [totalUsers, activeSellers, pendingOrders, platformFees] = await Promise.all([
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'SALESMAN', status: 'ACTIVE' } }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.walletTransaction.aggregate({
        where: { type: 'PLATFORM_FEE' },
        _sum: { amount: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalActiveUsers: totalUsers,
        activeSellers: activeSellers,
        pendingOrders: pendingOrders,
        totalRevenue: platformFees._sum.amount || 0
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all users
const Users = async (req, res) => {
  try {
    const { role, status, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const whereClause = {};
    if (role) whereClause.role = role;
    if (status) whereClause.status = status;

    const users = await prisma.user.findMany({
      where: whereClause,
      skip: parseInt(skip),
      take: parseInt(limit),
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update user status
const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status }
    });

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};


// Get Platform Finances — reads from Orders (the real financial ledger)
const getFinances = async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {};
    if (status) whereClause.status = status;
    if (paymentStatus) whereClause.paymentStatus = paymentStatus;
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom);
      if (dateTo)   whereClause.createdAt.lte = new Date(dateTo);
    }

    const [orders, totalCount, totals] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          salesman: { select: { id: true, name: true, email: true } },
          items: { select: { itemName: true, quantity: true, price: true, total: true, itemType: true } },
        },
      }),
      prisma.order.count({ where: whereClause }),
      prisma.order.aggregate({
        where: whereClause,
        _sum: { total: true, subtotal: true, deliveryFee: true },
      }),
    ]);

    // Enrich each order with a computed platform fee (5% of subtotal)
    const enriched = orders.map((o) => ({
      ...o,
      platformFee: parseFloat(((o.subtotal || 0) * 0.05).toFixed(2)),
    }));

    res.json({
      success: true,
      data: enriched,
      meta: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalRevenue: totals._sum.total || 0,
        totalPlatformFee: parseFloat(((totals._sum.subtotal || 0) * 0.05).toFixed(2)),
      },
    });
  } catch (error) {
    console.error('Error fetching finances:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// Get order count & revenue over time for the Overview charts.
// range: '14d' | '1m' | '1y' | 'custom' (custom requires from/to query params).
// Buckets by day for spans up to ~2 months, otherwise by month (so a 1-year
// view renders 12 bars instead of 365).
const getAnalytics = async (req, res) => {
  try {
    const { range = '14d', from, to } = req.query;

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    let startDate;
    let endDate = today;

    if (range === 'custom') {
      if (!from || !to) {
        return res.status(400).json({ success: false, message: '"from" and "to" are required for a custom range' });
      }
      startDate = new Date(from);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
    } else if (range === '1m') {
      startDate = new Date(today);
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setDate(startDate.getDate() + 1);
      startDate.setHours(0, 0, 0, 0);
    } else if (range === '1y') {
      startDate = new Date(today);
      startDate.setFullYear(startDate.getFullYear() - 1);
      startDate.setDate(startDate.getDate() + 1);
      startDate.setHours(0, 0, 0, 0);
    } else {
      // default 14d
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 13);
      startDate.setHours(0, 0, 0, 0);
    }

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) {
      return res.status(400).json({ success: false, message: 'Invalid date range' });
    }

    const spanDays = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000)) + 1;
    const granularity = spanDays > 62 ? 'month' : 'day';

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { createdAt: true, total: true },
    });

    const buckets = [];
    const bucketByKey = {};

    if (granularity === 'day') {
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        const bucket = { key, label: key, orders: 0, revenue: 0 };
        buckets.push(bucket);
        bucketByKey[key] = bucket;
      }
      orders.forEach((o) => {
        const key = o.createdAt.toISOString().slice(0, 10);
        const bucket = bucketByKey[key];
        if (bucket) {
          bucket.orders += 1;
          bucket.revenue += o.total || 0;
        }
      });
    } else {
      let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const endCursor = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      while (cursor <= endCursor) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        const label = cursor.toLocaleString('en-AU', { month: 'short', year: 'numeric' });
        const bucket = { key, label, orders: 0, revenue: 0 };
        buckets.push(bucket);
        bucketByKey[key] = bucket;
        cursor.setMonth(cursor.getMonth() + 1);
      }
      orders.forEach((o) => {
        const key = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, '0')}`;
        const bucket = bucketByKey[key];
        if (bucket) {
          bucket.orders += 1;
          bucket.revenue += o.total || 0;
        }
      });
    }

    res.json({
      success: true,
      data: buckets,
      meta: { granularity, from: startDate.toISOString(), to: endDate.toISOString() },
    });
  } catch (error) {
    console.error('Error fetching admin analytics:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get rider roster + delivery job performance (Rider & Delivery Ops tab)
const getRiderOps = async (req, res) => {
  try {
    const [riders, jobStatusGroups, recentJobs] = await Promise.all([
      prisma.rider.findMany({
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          status: true,
          rating: true,
          totalDeliveries: true,
          vehicleType: true,
        },
        orderBy: { totalDeliveries: 'desc' },
      }),
      prisma.deliveryJob.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.deliveryJob.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          customerName: true,
          paymentAmount: true,
          createdAt: true,
          partner: { select: { fullName: true } },
        },
      }),
    ]);

    const summary = riders.reduce(
      (acc, r) => {
        if (r.status === 'busy') acc.busy += 1;
        else if (r.status === 'online' || r.status === 'available') acc.online += 1;
        else acc.offline += 1;
        return acc;
      },
      { total: riders.length, online: 0, busy: 0, offline: 0 }
    );

    const jobStatusCounts = jobStatusGroups.map((g) => ({ status: g.status, count: g._count.status }));

    res.json({ success: true, data: { summary, riders, jobStatusCounts, recentJobs } });
  } catch (error) {
    console.error('Error fetching rider ops:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export { getOverviewStats, Users, updateUserStatus, getFinances, getAnalytics, getRiderOps };