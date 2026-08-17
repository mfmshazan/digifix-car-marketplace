import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import prisma from '../lib/prisma.js';
import upload from '../middleware/upload.middleware.js';
import fs from 'fs';
import path from 'path';

const router = Router();

// All routes require authentication
router.use(authenticate);

const cleanText = (value) => typeof value === 'string' ? value.trim() : '';
const isCoordinateInRange = (value, min, max) => {
  if (value === null || value === undefined || String(value).trim() === '') return false;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
};

const validateRequiredAddressFields = ({ street, city, state, postalCode }) => {
  const missingFields = [];
  if (!cleanText(street)) missingFields.push('street');
  if (!cleanText(city)) missingFields.push('city');
  if (!cleanText(state)) missingFields.push('state');
  if (!cleanText(postalCode)) missingFields.push('postal code');
  return missingFields;
};

// Get user addresses
router.get('/addresses', async (req, res) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user.id },
      orderBy: [
        { isDefault: 'desc' },
        { updatedAt: 'desc' },
      ],
    });
    res.json({ success: true, data: addresses });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ success: false, message: 'Failed to get addresses' });
  }
});

// Add address
router.post('/addresses', async (req, res) => {
  try {
    const { label, street, city, state, postalCode, country, latitude, longitude, isDefault } = req.body;

    const missingFields = validateRequiredAddressFields({ street, city, state, postalCode });
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Please enter ${missingFields.join(', ')}`,
      });
    }
    if (
      !isCoordinateInRange(latitude, -90, 90) ||
      !isCoordinateInRange(longitude, -180, 180)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please pin the delivery location on the map',
      });
    }

    const address = await prisma.$transaction(async (tx) => {
      const addressCount = await tx.address.count({
        where: { userId: req.user.id },
      });
      const shouldBeDefault = Boolean(isDefault) || addressCount === 0;

      if (shouldBeDefault) {
        await tx.address.updateMany({
          where: { userId: req.user.id },
          data: { isDefault: false },
        });
      }

      return tx.address.create({
        data: {
          userId: req.user.id,
          label: cleanText(label) || 'Home',
          street: cleanText(street),
          city: cleanText(city),
          state: cleanText(state),
          postalCode: cleanText(postalCode),
          country: cleanText(country) || 'Sri Lanka',
          latitude: Number(latitude),
          longitude: Number(longitude),
          isDefault: shouldBeDefault,
        },
      });
    }, { maxWait: 10000, timeout: 20000 });

    res.status(201).json({ success: true, data: address });
  } catch (error) {
    console.error('Create address error:', error);
    res.status(500).json({ success: false, message: 'Failed to create address' });
  }
});

// Update an address owned by the authenticated user
router.patch('/addresses/:addressId', async (req, res) => {
  try {
    const { addressId } = req.params;
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId: req.user.id,
      },
    });

    if (!existingAddress) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }

    const nextAddress = {
      street: req.body.street === undefined ? existingAddress.street : req.body.street,
      city: req.body.city === undefined ? existingAddress.city : req.body.city,
      state: req.body.state === undefined ? existingAddress.state : req.body.state,
      postalCode: req.body.postalCode === undefined ? existingAddress.postalCode : req.body.postalCode,
    };
    const missingFields = validateRequiredAddressFields(nextAddress);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Please enter ${missingFields.join(', ')}`,
      });
    }
    const coordinatesWereProvided =
      req.body.latitude !== undefined || req.body.longitude !== undefined;
    if (
      coordinatesWereProvided &&
      (!isCoordinateInRange(req.body.latitude, -90, 90) ||
        !isCoordinateInRange(req.body.longitude, -180, 180))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please pin a valid delivery location on the map',
      });
    }

    const address = await prisma.$transaction(async (tx) => {
      if (req.body.isDefault === true) {
        await tx.address.updateMany({
          where: {
            userId: req.user.id,
            id: { not: addressId },
          },
          data: { isDefault: false },
        });
      }

      const data = {};
      if (req.body.label !== undefined) data.label = cleanText(req.body.label) || 'Home';
      if (req.body.street !== undefined) data.street = cleanText(req.body.street);
      if (req.body.city !== undefined) data.city = cleanText(req.body.city);
      if (req.body.state !== undefined) data.state = cleanText(req.body.state);
      if (req.body.postalCode !== undefined) data.postalCode = cleanText(req.body.postalCode);
      if (req.body.country !== undefined) data.country = cleanText(req.body.country) || 'Sri Lanka';
      if (coordinatesWereProvided) {
        data.latitude = Number(req.body.latitude);
        data.longitude = Number(req.body.longitude);
      }
      if (req.body.isDefault === true) data.isDefault = true;

      return tx.address.update({
        where: { id: addressId },
        data,
      });
    }, { maxWait: 10000, timeout: 20000 });

    res.json({ success: true, data: address });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ success: false, message: 'Failed to update address' });
  }
});

// Delete an address and promote another address if the default was deleted
router.delete('/addresses/:addressId', async (req, res) => {
  try {
    const { addressId } = req.params;
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId: req.user.id,
      },
    });

    if (!existingAddress) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }

    const linkedOrderCount = await prisma.order.count({
      where: { addressId },
    });
    if (linkedOrderCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'This address is attached to an existing order. You can edit it or add a new default address instead.',
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id: addressId } });

      if (existingAddress.isDefault) {
        const replacement = await tx.address.findFirst({
          where: { userId: req.user.id },
          orderBy: { updatedAt: 'desc' },
        });
        if (replacement) {
          await tx.address.update({
            where: { id: replacement.id },
            data: { isDefault: true },
          });
        }
      }
    }, { maxWait: 10000, timeout: 20000 });

    res.json({ success: true, message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete address' });
  }
});

// Return the address that checkout should use. Never create placeholder data.
router.post('/addresses/default', async (req, res) => {
  try {
    let address = await prisma.address.findFirst({
      where: { 
        userId: req.user.id,
        isDefault: true 
      }
    });

    // If no default, get any address
    if (!address) {
      address = await prisma.address.findFirst({
        where: { userId: req.user.id },
        orderBy: { updatedAt: 'desc' },
      });
    }

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Please add a delivery address before checkout',
      });
    }

    res.json({ success: true, data: address });
  } catch (error) {
    console.error('Get/create default address error:', error);
    res.status(500).json({ success: false, message: 'Failed to get default address' });
  }
});

// Get wishlist
router.get('/wishlist', (req, res) => {
  // TODO: Implement
  res.json({ wishlist: [] });
});

// Get cart
router.get('/cart', (req, res) => {
  // TODO: Implement
  res.json({ cart: [] });
});

// Update profile picture (multer errors → 400; web clients often omit filename / extension)
router.put('/profile-picture', (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (err) {
      console.error('Multer upload error:', err.message);
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid or missing image file',
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    if (currentUser?.avatar && currentUser.avatar.includes('/uploads/')) {
      const fileName = currentUser.avatar.split('/').pop();
      const fullOldPath = path.join(process.cwd(), 'public/uploads', fileName);

      if (fs.existsSync(fullOldPath)) {
        fs.unlinkSync(fullOldPath);
      }
    }

    const avatarUrl = `/uploads/${req.file.filename}`;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
      select: { id: true, avatar: true },
    });

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      data: user,
    });
  } catch (error) {
    console.error('Update profile picture error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile picture' });
  }
});

// Remove profile picture
router.delete('/profile-picture', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true }
    });

    if (currentUser?.avatar && currentUser.avatar.includes('/uploads/')) {
      const fileName = currentUser.avatar.split('/').pop();
      const fullOldPath = path.join(process.cwd(), 'public/uploads', fileName);
      
      if (fs.existsSync(fullOldPath)) {
        fs.unlinkSync(fullOldPath);
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { avatar: null }
    });

    res.json({ success: true, message: 'Profile picture removed successfully' });
  } catch (error) {
    console.error('Remove profile picture error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove profile picture' });
  }
});

export default router;
