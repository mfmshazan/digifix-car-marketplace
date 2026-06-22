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
      where: { id: orderId }
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

    const createdReviews = [];

    // Process each review in the split UI payload
    for (const review of reviews) {
      const { targetId, targetType, rating, comment, title, images } = review;

      if (!targetId || !targetType || !rating) {
        continue;
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
      }

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
    const driverId = req.user.id;

    // Fetch all reviews for this driver (anonymized)
    const reviews = await prisma.review.findMany({
      where: {
        targetId: driverId,
        targetType: 'DELIVERY_PARTNER',
        status: 'PUBLISHED'
      },
      select: {
        rating: true,
        comment: true,
        createdAt: true,
        // Notice we DO NOT select userId or user relation
      },
      orderBy: { createdAt: 'desc' }
    });

    const averageRating = reviews.length > 0 
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
      : 5.0;

    res.status(200).json({
      success: true,
      data: {
        averageRating,
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

export const getAdminReviews = async (req, res) => {
  try {
    const { status, targetType, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (targetType) where.targetType = targetType;

    const reviews = await prisma.review.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

    const total = await prisma.review.count({ where });

    res.status(200).json({
      success: true,
      data: reviews,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get Admin Reviews Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
