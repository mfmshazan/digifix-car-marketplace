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

// Get Global Catalog
const getCatalog = async (req, res) => {
  try {
    const { type = 'PRODUCT', status } = req.query;

    let whereClause = {};
    if (status === 'active') whereClause.isActive = true;
    if (status === 'pending') whereClause.isActive = false; // Using isActive=false to represent pending/flagged

    let items;
    if (type === 'PRODUCT') {
      items = await prisma.product.findMany({
        where: whereClause,
        take: 50,
        include: { 
          salesman: { select: { name: true } }, 
          category: { 
            include: { parent: { select: { name: true } } } 
          } 
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      items = await prisma.carPart.findMany({
        where: whereClause,
        take: 50,
        include: { 
          seller: { select: { name: true } }, 
          category: { 
            include: { parent: { select: { name: true } } } 
          } 
        },
        orderBy: { createdAt: 'desc' }
      });
    }


    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update Catalog Item Status
const updateCatalogItemStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, isActive } = req.body;

    if (type === 'PRODUCT') {
      await prisma.product.update({ where: { id }, data: { isActive } });
    } else if (type === 'CAR_PART') {
      await prisma.carPart.update({ where: { id }, data: { isActive } });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid catalog type' });
    }

    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export { getOverviewStats, Users, updateUserStatus, getFinances, getCatalog, updateCatalogItemStatus };