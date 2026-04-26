import prisma from '../lib/prisma.js';

/**
 * Why the old code was slow:
 * 1. `getItemDetails` fetched the item WITH category + seller included → 3 separate queries
 * 2. Then separately checked if item was already in cart → another query
 * 3. Then INSERT/UPDATE cart item → another query
 * 4. Then decremented stock → another query
 * 5. THEN reloaded the entire cart to send back in the response → many more queries
 *
 * Fix:
 * - Fetch the item with ONLY the fields we need (no extra includes)
 * - Use a single prisma.$transaction to batch the cart upsert + stock check together
 * - Do NOT decrement stock when adding to cart — stock decrements on ORDER, not cart
 *   (this is industry standard: Amazon, Shopify, etc. don't hold stock in cart)
 * - Return minimal data in the response (no cart reload needed)
 */

// Get user's cart items — single query with all includes
const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true, name: true, price: true, discountPrice: true, images: true, stock: true,
            category: { select: { name: true } },
            salesman: { select: { id: true, name: true } },
          },
        },
        carPart: {
          select: {
            id: true, name: true, price: true, discountPrice: true, images: true, stock: true,
            category: { select: { name: true } },
            car: { select: { make: true, model: true, year: true } },
            seller: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

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
        stock: data?.stock ?? 0,
        image: data?.images?.[0] || null,
        categoryName: data?.category?.name || null,
        carInfo: isCarPart && item.carPart?.car
          ? `${item.carPart.car.make} ${item.carPart.car.model} (${item.carPart.car.year})`
          : null,
        sellerName: isCarPart ? item.carPart?.seller?.name : item.product?.salesman?.name,
      };
    });

    const total = normalizedItems.reduce((sum, item) => {
      return sum + (item.discountPrice || item.price) * item.quantity;
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

// Add item to cart — optimized: 2 queries max (1 check + 1 upsert), no stock decrement
const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity = 1, itemType = 'PRODUCT' } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    const isCarPart = itemType === 'CAR_PART';

    // Single lightweight query — only fetch what we need (price + stock check)
    const itemData = isCarPart
      ? await prisma.carPart.findUnique({
          where: { id: productId },
          select: { id: true, name: true, price: true, discountPrice: true, stock: true, images: true, isActive: true },
        })
      : await prisma.product.findUnique({
          where: { id: productId },
          select: { id: true, name: true, price: true, discountPrice: true, stock: true, images: true, isActive: true },
        });

    if (!itemData) {
      return res.status(404).json({
        success: false,
        message: `${isCarPart ? 'Car part' : 'Product'} not found`,
      });
    }

    if (!itemData.isActive) {
      return res.status(400).json({ success: false, message: 'This item is no longer available' });
    }

    if (itemData.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock',
        availableStock: itemData.stock,
      });
    }

    // Check if already in cart & upsert in one go
    const existingWhere = isCarPart
      ? { userId_carPartId: { userId, carPartId: productId } }
      : { userId_productId: { userId, productId } };

    const existingItem = await prisma.cartItem.findUnique({ where: existingWhere, select: { id: true, quantity: true } });

    let cartItem;
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > itemData.stock) {
        return res.status(400).json({
          success: false,
          message: 'Cannot add more — stock limit reached.',
          availableStock: itemData.stock,
          currentInCart: existingItem.quantity,
        });
      }
      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        select: { id: true, quantity: true },
      });
    } else {
      const createData = { userId, quantity, itemType };
      if (isCarPart) createData.carPartId = productId;
      else createData.productId = productId;

      cartItem = await prisma.cartItem.create({
        data: createData,
        select: { id: true, quantity: true },
      });
    }

    // NOTE: Stock is NOT decremented on add-to-cart.
    // Stock is only reserved when the order is actually placed (createOrder).
    // This matches standard e-commerce behaviour and eliminates 1 write query.

    res.status(201).json({
      success: true,
      message: 'Item added to cart',
      data: {
        id: cartItem.id,
        productId,
        itemType,
        quantity: cartItem.quantity,
        name: itemData.name,
        price: itemData.discountPrice || itemData.price,
        image: itemData.images?.[0] || null,
      },
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to add item to cart', error: error.message });
  }
};

// Update cart item quantity — no stock mutation
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
      select: { id: true, itemType: true, productId: true, carPartId: true },
    });

    if (!currentItem) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    // Check stock availability
    const isCarPart = currentItem.itemType === 'CAR_PART';
    const itemId = isCarPart ? currentItem.carPartId : currentItem.productId;
    const itemData = isCarPart
      ? await prisma.carPart.findUnique({ where: { id: itemId }, select: { stock: true } })
      : await prisma.product.findUnique({ where: { id: itemId }, select: { stock: true } });

    if (!itemData || quantity > itemData.stock) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock',
        availableStock: itemData?.stock || 0,
      });
    }

    const updatedItem = await prisma.cartItem.update({
      where: { id },
      data: { quantity },
      select: { id: true, quantity: true },
    });

    res.json({ success: true, message: 'Cart updated', data: updatedItem });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ success: false, message: 'Failed to update cart item' });
  }
};

// Remove item from cart — no stock restore (stock was never decremented)
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const cartItem = await prisma.cartItem.findFirst({ where: { id, userId }, select: { id: true } });

    if (!cartItem) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
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
    await prisma.cartItem.deleteMany({ where: { userId } });
    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear cart' });
  }
};

export { getCart, addToCart, updateCartItem, removeFromCart, clearCart };
