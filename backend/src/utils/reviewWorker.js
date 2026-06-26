import prisma from '../lib/prisma.js';

export const updateReviewAggregates = async (targetId, targetType) => {
  try {
    // Calculate average rating and total reviews for the specific target
    const aggregate = await prisma.review.aggregate({
      where: {
        targetId,
        targetType,
        status: 'PUBLISHED',
      },
      _avg: {
        rating: true,
      },
      _count: {
        id: true,
      },
    });

    const averageRating = aggregate._avg.rating || 0;
    const totalReviews = aggregate._count.id || 0;

    // Update the corresponding table based on targetType
    switch (targetType) {
      case 'PRODUCT':
        await prisma.product.update({
          where: { id: targetId },
          data: {
            averageRating,
            totalReviews,
          },
        });
        break;
      case 'SELLER':
        await prisma.store.update({
          where: { ownerId: targetId },
          data: {
            rating: averageRating,
            totalReviews,
          },
        });
        break;
      case 'DELIVERY_PARTNER':
        // The driver data might be in User or rider_delivery_partners
        // First try User model
        await prisma.user.updateMany({
          where: { id: targetId, role: { in: ['DELIVERY_PARTNER', 'DELIVERY_PERSON', 'RIDER'] } },
          data: {
            rating: averageRating,
            total_reviews: totalReviews,
          },
        });

        // Next try Rider model if ID is an integer
        const parsedId = parseInt(targetId, 10);
        if (!isNaN(parsedId)) {
          await prisma.rider.updateMany({
            where: { id: parsedId },
            data: {
              rating: averageRating,
              totalReviews: totalReviews,
            },
          });
        }
        break;
      case 'CAR_PART':
        await prisma.carPart.update({
          where: { id: targetId },
          data: {
            averageRating,
            totalReviews,
          },
        });
        break;
      default:
        console.warn(`Unknown review targetType: ${targetType}`);
    }

    console.log(`Successfully updated aggregates for ${targetType} ${targetId}: avg ${averageRating}, total ${totalReviews}`);
  } catch (error) {
    console.error(`Failed to update aggregates for ${targetType} ${targetId}:`, error);
  }
};
