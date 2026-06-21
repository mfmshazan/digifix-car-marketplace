import jwt from 'jsonwebtoken';
import { verifyRiderAccessToken } from '../lib/riderTokens.js';
import prisma from '../lib/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Authenticate user
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const token = authHeader.split(' ')[1];
    
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      req.user = {
        id: decoded.userId,
        userId: decoded.userId,
        role: decoded.role
      };
      return next();
    } catch (err) {
      try {
        const riderDecoded = verifyRiderAccessToken(token);
        // Find user by email to get string ID
        const user = await prisma.user.findUnique({ where: { email: riderDecoded.email } });
        if (!user) throw new Error('User not synced');
        req.user = {
          id: user.id,
          userId: user.id,
          role: user.role
        };
        return next();
      } catch (riderErr) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token',
        });
      }
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

// Authorize by role
const authorize = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
      });
    }

    next();
  };
};

export { authenticate, authorize };
