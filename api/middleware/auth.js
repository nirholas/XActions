const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

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
      where: { id: decoded.userId },
      include: { subscription: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request
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
      where: { id: decoded.userId },
      include: { subscription: true }
    });

    req.user = user || null;
    next();
  } catch (error) {
    // Invalid token, but still continue
    req.user = null;
    next();
  }
};

const requireSubscription = (tier = 'free') => {
  return (req, res, next) => {
    const user = req.user;
    
    if (!user.subscription) {
      return res.status(403).json({ 
        error: 'Subscription required',
        requiredTier: tier
      });
    }

    const tierLevels = { free: 0, basic: 1, pro: 2, enterprise: 3 };
    const userTierLevel = tierLevels[user.subscription.tier] || 0;
    const requiredTierLevel = tierLevels[tier] || 0;

    if (userTierLevel < requiredTierLevel) {
      return res.status(403).json({ 
        error: 'Insufficient subscription tier',
        currentTier: user.subscription.tier,
        requiredTier: tier
      });
    }

    next();
  };
};

const checkCredits = (requiredCredits) => {
  return async (req, res, next) => {
    const user = req.user;

    if (user.subscription?.tier !== 'free' && user.subscription?.tier) {
      // Paid users get unlimited operations
      return next();
    }

    if (user.credits < requiredCredits) {
      return res.status(403).json({
        error: 'Insufficient credits',
        required: requiredCredits,
        available: user.credits
      });
    }

    req.creditsToDeduct = requiredCredits;
    next();
  };
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  requireSubscription,
  checkCredits
};
