import prisma from '../lib/prisma.js';
import { resolveShopOwnerId } from '../lib/shopAccess.js';

// Delivery vehicle types a product can require (matches the Prisma enum).
const DELIVERY_VEHICLE_TYPES = ['MOTORBIKE', 'CAR', 'LORRY'];

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

    // Build where clause. Only surface approved listings — same gate the
    // number-plate search applies, so a REJECTED item never shows here either.
    const where = {
      isActive: true,
      approvalStatus: 'APPROVED',
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
            select: { id: true, name: true },
          },
          store: {
            select: { id: true, name: true, rating: true, phone: true },
          },
          vehicleModel: {
            select: {
              id: true,
              name: true,
              vehicleBrand: { select: { id: true, name: true } },
              vehicleType: { select: { id: true, name: true } },
            },
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
          select: { id: true, name: true, rating: true, logo: true, phone: true },
        },
        vehicleModel: {
          include: {
            vehicleBrand: true,
            vehicleType: true,
          },
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
    // Scope to the shop owner (manager) so a salesman's items belong to the shop,
    // matching how orders are recorded & how dashboards query. See resolveShopOwnerId.
    const userId = await resolveShopOwnerId(req.user);
    const {
      name,
      description,
      price,
      discountPrice,
      sku,
      stock,
      images,
      categoryId,
      vehicleModelId,
      vehicleModelIds,
      compatibleVehicles,
      deliveryVehicle,
    } = req.body;

    // Support both the legacy single vehicleModelId and the newer multi-select
    // vehicleModelIds array (manager can tag one product to several models).
    const modelIds = Array.isArray(vehicleModelIds) && vehicleModelIds.length > 0
      ? [...new Set(vehicleModelIds)]
      : (vehicleModelId ? [vehicleModelId] : []);

    // Validate required fields
    if (!name || !price || modelIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, and at least one vehicle model are required',
      });
    }

    // The delivery vehicle (which rider vehicle can carry this product) is required.
    if (!DELIVERY_VEHICLE_TYPES.includes(deliveryVehicle)) {
      return res.status(400).json({
        success: false,
        message: 'Select a delivery vehicle: Motorbike, Car, or Lorry',
      });
    }

    // Verify that every selected vehicle model exists
    const matchingModels = await prisma.vehicleModel.findMany({
      where: { id: { in: modelIds } },
    });

    if (matchingModels.length !== modelIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more selected vehicle models are invalid',
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
        vehicleModelId: modelIds[0],
        deliveryVehicleType: deliveryVehicle,
        salesmanId: userId,
        storeId: store?.id,
        approvalStatus: 'APPROVED',
        compatibleModels: {
          connect: modelIds.map((id) => ({ id })),
        },
        compatibleVehicles: compatibleVehicles
          ? {
              create: compatibleVehicles,
            }
          : undefined,
      },
      include: {
        category: true,
        store: true,
        vehicleModel: {
          include: {
            vehicleBrand: true,
            vehicleType: true,
          },
        },
        compatibleModels: {
          include: {
            vehicleBrand: true,
            vehicleType: true,
          },
        },
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
    // Scope to the shop owner (manager) so a salesman's items belong to the shop,
    // matching how orders are recorded & how dashboards query. See resolveShopOwnerId.
    const userId = await resolveShopOwnerId(req.user);
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

    // Verify vehicleModelIds/vehicleModelId if provided
    const modelIds = Array.isArray(updateData.vehicleModelIds) && updateData.vehicleModelIds.length > 0
      ? [...new Set(updateData.vehicleModelIds)]
      : (updateData.vehicleModelId ? [updateData.vehicleModelId] : []);

    if (modelIds.length > 0) {
      const matchingModels = await prisma.vehicleModel.findMany({
        where: { id: { in: modelIds } },
      });

      if (matchingModels.length !== modelIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more selected vehicle models are invalid',
        });
      }
    }

    // If a delivery vehicle is supplied it must be valid; when omitted the
    // existing value is kept (undefined = no change).
    if (updateData.deliveryVehicle !== undefined && !DELIVERY_VEHICLE_TYPES.includes(updateData.deliveryVehicle)) {
      return res.status(400).json({
        success: false,
        message: 'Delivery vehicle must be Motorbike, Car, or Lorry',
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
        vehicleModelId: modelIds[0] || undefined,
        deliveryVehicleType: updateData.deliveryVehicle ?? undefined,
        isActive: updateData.isActive,
        compatibleModels: modelIds.length > 0
          ? { set: modelIds.map((id) => ({ id })) }
          : undefined,
      },
      include: {
        category: true,
        store: true,
        vehicleModel: {
          include: {
            vehicleBrand: true,
            vehicleType: true,
          },
        },
        compatibleModels: {
          include: {
            vehicleBrand: true,
            vehicleType: true,
          },
        },
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
    // Scope to the shop owner (manager) so a salesman's items belong to the shop,
    // matching how orders are recorded & how dashboards query. See resolveShopOwnerId.
    const userId = await resolveShopOwnerId(req.user);
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
    // A salesman views the shop catalog, which is owned by their manager.
    const userId = await resolveShopOwnerId(req.user);
    const { page = '1', limit = '20' } = req.query;

    const pageNum = Number.isFinite(parseInt(page)) && parseInt(page) > 0 ? parseInt(page) : 1;
    const limitNum = Number.isFinite(parseInt(limit)) && parseInt(limit) > 0 ? parseInt(limit) : 20;
    const skip = (pageNum - 1) * limitNum;
    // Upper bound of rows that could appear on this page from either table. Any item in
    // the merged page must be within the first (skip + limit) rows of its own table when
    // both are ordered by createdAt desc — so we never need to load more than this per table.
    const takeBound = skip + limitNum;

    // Fetch a bounded slice of both tables plus their totals (counts are cheap, index-only).
    const [products, carParts, productTotal, carPartTotal] = await Promise.all([
      prisma.product.findMany({
        where: { salesmanId: userId },
        orderBy: { createdAt: 'desc' },
        take: takeBound,
        include: {
          category: {
            select: { id: true, name: true },
          },
          vehicleModel: {
            include: {
              vehicleBrand: { select: { id: true, name: true } },
              vehicleType: { select: { id: true, name: true } },
            },
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
      prisma.carPart.findMany({
        where: { sellerId: userId },
        orderBy: { createdAt: 'desc' },
        take: takeBound,
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
      prisma.carPart.count({ where: { sellerId: userId } }),
    ]);

    // Compute status function
    const computeStatus = (item) => {
      const statuses = item.orderItems.map(oi => oi.order.status);
      let status = 'IN_STORE';
      if (statuses.includes('PROCESSING')) status = 'PROCESSING';
      else if (statuses.includes('PENDING')) status = 'PENDING';
      else if (statuses.includes('SHIPPED')) status = 'SHIPPED';
      else if (statuses.includes('DELIVERED')) status = 'DELIVERED';
      else if (statuses.includes('CANCELLED')) status = 'CANCELLED';
      return { ...item, computedStatus: status };
    };

    const enrichedProducts = products.map(computeStatus);
    const enrichedCarParts = carParts.map(computeStatus);

    // Combine and sort by createdAt descending
    const allItems = [...enrichedProducts, ...enrichedCarParts].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    // Slice the merged/sorted window down to the requested page. `allItems` holds at most
    // (skip + limit) rows per table, which is exactly enough to fill this page correctly.
    const total = productTotal + carPartTotal;
    const paginatedItems = allItems.slice(skip, skip + limitNum);

    res.json({
      success: true,
      data: {
        products: paginatedItems,
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

export {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getSalesmanProducts,
};
