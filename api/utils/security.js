// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Security utilities for XActions
 */

import crypto from 'crypto';

// Encryption key derived from JWT_SECRET
const getEncryptionKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  return crypto.createHash('sha256').update(secret || 'dev-only-key').digest();
};

/**
 * Encrypt sensitive data (like session cookies)
 */
export function encrypt(text) {
  if (!text) return null;
  
  const iv = crypto.randomBytes(16);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return IV + encrypted data
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedText) {
  if (!encryptedText) return null;
  
  try {
    const [ivHex, encrypted] = encryptedText.split(':');
    if (!ivHex || !encrypted) return null;
    
    const iv = Buffer.from(ivHex, 'hex');
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (e) {
    console.error('❌ Decryption failed:', e.message);
    return null;
  }
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(str) {
  if (!str) return '';
  const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  return String(str).replace(/[&<>"'`=\/]/g, s => htmlEntities[s]);
}

/**
 * Generate CSRF token — HMAC of sessionId + timestamp, stored for verification
 */
const csrfTokenStore = new Map();
const CSRF_TOKEN_TTL = 60 * 60 * 1000; // 1 hour

export function generateCsrfToken(sessionId) {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  const timestamp = Date.now().toString();
  const token = crypto
    .createHmac('sha256', secret || 'dev-only-key')
    .update(sessionId + timestamp)
    .digest('hex');

  // Store token with expiry for server-side validation
  csrfTokenStore.set(token, { sessionId, createdAt: Date.now() });

  // Evict expired tokens
  for (const [key, val] of csrfTokenStore) {
    if (Date.now() - val.createdAt > CSRF_TOKEN_TTL) {
      csrfTokenStore.delete(key);
    }
  }

  return token;
}

/**
 * Verify CSRF token — checks token exists in store and matches session
 */
export function verifyCsrfToken(token, sessionId) {
  if (!token || typeof token !== 'string' || token.length !== 64) {
    return false;
  }

  const stored = csrfTokenStore.get(token);
  if (!stored) {
    return false;
  }

  // Check expiry
  if (Date.now() - stored.createdAt > CSRF_TOKEN_TTL) {
    csrfTokenStore.delete(token);
    return false;
  }

  // Check session matches
  if (stored.sessionId !== sessionId) {
    return false;
  }

  // Single-use: delete after verification
  csrfTokenStore.delete(token);
  return true;
}

/**
 * Sanitize user input for database
 */
export function sanitizeInput(str, maxLength = 1000) {
  if (!str) return '';
  return String(str)
    .trim()
    .slice(0, maxLength)
    .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
}

/**
 * Hash sensitive data for logging (don't log raw tokens)
 */
export function hashForLog(str) {
  if (!str) return 'null';
  return crypto.createHash('sha256').update(str).digest('hex').slice(0, 8) + '...';
}
