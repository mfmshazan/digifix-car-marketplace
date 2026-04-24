import prisma from '../lib/prisma.js';

export const getRevenueStats = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Fetch orders from the last 7 days
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
        paymentStatus: 'PAID'
      },
      select: {
        createdAt: true,
        total: true,
      }
    });

    const revenueByDay = {};

    // Initialize last 7 days with 0
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      revenueByDay[dayName] = 0;
    }

    // Sum up totals by day
    orders.forEach(order => {
      const dayName = new Date(order.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
      if (revenueByDay[dayName] !== undefined) {
        revenueByDay[dayName] += order.total;
      }
    });

    const revenueData = Object.keys(revenueByDay).map(day => ({
      name: day,
      revenue: revenueByDay[day]
    }));

    res.json({
      success: true,
      data: revenueData
    });
  } catch (error) {
    console.error('Get revenue stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get revenue stats' });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalOrders = await prisma.order.count();
    const activeSellers = await prisma.user.count({
      where: { role: 'SALESMAN' }
    });
    
    // Calculate total revenue from delivered orders (or whatever status represents paid/completed)
    const revenueResult = await prisma.order.aggregate({
      _sum: {
        total: true,
      },
      where: {
        paymentStatus: 'PAID'
      }
    });

    const revenue = revenueResult._sum.total || 0;

    res.json({
      success: true,
      data: {
        totalUsers,
        totalOrders,
        activeSellers,
        revenue
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get dashboard stats' });
  }
};
