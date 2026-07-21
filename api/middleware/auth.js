// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { tierMeetsRequirement, getTier, isWithinLimit } from '../config/subscription-tiers.js';

const prisma = new PrismaClient();

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

/**
 * Require a minimum subscription tier.
 * Loads the user's subscription from DB and checks tier level.
 * Must be used after authMiddleware.
 */
const requireSubscription = (requiredTier = 'free') => {
  return async (req, res, next) => {
    if (requiredTier === 'free') return next();

    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: req.user.id },
      });

      const userTier = (subscription?.status === 'active' || subscription?.status === 'cancelled')
        ? subscription.tier
        : 'free';

      // Cancelled subs still have access until cancelAt date
      if (subscription?.status === 'cancelled' && subscription.cancelAt && subscription.cancelAt < new Date()) {
        req.userTier = 'free';
      } else {
        req.userTier = userTier;
      }

      if (!tierMeetsRequirement(req.userTier, requiredTier)) {
        return res.status(403).json({
          error: 'Upgrade required',
          requiredTier,
          currentTier: req.userTier,
          upgradeUrl: '/api/billing/plans',
        });
      }

      next();
    } catch (error) {
      console.error('❌ Subscription check error:', error.message);
      // Fail open — don't block users if DB is down
      next();
    }
  };
};

/**
 * Check daily usage against tier limits.
 * limitKey: 'apiCallsPerDay' | 'scrapesPerDay' | 'automationsPerDay'
 * Must be used after authMiddleware.
 */
const checkUsageLimit = (limitKey) => {
  return async (req, res, next) => {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: req.user.id },
      });

      const userTier = subscription?.status === 'active' ? subscription.tier : 'free';
      const tierConfig = getTier(userTier);
      const limit = tierConfig.limits[limitKey];

      if (limit === -1) return next(); // unlimited

      // Count today's operations
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayCount = await prisma.operation.count({
        where: {
          userId: req.user.id,
          createdAt: { gte: todayStart },
        },
      });

      if (!isWithinLimit(limit, todayCount)) {
        return res.status(429).json({
          error: 'Daily limit reached',
          limit,
          used: todayCount,
          currentTier: userTier,
          upgradeUrl: '/api/billing/plans',
        });
      }

      next();
    } catch (error) {
      console.error('❌ Usage limit check error:', error.message);
      next();
    }
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
  checkUsageLimit,
  requireAdmin,
};

// Also export authenticate as alias for authMiddleware for backward compatibility
export const authenticate = authMiddleware;
export const authenticateToken = authMiddleware;
