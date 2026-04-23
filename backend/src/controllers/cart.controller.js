import prisma from '../lib/prisma.js';

// Helper: get item details (product or car part)
const getItemDetails = async (productId, itemType) => {
  if (itemType === 'CAR_PART') {
    return prisma.carPart.findUnique({
      where: { id: productId },
      include: { category: true, seller: { select: { id: true, name: true } } },
    });
  }
  return prisma.product.findUnique({
    where: { id: productId },
    include: { category: true, salesman: { select: { id: true, name: true } } },
  });
};

// Get user's cart items
const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: { category: true },
        },
        carPart: {
          include: {
            category: true,
            car: { select: { make: true, model: true, year: true } },
            seller: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Normalize each item into a unified format for the mobile app
    const normalizedItems = cartItems.map((item) => {
      const isCarPart = item.itemType === 'CAR_PART';
      const data = isCarPart ? item.carPart : item.product;

      return {
        id: item.id,
        cartItemId: item.id,
        productId: isCarPart ? item.carPartId : item.productId,
        itemType: item.itemType,
        name: data?.name || 'Unknown',
        price: data?.price || 0,
        discountPrice: data?.discountPrice || null,
        quantity: item.quantity,
        image: data?.images?.[0] || null,
        categoryName: data?.category?.name || null,
        carInfo: isCarPart && item.carPart?.car
          ? `${item.carPart.car.make} ${item.carPart.car.model} (${item.carPart.car.year})`
          : null,
        sellerName: isCarPart
          ? item.carPart?.seller?.name
          : item.product?.salesman?.name,
      };
    });

    const total = normalizedItems.reduce((sum, item) => {
      const price = item.discountPrice || item.price;
      return sum + price * item.quantity;
    }, 0);

    res.json({
      success: true,
      data: {
        items: normalizedItems,
        total,
        itemCount: normalizedItems.reduce((sum, item) => sum + item.quantity, 0),
      },
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to get cart' });
  }
};

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity = 1, itemType = 'PRODUCT' } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    const isCarPart = itemType === 'CAR_PART';

    // Fetch the item (product or car part)
    const itemData = await getItemDetails(productId, itemType);

    if (!itemData) {
      return res.status(404).json({
        success: false,
        message: `${isCarPart ? 'Car part' : 'Product'} not found`,
      });
    }

    if (itemData.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock',
        availableStock: itemData.stock,
      });
    }

    // Build where clause for existing cart check
    const existingWhere = isCarPart
      ? { userId_carPartId: { userId, carPartId: productId } }
      : { userId_productId: { userId, productId } };

    const existingItem = await prisma.cartItem.findUnique({ where: existingWhere });

    let cartItem;

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > itemData.stock) {
        return res.status(400).json({
          success: false,
          message: 'Cannot add more items. Stock limit reached.',
          availableStock: itemData.stock,
          currentInCart: existingItem.quantity,
        });
      }

      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      const createData = {
        userId,
        quantity,
        itemType,
      };
      if (isCarPart) {
        createData.carPartId = productId;
      } else {
        createData.productId = productId;
      }

      cartItem = await prisma.cartItem.create({ data: createData });
    }

    // Decrement stock
    if (isCarPart) {
      await prisma.carPart.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
      });
    } else {
      await prisma.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Item added to cart',
      data: {
        id: cartItem.id,
        productId,
        itemType,
        quantity: cartItem.quantity,
      },
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to add item to cart', error: error.message });
  }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
    }

    const currentItem = await prisma.cartItem.findFirst({
      where: { id, userId },
    });

    if (!currentItem) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    const quantityDiff = quantity - currentItem.quantity;
    const isCarPart = currentItem.itemType === 'CAR_PART';

    // Check stock for increase
    if (quantityDiff > 0) {
      const itemData = isCarPart
        ? await prisma.carPart.findUnique({ where: { id: currentItem.carPartId } })
        : await prisma.product.findUnique({ where: { id: currentItem.productId } });

      if (!itemData || itemData.stock < quantityDiff) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock',
          availableStock: (itemData?.stock || 0) + currentItem.quantity,
        });
      }
    }

    const updatedItem = await prisma.cartItem.update({
      where: { id },
      data: { quantity },
    });

    // Update stock
    if (quantityDiff !== 0) {
      if (isCarPart) {
        await prisma.carPart.update({
          where: { id: currentItem.carPartId },
          data: { stock: { decrement: quantityDiff } },
        });
      } else {
        await prisma.product.update({
          where: { id: currentItem.productId },
          data: { stock: { decrement: quantityDiff } },
        });
      }
    }

    res.json({ success: true, message: 'Cart updated', data: updatedItem });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ success: false, message: 'Failed to update cart item' });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const cartItem = await prisma.cartItem.findFirst({ where: { id, userId } });

    if (!cartItem) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    // Restore stock
    if (cartItem.itemType === 'CAR_PART' && cartItem.carPartId) {
      await prisma.carPart.update({
        where: { id: cartItem.carPartId },
        data: { stock: { increment: cartItem.quantity } },
      });
    } else if (cartItem.productId) {
      await prisma.product.update({
        where: { id: cartItem.productId },
        data: { stock: { increment: cartItem.quantity } },
      });
    }

    await prisma.cartItem.delete({ where: { id } });

    res.json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove item from cart' });
  }
};

// Clear cart
const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cartItems = await prisma.cartItem.findMany({ where: { userId } });

    // Restore stock for all items
    for (const item of cartItems) {
      if (item.itemType === 'CAR_PART' && item.carPartId) {
        await prisma.carPart.update({
          where: { id: item.carPartId },
          data: { stock: { increment: item.quantity } },
        });
      } else if (item.productId) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    await prisma.cartItem.deleteMany({ where: { userId } });

    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear cart' });
  }
};

export { getCart, addToCart, updateCartItem, removeFromCart, clearCart };
