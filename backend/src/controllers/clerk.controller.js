import prisma from '../lib/prisma.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Handle Clerk Google Auth Callback
const clerkGoogleCallback = async (req, res) => {
  try {
    const { user } = req;

    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
      });
    }

    // Extract user info from Clerk
    const email = user.primaryEmailAddress?.emailAddress;
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const clerkUserId = user.id;
    const avatar = user.profileImageUrl;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email not found in Clerk profile',
      });
    }

    // Check if user exists in database
    let dbUser = await prisma.user.findUnique({
      where: { email },
      include: { store: true },
    });

    if (!dbUser) {
      // Create new user
      dbUser = await prisma.user.create({
        data: {
          email,
          name,
          avatar,
          authProvider: 'GOOGLE',
          googleId: clerkUserId,
          role: 'CUSTOMER', // Default role
          isVerified: true, // Clerk verified
        },
        include: { store: true },
      });
    } else if (dbUser.authProvider !== 'GOOGLE' || !dbUser.googleId) {
      // Update existing user to use Google auth
      dbUser = await prisma.user.update({
        where: { email },
        data: {
          authProvider: 'GOOGLE',
          googleId: clerkUserId,
          avatar: avatar || dbUser.avatar,
        },
        include: { store: true },
      });
    }

    // Generate JWT token
    const token = generateToken(dbUser.id, dbUser.role);

    res.json({
      success: true,
      message: 'Google sign-in successful',
      data: {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          avatar: dbUser.avatar,
          role: dbUser.role,
          store: dbUser.store,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Clerk Google callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process Google sign-in',
    });
  }
};

// Get user info from Clerk auth
const getClerkUserInfo = async (req, res) => {
  try {
    const { user } = req;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const email = user.primaryEmailAddress?.emailAddress;

    // Find user in database
    const dbUser = await prisma.user.findUnique({
      where: { email },
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

    if (!dbUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found in database',
      });
    }

    res.json({
      success: true,
      data: dbUser,
    });
  } catch (error) {
    console.error('Get Clerk user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user info',
    });
  }
};

export { clerkGoogleCallback, getClerkUserInfo };
