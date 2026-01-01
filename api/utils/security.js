/**
 * Security utilities for XActions
 */

import crypto from 'crypto';

// Encryption key derived from JWT_SECRET
const getEncryptionKey = () => {
  const secret = process.env.JWT_SECRET || 'xactions-default-key';
  return crypto.createHash('sha256').update(secret).digest();
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
    console.error('Decryption failed:', e.message);
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
 * Generate CSRF token
 */
export function generateCsrfToken(sessionId) {
  const secret = process.env.JWT_SECRET || 'xactions-csrf';
  return crypto
    .createHmac('sha256', secret)
    .update(sessionId + Date.now().toString())
    .digest('hex');
}

/**
 * Verify CSRF token
 */
export function verifyCsrfToken(token, sessionId) {
  // For now, just check it exists and is the right format
  // In production, you'd store and compare
  return token && token.length === 64;
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
