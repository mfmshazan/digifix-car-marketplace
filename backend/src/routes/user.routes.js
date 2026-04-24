import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import prisma from '../lib/prisma.js';
import upload from '../middleware/upload.middleware.js';
import fs from 'fs';
import path from 'path';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get user addresses
router.get('/addresses', async (req, res) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user.id },
      orderBy: { isDefault: 'desc' }
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
    const { label, street, city, state, postalCode, country, isDefault } = req.body;
    
    if (!street || !city || !state || !postalCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Street, city, state, and postal code are required' 
      });
    }

    // If setting as default, remove default from other addresses
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user.id },
        data: { isDefault: false }
      });
    }

    const address = await prisma.address.create({
      data: {
        userId: req.user.id,
        label: label || 'Home',
        street,
        city,
        state,
        postalCode,
        country: country || 'Sri Lanka',
        isDefault: isDefault || false
      }
    });

    res.status(201).json({ success: true, data: address });
  } catch (error) {
    console.error('Create address error:', error);
    res.status(500).json({ success: false, message: 'Failed to create address' });
  }
});

// Get or create default address (for quick checkout)
router.post('/addresses/default', async (req, res) => {
  try {
    // Check if user has any address
    let address = await prisma.address.findFirst({
      where: { 
        userId: req.user.id,
        isDefault: true 
      }
    });

    // If no default, get any address
    if (!address) {
      address = await prisma.address.findFirst({
        where: { userId: req.user.id }
      });
    }

    // If still no address, create a default one
    if (!address) {
      const { street, city, state, postalCode, country } = req.body;
      
      address = await prisma.address.create({
        data: {
          userId: req.user.id,
          label: 'Default',
          street: street || 'Please update your address',
          city: city || 'Colombo',
          state: state || 'Western',
          postalCode: postalCode || '00100',
          country: country || 'Sri Lanka',
          isDefault: true
        }
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
