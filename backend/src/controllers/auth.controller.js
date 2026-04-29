import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { isRiderRegisterPayload, loginRiderByEmail, registerRider } from './riderAuth.controller.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Register new user
const register = async (req, res) => {
  if (isRiderRegisterPayload(req.body)) {
    return registerRider(req, res, (error) => {
      console.error('Rider registration error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to register rider',
      });
    });
  }

  try {
    const { password, name, phone, role = 'CUSTOMER' } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();

    // Admin restrictions
    if (role === 'ADMIN') {
      const isWeb = req.headers.origin || req.headers.referer || (req.headers['user-agent'] && req.headers['user-agent'].includes('Mozilla'));
      if (!isWeb) {
        return res.status(403).json({
          success: false,
          message: 'Admin registration is only allowed from the web application',
        });
      }

      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' },
      });

      if (adminCount >= 2) {
        return res.status(403).json({
          success: false,
          message: 'Maximum number of admins has been reached',
        });
      }
    }

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        role: role,
        authProvider: 'EMAIL',
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    // If salesman, create a store
    if (role === 'SALESMAN') {
      await prisma.store.create({
        data: {
          name: name ? `${name}'s Store` : 'My Store',
          ownerId: user.id,
        },
      });
    }

    // Generate token
    const token = generateToken(user.id, user.role);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register user',
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { password } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        store: true,
      },
    });

    if (!user) {
      const riderLoginResult = await loginRiderByEmail({ email, password });

      if (riderLoginResult && riderLoginResult !== false) {
        return res.json(riderLoginResult);
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Admin web-only restriction
    if (user.role === 'ADMIN') {
      const isWeb = req.headers.origin || req.headers.referer || (req.headers['user-agent'] && req.headers['user-agent'].includes('Mozilla'));
      if (!isWeb) {
        return res.status(403).json({
          success: false,
          message: 'Admin login is only allowed from the web application',
        });
      }
    }

    // Check if user signed up with Google
    if (user.authProvider === 'GOOGLE' && !user.password) {
      return res.status(401).json({
        success: false,
        message: 'Please sign in with Google',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate token
    const token = generateToken(user.id, user.role);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          store: user.store,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login',
    });
  }
};

// Get user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    let user;

    // Try the full query with _count first
    try {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          avatar: true,
          role: true,
          isVerified: true,
          createdAt: true,
          store: true,
          _count: {
            select: {
              orders: true,
              wishlist: true,
              addresses: true,
            },
          },
        },
      });
    } catch (countError) {
      // _count failed (e.g. relation not yet migrated) — fall back to basic query
      console.warn('Profile count query failed, falling back to basic query:', countError.message);
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          avatar: true,
          role: true,
          isVerified: true,
          createdAt: true,
          store: true,
        },
      });
      if (user) {
        user._count = { orders: 0, wishlist: 0, addresses: 0 };
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, phone, avatar } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (avatar !== undefined) data.avatar = avatar;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
      },
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
};

export { register, login, getProfile, updateProfile };
