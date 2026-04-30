import prisma from '../lib/prisma.js';

// Get all products (with filters)
const getProducts = async (req, res) => {
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

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {
      isActive: true,
    };

    if (category) {
      where.categoryId = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    // Get products
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: {
            select: { id: true, name: true },
          },
          salesman: {
            select: {
              id: true,
              name: true,
              phone: true,
              avatar: true,
              store: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  logo: true,
                  rating: true,
                  isVerified: true,
                },
              },
            },
          },
          store: {
            select: { id: true, name: true, phone: true, rating: true, logo: true, isVerified: true },
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
const getProductById = async (req, res) => {
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
const createProduct = async (req, res) => {
  try {
    const userId = req.user.userId;
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
    if (!name || !price) {
      return res.status(400).json({
        success: false,
        message: 'Name and price are required',
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
        categoryId: categoryId || null,
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
const updateProduct = async (req, res) => {
  try {
    const userId = req.user.userId;
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
        categoryId: updateData.categoryId || null,
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
const deleteProduct = async (req, res) => {
  try {
    const userId = req.user.userId;
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
const getSalesmanProducts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
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
          orderItems: {
            select: {
              id: true,
              order: {
                select: { status: true }
              }
            }
          }
        },
      }),
      prisma.product.count({ where: { salesmanId: userId } }),
    ]);

    // Compute status for each product
    const enrichedProducts = products.map(product => {
      // Logic: find the "most active" status among its order items
      // Priority: PROCESSING > PENDING > SHIPPED > DELIVERED
      const statuses = product.orderItems.map(item => item.order.status);
      
      let status = 'IN_STORE';
      if (statuses.includes('PROCESSING')) status = 'PROCESSING';
      else if (statuses.includes('PENDING')) status = 'PENDING';
      else if (statuses.includes('SHIPPED')) status = 'SHIPPED';
      else if (statuses.includes('DELIVERED')) status = 'DELIVERED';
      else if (statuses.includes('CANCELLED')) status = 'CANCELLED';

      return { ...product, computedStatus: status };
    });

    res.json({
      success: true,
      data: {
        products: enrichedProducts,
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

// Upload product images
const uploadProductImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No images uploaded' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const urls = req.files.map(file => `${baseUrl}/uploads/${file.filename}`);

    return res.json({ success: true, data: { urls } });
  } catch (error) {
    console.error('Upload product images error:', error);
    return res.status(500).json({ success: false, message: 'Failed to upload images' });
  }
};

export {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getSalesmanProducts,
  uploadProductImages,
};
