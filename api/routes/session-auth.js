const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const browserAutomation = require('../services/browserAutomation');

const prisma = new PrismaClient();

// Encryption helpers for session cookies
const ENCRYPTION_KEY = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'default-key-change-in-production';
const ALGORITHM = 'aes-256-gcm';

function encrypt(text) {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedData) {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) return null;
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    return null;
  }
}

// Save session cookie for browser automation
router.post('/save-session',
  authenticate,
  [
    body('sessionCookie').notEmpty().withMessage('Session cookie is required'),
    body('username').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { sessionCookie, username } = req.body;

      // Test the session cookie by attempting to authenticate
      const page = await browserAutomation.createPage(sessionCookie);
      const isAuthenticated = await browserAutomation.checkAuthentication(page);
      await page.close();

      if (!isAuthenticated) {
        return res.status(401).json({ 
          error: 'Invalid session cookie - authentication failed' 
        });
      }

      // Save encrypted session cookie to user record
      const encryptedCookie = encrypt(sessionCookie);
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          sessionCookie: encryptedCookie,
          twitterUsername: username || null,
          authMethod: 'session' // Track which method user prefers
        }
      });

      res.json({ 
        message: 'Session saved successfully',
        authMethod: 'session'
      });
    } catch (error) {
      console.error('Save session error:', error);
      res.status(500).json({ error: 'Failed to save session' });
    }
  }
);

// Remove session cookie (switch back to OAuth)
router.delete('/remove-session',
  authenticate,
  async (req, res) => {
    try {
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          sessionCookie: null,
          authMethod: null
        }
      });

      res.json({ message: 'Session removed successfully' });
    } catch (error) {
      console.error('Remove session error:', error);
      res.status(500).json({ error: 'Failed to remove session' });
    }
  }
);

// Get current auth method
router.get('/auth-method',
  authenticate,
  async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          authMethod: true,
          twitterUsername: true,
          twitterAccessToken: true,
          sessionCookie: true
        }
      });

      const hasOAuth = !!user.twitterAccessToken;
      const hasSession = !!user.sessionCookie;

      res.json({
        authMethod: user.authMethod,
        hasOAuth,
        hasSession,
        username: user.twitterUsername
      });
    } catch (error) {
      console.error('Get auth method error:', error);
      res.status(500).json({ error: 'Failed to get auth method' });
    }
  }
);

// Helper function to get decrypted session cookie (for use in other services)
async function getDecryptedSessionCookie(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { sessionCookie: true }
  });
  if (!user?.sessionCookie) return null;
  return decrypt(user.sessionCookie);
}

module.exports = router;
module.exports.getDecryptedSessionCookie = getDecryptedSessionCookie;
module.exports.encrypt = encrypt;
module.exports.decrypt = decrypt;
