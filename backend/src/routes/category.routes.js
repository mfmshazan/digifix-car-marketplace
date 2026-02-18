import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Get all categories with products and car parts count
router.get('/', async (req, res) => {
  try {
    // Get all top-level categories
    const categories = await prisma.category.findMany({
      where: {
        parentId: null,
      },
      include: {
        children: true,
      },
    });
    
    // Get counts for each category using raw count queries
    const categoriesWithCounts = await Promise.all(
      categories.map(async (cat) => {
        const productsCount = await prisma.product.count({
          where: { categoryId: cat.id }
        });
        const carPartsCount = await prisma.carPart.count({
          where: { categoryId: cat.id }
        });
        
        return {
          ...cat,
          _count: {
            products: productsCount,
            carParts: carPartsCount
          },
          totalPartsCount: productsCount + carPartsCount,
        };
      })
    );
    
    res.json({ success: true, data: categoriesWithCounts });
  } catch (error) {
    console.error('Category fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// Create category (Admin/Salesman)
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, icon, image, parentId } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const category = await prisma.category.create({
      data: { name, description, icon, image, parentId },
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create category' });
  }
});

// Get category by ID with its products and car parts
router.get('/:id', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: {
        children: true,
        products: {
          where: { isActive: true },
          take: parseInt(limit),
          skip,
          include: {
            salesman: {
              select: { id: true, name: true }
            }
          }
        },
        carParts: {
          where: { isActive: true },
          take: parseInt(limit),
          skip,
          include: {
            seller: {
              select: { id: true, name: true }
            },
            car: {
              select: { id: true, numberPlate: true, make: true, model: true, year: true }
            }
          }
        },
      },
    });
    
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    
    // Get total counts for pagination
    const [productsCount, carPartsCount] = await Promise.all([
      prisma.product.count({ where: { categoryId: req.params.id, isActive: true } }),
      prisma.carPart.count({ where: { categoryId: req.params.id, isActive: true } })
    ]);
    
    res.json({ 
      success: true, 
      data: {
        ...category,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalProducts: productsCount,
          totalCarParts: carPartsCount,
          total: productsCount + carPartsCount
        }
      }
    });
  } catch (error) {
    console.error('Category fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch category' });
  }
});

// Get parts by category name (for search by category name like "Brakes")
router.get('/name/:name/parts', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const categoryName = req.params.name;
    
    // Find category by name (case-insensitive)
    const category = await prisma.category.findFirst({
      where: { 
        name: { 
          equals: categoryName,
          mode: 'insensitive'
        } 
      }
    });
    
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    
    // Get car parts in this category
    const [carParts, products, carPartsCount, productsCount] = await Promise.all([
      prisma.carPart.findMany({
        where: { categoryId: category.id, isActive: true },
        take: parseInt(limit),
        skip,
        include: {
          seller: { select: { id: true, name: true } },
          car: { select: { id: true, numberPlate: true, make: true, model: true, year: true } },
          category: { select: { id: true, name: true, icon: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.findMany({
        where: { categoryId: category.id, isActive: true },
        take: parseInt(limit),
        skip,
        include: {
          salesman: { select: { id: true, name: true } },
          category: { select: { id: true, name: true, icon: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.carPart.count({ where: { categoryId: category.id, isActive: true } }),
      prisma.product.count({ where: { categoryId: category.id, isActive: true } })
    ]);
    
    res.json({ 
      success: true, 
      data: {
        category,
        carParts,
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalCarParts: carPartsCount,
          totalProducts: productsCount,
          total: carPartsCount + productsCount
        }
      }
    });
  } catch (error) {
    console.error('Category parts fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch category parts' });
  }
});

export default router;
