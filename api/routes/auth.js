import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';

const router = express.Router();
const prisma = new PrismaClient();

// Register new user (email optional)
router.post('/register',
  [
    body('password').isLength({ min: 8 }),
    body('username').isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
    body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { password, username, email } = req.body;

      // Check if username exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username },
            ...(email ? [{ email }] : [])
          ]
        }
      });

      if (existingUser) {
        if (existingUser.username === username) {
          return res.status(400).json({ error: 'Username already taken' });
        }
        if (email && existingUser.email === email) {
          return res.status(400).json({ error: 'Email already registered' });
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user with 0 credits (must follow or buy to get credits)
      const user = await prisma.user.create({
        data: {
          email: email || null,  // Email is optional
          username,
          password: hashedPassword,
          credits: 0,
          subscription: {
            create: {
              tier: 'free',
              status: 'active',
              startDate: new Date()
            }
          }
        },
        include: {
          subscription: true
        }
      });

      // Generate JWT (use username if no email)
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          credits: user.credits,
          subscription: user.subscription
        }
      });
    } catch (error) {
      console.error('❌ Registration error:', error.message);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Login (accepts username OR email)
router.post('/login',
  [
    body('identifier').notEmpty().withMessage('Username or email required'),
    body('password').notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { identifier, password } = req.body;

      // Find user by email OR username
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: identifier.toLowerCase() },
            { username: identifier }
          ]
        },
        include: { subscription: true }
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if user has a password (guest users don't)
      if (!user.password) {
        return res.status(401).json({ 
          error: 'This account was created as a guest. Please set a password first.',
          needsPassword: true
        });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          credits: user.credits,
          subscription: user.subscription,
          twitterConnected: !!user.twitterAccessToken
        }
      });
    } catch (error) {
      console.error('❌ Login error:', error.message);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Refresh token — only allow refresh within 24 hours of expiration
router.post('/refresh', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    // Decode without verification to check expiry window
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp || !decoded.userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Only allow refresh if token expired within the last 24 hours
    const now = Math.floor(Date.now() / 1000);
    const maxRefreshWindow = 24 * 60 * 60; // 24 hours
    if (decoded.exp < now - maxRefreshWindow) {
      return res.status(401).json({ error: 'Token too old to refresh — please log in again' });
    }

    // Verify signature (allow recently expired tokens within the refresh window)
    try {
      jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    } catch {
      return res.status(401).json({ error: 'Invalid token signature' });
    }

    // Verify user still exists
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate new token
    const newToken = jwt.sign(
      { userId: decoded.userId, username: decoded.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token: newToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
