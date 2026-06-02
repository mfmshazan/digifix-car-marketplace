import prisma from '../lib/prisma.js';

/**
 * Get delivery partner profile
 */
export const getPartnerProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        vehicleType: true,
        vehicleNumber: true,
        deliveryStatus: true,
        total_deliveries: true,
        rating: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Partner profile not found',
      });
    }

    // Map fields to match mobile app's expected structure if necessary
    // Mobile app expects data.data.deliveryPartner sometimes
    const profileData = {
        ...user,
        full_name: user.name,
        vehicle_type: user.vehicleType,
        vehicle_number: user.vehicleNumber,
        status: user.deliveryStatus,
        total_deliveries: user.total_deliveries,
        // The mobile app specifically looks for data.deliveryPartner in getProfile
        deliveryPartner: {
            vehicleType: user.vehicleType,
            vehicleNumber: user.vehicleNumber,
            status: user.deliveryStatus,
            rating: user.rating,
            totalDeliveries: user.total_deliveries
        }
    };

    res.json({
      success: true,
      data: profileData,
    });
  } catch (error) {
    console.error('Get partner profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch partner profile',
    });
  }
};

/**
 * Update partner status (online/offline)
 */
export const updatePartnerStatus = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { status } = req.body;

        const user = await prisma.user.update({
            where: { id: userId },
            data: { deliveryStatus: status },
        });

        res.json({
            success: true,
            message: 'Status updated successfully',
            data: { status: user.deliveryStatus },
        });
    } catch (error) {
        console.error('Update partner status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update status',
        });
    }
};

/**
 * Update partner location (optional impl)
 */
export const updatePartnerLocation = async (req, res) => {
    // This could involve updating a separate Location table
    res.json({ success: true, message: 'Location updated' });
};
