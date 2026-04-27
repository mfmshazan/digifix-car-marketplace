import prisma from '../lib/prisma.js';

/**
 * Get user's wishlist
 */
export const getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;

    const wishlist = await prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: true,
        carPart: {
          include: {
            seller: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: wishlist,
    });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch wishlist',
      error: error.message,
    });
  }
};

/**
 * Toggle an item in the wishlist
 */
export const toggleWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId, itemType = 'PRODUCT' } = req.body;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: 'Item ID is required',
      });
    }

    // Check if the item is already in the wishlist
    const existingItem = await prisma.wishlistItem.findFirst({
      where: {
        userId,
        ...(itemType === 'CAR_PART' ? { carPartId: itemId } : { productId: itemId }),
      },
    });

    if (existingItem) {
      // Remove it
      await prisma.wishlistItem.delete({
        where: { id: existingItem.id },
      });
      return res.status(200).json({
        success: true,
        message: 'Item removed from wishlist',
        isWishlisted: false,
      });
    } else {
      // Add it
      await prisma.wishlistItem.create({
        data: {
          userId,
          itemType,
          ...(itemType === 'CAR_PART' ? { carPartId: itemId } : { productId: itemId }),
        },
      });
      return res.status(201).json({
        success: true,
        message: 'Item added to wishlist',
        isWishlisted: true,
      });
    }
  } catch (error) {
    console.error('Error toggling wishlist:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle wishlist',
      error: error.message,
    });
  }
};

/**
 * Remove an item directly by its wishlist ID
 */
export const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existingItem = await prisma.wishlistItem.findFirst({
      where: { id, userId },
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist item not found',
      });
    }

    await prisma.wishlistItem.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'Item removed from wishlist',
    });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove from wishlist',
      error: error.message,
    });
  }
};
