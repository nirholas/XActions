import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Payment routes archived - XActions is now 100% free and open-source
// All users have full access to all features - no credits or subscription tiers

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request - all users have full access
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// Optional auth - doesn't fail if no token, just attaches user if valid
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    req.user = user || null;
    next();
  } catch (error) {
    // Invalid token, but still continue
    req.user = null;
    next();
  }
};

// Subscription check - DEPRECATED: XActions is now free
// Kept for backward compatibility but always allows access
const requireSubscription = (tier = 'free') => {
  return (req, res, next) => {
    // XActions is now 100% free - all users have full access
    next();
  };
};

// Credit check - DEPRECATED: XActions is now free
// Kept for backward compatibility but always allows access
const checkCredits = (requiredCredits) => {
  return async (req, res, next) => {
    // XActions is now 100% free - no credit checks
    next();
  };
};

/**
 * Require admin privileges
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

export {
  authMiddleware,
  optionalAuthMiddleware,
  requireSubscription,
  checkCredits,
  requireAdmin,
};

// Also export authenticate as alias for authMiddleware for backward compatibility
export const authenticate = authMiddleware;
export const authenticateToken = authMiddleware;
