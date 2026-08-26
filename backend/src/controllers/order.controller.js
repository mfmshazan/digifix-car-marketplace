import prisma from '../lib/prisma.js';
import { sendNewOrderNotificationToSalesman, sendOrderStatusToCustomer } from '../lib/onesignal.js';
import { createRiderJobsForMarketplaceOrders } from '../services/riderDeliveryJobFactory.js';
import { getAdminWallet, ensureWallet } from '../lib/adminWallet.js';
import { resolveShopOwnerId, getShopMemberIds } from '../lib/shopAccess.js';
import { riderQuery } from '../lib/riderDb.js';

const hasValidCoordinates = (latitude, longitude) => {
  if (latitude === null || latitude === undefined || String(latitude).trim() === '' ||
      longitude === null || longitude === undefined || String(longitude).trim() === '') {
    return false;
  }
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
    Number.isFinite(lng) && lng >= -180 && lng <= 180;
};

const formatDeliveryAddress = (address) =>
  [address?.street, address?.city, address?.state, address?.postalCode, address?.country]
    .filter(Boolean)
    .join(', ');

/**
 * Get salesman's sales summary
 * Returns daily sales, total revenue, and product details for the salesman
 */
export const getSalesmanSalesSummary = async (req, res) => {
  try {
    // Salesmen share the shop's sales figures — scope to the manager (shop owner).
    const shopOwnerId = await resolveShopOwnerId(req.user);
    const shopOrderOwnerIds = await getShopMemberIds(shopOwnerId);
    const { date } = req.query;
    
    // Default to today if no date provided
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // Get today's orders for this salesman
    const todayOrders = await prisma.order.findMany({
      where: {
        salesmanId: { in: shopOrderOwnerIds },
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
        salesmanId: { in: shopOrderOwnerIds },
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
        salesmanId: { in: shopOrderOwnerIds },
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
          salesmanId: { in: shopOrderOwnerIds },
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
          salesmanId: { in: shopOrderOwnerIds },
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
 * Get count of pending orders for salesman (lightweight endpoint)
 */
export const getSalesmanPendingCount = async (req, res) => {
  try {
    const shopOwnerId = await resolveShopOwnerId(req.user);
    const shopOrderOwnerIds = await getShopMemberIds(shopOwnerId);
    const count = await prisma.order.count({
      where: { salesmanId: { in: shopOrderOwnerIds }, status: 'PENDING' }
    });
    res.json({ success: true, count });
  } catch (error) {
    console.error('Get pending count error:', error);
    res.status(500).json({ success: false, message: 'Failed to get pending count', error: error.message });
  }
};

/**
 * Get all orders for salesman
 */
export const getSalesmanOrders = async (req, res) => {
  try {
    // Include legacy orders recorded against a salesman as well as manager-owned orders.
    const shopOwnerId = await resolveShopOwnerId(req.user);
    const shopOrderOwnerIds = await getShopMemberIds(shopOwnerId);
    const { status, page = 1, limit = 20 } = req.query;

    const where = {
      salesmanId: { in: shopOrderOwnerIds }
    };

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
        customer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        address: true,
        // Used to tell a post-delivery complaint apart from a pre-fulfillment
        // cancellation: only a delivered order has a DELIVERED tracking entry.
        tracking: {
          where: { status: 'DELIVERED' },
          select: { id: true },
          take: 1
        }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      }),
      prisma.order.count({ where }),
    ]);

    // Format orders to include proper item names and images
    const formattedOrders = orders.map(order => ({
      ...order,
      // A complaint is a refund request raised against an already-delivered order.
      isComplaint: order.status === 'REFUND_REQUESTED' && order.tracking.length > 0,
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
 * Integrates Wallet Logic for DELIVERED and REFUNDED
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    // Salesmen act on behalf of their manager, so scope to the shop owner's id.
    const shopOwnerId = await resolveShopOwnerId(req.user);
    const shopOrderOwnerIds = await getShopMemberIds(shopOwnerId);

    // Verify the order belongs to this shop
    const order = await prisma.order.findFirst({
      where: {
        id,
        salesmanId: { in: shopOrderOwnerIds }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // ── Enforce the order lifecycle (seller/manager driven) ──────────────────
    // The seller advances the order ONE step at a time and cannot skip ahead:
    //   PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
    // Cancelling is only allowed while the order is still PENDING.
    const SELLER_STATUS_FLOW = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    if (status === 'CANCELLED') {
      if (order.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: 'Orders can only be cancelled while they are still Pending.',
        });
      }
    } else {
      const currentIndex = SELLER_STATUS_FLOW.indexOf(order.status);
      const targetIndex = SELLER_STATUS_FLOW.indexOf(status);
      if (targetIndex === -1) {
        return res.status(400).json({ success: false, message: `Invalid status: ${status}.` });
      }
      if (targetIndex !== currentIndex + 1) {
        const nextAllowed = SELLER_STATUS_FLOW[currentIndex + 1];
        return res.status(400).json({
          success: false,
          message: nextAllowed
            ? `Advance the order one step at a time. From ${order.status} you can only move to ${nextAllowed}.`
            : `The order is already ${order.status} and cannot be advanced further.`,
        });
      }
    }

    // Gate manual SHIPPED: the seller/manager can only mark an order SHIPPED
    // once a rider has been assigned AND has physically picked up the package.
    // The rider's pickup keeps the order in PROCESSING (see syncMarketplaceOrderStatus),
    // so SHIPPED is the seller's explicit confirmation that it has left the shop.
    if (status === 'SHIPPED' && order.status !== 'SHIPPED') {
      const pickedUpStatuses = ['picked_up', 'in_transit', 'arrived_at_dropoff', 'delivered'];
      const jobRes = await riderQuery(
        `SELECT status FROM "DeliveryJob"
           WHERE marketplace_order_id = $1
           ORDER BY created_at DESC
           LIMIT 1`,
        [id]
      );
      const deliveryJob = jobRes.rows[0];

      if (!deliveryJob) {
        return res.status(400).json({
          success: false,
          message: 'Assign a rider before marking this order as Shipped.'
        });
      }
      if (!pickedUpStatuses.includes(deliveryJob.status)) {
        return res.status(400).json({
          success: false,
          message: 'You can mark this order as Shipped only after the rider has picked it up.'
        });
      }
    }

    // Gate manual DELIVERED: only after the rider has actually completed delivery.
    // (The rider's own "delivered" step already auto-advances the order; this stops
    // the seller from marking Delivered before the package has arrived.)
    if (status === 'DELIVERED' && order.status !== 'DELIVERED') {
      const jobRes = await riderQuery(
        `SELECT status FROM "DeliveryJob"
           WHERE marketplace_order_id = $1
           ORDER BY created_at DESC
           LIMIT 1`,
        [id]
      );
      const deliveryJob = jobRes.rows[0];
      if (!deliveryJob || deliveryJob.status !== 'delivered') {
        return res.status(400).json({
          success: false,
          message: 'You can mark this order as Delivered only after the rider completes the delivery.'
        });
      }
    }

    // Run order update and wallet transfers in one atomic transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      
      const updated = await tx.order.update({
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
      await tx.orderTracking.create({
        data: {
          orderId: id,
          status,
          description: `Order status updated to ${status}`
        }
      });

      // ==========================================
      // WALLET INTEGRATION: RELEASE FUNDS TO SELLER
      // Admin → Salesman: release held Stripe funds on delivery
      // ==========================================
      if (status === 'DELIVERED' && order.status !== 'DELIVERED') {
        if (order.paymentMethod === 'Stripe' || order.paymentMethod === 'WALLET') {
          const adminWallet = await getAdminWallet(tx);
          const salesmanWallet = await ensureWallet(shopOwnerId, tx);

          await tx.wallet.update({ where: { id: adminWallet.id }, data: { balance: { decrement: order.total } } });
          await tx.wallet.update({ where: { id: salesmanWallet.id }, data: { balance: { increment: order.total } } });

          await tx.walletTransaction.create({
            data: {
              amount: order.total,
              type: 'SALE_EARNING',
              senderWalletId: adminWallet.id,
              receiverWalletId: salesmanWallet.id,
              orderId: order.id,
              description: `Sale earnings released for delivered order ${order.orderNumber}`
            }
          });
        }
      }

      // ==========================================
      // WALLET INTEGRATION: REFUND TO CUSTOMER
      // Admin → Customer: admin refunds from held pool
      // ==========================================
      if (status === 'REFUNDED' && order.status !== 'REFUNDED') {
        if (order.paymentMethod === 'Stripe' || order.paymentMethod === 'WALLET') {
          const adminWallet = await getAdminWallet(tx);
          const customerWallet = await ensureWallet(order.customerId, tx);

          await tx.wallet.update({ where: { id: adminWallet.id }, data: { balance: { decrement: order.total } } });
          await tx.wallet.update({ where: { id: customerWallet.id }, data: { balance: { increment: order.total } } });

          await tx.walletTransaction.create({
            data: {
              amount: order.total,
              type: 'REFUND',
              senderWalletId: adminWallet.id,
              receiverWalletId: customerWallet.id,
              orderId: id,
              description: `Refund for order ${order.orderNumber}`
            }
          });
        }
      }

      return updated;
    }, {
      // Prisma's default interactive-transaction timeout is 5s. Under high DB latency
      // (e.g. a local backend talking to a distant pooler) the update + tracking write
      // can exceed that and abort. Give it generous headroom; it still returns as soon
      // as the work completes.
      maxWait: 10000,
      timeout: 20000,
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
      // Also broadcast to the manager and every salesman in the shop
      // These ids were already resolved for authorization above. Reuse them
      // instead of performing the same user/member database queries again.
      for (const memberId of shopOrderOwnerIds) {
        io.to(`user:${memberId}`).emit('orderStatusUpdated', {
          orderId: id,
          orderNumber: updatedOrder.orderNumber,
          status,
          updatedAt: updatedOrder.updatedAt,
        });
      }
      console.log(`📡 Emitted orderStatusUpdated for order ${id} → customer ${updatedOrder.customerId} + ${shopOrderOwnerIds.length} shop member(s)`);
    }

    // 🔔 Push notification to the customer (reaches them even if the app is closed).
    // Only fires for customer-facing statuses; the socket event above handles the
    // live in-app update when the app is open. Fire-and-forget: never block the response.
    sendOrderStatusToCustomer({
      customerId: updatedOrder.customerId,
      orderNumber: updatedOrder.orderNumber,
      orderId: id,
      status,
    }).catch((err) => console.error('Order status push failed:', err?.message || err));

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Update order status error:', error);
    const databaseUnavailable =
      error?.code === 'P1001' ||
      String(error?.message || '').includes("Can't reach database server");

    res.status(databaseUnavailable ? 503 : 500).json({
      success: false,
      message: databaseUnavailable
        ? 'The database is temporarily unavailable. Please try again shortly.'
        : 'Failed to update order status',
      error: error.message,
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
                categoryId: true,
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
        address: true,
        reviews: {
          select: {
            id: true,
            targetId: true,
            targetType: true,
            rating: true,
            comment: true,
            replies: {
              select: {
                id: true,
                replyText: true,
                createdAt: true,
                seller: {
                  select: { name: true }
                }
              }
            }
          }
        },
        riderDeliveryJobs: {
          select: {
            id: true,
            status: true,
            partnerId: true,
            partner: {
              select: {
                id: true,
                fullName: true,
                profilePhotoUrl: true,
                vehicleType: true,
                vehicleNumber: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
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
 * Dedcuts wallet balance upfront if paymentMethod === 'WALLET'
 */
/**
 * Estimate the delivery fee for the current cart + selected address, so the customer
 * sees the same distance/vehicle based fee in the cart before paying with Stripe.
 * Body: { items: [{ productId, quantity }], addressId }
 */
export const estimateDelivery = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { items, addressId } = req.body;
    if (!items?.length || !addressId) {
      return res.status(400).json({ success: false, message: 'items and addressId are required' });
    }
    const address = await prisma.address.findFirst({ where: { id: addressId, userId: customerId } });
    if (!address || !hasValidCoordinates(address.latitude, address.longitude)) {
      return res.status(400).json({ success: false, message: 'The selected address needs a delivery pin.' });
    }
    const itemIds = items.map((i) => i.productId);
    const [products, carParts] = await Promise.all([
      prisma.product.findMany({ where: { id: { in: itemIds } }, select: { deliveryVehicleType: true, salesman: { select: { store: { select: { id: true, pickupLatitude: true, pickupLongitude: true } } } } } }),
      prisma.carPart.findMany({ where: { id: { in: itemIds } }, select: { seller: { select: { store: { select: { id: true, pickupLatitude: true, pickupLongitude: true } } } } } }),
    ]);
    const all = [
      ...products.map((p) => ({ v: p.deliveryVehicleType, shopId: p.salesman?.store?.id, lat: p.salesman?.store?.pickupLatitude, lng: p.salesman?.store?.pickupLongitude })),
      ...carParts.map((p) => ({ v: p.deliveryVehicleType, shopId: p.seller?.store?.id, lat: p.seller?.store?.pickupLatitude, lng: p.seller?.store?.pickupLongitude })),
    ];
    const RATE = { MOTORBIKE: 50, CAR: 70, LORRY: 30 };
    const RANK = { MOTORBIKE: 1, CAR: 2, LORRY: 3 };
    const haversineKm = (a, b, c, d) => {
      const r = (x) => (Number(x) * Math.PI) / 180, R = 6371;
      const dLat = r(c - a), dLon = r(d - b);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    };
    // Group items by their shop pickup point; charge each shop's delivery leg
    // separately (distance x the largest vehicle in that shop's items) and sum them.
    const shops = new Map(); // shopId -> { lat, lng, vehicle }
    for (const it of all) {
      if (it.shopId == null || it.lat == null || it.lng == null) continue;
      const group = shops.get(it.shopId) || { lat: Number(it.lat), lng: Number(it.lng), vehicle: 'MOTORBIKE' };
      if (it.v && RANK[it.v] > RANK[group.vehicle]) group.vehicle = it.v;
      shops.set(it.shopId, group);
    }
    let deliveryFee = 0;
    for (const shop of shops.values()) {
      if (!hasValidCoordinates(shop.lat, shop.lng)) continue;
      const km = haversineKm(shop.lat, shop.lng, Number(address.latitude), Number(address.longitude));
      deliveryFee += Math.round(km * RATE[shop.vehicle]);
    }
    return res.json({ success: true, data: { deliveryFee, shopCount: shops.size } });
  } catch (e) {
    console.error('estimateDelivery error:', e);
    return res.status(500).json({ success: false, message: 'Failed to estimate delivery' });
  }
};

export const createOrder = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { items, addressId, paymentMethod, notes } = req.body;
    const normalizedPaymentMethod = String(paymentMethod || 'COD').trim().toUpperCase();

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must have at least one item'
      });
    }

    if (!addressId) {
      return res.status(400).json({
        success: false,
        message: 'Please add and select a delivery address before placing your order',
      });
    }

    const address = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId: customerId,
      },
    });

    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'The selected delivery address is invalid. Please choose one of your saved addresses',
      });
    }
    if (!hasValidCoordinates(address.latitude, address.longitude)) {
      return res.status(400).json({
        success: false,
        message: 'The selected address needs a delivery pin. Edit the address and choose its location on the map.',
      });
    }
    const validAddressId = address.id;
    const deliveryAddressSnapshot = formatDeliveryAddress(address);
    const deliveryLatitudeSnapshot = Number(address.latitude);
    const deliveryLongitudeSnapshot = Number(address.longitude);

    // Get item IDs
    const itemIds = items.map(item => item.productId);
    
    // First, try to find items as Products
    const [products, carParts] = await Promise.all([
      prisma.product.findMany({
        where: {
          id: { in: itemIds }
        },
        include: {
        salesman: {
          select: {
            id: true,
            name: true,
            role: true,
            managerId: true,
            store: {
              select: {
                name: true,
                pickupLatitude: true,
                pickupLongitude: true
              }
            }
          }
        }
        }
      }),

      // Product and car-part lookups are independent, so do not pay for two
      // sequential database round trips when placing an order.
      prisma.carPart.findMany({
        where: {
          id: { in: itemIds }
        },
        include: {
        seller: {
          select: {
            id: true,
            name: true,
            role: true,
            managerId: true,
            store: {
              select: {
                name: true,
                pickupLatitude: true,
                pickupLongitude: true
              }
            }
          }
        }
        }
      }),
    ]);

    // Combine both types into a unified format
    const allItems = [];
    
    products.forEach(product => {
      allItems.push({
        id: product.id,
        type: 'PRODUCT',
        name: product.name,
        price: product.price,
        discountPrice: product.discountPrice,
        images: product.images,
        sellerId: product.salesman?.managerId || product.salesmanId,
        sellerName: product.salesman?.name || 'Unknown Seller',
        storeName: product.salesman?.store?.name,
        deliveryVehicleType: product.deliveryVehicleType || null,
        pickupLat: product.salesman?.store?.pickupLatitude ?? null,
        pickupLng: product.salesman?.store?.pickupLongitude ?? null
      });
    });

    carParts.forEach(part => {
      allItems.push({
        id: part.id,
        type: 'CAR_PART',
        name: part.name,
        price: part.price,
        discountPrice: part.discountPrice,
        images: part.images,
        sellerId: part.seller?.managerId || part.sellerId,
        sellerName: part.seller?.name || 'Unknown Seller',
        storeName: part.seller?.store?.name,
        deliveryVehicleType: part.deliveryVehicleType || null,
        pickupLat: part.seller?.store?.pickupLatitude ?? null,
        pickupLng: part.seller?.store?.pickupLongitude ?? null
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

    // Reject the order up front if any item doesn't have enough stock.
    for (const orderItem of items) {
      const prod = products.find(p => p.id === orderItem.productId);
      const cp = carParts.find(c => c.id === orderItem.productId);
      const available = prod ? prod.stock : (cp ? cp.stock : 0);
      const itemName = prod?.name || cp?.name || orderItem.productId;
      if (available < orderItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock for ${itemName}. Only ${available} left.`,
        });
      }
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

    // Distance-based delivery fee. The per-km rate depends on the vehicle the order needs;
    // an order uses the largest vehicle any of its items requires (LORRY > CAR > MOTORBIKE).
    //   MOTORBIKE Rs.50/km, CAR Rs.70/km, LORRY Rs.30/km.
    const VEHICLE_RATE_PER_KM = { MOTORBIKE: 50, CAR: 70, LORRY: 30 };
    const VEHICLE_RANK = { MOTORBIKE: 1, CAR: 2, LORRY: 3 };

    const haversineKm = (lat1, lon1, lat2, lon2) => {
      const toRad = (v) => (Number(v) * Math.PI) / 180;
      const R = 6371; // km
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    // Group ordered items by their shop pickup point. Each shop's delivery leg is
    // charged separately (distance x the largest vehicle in that shop's items) and
    // summed, so an order spanning multiple shops pays a fee for each shop.
    const orderedItems = items
      .map((oi) => allItems.find((i) => i.id === oi.productId))
      .filter(Boolean);
    const pickupShops = new Map(); // sellerId (shop) -> { lat, lng, vehicle }
    for (const it of orderedItems) {
      if (it.sellerId == null || it.pickupLat == null || it.pickupLng == null) continue;
      const group = pickupShops.get(it.sellerId) || { lat: Number(it.pickupLat), lng: Number(it.pickupLng), vehicle: 'MOTORBIKE' };
      if (it.deliveryVehicleType && VEHICLE_RANK[it.deliveryVehicleType] > VEHICLE_RANK[group.vehicle]) {
        group.vehicle = it.deliveryVehicleType;
      }
      pickupShops.set(it.sellerId, group);
    }

    // Per-shop fee so each seller's order carries only its own delivery leg.
    const feeByShop = new Map(); // sellerId -> fee
    let deliveryFee = 0; // total across shops (for the customer's grand total)
    for (const [sellerId, shop] of pickupShops) {
      if (!hasValidCoordinates(shop.lat, shop.lng)) continue;
      const distanceKm = haversineKm(
        shop.lat, shop.lng, deliveryLatitudeSnapshot, deliveryLongitudeSnapshot
      );
      const fee = Math.round(distanceKm * VEHICLE_RATE_PER_KM[shop.vehicle]);
      feeByShop.set(sellerId, fee);
      deliveryFee += fee;
    }

    let grandTotal = 0;
    
    Object.values(groupedBySeller).forEach(sellerGroup => {
      sellerGroup.subtotal = sellerGroup.items.reduce((sum, item) => sum + item.total, 0);
      sellerGroup.serviceCharge = parseFloat((sellerGroup.subtotal * SERVICE_CHARGE_RATE).toFixed(2));
      grandTotal += sellerGroup.subtotal + sellerGroup.serviceCharge;
    });
    // Delivery fee is added once to the overall order total, not per-seller
    grandTotal += deliveryFee;

    // ==========================================
    // WALLET INTEGRATION: UPFRONT DEDUCTION
    // ==========================================
    if (normalizedPaymentMethod === 'WALLET') {
        const customerWallet = await prisma.wallet.findUnique({ where: { userId: customerId } });
        
        if (!customerWallet || customerWallet.balance < grandTotal) {
            return res.status(400).json({ success: false, message: 'Insufficient wallet balance to place this order.' });
        }
    }

    // Generate order number prefix
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderPrefix = `ORD-${timestamp}-${randomPart}`;

    // Create orders for each seller in a transaction 
    const createdOrders = await prisma.$transaction(async (tx) => {
      
      // If WALLET, deduct balance now
      if (normalizedPaymentMethod === 'WALLET') {
          const customerWallet = await tx.wallet.findUnique({ where: { userId: customerId } });
          
          await tx.wallet.update({
              where: { id: customerWallet.id },
              data: { balance: { decrement: grandTotal } }
          });

          // Log the WalletTransaction
          await tx.walletTransaction.create({
              data: {
                  amount: grandTotal,
                  type: 'PURCHASE',
                  senderWalletId: customerWallet.id,
                  description: 'Paid upfront using Wallet Balance'
              }
          });
      }

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
          // Each seller's order carries its own shop's delivery leg.
          total: sellerGroup.subtotal + sellerGroup.serviceCharge + (feeByShop.get(sellerId) || 0),
          deliveryFee: feeByShop.get(sellerId) || 0,
          paymentMethod: normalizedPaymentMethod,
          notes,
          deliveryAddress: deliveryAddressSnapshot,
          deliveryLatitude: deliveryLatitudeSnapshot,
          deliveryLongitude: deliveryLongitudeSnapshot,
          status: 'PENDING',
          paymentStatus: normalizedPaymentMethod === 'WALLET' ? 'PAID' : 'PENDING', // Mark paid automatically if Wallet
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
        
        orderData.addressId = validAddressId;
        
        const order = await tx.order.create({
          data: orderData,
          include: {
            items: {
              include: {
                product: {
                  select: { id: true, name: true, images: true }
                },
                carPart: {
                  select: { id: true, name: true, images: true }
                }
              }
            },
            salesman: {
              select: {
                id: true,
                name: true,
                store: { select: { name: true } }
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

      // Decrement stock for every ordered item now that the orders are created.
      for (const orderItem of items) {
        if (products.find(p => p.id === orderItem.productId)) {
          await tx.product.update({
            where: { id: orderItem.productId },
            data: { stock: { decrement: orderItem.quantity } },
          });
        } else if (carParts.find(c => c.id === orderItem.productId)) {
          await tx.carPart.update({
            where: { id: orderItem.productId },
            data: { stock: { decrement: orderItem.quantity } },
          });
        }
      }

      return orders;
    }, {
      timeout: 30000,
      maxWait: 10000
    });

    // Format response
    const response = {
      orderNumber: orderPrefix,
      total: grandTotal,
      deliveryFee,
      status: 'PENDING',
      paymentStatus: normalizedPaymentMethod === 'WALLET' ? 'PAID' : 'PENDING',
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

    // Resolve every shop member (manager + their salesmen) per order so both the
    // manager AND the salesmen get the realtime event and the push notification.
    const orderShopMembers = await Promise.all(
      createdOrders.map(order => getShopMemberIds(order.salesmanId))
    );

    // 🔌 Emit real-time event to each shop member so their dashboard shows the new order instantly
    const io = req.app.get('io');
    if (io) {
      createdOrders.forEach((order, idx) => {
        const orderPayload = {
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerId,
          salesmanId: order.salesmanId,
          total: order.total,
          status: order.status,
          createdAt: order.createdAt,
        };
        const memberIds = orderShopMembers[idx];
        for (const memberId of memberIds) {
          io.to(`user:${memberId}`).emit('newOrder', orderPayload);
        }
        console.log(`📡 Emitted newOrder ${order.orderNumber} → ${memberIds.length} shop member(s)`);
      });
    }

    // 🔔 OneSignal push notifications (non-blocking — won't delay the response)
    Promise.all(
      createdOrders.flatMap((order, idx) =>
        orderShopMembers[idx].map(memberId =>
          sendNewOrderNotificationToSalesman({
            salesmanId: memberId,
            orderId: order.id,
            orderNumber: order.orderNumber,
            total: order.total,
          }).catch(err => console.error('OneSignal error:', err.message))
        )
      )
    );

    createRiderJobsForMarketplaceOrders(createdOrders).catch(err =>
      console.error('Rider delivery job creation error:', err.message)
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
 * Get customer orders (Simple)
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

    // A post-delivery refund request is a product complaint — it is handled by
    // the product's shop (manager), not admin. A pre-fulfillment cancellation
    // (PENDING/CONFIRMED) still goes to admin for review.
    const isComplaint = order.status === 'DELIVERED';

    // Log the status change for audit trail
    await prisma.orderTracking.create({
      data: {
        orderId: id,
        status: 'REFUND_REQUESTED',
        description: isComplaint
          ? `Customer raised a complaint: "${reason.trim()}"`
          : `Customer requested cancellation: "${reason.trim()}"`,
      }
    });

    const io = req.app.get('io');

    // ── Post-delivery complaint → notify the shop (manager + salesmen) only ──
    if (isComplaint) {
      const shopMemberIds = await getShopMemberIds(order.salesmanId);
      const payload = {
        orderId: id,
        orderNumber: order.orderNumber,
        customerId,
        customerName: order.customer?.name,
        reason: reason.trim(),
      };
      if (io) {
        for (const memberId of shopMemberIds) {
          io.to(`user:${memberId}`).emit('complaintRaised', payload);
        }
        console.log(`📡 Emitted complaintRaised for order ${order.orderNumber} → ${shopMemberIds.length} shop member(s)`);
      }

      // Non-blocking push to the manager + salesmen
      const { sendComplaintToShop } = await import('../lib/onesignal.js');
      Promise.all(
        shopMemberIds.map(memberId =>
          sendComplaintToShop({
            salesmanId: memberId,
            orderNumber: order.orderNumber,
            customerName: order.customer?.name || 'A customer',
          }).catch(err => console.error('OneSignal complaint notification error:', err.message))
        )
      );

      return res.json({
        success: true,
        message: 'Complaint submitted. The store will review your request.',
        data: updatedOrder
      });
    }

    // Notify all admins via socket so they see it immediately on their dashboard
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
    const preferredAdminIdsRaw = process.env.ADMIN_NOTIFICATION_USER_IDS;

    let adminIds = [];

    if (preferredAdminIdsRaw) {
      adminIds = preferredAdminIdsRaw
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
    } else if (preferredAdminId) {
      adminIds = [preferredAdminId];
    }

    if (adminIds.length < 3) {
      const excludeIds = new Set(adminIds);
      const extraAdmins = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
          ...(adminIds.length ? { id: { notIn: adminIds } } : {}),
        },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
        take: 3 - adminIds.length,
      });

      extraAdmins.forEach((admin) => {
        if (!excludeIds.has(admin.id)) {
          adminIds.push(admin.id);
        }
      });
    }
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
      const shopMemberIds = await getShopMemberIds(order.salesmanId);
      for (const memberId of shopMemberIds) {
        io.to(`user:${memberId}`).emit('cancellationApproved', payload);
      }
      io.to(`user:${order.customerId}`).emit('cancellationApproved', payload);
      console.log(`📡 Emitted cancellationApproved for order ${order.orderNumber} → ${shopMemberIds.length} shop member(s)`);
    }

    // Push notification to the manager + every salesman — they need to know to stop processing this order
    const { sendRefundApprovedToSalesman } = await import('../lib/onesignal.js');
    const refundMemberIds = await getShopMemberIds(order.salesmanId);
    Promise.all(
      refundMemberIds.map(memberId =>
        sendRefundApprovedToSalesman({
          salesmanId: memberId,
          orderNumber: order.orderNumber,
        }).catch(err => console.error('OneSignal salesman notification error:', err.message))
      )
    );

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

/**
 * Manager accepts a post-delivery complaint (refund request).
 * Sets the order to CANCELLED / REFUNDED status and notifies the customer.
 * NOTE: no wallet movement here — the actual refund transfer is handled separately.
 */
export const acceptComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    // Scope to the shop owner so a salesman/manager can only act on their own shop's orders.
    const shopOwnerId = await resolveShopOwnerId(req.user);
    const shopOrderOwnerIds = await getShopMemberIds(shopOwnerId);

    const order = await prisma.order.findFirst({
      where: { id, salesmanId: { in: shopOrderOwnerIds } },
      include: {
        customer: { select: { id: true, name: true } },
        tracking: { where: { status: 'DELIVERED' }, select: { id: true }, take: 1 },
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.status !== 'REFUND_REQUESTED' || order.tracking.length === 0) {
      return res.status(400).json({ success: false, message: 'This order has no pending complaint to review' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        // Marks that money should be returned — wallet transfer handled elsewhere.
        paymentStatus: order.paymentStatus === 'PAID' ? 'REFUNDED' : order.paymentStatus,
      }
    });

    await prisma.orderTracking.create({
      data: {
        orderId: id,
        status: 'CANCELLED',
        description: 'Store accepted the complaint and approved the refund request',
      }
    });

    const io = req.app.get('io');
    if (io) {
      const payload = {
        orderId: id,
        orderNumber: order.orderNumber,
        status: 'CANCELLED',
        resolution: 'accepted',
        message: `Your complaint for Order ${order.orderNumber} was accepted. A refund has been approved.`,
      };
      io.to(`user:${order.customerId}`).emit('complaintResolved', payload);
      io.to(`user:${order.customerId}`).emit('orderStatusUpdated', {
        orderId: id, orderNumber: order.orderNumber, status: 'CANCELLED', updatedAt: updatedOrder.updatedAt,
      });
      const shopMemberIds = await getShopMemberIds(shopOwnerId);
      for (const memberId of shopMemberIds) {
        io.to(`user:${memberId}`).emit('complaintResolved', payload);
      }
    }

    res.json({ success: true, message: 'Complaint accepted. The customer has been notified.', data: updatedOrder });
  } catch (error) {
    console.error('Accept complaint error:', error);
    res.status(500).json({ success: false, message: 'Failed to accept complaint', error: error.message });
  }
};

/**
 * Manager rejects a post-delivery complaint — the order reverts to DELIVERED.
 */
export const rejectComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const shopOwnerId = await resolveShopOwnerId(req.user);
    const shopOrderOwnerIds = await getShopMemberIds(shopOwnerId);

    const order = await prisma.order.findFirst({
      where: { id, salesmanId: { in: shopOrderOwnerIds } },
      include: {
        customer: { select: { id: true, name: true } },
        tracking: { where: { status: 'DELIVERED' }, select: { id: true }, take: 1 },
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.status !== 'REFUND_REQUESTED' || order.tracking.length === 0) {
      return res.status(400).json({ success: false, message: 'This order has no pending complaint to review' });
    }

    // A complaint is raised against a delivered order, so revert it to DELIVERED.
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status: 'DELIVERED', cancellationReason: null }
    });

    await prisma.orderTracking.create({
      data: {
        orderId: id,
        status: 'DELIVERED',
        description: `Store rejected the complaint${message ? `: ${message}` : ''}`,
      }
    });

    const io = req.app.get('io');
    if (io) {
      const payload = {
        orderId: id,
        orderNumber: order.orderNumber,
        status: 'DELIVERED',
        resolution: 'rejected',
        message: message || `Your complaint for Order ${order.orderNumber} was reviewed and declined by the store.`,
      };
      io.to(`user:${order.customerId}`).emit('complaintResolved', payload);
      io.to(`user:${order.customerId}`).emit('orderStatusUpdated', {
        orderId: id, orderNumber: order.orderNumber, status: 'DELIVERED', updatedAt: updatedOrder.updatedAt,
      });
      const shopMemberIds = await getShopMemberIds(shopOwnerId);
      for (const memberId of shopMemberIds) {
        io.to(`user:${memberId}`).emit('complaintResolved', payload);
      }
    }

    res.json({ success: true, message: 'Complaint rejected. The customer has been notified.', data: updatedOrder });
  } catch (error) {
    console.error('Reject complaint error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject complaint', error: error.message });
  }
};

export default {
  getSalesmanSalesSummary,
  getSalesmanOrders,
  getSalesmanPendingCount,
  updateOrderStatus,
  getCustomerOrders,
  createOrder,
  getCustomerOrdersSimple,
  requestCancellation,
  approveCancellation,
  rejectCancellation,
  acceptComplaint,
  rejectComplaint
};
