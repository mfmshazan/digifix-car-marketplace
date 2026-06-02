import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

// GET /api/stats - Public endpoint for landing page statistics
router.get('/', async (req, res) => {
  try {
    const [partsCount, customersCount, sellersCount] = await Promise.all([
      prisma.carPart.count(),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({ where: { role: 'SALESMAN' } })
    ]);

    res.json({
      success: true,
      data: {
        partsListed: partsCount,
        happyCustomers: customersCount,
        activeSellers: sellersCount
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch statistics',
      data: {
        partsListed: 0,
        happyCustomers: 0,
        activeSellers: 0
      }
    });
  }
});

export default router;
