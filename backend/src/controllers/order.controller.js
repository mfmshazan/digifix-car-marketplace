import prisma from '../lib/prisma.js';
import { sendNewOrderNotificationToSalesman } from '../lib/onesignal.js';

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

    // 🔌 Emit real-time event to the customer so their mobile app updates instantly
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${updatedOrder.customerId}`).emit('orderStatusUpdated', {
        orderId: id,
        orderNumber: updatedOrder.orderNumber,
        status,
        updatedAt: updatedOrder.updatedAt,
      });
      // Also broadcast to salesmen watching this order (e.g., salesman dashboard)
      io.to(`user:${salesmanId}`).emit('orderStatusUpdated', {
        orderId: id,
        orderNumber: updatedOrder.orderNumber,
        status,
        updatedAt: updatedOrder.updatedAt,
      });
      console.log(`📡 Emitted orderStatusUpdated for order ${id} → customer ${updatedOrder.customerId}`);
    }

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

    // Service charge is the platform's revenue — calculated server-side to prevent tampering
    const SERVICE_CHARGE_RATE = 0.10;
    // Delivery fee will be distance-based (Rs. 250/km) once GPS integration is complete
    // For now it defaults to 0 since we don't have distance data yet
    const calculateDeliveryFee = (distanceKm = 0) => distanceKm * 250;
    const deliveryFee = calculateDeliveryFee(0);
    let grandTotal = 0;
    
    Object.values(groupedBySeller).forEach(sellerGroup => {
      sellerGroup.subtotal = sellerGroup.items.reduce((sum, item) => sum + item.total, 0);
      sellerGroup.serviceCharge = parseFloat((sellerGroup.subtotal * SERVICE_CHARGE_RATE).toFixed(2));
      grandTotal += sellerGroup.subtotal + sellerGroup.serviceCharge;
    });
    // Delivery fee is added once to the overall order total, not per-seller
    grandTotal += deliveryFee;

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
          serviceCharge: sellerGroup.serviceCharge,
          // Only the first order carries the delivery fee to avoid double-charging
          total: sellerGroup.subtotal + sellerGroup.serviceCharge + (Object.keys(groupedBySeller).length === 1 ? deliveryFee : 0),
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

    // 🔌 Emit real-time event to each salesman so their dashboard shows the new order instantly
    const io = req.app.get('io');
    if (io) {
      for (const order of createdOrders) {
        const orderPayload = {
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerId,
          salesmanId: order.salesmanId,
          total: order.total,
          status: order.status,
          createdAt: order.createdAt,
        };
        // Notify the specific salesman's room
        io.to(`user:${order.salesmanId}`).emit('newOrder', orderPayload);
        console.log(`📡 Emitted newOrder ${order.orderNumber} → salesman ${order.salesmanId}`);
      }
    }

    // 🔔 OneSignal push notifications (non-blocking — won't delay the response)
    Promise.all(
      createdOrders.map(order =>
        sendNewOrderNotificationToSalesman({
          salesmanId: order.salesmanId,
          orderId: order.id,
          orderNumber: order.orderNumber,
          total: order.total,
        }).catch(err => console.error('OneSignal error:', err.message))
      )
    );

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

/**
 * Customer requests cancellation or refund.
 * PENDING/CONFIRMED → customer changed their mind before processing.
 * DELIVERED → product arrived defective/wrong, customer wants refund.
 * All other statuses are locked because the order is mid-fulfillment.
 */
export const requestCancellation = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a detailed reason (at least 5 characters)'
      });
    }

    const order = await prisma.order.findFirst({
      where: { id, customerId },
      include: {
        customer: { select: { id: true, name: true } },
        salesman: { select: { id: true, name: true } }
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Only these statuses are cancellable — mid-fulfillment orders cannot be reversed
    const cancellableStatuses = ['PENDING', 'CONFIRMED', 'DELIVERED'];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel an order with status "${order.status}". Only Pending, Confirmed, or Delivered orders can be cancelled.`
      });
    }

    // Mark as awaiting admin review — direct cancellation isn't allowed for accountability
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'REFUND_REQUESTED',
        cancellationReason: reason.trim(),
      }
    });

    // Log the status change for audit trail
    await prisma.orderTracking.create({
      data: {
        orderId: id,
        status: 'REFUND_REQUESTED',
        description: `Customer requested cancellation: "${reason.trim()}"`
      }
    });

    // Notify all admins via socket so they see it immediately on their dashboard
    const io = req.app.get('io');
    if (io) {
      io.to('role:ADMIN').emit('cancellationRequested', {
        orderId: id,
        orderNumber: order.orderNumber,
        customerId,
        customerName: order.customer?.name,
        salesmanId: order.salesmanId,
        reason: reason.trim(),
        previousStatus: order.status,
      });
      console.log(`📡 Emitted cancellationRequested for order ${order.orderNumber} → admins`);
    }

    // Web push notification to admins — fetch their IDs so we can target by external_id
    // This is non-blocking to avoid delaying the customer's response
    const { sendCancellationRequestToAdmin } = await import('../lib/onesignal.js');
    const preferredAdminId = process.env.ADMIN_NOTIFICATION_USER_ID;
    const admin = await prisma.user.findFirst({
      where: {
        role: 'ADMIN',
        ...(preferredAdminId ? { id: preferredAdminId } : {}),
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    const adminIds = admin ? [admin.id] : [];
    sendCancellationRequestToAdmin({
      orderNumber: order.orderNumber,
      customerName: order.customer?.name || 'A customer',
      adminIds,
    }).catch(err => console.error('OneSignal admin notification error:', err.message));

    res.json({
      success: true,
      message: 'Cancellation request submitted. Admin will review your request.',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Request cancellation error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit cancellation request', error: error.message });
  }
};

/**
 * Admin approves a cancellation — triggers refund flow and notifies both parties.
 * The salesman needs to know so they stop processing/shipping.
 * The customer needs confirmation that their refund is on the way.
 */
export const approveCancellation = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true } },
        salesman: { select: { id: true, name: true } }
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'REFUND_REQUESTED') {
      return res.status(400).json({
        success: false,
        message: 'This order does not have a pending cancellation request'
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        // Payment status reflects that money needs to be returned (Stripe handles actual transfer)
        paymentStatus: order.paymentStatus === 'PAID' ? 'REFUNDED' : order.paymentStatus,
      }
    });

    await prisma.orderTracking.create({
      data: {
        orderId: id,
        status: 'CANCELLED',
        description: 'Admin approved the cancellation/refund request'
      }
    });

    // Notify both parties in real-time so their dashboards update instantly
    const io = req.app.get('io');
    if (io) {
      const payload = {
        orderId: id,
        orderNumber: order.orderNumber,
        status: 'CANCELLED',
        message: `Refund approved for Order ${order.orderNumber}. Please refund customer ${order.customer?.name || ''}.`.trim(),
      };
      io.to(`user:${order.salesmanId}`).emit('cancellationApproved', payload);
      io.to(`user:${order.customerId}`).emit('cancellationApproved', payload);
      console.log(`📡 Emitted cancellationApproved for order ${order.orderNumber}`);
    }

    // Push notification to salesman — they need to know to stop processing this order
    const { sendRefundApprovedToSalesman } = await import('../lib/onesignal.js');
    sendRefundApprovedToSalesman({
      salesmanId: order.salesmanId,
      orderNumber: order.orderNumber,
    }).catch(err => console.error('OneSignal salesman notification error:', err.message));

    res.json({
      success: true,
      message: 'Cancellation approved. Customer and salesman have been notified.',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Approve cancellation error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve cancellation', error: error.message });
  }
};

/**
 * Admin rejects a cancellation — order reverts to its previous state.
 * We set it back to PENDING since the original status isn't stored
 * (if needed, we could track the pre-cancellation status in OrderTracking).
 */
export const rejectCancellation = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true } },
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'REFUND_REQUESTED') {
      return res.status(400).json({
        success: false,
        message: 'This order does not have a pending cancellation request'
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'PENDING',
        // Clear the reason since the request was rejected
        cancellationReason: null,
      }
    });

    await prisma.orderTracking.create({
      data: {
        orderId: id,
        status: 'PENDING',
        description: `Admin rejected the cancellation request${message ? `: ${message}` : ''}`
      }
    });

    // Let the customer know their request was denied
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${order.customerId}`).emit('cancellationRejected', {
        orderId: id,
        orderNumber: order.orderNumber,
        status: 'PENDING',
        message: message || 'Your cancellation request was rejected.',
      });
      console.log(`📡 Emitted cancellationRejected for order ${order.orderNumber}`);
    }

    res.json({
      success: true,
      message: 'Cancellation request rejected. Order has been restored.',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Reject cancellation error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject cancellation', error: error.message });
  }
};

export default {
  getSalesmanSalesSummary,
  getSalesmanOrders,
  updateOrderStatus,
  getCustomerOrders,
  createOrder,
  requestCancellation,
  approveCancellation,
  rejectCancellation
};
