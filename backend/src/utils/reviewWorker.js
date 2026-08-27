import prisma from '../lib/prisma.js';
import { riderQuery } from '../lib/riderDb.js';

export const updateReviewAggregates = async (targetId, targetType) => {
  try {
    // Update the corresponding table based on targetType
    switch (targetType) {
      case 'PRODUCT': {
        const aggregate = await prisma.review.aggregate({
          where: {
            targetId,
            targetType,
            status: 'PUBLISHED',
          },
          _avg: { rating: true },
          _count: { id: true },
        });
        const averageRating = aggregate._avg.rating || 0;
        const totalReviews = aggregate._count.id || 0;

        await prisma.product.update({
          where: { id: targetId },
          data: {
            averageRating,
            totalReviews,
          },
        });
        console.log(`Successfully updated aggregates for PRODUCT ${targetId}: avg ${averageRating}, total ${totalReviews}`);
        break;
      }

      case 'SELLER': {
        const aggregate = await prisma.review.aggregate({
          where: {
            targetId,
            targetType,
            status: 'PUBLISHED',
          },
          _avg: { rating: true },
          _count: { id: true },
        });
        const averageRating = aggregate._avg.rating || 0;
        const totalReviews = aggregate._count.id || 0;

        await prisma.store.update({
          where: { ownerId: targetId },
          data: {
            rating: averageRating,
            totalReviews,
          },
        });
        console.log(`Successfully updated aggregates for SELLER ${targetId}: avg ${averageRating}, total ${totalReviews}`);
        break;
      }

      case 'DELIVERY_PARTNER': {
        let riderId = parseInt(targetId, 10);
        let marketplaceUserId = null;
        let riderEmail = null;

        if (isNaN(riderId)) {
          marketplaceUserId = targetId;
          const user = await prisma.user.findUnique({
            where: { id: targetId },
            select: { id: true, email: true },
          });
          if (user?.email) {
            riderEmail = user.email;
            const riderRes = await riderQuery(
              `SELECT id FROM "Rider" WHERE LOWER(email) = LOWER($1)`,
              [user.email]
            );
            if (riderRes.rows.length > 0) {
              riderId = riderRes.rows[0].id;
            }
          }
        } else {
          const riderRes = await riderQuery(
            `SELECT rider.id, rider.email, u.id AS marketplace_user_id
               FROM "Rider" rider
               LEFT JOIN "User" u ON LOWER(u.email) = LOWER(rider.email)
              WHERE rider.id = $1`,
            [riderId]
          );
          if (riderRes.rows.length > 0) {
            riderEmail = riderRes.rows[0].email;
            marketplaceUserId = riderRes.rows[0].marketplace_user_id;
          }
        }

        const allTargetIds = [
          !isNaN(riderId) ? String(riderId) : null,
          marketplaceUserId,
          String(targetId),
        ].filter(Boolean);

        const driverAggregate = await prisma.review.aggregate({
          where: {
            targetId: { in: allTargetIds },
            targetType: 'DELIVERY_PARTNER',
            status: 'PUBLISHED',
          },
          _avg: { rating: true },
          _count: { id: true },
        });

        const driverAvg = Number(driverAggregate._avg.rating || 0);
        const driverTotal = Number(driverAggregate._count.id || 0);

        if (!isNaN(riderId)) {
          await riderQuery(
            `UPDATE "Rider"
                SET rating = $1,
                    total_reviews = $2,
                    updated_at = NOW()
              WHERE id = $3`,
            [driverAvg, driverTotal, riderId]
          );
        }

        const userOrConditions = [
          marketplaceUserId ? { id: marketplaceUserId } : null,
          riderEmail ? { email: { equals: riderEmail, mode: 'insensitive' } } : null,
          !isNaN(riderId) ? null : { id: targetId },
        ].filter(Boolean);

        if (userOrConditions.length > 0) {
          await prisma.user.updateMany({
            where: {
              OR: userOrConditions,
              role: { in: ['DELIVERY_PARTNER', 'DELIVERY_PERSON', 'RIDER'] },
            },
            data: {
              rating: driverAvg,
              total_reviews: driverTotal,
            },
          });
        }

        console.log(`Successfully updated aggregates for DELIVERY_PARTNER riderId=${riderId}, targetId=${targetId}: avg ${driverAvg}, total ${driverTotal}`);
        break;
      }

      case 'CAR_PART': {
        const aggregate = await prisma.review.aggregate({
          where: {
            targetId,
            targetType,
            status: 'PUBLISHED',
          },
          _avg: { rating: true },
          _count: { id: true },
        });
        const averageRating = aggregate._avg.rating || 0;
        const totalReviews = aggregate._count.id || 0;

        await prisma.carPart.update({
          where: { id: targetId },
          data: {
            averageRating,
            totalReviews,
          },
        });
        console.log(`Successfully updated aggregates for CAR_PART ${targetId}: avg ${averageRating}, total ${totalReviews}`);
        break;
      }


      default:
        console.warn(`Unknown review targetType: ${targetType}`);
    }
  } catch (error) {
    console.error(`Failed to update aggregates for ${targetType} ${targetId}:`, error);
  }
};
