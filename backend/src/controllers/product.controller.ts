import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// Get all products (with filters)
export const getProducts = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      category,
      search,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {
      isActive: true,
    };

    if (category) {
      where.categoryId = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice as string);
      if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
    }

    // Get products
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          category: {
            select: { id: true, name: true },
          },
          salesman: {
            select: { id: true, name: true },
          },
          store: {
            select: { id: true, name: true, rating: true },
          },
          _count: {
            select: { reviews: true },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
    });
  }
};

// Get product by ID
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        salesman: {
          select: { id: true, name: true, avatar: true },
        },
        store: {
          select: { id: true, name: true, rating: true, logo: true },
        },
        compatibleVehicles: true,
        reviews: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { reviews: true },
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
    });
  }
};

// Create product (Salesman only)
export const createProduct = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const {
      name,
      description,
      price,
      discountPrice,
      sku,
      stock,
      images,
      categoryId,
      compatibleVehicles,
    } = req.body;

    // Validate required fields
    if (!name || !price || !categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, and category are required',
      });
    }

    // Get salesman's store
    const store = await prisma.store.findUnique({
      where: { ownerId: userId },
    });

    // Create product
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        discountPrice: discountPrice ? parseFloat(discountPrice) : null,
        sku,
        stock: stock ? parseInt(stock) : 0,
        images: images || [],
        categoryId,
        salesmanId: userId,
        storeId: store?.id,
        compatibleVehicles: compatibleVehicles
          ? {
              create: compatibleVehicles,
            }
          : undefined,
      },
      include: {
        category: true,
        store: true,
        compatibleVehicles: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
    });
  }
};

// Update product (Salesman only)
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;
    const updateData = req.body;

    // Check if product belongs to salesman
    const existingProduct = await prisma.product.findFirst({
      where: { id, salesmanId: userId },
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or unauthorized',
      });
    }

    // Update product
    const product = await prisma.product.update({
      where: { id },
      data: {
        name: updateData.name,
        description: updateData.description,
        price: updateData.price ? parseFloat(updateData.price) : undefined,
        discountPrice: updateData.discountPrice ? parseFloat(updateData.discountPrice) : null,
        sku: updateData.sku,
        stock: updateData.stock ? parseInt(updateData.stock) : undefined,
        images: updateData.images,
        categoryId: updateData.categoryId,
        isActive: updateData.isActive,
      },
      include: {
        category: true,
        store: true,
      },
    });

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
    });
  }
};

// Delete product (Salesman only)
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    // Check if product belongs to salesman
    const existingProduct = await prisma.product.findFirst({
      where: { id, salesmanId: userId },
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or unauthorized',
      });
    }

    // Delete product
    await prisma.product.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
    });
  }
};

// Get salesman's products
export const getSalesmanProducts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: { salesmanId: userId },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          category: {
            select: { id: true, name: true },
          },
          _count: {
            select: { reviews: true, orderItems: true },
          },
        },
      }),
      prisma.product.count({ where: { salesmanId: userId } }),
    ]);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Get salesman products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
    });
  }
};
