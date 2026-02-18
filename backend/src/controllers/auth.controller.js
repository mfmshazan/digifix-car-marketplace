import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Register new user
const register = async (req, res) => {
  try {
    const { email, password, name, role = 'CUSTOMER' } = req.body;

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
        role: role,
        authProvider: 'EMAIL',
      },
      select: {
        id: true,
        email: true,
        name: true,
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
    const { email, password } = req.body;

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
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
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
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
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
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, avatar } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        phone,
        avatar,
      },
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

// Google OAuth callback (for web frontend)
const googleCallback = async (req, res) => {
  try {
    const { email, name, googleId, avatar } = req.body;

    if (!email || !googleId) {
      return res.status(400).json({
        success: false,
        message: 'Email and Google ID are required',
      });
    }

    // Check if user exists by email or googleId
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { googleId },
        ],
      },
      include: { store: true },
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          avatar,
          authProvider: 'GOOGLE',
          googleId,
          role: 'CUSTOMER',
          isVerified: true,
        },
        include: { store: true },
      });
    } else if (!user.googleId) {
      // Link Google account to existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId,
          authProvider: 'GOOGLE',
          avatar: avatar || user.avatar,
          name: user.name || name,
        },
        include: { store: true },
      });
    }

    // Generate token
    const token = generateToken(user.id, user.role);

    res.json({
      success: true,
      message: 'Google sign-in successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          phone: user.phone,
          store: user.store,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Google callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process Google sign-in',
    });
  }
};

export { register, login, getProfile, updateProfile, googleCallback };
