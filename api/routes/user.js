import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Payment routes archived - XActions is now 100% free and open-source
// All credit and subscription endpoints have been removed

// All routes require authentication
router.use(authMiddleware);

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        operations: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      // XActions is now free - unlimited access for all users
      plan: 'free_unlimited',
      twitterConnected: !!user.twitterAccessToken,
      recentOperations: user.operations
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.patch('/profile', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (username) {
      // Check if username is taken
      const existing = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id: req.user.id }
        }
      });

      if (existing) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { username }
    });

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      plan: 'free_unlimited'
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get user statistics
router.get('/stats', async (req, res) => {
  try {
    const operations = await prisma.operation.findMany({
      where: { userId: req.user.id }
    });

    const stats = {
      totalOperations: operations.length,
      totalUnfollows: operations.reduce((sum, op) => sum + (op.unfollowedCount || 0), 0),
      totalFollowers: operations.reduce((sum, op) => sum + (op.followedCount || 0), 0),
      operationsByType: {},
      operationsByStatus: {}
    };

    operations.forEach(op => {
      stats.operationsByType[op.type] = (stats.operationsByType[op.type] || 0) + 1;
      stats.operationsByStatus[op.status] = (stats.operationsByStatus[op.status] || 0) + 1;
    });

    res.json(stats);
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get operation history
router.get('/operations', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    const skip = (page - 1) * limit;

    const where = { userId: req.user.id };
    if (type) where.type = type;
    if (status) where.status = status;

    const [operations, total] = await Promise.all([
      prisma.operation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.operation.count({ where })
    ]);

    res.json({
      operations,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Operations fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch operations' });
  }
});

// Delete account
router.delete('/account', async (req, res) => {
  try {
    await prisma.user.delete({
      where: { id: req.user.id }
    });

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
