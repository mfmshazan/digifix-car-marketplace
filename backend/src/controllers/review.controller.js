import prisma from '../lib/prisma.js';
import { updateReviewAggregates } from '../utils/reviewWorker.js';

// Basic profanity filter
const badWords = ['fuck', 'shit', 'bitch', 'asshole', 'cunt', 'dick'];
const profanityRegex = new RegExp(`\\b(${badWords.join('|')})\\b`, 'i');

export const createReviews = async (req, res) => {
  try {
    const { orderId, reviews } = req.body;
    const userId = req.user.id;

    if (!orderId || !reviews || !Array.isArray(reviews)) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    // Purchase Validation: Check if the user owns this DELIVERED order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { select: { productId: true, carPartId: true } },
        riderDeliveryJobs: {
          where: { status: 'delivered' },
          orderBy: { deliveredAt: 'desc' },
          take: 1,
          select: { partnerId: true },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.customerId !== userId) {
      return res.status(403).json({ success: false, message: 'You can only review your own orders' });
    }

    if (order.status !== 'DELIVERED') {
      return res.status(400).json({ success: false, message: 'You can only review delivered orders' });
    }

    const productIds = new Set(order.items.map((item) => item.productId).filter(Boolean));
    const carPartIds = new Set(order.items.map((item) => item.carPartId).filter(Boolean));
    const assignedRiderId = order.riderDeliveryJobs[0]?.partnerId;
    const validTargetTypes = new Set(['PRODUCT', 'CAR_PART', 'SELLER', 'DELIVERY_PARTNER']);

    for (const review of reviews) {
      const targetId = String(review?.targetId || '');
      const { targetType } = review || {};
      const rating = Number(review?.rating);

      if (!targetId || !validTargetTypes.has(targetType)) {
        return res.status(400).json({ success: false, message: 'Invalid review target' });
      }

      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5' });
      }

      const targetBelongsToOrder =
        (targetType === 'PRODUCT' && productIds.has(targetId)) ||
        (targetType === 'CAR_PART' && carPartIds.has(targetId)) ||
        (targetType === 'SELLER' && targetId === String(order.salesmanId)) ||
        (targetType === 'DELIVERY_PARTNER' && assignedRiderId !== null && assignedRiderId !== undefined && targetId === String(assignedRiderId));

      if (!targetBelongsToOrder) {
        return res.status(403).json({ success: false, message: 'This review target is not part of the delivered order' });
      }
    }

    const createdReviews = [];

    // Process each review in the split UI payload
    for (const review of reviews) {
      const { targetId, targetType, rating, comment, title, images } = review;

      let status = 'PUBLISHED';
      
      // Profanity Check
      if (comment && profanityRegex.test(comment)) {
        status = 'FLAGGED';
      }

      try {
        const newReview = await prisma.review.create({
          data: {
            orderId,
            targetId,
            targetType,
            rating,
            comment,
            title,
            images: images || [],
            status,
            userId
          }
        });

        createdReviews.push(newReview);

        // Trigger async aggregate update if published
        if (status === 'PUBLISHED') {
          // Fire and forget
          updateReviewAggregates(targetId, targetType);
        }
      } catch (err) {
        // P2002 is Prisma's unique constraint violation error code
        if (err.code === 'P2002') {
          return res.status(409).json({ success: false, message: 'You have already reviewed this item for this order' });
        }
        throw err;
      }
    }

    res.status(201).json({
      success: true,
      message: 'Reviews submitted successfully',
      data: createdReviews
    });
  } catch (error) {
    console.error('Create Reviews Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const editReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, title } = req.body;
    const userId = req.user.id;

    const existingReview = await prisma.review.findUnique({
      where: { id }
    });

    if (!existingReview) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (existingReview.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Check grace period (48 hours)
    const hoursSinceCreation = (new Date() - new Date(existingReview.createdAt)) / (1000 * 60 * 60);
    if (hoursSinceCreation > 48) {
      return res.status(400).json({ success: false, message: 'Review can only be edited within 48 hours of creation' });
    }

    let status = existingReview.status;
    if (comment && profanityRegex.test(comment)) {
      status = 'FLAGGED';
    }

    const updatedReview = await prisma.review.update({
      where: { id },
      data: {
        rating: rating || existingReview.rating,
        comment: comment !== undefined ? comment : existingReview.comment,
        title: title !== undefined ? title : existingReview.title,
        status
      }
    });

    // Update aggregates asynchronously
    updateReviewAggregates(updatedReview.targetId, updatedReview.targetType);

    res.status(200).json({ success: true, data: updatedReview });
  } catch (error) {
    console.error('Edit Review Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const replyToReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { replyText } = req.body;
    const sellerId = req.user.id;

    const review = await prisma.review.findUnique({
      where: { id },
      include: { replies: true }
    });

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (review.replies.length > 0) {
      return res.status(400).json({ success: false, message: 'A reply already exists for this review' });
    }

    // In a real app, you might want to verify the sellerId owns the targetId (Product or Store)
    
    const reply = await prisma.reviewReply.create({
      data: {
        reviewId: id,
        sellerId,
        replyText
      }
    });

    res.status(201).json({ success: true, data: reply });
  } catch (error) {
    console.error('Reply to Review Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const flagReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await prisma.review.update({
      where: { id },
      data: { status: 'FLAGGED' }
    });

    // We should potentially update aggregates to exclude the flagged review
    updateReviewAggregates(review.targetId, review.targetType);

    res.status(200).json({ success: true, message: 'Review flagged successfully' });
  } catch (error) {
    console.error('Flag Review Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const changeReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // PUBLISHED or HIDDEN

    const review = await prisma.review.update({
      where: { id },
      data: { status }
    });

    updateReviewAggregates(review.targetId, review.targetType);

    res.status(200).json({ success: true, data: review });
  } catch (error) {
    console.error('Change Review Status Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getDriverSummary = async (req, res) => {
  try {
    const rawId = req.user.id;
    const riderId = parseInt(rawId, 10);
    let marketplaceUserId = null;

    if (isNaN(riderId)) {
      marketplaceUserId = rawId;
      const user = await prisma.user.findUnique({
        where: { id: rawId },
        select: { id: true, email: true },
      });
      if (user?.email) {
        const riderRes = await prisma.$queryRawUnsafe(
          `SELECT id FROM "Rider" WHERE LOWER(email) = LOWER($1)`,
          user.email
        );
        if (riderRes && riderRes.length > 0) {
          riderId = riderRes[0].id;
        }
      }
    } else {
      const riderRes = await prisma.$queryRawUnsafe(
        `SELECT rider.id, rider.email, u.id AS marketplace_user_id
           FROM "Rider" rider
           LEFT JOIN "User" u ON LOWER(u.email) = LOWER(rider.email)
          WHERE rider.id = $1`,
        riderId
      );
      if (riderRes && riderRes.length > 0) {
        marketplaceUserId = riderRes[0].marketplace_user_id;
      }
    }

    const allTargetIds = [
      !isNaN(riderId) ? String(riderId) : null,
      marketplaceUserId,
      String(rawId),
    ].filter(Boolean);

    // Fetch all reviews for this driver (anonymized)
    const reviews = await prisma.review.findMany({
      where: {
        targetId: { in: allTargetIds },
        targetType: 'DELIVERY_PARTNER',
        status: 'PUBLISHED'
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    const averageRating = reviews.length > 0 
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
      : 0.0;

    res.status(200).json({
      success: true,
      data: {
        averageRating: Number(averageRating.toFixed(2)),
        totalReviews: reviews.length,
        recentFeedback: reviews.slice(0, 100)
      }
    });
  } catch (error) {
    console.error('Get Driver Summary Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getTargetReviews = async (req, res) => {
  try {
    const { targetId } = req.params;

    const reviews = await prisma.review.findMany({
      where: {
        targetId,
        status: 'PUBLISHED'
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true }
        },
        replies: {
          include: {
            seller: {
              select: { id: true, name: true, avatar: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    console.error('Get Target Reviews Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
