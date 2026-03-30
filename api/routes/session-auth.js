import express from 'express';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import browserAutomation from '../services/browserAutomation.js';

const router = express.Router();
const prisma = new PrismaClient();

// Encryption helpers for session cookies
const ENCRYPTION_KEY = process.env.SESSION_SECRET || process.env.JWT_SECRET;
if (!ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
  console.error('❌ SESSION_SECRET or JWT_SECRET must be set in production');
  process.exit(1);
}
const ALGORITHM = 'aes-256-gcm';

function encrypt(text) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY || 'dev-only-key', salt, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return salt.toString('hex') + ':' + iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedData) {
  try {
    const parts = encryptedData.split(':');
    // Support both old format (3 parts) and new format (4 parts with salt)
    if (parts.length === 4) {
      const salt = Buffer.from(parts[0], 'hex');
      const key = crypto.scryptSync(ENCRYPTION_KEY || 'dev-only-key', salt, 32);
      const iv = Buffer.from(parts[1], 'hex');
      const authTag = Buffer.from(parts[2], 'hex');
      const encrypted = parts[3];
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }
    // Legacy format (3 parts, hardcoded salt) is no longer supported.
    // Data encrypted with the old format must be re-encrypted.
    console.warn('⚠️  Encountered legacy encryption format — re-save to upgrade');
    return null;
  } catch (error) {
    console.error('❌ Decryption error:', error.message);
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
      console.error('❌ Save session error:', error.message);
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
      console.error('❌ Remove session error:', error.message);
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
      console.error('❌ Get auth method error:', error.message);
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

export default router;
export { getDecryptedSessionCookie, encrypt, decrypt };
