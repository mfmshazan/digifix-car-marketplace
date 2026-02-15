import prisma from '../lib/prisma.js';

// Get user's cart items
const getCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true,
            salesman: {
              select: {
                id: true,
                name: true,
                store: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Also get cart items for car parts
    const carPartCartItems = await prisma.$queryRaw`
      SELECT cp.*, c.name as category_name, car.make, car.model, car.year, car."numberPlate",
             u.name as seller_name, u.id as seller_id
      FROM "CarPart" cp
      JOIN "Category" c ON cp."categoryId" = c.id
      JOIN "Car" car ON cp."carId" = car.id
      JOIN "User" u ON cp."sellerId" = u.id
      WHERE cp.id IN (
        SELECT "productId" FROM "CartItem" WHERE "userId" = ${userId}
      )
    `;

    const total = cartItems.reduce((sum, item) => {
      const price = item.product.discountPrice || item.product.price;
      return sum + price * item.quantity;
    }, 0);

    res.json({
      success: true,
      data: {
        items: cartItems,
        total,
        itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
      },
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cart',
    });
  }
};

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, quantity = 1, type = 'product' } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
    }

    // Check if product exists and has stock (for regular products)
    if (type === 'product') {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      if (product.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock',
          availableStock: product.stock,
        });
      }

      // Check if item already in cart
      const existingItem = await prisma.cartItem.findUnique({
        where: {
          userId_productId: { userId, productId },
        },
      });

      let cartItem;

      if (existingItem) {
        // Check if total quantity exceeds stock
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > product.stock) {
          return res.status(400).json({
            success: false,
            message: 'Cannot add more items. Stock limit reached.',
            availableStock: product.stock,
            currentInCart: existingItem.quantity,
          });
        }

        // Update quantity
        cartItem = await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: newQuantity },
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        });
      } else {
        // Create new cart item
        cartItem = await prisma.cartItem.create({
          data: {
            userId,
            productId,
            quantity,
          },
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        });
      }

      // Reduce stock
      await prisma.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
      });

      res.status(201).json({
        success: true,
        message: 'Item added to cart',
        data: cartItem,
      });
    } else {
      // Handle car parts - similar logic
      const carPart = await prisma.carPart.findUnique({
        where: { id: productId },
      });

      if (!carPart) {
        return res.status(404).json({
          success: false,
          message: 'Car part not found',
        });
      }

      if (carPart.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock',
          availableStock: carPart.stock,
        });
      }

      // Reduce stock for car parts
      await prisma.carPart.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
      });

      res.status(201).json({
        success: true,
        message: 'Car part added to cart',
        data: { carPart, quantity },
      });
    }
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item to cart',
    });
  }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1',
      });
    }

    // Get current cart item
    const currentItem = await prisma.cartItem.findFirst({
      where: { id, userId },
      include: { product: true },
    });

    if (!currentItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found',
      });
    }

    const quantityDiff = quantity - currentItem.quantity;

    // Check stock for increase
    if (quantityDiff > 0) {
      if (currentItem.product.stock < quantityDiff) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock',
          availableStock: currentItem.product.stock + currentItem.quantity,
        });
      }
    }

    // Update cart item
    const updatedItem = await prisma.cartItem.update({
      where: { id },
      data: { quantity },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    // Update stock (increase or decrease)
    await prisma.product.update({
      where: { id: currentItem.productId },
      data: { stock: { decrement: quantityDiff } },
    });

    res.json({
      success: true,
      message: 'Cart updated',
      data: updatedItem,
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart item',
    });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // Get the cart item
    const cartItem = await prisma.cartItem.findFirst({
      where: { id, userId },
    });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found',
      });
    }

    // Restore stock
    await prisma.product.update({
      where: { id: cartItem.productId },
      data: { stock: { increment: cartItem.quantity } },
    });

    // Delete cart item
    await prisma.cartItem.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Item removed from cart',
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove item from cart',
    });
  }
};

// Clear cart
const clearCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all cart items to restore stock
    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
    });

    // Restore stock for all items
    for (const item of cartItems) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    // Delete all cart items
    await prisma.cartItem.deleteMany({
      where: { userId },
    });

    res.json({
      success: true,
      message: 'Cart cleared',
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart',
    });
  }
};

export { getCart, addToCart, updateCartItem, removeFromCart, clearCart };
