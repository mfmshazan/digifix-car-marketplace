import { riderQuery } from '../lib/riderDb.js';
import { dispatchAvailableJobs, cancelPendingOffersForPartner } from '../services/riderRealtimeDispatch.js';
import { hasValue, isFloatInRange, validationError } from '../utils/riderValidation.js';

export const getRiderProfile = async (req, res, next) => {
  try {
    const result = await riderQuery(
      `SELECT id, email, full_name, phone, vehicle_type, vehicle_number,
              profile_photo_url, bio, address, emergency_contact_name, emergency_contact_phone,
              push_token, push_platform, push_token_updated_at,
              status, current_latitude, current_longitude, rating, total_deliveries,
              created_at, updated_at
         FROM rider_delivery_partners
        WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Partner not found' });
    }

    return res.json({ success: true, data: result.rows[0] });
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
      `UPDATE rider_delivery_partners
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
      `UPDATE rider_delivery_partners
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
    const result = await riderQuery('DELETE FROM rider_delivery_partners WHERE id = $1 RETURNING id', [req.user.id]);

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
      'UPDATE rider_delivery_partners SET status = $1 WHERE id = $2 RETURNING status',
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
      'UPDATE rider_delivery_partners SET current_latitude = $1, current_longitude = $2 WHERE id = $3',
      [latitude, longitude, req.user.id]
    );

    await dispatchAvailableJobs();

    return res.json({
      success: true,
      message: 'Location updated successfully',
    });
  } catch (error) {
    return next(error);
  }
};

