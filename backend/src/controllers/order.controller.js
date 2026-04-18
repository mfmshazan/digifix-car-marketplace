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
            },
            carPart: {
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

    // Get top selling items this month (both products and car parts)
    const topProductItems = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        productId: { not: null },
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

    const topCarPartItems = await prisma.orderItem.groupBy({
      by: ['carPartId'],
      where: {
        carPartId: { not: null },
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
    const topProductIds = topProductItems.map(p => p.productId).filter(Boolean);
    const productDetails = topProductIds.length > 0 ? await prisma.product.findMany({
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
    }) : [];

    // Get car part details for top car parts
    const topCarPartIds = topCarPartItems.map(p => p.carPartId).filter(Boolean);
    const carPartDetails = topCarPartIds.length > 0 ? await prisma.carPart.findMany({
      where: {
        id: { in: topCarPartIds }
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
    }) : [];

    // Combine and sort top selling items
    const topSellingFromProducts = topProductItems.map(p => {
      const details = productDetails.find(pd => pd.id === p.productId);
      return {
        ...details,
        uniqueId: `product-${p.productId}`, // Add unique identifier
        totalSold: p._sum.quantity,
        totalRevenue: p._sum.total
      };
    });

    const topSellingFromCarParts = topCarPartItems.map(p => {
      const details = carPartDetails.find(pd => pd.id === p.carPartId);
      return {
        ...details,
        uniqueId: `carpart-${p.carPartId}`, // Add unique identifier
        totalSold: p._sum.quantity,
        totalRevenue: p._sum.total
      };
    });

    // Merge and sort by quantity sold
    const topSellingProducts = [...topSellingFromProducts, ...topSellingFromCarParts]
      .sort((a, b) => (b.totalSold || 0) - (a.totalSold || 0))
      .slice(0, 5);

    // Format today's orders for display
    const formattedOrders = todayOrders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customer: order.customer?.name || 'Unknown Customer',
      customerEmail: order.customer?.email,
      items: order.items.map(item => {
        // Handle both product and carPart
        const itemData = item.product || item.carPart;
        return {
          id: item.id, // Add unique id for React keys
          productName: item.itemName || itemData?.name || 'Unknown Item',
          productImage: itemData?.images?.[0],
          category: itemData?.category?.name,
          quantity: item.quantity,
          price: item.price,
          total: item.total
        };
      }),
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
            },
            carPart: {
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

    // Format orders to include proper item names and images
    const formattedOrders = orders.map(order => ({
      ...order,
      items: order.items.map(item => {
        // Get product or carPart details
        const productData = item.product || item.carPart;
        return {
          ...item,
          product: {
            id: productData?.id || item.productId || item.carPartId,
            name: item.itemName || productData?.name || 'Unknown Item',
            images: productData?.images || []
          }
        };
      })
    }));

    const total = await prisma.order.count({ where });

    res.json({
      success: true,
      data: {
        orders: formattedOrders,
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
 * Supports both Product and CarPart items
 * Groups items by seller and creates separate orders
 * Address is optional
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

    // Address is optional - verify only if provided
    let validAddressId = null;
    if (addressId) {
      const address = await prisma.address.findFirst({
        where: {
          id: addressId,
          userId: customerId
        }
      });
      if (address) {
        validAddressId = address.id;
      }
    }

    // Get item IDs (could be Product IDs or CarPart IDs)
    const itemIds = items.map(item => item.productId);
    
    // First, try to find items as Products
    const products = await prisma.product.findMany({
      where: {
        id: { in: itemIds }
      },
      include: {
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
    });

    // Then, find items as CarParts
    const carParts = await prisma.carPart.findMany({
      where: {
        id: { in: itemIds }
      },
      include: {
        seller: {
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
    });

    // Combine both types into a unified format
    const allItems = [];
    
    // Add products
    products.forEach(product => {
      allItems.push({
        id: product.id,
        type: 'PRODUCT',
        name: product.name,
        price: product.price,
        discountPrice: product.discountPrice,
        images: product.images,
        sellerId: product.salesmanId,
        sellerName: product.salesman?.name || 'Unknown Seller',
        storeName: product.salesman?.store?.name
      });
    });

    // Add car parts
    carParts.forEach(part => {
      allItems.push({
        id: part.id,
        type: 'CAR_PART',
        name: part.name,
        price: part.price,
        discountPrice: part.discountPrice,
        images: part.images,
        sellerId: part.sellerId,
        sellerName: part.seller?.name || 'Unknown Seller',
        storeName: part.seller?.store?.name
      });
    });

    // Check if all items were found
    if (allItems.length !== items.length) {
      const foundIds = allItems.map(i => i.id);
      const missingIds = itemIds.filter(id => !foundIds.includes(id));
      return res.status(400).json({
        success: false,
        message: `One or more items not found: ${missingIds.join(', ')}`
      });
    }

    // Group items by seller
    const groupedBySeller = {};
    items.forEach(orderItem => {
      const item = allItems.find(i => i.id === orderItem.productId);
      const sellerId = item.sellerId;
      
      if (!groupedBySeller[sellerId]) {
        groupedBySeller[sellerId] = {
          sellerId,
          sellerName: item.sellerName,
          storeName: item.storeName,
          items: []
        };
      }
      
      const price = item.discountPrice || item.price;
      groupedBySeller[sellerId].items.push({
        productId: orderItem.productId,
        itemType: item.type,
        name: item.name,
        quantity: orderItem.quantity,
        price,
        total: price * orderItem.quantity
      });
    });

    // Calculate total
    const deliveryFee = 300;
    let grandTotal = deliveryFee;
    
    Object.values(groupedBySeller).forEach(sellerGroup => {
      sellerGroup.subtotal = sellerGroup.items.reduce((sum, item) => sum + item.total, 0);
      grandTotal += sellerGroup.subtotal;
    });

    // Generate order number prefix
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderPrefix = `ORD-${timestamp}-${randomPart}`;

    // Create orders for each seller in a transaction (with extended timeout)
    const createdOrders = await prisma.$transaction(async (tx) => {
      const orders = [];
      let orderIndex = 1;
      
      for (const [sellerId, sellerGroup] of Object.entries(groupedBySeller)) {
        const orderNumber = Object.keys(groupedBySeller).length > 1 
          ? `${orderPrefix}-${orderIndex}` 
          : orderPrefix;
        
        const orderData = {
          orderNumber,
          customerId,
          salesmanId: sellerId,
          subtotal: sellerGroup.subtotal,
          total: sellerGroup.subtotal + (Object.keys(groupedBySeller).length === 1 ? deliveryFee : 0),
          deliveryFee: Object.keys(groupedBySeller).length === 1 ? deliveryFee : 0,
          paymentMethod,
          notes,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          items: {
            create: sellerGroup.items.map(item => ({
              productId: item.itemType === 'PRODUCT' ? item.productId : null,
              carPartId: item.itemType === 'CAR_PART' ? item.productId : null,
              itemType: item.itemType,
              itemName: item.name,
              quantity: item.quantity,
              price: item.price,
              total: item.total
            }))
          }
        };
        
        if (validAddressId) {
          orderData.addressId = validAddressId;
        }
        
        const order = await tx.order.create({
          data: orderData,
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    images: true
                  }
                },
                carPart: {
                  select: {
                    id: true,
                    name: true,
                    images: true
                  }
                }
              }
            },
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
        });

        // Create tracking entry
        await tx.orderTracking.create({
          data: {
            orderId: order.id,
            status: 'PENDING',
            description: 'Order placed'
          }
        });

        orders.push(order);
        orderIndex++;
      }

      return orders;
    }, {
      timeout: 30000, // 30 seconds timeout for complex order creation
      maxWait: 10000  // Max time to wait for transaction slot
    });

    // Format response
    const response = {
      orderNumber: orderPrefix,
      total: grandTotal,
      deliveryFee,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      createdAt: createdOrders[0]?.createdAt,
      orders: createdOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        sellerId: order.salesmanId,
        sellerName: order.salesman?.name,
        storeName: order.salesman?.store?.name,
        status: order.status,
        subtotal: order.subtotal,
        items: order.items.map(item => {
          const itemData = item.itemType === 'CAR_PART' ? item.carPart : item.product;
          return {
            id: item.id,
            name: item.itemName || itemData?.name,
            image: itemData?.images?.[0],
            quantity: item.quantity,
            price: item.price,
            total: item.total
          };
        })
      }))
    };

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: response
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

/**
 * Get customer orders
 */
export const getCustomerOrdersSimple = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    const where = { customerId };
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
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
              },
              carPart: {
                select: {
                  id: true,
                  name: true,
                  images: true
                }
              }
            }
          },
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
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.order.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        orders: orders.map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          total: order.total,
          createdAt: order.createdAt,
          seller: {
            id: order.salesman?.id,
            name: order.salesman?.name,
            storeName: order.salesman?.store?.name
          },
          items: order.items.map(item => {
            const itemData = item.itemType === 'CAR_PART' ? item.carPart : item.product;
            return {
              id: item.id,
              name: item.itemName || itemData?.name,
              image: itemData?.images?.[0],
              quantity: item.quantity,
              price: item.price,
              total: item.total
            };
          })
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
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

export default {
  getSalesmanSalesSummary,
  getSalesmanOrders,
  updateOrderStatus,
  getCustomerOrders,
  createOrder
};
