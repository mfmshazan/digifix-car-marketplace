import prisma from '../lib/prisma.js';

/**
 * Get salesman's sales summary
 * Returns daily sales, total revenue, and product details for the salesman
 */
export const getSalesmanSalesSummary = async (req, res) => {
  try {
    const salesmanId = req.user.id;
    const { date } = req.query;
    
    // Default to today if no date provided
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // Get today's orders for this salesman
    const todayOrders = await prisma.order.findMany({
      where: {
        salesmanId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                category: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate today's summary
    const todayStats = todayOrders.reduce((acc, order) => {
      acc.totalOrders += 1;
      acc.totalRevenue += order.total;
      acc.pendingOrders += order.status === 'PENDING' ? 1 : 0;
      acc.completedOrders += order.status === 'DELIVERED' ? 1 : 0;
      acc.totalItems += order.items.reduce((sum, item) => sum + item.quantity, 0);
      return acc;
    }, {
      totalOrders: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      completedOrders: 0,
      totalItems: 0
    });

    // Get this week's orders for comparison
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const weekOrders = await prisma.order.findMany({
      where: {
        salesmanId,
        createdAt: {
          gte: startOfWeek
        }
      },
      select: {
        total: true,
        createdAt: true
      }
    });

    const weeklyRevenue = weekOrders.reduce((sum, order) => sum + order.total, 0);
    const weeklyOrders = weekOrders.length;

    // Get this month's statistics
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthOrders = await prisma.order.findMany({
      where: {
        salesmanId,
        createdAt: {
          gte: startOfMonth
        }
      },
      select: {
        total: true
      }
    });

    const monthlyRevenue = monthOrders.reduce((sum, order) => sum + order.total, 0);
    const monthlyOrders = monthOrders.length;

    // Get top selling products this month
    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          salesmanId,
          createdAt: {
            gte: startOfMonth
          }
        }
      },
      _sum: {
        quantity: true,
        total: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: 5
    });

    // Get product details for top products
    const topProductIds = topProducts.map(p => p.productId);
    const productDetails = await prisma.product.findMany({
      where: {
        id: { in: topProductIds }
      },
      select: {
        id: true,
        name: true,
        images: true,
        price: true,
        category: {
          select: {
            name: true
          }
        }
      }
    });

    const topSellingProducts = topProducts.map(p => {
      const details = productDetails.find(pd => pd.id === p.productId);
      return {
        ...details,
        totalSold: p._sum.quantity,
        totalRevenue: p._sum.total
      };
    });

    // Format today's orders for display
    const formattedOrders = todayOrders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customer: order.customer?.name || 'Unknown Customer',
      customerEmail: order.customer?.email,
      items: order.items.map(item => ({
        productName: item.product?.name,
        productImage: item.product?.images?.[0],
        category: item.product?.category?.name,
        quantity: item.quantity,
        price: item.price,
        total: item.total
      })),
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      discount: order.discount,
      total: order.total,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt
    }));

    res.json({
      success: true,
      data: {
        today: {
          date: startOfDay.toISOString().split('T')[0],
          ...todayStats,
          orders: formattedOrders
        },
        weekly: {
          totalRevenue: weeklyRevenue,
          totalOrders: weeklyOrders
        },
        monthly: {
          totalRevenue: monthlyRevenue,
          totalOrders: monthlyOrders
        },
        topSellingProducts
      }
    });
  } catch (error) {
    console.error('Get salesman sales summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales summary',
      error: error.message
    });
  }
};

/**
 * Get all orders for salesman
 */
export const getSalesmanOrders = async (req, res) => {
  try {
    const salesmanId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    const where = {
      salesmanId
    };

    if (status) {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true
              }
            }
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        address: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

    const total = await prisma.order.count({ where });

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get salesman orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

/**
 * Update order status
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const salesmanId = req.user.id;

    // Verify the order belongs to this salesman
    const order = await prisma.order.findFirst({
      where: {
        id,
        salesmanId
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { 
        status,
        updatedAt: new Date()
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Create tracking entry
    await prisma.orderTracking.create({
      data: {
        orderId: id,
        status,
        description: `Order status updated to ${status}`
      }
    });

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

/**
 * Get customer's orders
 */
export const getCustomerOrders = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    const where = {
      customerId
    };

    if (status) {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                salesman: {
                  select: {
                    id: true,
                    name: true,
                    store: {
                      select: {
                        name: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        address: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

    const total = await prisma.order.count({ where });

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

/**
 * Create new order
 */
export const createOrder = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { items, addressId, paymentMethod, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must have at least one item'
      });
    }

    if (!addressId) {
      return res.status(400).json({
        success: false,
        message: 'Delivery address is required'
      });
    }

    // Verify address belongs to user
    const address = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId: customerId
      }
    });

    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Invalid delivery address'
      });
    }

    // Get product details and calculate totals
    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds }
      }
    });

    if (products.length !== items.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more products not found'
      });
    }

    // Calculate order totals
    let subtotal = 0;
    const orderItems = items.map(item => {
      const product = products.find(p => p.id === item.productId);
      const price = product.discountPrice || product.price;
      const total = price * item.quantity;
      subtotal += total;

      return {
        productId: item.productId,
        quantity: item.quantity,
        price,
        total
      };
    });

    const deliveryFee = 300; // Fixed delivery fee
    const total = subtotal + deliveryFee;

    // Create order - use the first product's salesman (for simplicity)
    // In a real app, you might split orders by salesman
    const salesmanId = products[0].salesmanId;

    const order = await prisma.order.create({
      data: {
        customerId,
        salesmanId,
        addressId,
        subtotal,
        deliveryFee,
        total,
        paymentMethod,
        notes,
        items: {
          create: orderItems
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        address: true
      }
    });

    // Create initial tracking entry
    await prisma.orderTracking.create({
      data: {
        orderId: order.id,
        status: 'PENDING',
        description: 'Order placed successfully'
      }
    });

    // Clear cart items for these products
    await prisma.cartItem.deleteMany({
      where: {
        userId: customerId,
        productId: { in: productIds }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
};

export default {
  getSalesmanSalesSummary,
  getSalesmanOrders,
  updateOrderStatus,
  getCustomerOrders,
  createOrder
};
