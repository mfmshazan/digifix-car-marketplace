import { riderQuery } from '../lib/riderDb.js';

const PERIODS = new Set(['today', 'week', 'month']);

const positiveTagRules = [
  { label: 'Fast delivery', pattern: /\b(fast|quick|speedy|prompt)\b/i },
  { label: 'On time', pattern: /\b(on time|punctual|timely)\b/i },
  { label: 'Friendly', pattern: /\b(friendly|kind|polite|courteous)\b/i },
  { label: 'Professional', pattern: /\b(professional|excellent|great service)\b/i },
  { label: 'Careful handling', pattern: /\b(careful|safe|well handled|good condition)\b/i },
  { label: 'Good communication', pattern: /\b(communication|updated|informed|called)\b/i },
];

const negativeTagRules = [
  { label: 'Late', pattern: /\b(late|delayed|delay|slow)\b/i },
  { label: 'Poor communication', pattern: /\b(no update|did not call|poor communication|unresponsive)\b/i },
  { label: 'Unprofessional', pattern: /\b(rude|unprofessional|impolite)\b/i },
  { label: 'Package handling', pattern: /\b(damaged|broken|careless|poor handling)\b/i },
  { label: 'Address issue', pattern: /\b(wrong address|could not find|lost)\b/i },
];

const deriveTags = (review) => {
  const rating = Number(review.rating);
  const text = `${review.title || ''} ${review.comment || ''}`.trim();
  const rules = rating >= 4 ? positiveTagRules : rating <= 2 ? negativeTagRules : [];
  const tags = rules.filter((rule) => rule.pattern.test(text)).map((rule) => rule.label);

  if (!tags.length && rating >= 4) tags.push('Great service');
  if (!tags.length && rating <= 2) tags.push('Needs improvement');

  return tags.slice(0, 3);
};

const summarizeTags = (reviews, minimumRating, maximumRating) => {
  const counts = new Map();

  reviews
    .filter((review) => review.rating >= minimumRating && review.rating <= maximumRating)
    .forEach((review) => {
      deriveTags(review).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
    });

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, 5);
};

const maskCustomerName = (name) => {
  const clean = String(name || 'Customer').trim();
  if (!clean) return 'C***r';
  if (clean.length === 1) return `${clean[0]}***`;
  return `${clean[0]}***${clean[clean.length - 1]}`;
};

const getRiderIdentity = async (partnerId) => {
  const result = await riderQuery(
    `SELECT rider.id, rider.email, rider.rating,
            marketplace_user.id AS marketplace_user_id
       FROM "Rider" rider
       LEFT JOIN "User" marketplace_user
         ON LOWER(marketplace_user.email) = LOWER(rider.email)
      WHERE rider.id = $1`,
    [partnerId]
  );

  return result.rows[0] || null;
};

const getPeriodWindow = async (period) => {
  const result = await riderQuery(
    `SELECT CASE $1
              WHEN 'today' THEN DATE_TRUNC('day', NOW())
              WHEN 'month' THEN DATE_TRUNC('month', NOW())
              ELSE NOW() - INTERVAL '7 days'
            END AS period_start,
            NOW() AS period_end`,
    [period]
  );

  return result.rows[0];
};

const getOnlineHours = async (partnerId, periodStart, periodEnd) => {
  const relation = await riderQuery(
    `SELECT TO_REGCLASS('"RiderAvailabilitySession"') AS relation`
  );

  if (!relation.rows[0]?.relation) {
    return 0;
  }

  const result = await riderQuery(
    `SELECT COALESCE(
              SUM(
                EXTRACT(EPOCH FROM (
                  LEAST(COALESCE(ended_at, $3), $3) -
                  GREATEST(started_at, $2)
                ))
              ) FILTER (
                WHERE started_at < $3
                  AND COALESCE(ended_at, $3) > $2
              ),
              0
            ) / 3600 AS online_hours
       FROM "RiderAvailabilitySession"
      WHERE partner_id = $1`,
    [partnerId, periodStart, periodEnd]
  );

  return Number(result.rows[0]?.online_hours || 0);
};

export const getRiderPerformance = async (req, res, next) => {
  try {
    const requestedPeriod = String(req.query.period || 'week').toLowerCase();
    const period = PERIODS.has(requestedPeriod) ? requestedPeriod : 'week';
    const identity = await getRiderIdentity(req.user.id);

    if (!identity) {
      return res.status(404).json({ success: false, message: 'Rider not found' });
    }

    const { period_start: periodStart, period_end: periodEnd } = await getPeriodWindow(period);
    const reviewTargetIds = [String(identity.id), identity.marketplace_user_id].filter(Boolean);

    const [
      deliveryResult,
      offerResult,
      periodRatingResult,
      reviewResult,
      trendResult,
      onlineHours,
    ] = await Promise.all([
      riderQuery(
        `SELECT
            COUNT(*) FILTER (WHERE delivered_at >= $2) AS total_deliveries,
            COALESCE(SUM(payment_amount) FILTER (WHERE delivered_at >= $2), 0) AS total_earnings,
            COUNT(*) FILTER (WHERE accepted_at >= $2) AS accepted_deliveries,
            COUNT(*) FILTER (WHERE accepted_at >= $2 AND status = 'delivered') AS completed_deliveries
           FROM "DeliveryJob"
          WHERE partner_id = $1`,
        [req.user.id, periodStart]
      ),
      riderQuery(
        `SELECT
            COUNT(*) FILTER (WHERE offer_status = 'accepted') AS accepted,
            COUNT(*) FILTER (WHERE offer_status = 'declined') AS declined,
            COUNT(*) FILTER (WHERE offer_status = 'expired') AS expired
           FROM "DeliveryOffer"
          WHERE partner_id = $1
            AND offered_at >= $2`,
        [req.user.id, periodStart]
      ),
      riderQuery(
        `SELECT COALESCE(AVG(rating), 0) AS average_rating,
                COUNT(*) AS total_reviews
           FROM "Review"
          WHERE "targetType" = 'DELIVERY_PARTNER'
            AND status = 'PUBLISHED'
            AND "targetId" = ANY($1::text[])
            AND "createdAt" >= $2`,
        [reviewTargetIds, periodStart]
      ),
      riderQuery(
        `SELECT review.id, review.rating, review.title, review.comment,
                review."createdAt" AS created_at,
                customer.name AS customer_name
           FROM "Review" review
           JOIN "User" customer ON customer.id = review."userId"
          WHERE review."targetType" = 'DELIVERY_PARTNER'
            AND review.status = 'PUBLISHED'
            AND review."targetId" = ANY($1::text[])
          ORDER BY review."createdAt" DESC`,
        [reviewTargetIds]
      ),
      riderQuery(
        `WITH days AS (
            SELECT GENERATE_SERIES(
              DATE_TRUNC('day', NOW()) - INTERVAL '6 days',
              DATE_TRUNC('day', NOW()),
              INTERVAL '1 day'
            ) AS day
          ),
          offer_metrics AS (
            SELECT DATE_TRUNC('day', offered_at) AS day,
                   COUNT(*) FILTER (WHERE offer_status = 'accepted') AS accepted,
                   COUNT(*) FILTER (
                     WHERE offer_status IN ('accepted', 'declined', 'expired')
                   ) AS total_responses
              FROM "DeliveryOffer"
             WHERE partner_id = $1
               AND offered_at >= DATE_TRUNC('day', NOW()) - INTERVAL '6 days'
             GROUP BY DATE_TRUNC('day', offered_at)
          ),
          job_metrics AS (
            SELECT DATE_TRUNC('day', accepted_at) AS day,
                   COUNT(*) AS accepted_jobs,
                   COUNT(*) FILTER (WHERE status = 'delivered') AS completed_jobs
              FROM "DeliveryJob"
             WHERE partner_id = $1
               AND accepted_at >= DATE_TRUNC('day', NOW()) - INTERVAL '6 days'
             GROUP BY DATE_TRUNC('day', accepted_at)
          )
          SELECT days.day,
                 COALESCE(offer_metrics.accepted, 0) AS accepted,
                 COALESCE(offer_metrics.total_responses, 0) AS total_responses,
                 COALESCE(job_metrics.accepted_jobs, 0) AS accepted_jobs,
                 COALESCE(job_metrics.completed_jobs, 0) AS completed_jobs
            FROM days
            LEFT JOIN offer_metrics ON offer_metrics.day = days.day
            LEFT JOIN job_metrics ON job_metrics.day = days.day
           ORDER BY days.day`,
        [req.user.id]
      ),
      getOnlineHours(req.user.id, periodStart, periodEnd),
    ]);

    const deliveries = deliveryResult.rows[0];
    const offers = offerResult.rows[0];
    const periodRatings = periodRatingResult.rows[0];
    const reviews = reviewResult.rows.map((review) => ({
      ...review,
      rating: Number(review.rating),
    }));
    const acceptedOffers = Number(offers.accepted || 0);
    const totalOfferResponses =
      acceptedOffers + Number(offers.declined || 0) + Number(offers.expired || 0);
    const acceptedDeliveries = Number(deliveries.accepted_deliveries || 0);
    const completedDeliveries = Number(deliveries.completed_deliveries || 0);
    const overallAverage = reviews.length
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : Number(identity.rating || 0);

    return res.json({
      success: true,
      data: {
        period,
        periodStart,
        periodEnd,
        overview: {
          totalDeliveries: Number(deliveries.total_deliveries || 0),
          averageRating: Number(periodRatings.total_reviews || 0)
            ? Number(periodRatings.average_rating || 0)
            : overallAverage,
          acceptanceRate: totalOfferResponses
            ? (acceptedOffers / totalOfferResponses) * 100
            : 0,
          completionRate: acceptedDeliveries
            ? (completedDeliveries / acceptedDeliveries) * 100
            : 0,
          onlineHours,
          totalEarnings: Number(deliveries.total_earnings || 0),
        },
        ratings: {
          overallAverage,
          totalReviews: reviews.length,
          breakdown: [5, 4, 3, 2, 1].map((stars) => ({
            stars,
            count: reviews.filter((review) => review.rating === stars).length,
          })),
          positiveTags: summarizeTags(reviews, 4, 5),
          negativeTags: summarizeTags(reviews, 1, 2),
          recent: reviews.slice(0, 10).map((review) => ({
            id: review.id,
            rating: review.rating,
            comment: review.comment || '',
            tags: deriveTags(review),
            createdAt: review.created_at,
            customerName: maskCustomerName(review.customer_name),
          })),
        },
        trend: trendResult.rows.map((row) => {
          const totalResponses = Number(row.total_responses || 0);
          const accepted = Number(row.accepted || 0);
          const acceptedJobs = Number(row.accepted_jobs || 0);
          const completedJobs = Number(row.completed_jobs || 0);

          return {
            date: row.day,
            acceptanceRate: totalResponses ? (accepted / totalResponses) * 100 : 0,
            completionRate: acceptedJobs ? (completedJobs / acceptedJobs) * 100 : 0,
          };
        }),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const flagRiderReview = async (req, res, next) => {
  try {
    const identity = await getRiderIdentity(req.user.id);

    if (!identity) {
      return res.status(404).json({ success: false, message: 'Rider not found' });
    }

    const targetIds = [String(identity.id), identity.marketplace_user_id].filter(Boolean);
    const result = await riderQuery(
      `UPDATE "Review"
          SET status = 'FLAGGED',
              "updatedAt" = NOW()
        WHERE id = $1
          AND "targetType" = 'DELIVERY_PARTNER'
          AND "targetId" = ANY($2::text[])
          AND status = 'PUBLISHED'
        RETURNING id`,
      [req.params.id, targetIds]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Review not found or already reported',
      });
    }

    const aggregate = await riderQuery(
      `SELECT COALESCE(AVG(rating), 0) AS average_rating,
              COUNT(*) AS total_reviews
         FROM "Review"
        WHERE "targetType" = 'DELIVERY_PARTNER'
          AND "targetId" = ANY($1::text[])
          AND status = 'PUBLISHED'`,
      [targetIds]
    );

    await riderQuery(
      `UPDATE "Rider"
          SET rating = $1,
              total_reviews = $2
        WHERE id = $3`,
      [
        Number(aggregate.rows[0]?.average_rating || 0),
        Number(aggregate.rows[0]?.total_reviews || 0),
        req.user.id,
      ]
    );

    return res.json({
      success: true,
      message: 'Review reported for admin moderation',
    });
  } catch (error) {
    return next(error);
  }
};
