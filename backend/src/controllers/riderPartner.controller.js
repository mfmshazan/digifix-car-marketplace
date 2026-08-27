import fs from 'fs';
import path from 'path';
import { riderQuery } from '../lib/riderDb.js';
import { dispatchAvailableJobs, cancelPendingOffersForPartner } from '../services/riderRealtimeDispatch.js';
import { hasValue, isFloatInRange, validationError } from '../utils/riderValidation.js';

export const uploadRiderPhoto = async (req, res, next) => {
  try {
    const file = req.file || (req.files && req.files[0]);
    if (!file) {
      return res.status(400).json({ success: false, message: 'No photo uploaded' });
    }

    const currentRider = await riderQuery(
      `SELECT profile_photo_url FROM "Rider" WHERE id = $1`,
      [req.user.id]
    );

    if (currentRider.rows.length && currentRider.rows[0].profile_photo_url?.includes('/uploads/')) {
      const oldFileName = currentRider.rows[0].profile_photo_url.split('/').pop();
      const oldFilePath = path.join(process.cwd(), 'public/uploads', oldFileName);
      if (fs.existsSync(oldFilePath)) {
        try { fs.unlinkSync(oldFilePath); } catch (_) {}
      }
    }

    const photoUrl = `/uploads/${file.filename}`;
    const result = await riderQuery(
      `UPDATE "Rider"
          SET profile_photo_url = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, full_name, email, profile_photo_url`,
      [photoUrl, req.user.id]
    );

    return res.json({
      success: true,
      message: 'Profile photo updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteRiderPhoto = async (req, res, next) => {
  try {
    const currentRider = await riderQuery(
      `SELECT profile_photo_url FROM "Rider" WHERE id = $1`,
      [req.user.id]
    );

    if (currentRider.rows.length && currentRider.rows[0].profile_photo_url?.includes('/uploads/')) {
      const oldFileName = currentRider.rows[0].profile_photo_url.split('/').pop();
      const oldFilePath = path.join(process.cwd(), 'public/uploads', oldFileName);
      if (fs.existsSync(oldFilePath)) {
        try { fs.unlinkSync(oldFilePath); } catch (_) {}
      }
    }

    const result = await riderQuery(
      `UPDATE "Rider"
          SET profile_photo_url = NULL, updated_at = NOW()
        WHERE id = $1
        RETURNING id, full_name, email, profile_photo_url`,
      [req.user.id]
    );

    return res.json({
      success: true,
      message: 'Profile photo removed successfully',
      data: result.rows[0],
    });
  } catch (error) {
    return next(error);
  }
};

export const getRiderProfile = async (req, res, next) => {
  try {
    const result = await riderQuery(
      `SELECT rider.id, rider.email, rider.full_name, rider.phone, rider.vehicle_type, rider.vehicle_number,
              rider.profile_photo_url, rider.bio, rider.address, rider.emergency_contact_name, rider.emergency_contact_phone,
              rider.push_token, rider.push_platform, rider.push_token_updated_at,
              rider.status, rider.current_latitude, rider.current_longitude,
              COALESCE(
                (SELECT AVG(review.rating)
                   FROM "Review" review
                   LEFT JOIN "User" marketplace_user ON LOWER(marketplace_user.email) = LOWER(rider.email)
                  WHERE review."targetType" = 'DELIVERY_PARTNER'
                    AND review.status = 'PUBLISHED'
                    AND (review."targetId" = rider.id::text OR review."targetId" = marketplace_user.id)),
                rider.rating,
                0.00
              ) AS rating,
              rider.total_deliveries,
              COALESCE(
                (SELECT COUNT(*)
                   FROM "Review" review
                   LEFT JOIN "User" marketplace_user ON LOWER(marketplace_user.email) = LOWER(rider.email)
                  WHERE review."targetType" = 'DELIVERY_PARTNER'
                    AND review.status = 'PUBLISHED'
                    AND (review."targetId" = rider.id::text OR review."targetId" = marketplace_user.id)),
                rider.total_reviews,
                0
              ) AS total_reviews,
              rider.created_at, rider.updated_at
         FROM "Rider" rider
        WHERE rider.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Partner not found' });
    }

    const row = result.rows[0];
    const liveRating = Number(row.rating || 0);
    const liveTotalReviews = Number(row.total_reviews || 0);

    // Keep Rider record synced in background
    riderQuery(
      `UPDATE "Rider" SET rating = $1, total_reviews = $2, updated_at = NOW() WHERE id = $3`,
      [liveRating, liveTotalReviews, req.user.id]
    ).catch(() => {});

    return res.json({
      success: true,
      data: {
        ...row,
        rating: liveRating,
        total_reviews: liveTotalReviews,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const updateRiderProfile = async (req, res, next) => {
  try {
    const fieldMap = {
      fullName: 'full_name',
      phone: 'phone',
      vehicleType: 'vehicle_type',
      vehicleNumber: 'vehicle_number',
      profilePhotoUrl: 'profile_photo_url',
      bio: 'bio',
      address: 'address',
      emergencyContactName: 'emergency_contact_name',
      emergencyContactPhone: 'emergency_contact_phone',
    };

    const updates = [];
    const values = [];

    Object.entries(fieldMap).forEach(([bodyField, column]) => {
      if (req.body[bodyField] !== undefined) {
        updates.push(`${column} = $${updates.length + 1}`);
        values.push(req.body[bodyField] || null);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    values.push(req.user.id);
    const result = await riderQuery(
      `UPDATE "Rider"
          SET ${updates.join(', ')}
        WHERE id = $${values.length}
        RETURNING id, email, full_name, phone, vehicle_type, vehicle_number,
                  profile_photo_url, bio, address, emergency_contact_name, emergency_contact_phone,
                  push_token, push_platform, push_token_updated_at, status, rating, total_deliveries`,
      values
    );

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    return next(error);
  }
};

export const updateRiderPushToken = async (req, res, next) => {
  try {
    const { pushToken, devicePlatform = 'unknown' } = req.body;

    if (!hasValue(pushToken) || !['android', 'ios', 'web', 'unknown'].includes(devicePlatform)) {
      return validationError(res, 'Invalid push token payload');
    }

    const result = await riderQuery(
      `UPDATE "Rider"
          SET push_token = $1,
              push_platform = $2,
              push_token_updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING push_token, push_platform, push_token_updated_at`,
      [pushToken, devicePlatform, req.user.id]
    );

    return res.json({
      success: true,
      message: 'Push token saved successfully',
      data: result.rows[0],
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteRiderProfile = async (req, res, next) => {
  try {
    const result = await riderQuery('DELETE FROM "Rider" WHERE id = $1 RETURNING id', [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Partner not found' });
    }

    return res.json({ success: true, message: 'Profile deleted successfully' });
  } catch (error) {
    return next(error);
  }
};

export const updateRiderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['online', 'offline'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "online" or "offline"',
      });
    }

    const result = await riderQuery(
      'UPDATE "Rider" SET status = $1 WHERE id = $2 RETURNING status',
      [status, req.user.id]
    );

    if (status === 'offline') {
      await cancelPendingOffersForPartner(req.user.id, 'partner_went_offline');
    } else {
      await dispatchAvailableJobs();
    }

    return res.json({
      success: true,
      message: 'Status updated successfully',
      data: { status: result.rows[0].status },
    });
  } catch (error) {
    return next(error);
  }
};

export const updateRiderLocation = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;

    if (!isFloatInRange(latitude, -90, 90) || !isFloatInRange(longitude, -180, 180)) {
      return validationError(res, 'Invalid coordinates');
    }

    await riderQuery(
      'UPDATE "Rider" SET current_latitude = $1, current_longitude = $2 WHERE id = $3',
      [latitude, longitude, req.user.id]
    );

    const activeJob = await riderQuery(
      `SELECT id
         FROM "DeliveryJob"
        WHERE partner_id = $1
          AND status IN ('assigned', 'accepted', 'arrived_at_pickup', 'picked_up', 'in_transit', 'arrived_at_dropoff')
        ORDER BY assigned_at DESC NULLS LAST, created_at DESC
        LIMIT 1`,
      [req.user.id]
    );

    if (activeJob.rows.length) {
      await riderQuery(
        `INSERT INTO "DeliveryTracking" (job_id, partner_id, latitude, longitude)
         VALUES ($1, $2, $3, $4)`,
        [activeJob.rows[0].id, req.user.id, latitude, longitude]
      );
    }

    await dispatchAvailableJobs();

    return res.json({
      success: true,
      message: 'Location updated successfully',
    });
  } catch (error) {
    return next(error);
  }
};

