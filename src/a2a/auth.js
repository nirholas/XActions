/**
 * XActions A2A — Inter-Agent Authentication
 *
 * API key management, JWT token generation/validation, permission system,
 * and middleware for authenticating agent-to-agent communication.
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// ============================================================================
// Constants & Paths
// ============================================================================

const A2A_DIR = path.join(os.homedir(), '.xactions', 'a2a');
const KEYS_FILE = path.join(A2A_DIR, 'a2a-keys.json');
const SECRET_FILE = path.join(A2A_DIR, 'a2a-secret.key');
const OUTBOUND_FILE = path.join(A2A_DIR, 'outbound-auth.json');

/** Available permissions */
export const PERMISSIONS = [
  'read', 'write', 'admin', 'scrape', 'post', 'follow', 'analytics', 'workflow',
];

/** Permission presets */
export const PERMISSION_PRESETS = {
  readonly: ['read', 'scrape', 'analytics'],
  standard: ['read', 'write', 'scrape', 'analytics', 'follow'],
  full: [...PERMISSIONS],
};

// ============================================================================
// Helpers
// ============================================================================

async function ensureDir() {
  await fs.mkdir(A2A_DIR, { recursive: true });
}

async function readJsonFile(filePath, fallback = []) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath, data) {
  await ensureDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

async function getOrCreateSecret() {
  await ensureDir();
  try {
    const existing = await fs.readFile(SECRET_FILE, 'utf-8');
    return existing.trim();
  } catch {
    const secret = crypto.randomBytes(64).toString('hex');
    await fs.writeFile(SECRET_FILE, secret, { mode: 0o600 });
    return secret;
  }
}

// ============================================================================
// API Key Authentication
// ============================================================================

/**
 * Generate a new API key for an external agent.
 *
 * @param {string} label - Descriptive label
 * @param {string[]} [permissions=PERMISSION_PRESETS.readonly]
 * @param {number} [expiresInDays=365]
 * @returns {Promise<{ key: string, label: string, permissions: string[], createdAt: string, expiresAt: string }>}
 */
export async function generateApiKey(label, permissions = PERMISSION_PRESETS.readonly, expiresInDays = 365) {
  const key = `xa2a_${crypto.randomBytes(32).toString('hex')}`;
  const record = {
    hash: hashKey(key),
    label,
    permissions,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + expiresInDays * 86400000).toISOString(),
    revoked: false,
  };

  const keys = await readJsonFile(KEYS_FILE, []);
  keys.push(record);
  await writeJsonFile(KEYS_FILE, keys);

  return { key, label, permissions, createdAt: record.createdAt, expiresAt: record.expiresAt };
}

/**
 * Validate an API key.
 *
 * @param {string} key
 * @returns {Promise<{ valid: boolean, permissions?: string[], label?: string }>}
 */
export async function validateApiKey(key) {
  if (!key || !key.startsWith('xa2a_')) return { valid: false };
  const hash = hashKey(key);
  const keys = await readJsonFile(KEYS_FILE, []);
  const record = keys.find(k => k.hash === hash && !k.revoked);
  if (!record) return { valid: false };
  if (new Date(record.expiresAt) < new Date()) return { valid: false };
  return { valid: true, permissions: record.permissions, label: record.label };
}

/**
 * Revoke an API key.
 *
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export async function revokeApiKey(key) {
  const hash = hashKey(key);
  const keys = await readJsonFile(KEYS_FILE, []);
  const record = keys.find(k => k.hash === hash);
  if (!record) return false;
  record.revoked = true;
  await writeJsonFile(KEYS_FILE, keys);
  return true;
}

/**
 * List all active API keys (without exposing key values).
 *
 * @returns {Promise<Array<{ label: string, permissions: string[], createdAt: string, expiresAt: string, revoked: boolean }>>}
 */
export async function listApiKeys() {
  const keys = await readJsonFile(KEYS_FILE, []);
  return keys.map(({ label, permissions, createdAt, expiresAt, revoked }) => ({
    label, permissions, createdAt, expiresAt, revoked,
  }));
}

// ============================================================================
// JWT/Bearer Token Authentication (using HMAC-SHA256 — no jose dependency)
// ============================================================================

/**
 * Generate a signed JWT token.
 *
 * @param {string} agentId - Subject agent identifier
 * @param {string[]} [permissions=PERMISSION_PRESETS.readonly]
 * @param {number} [expiresInSec=3600] - Expiry in seconds (default 1h)
 * @returns {Promise<string>} JWT token
 */
export async function generateToken(agentId, permissions = PERMISSION_PRESETS.readonly, expiresInSec = 3600) {
  const secret = await getOrCreateSecret();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: agentId,
    iss: 'xactions',
    aud: 'a2a',
    permissions,
    iat: now,
    exp: now + expiresInSec,
  };

  const encHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${encHeader}.${encPayload}`).digest('base64url');

  return `${encHeader}.${encPayload}.${signature}`;
}

/**
 * Validate a JWT token.
 *
 * @param {string} token
 * @returns {Promise<{ valid: boolean, payload?: object, error?: string }>}
 */
export async function validateToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, error: 'Malformed token' };

    const [encHeader, encPayload, signature] = parts;
    const secret = await getOrCreateSecret();
    const expectedSig = crypto.createHmac('sha256', secret).update(`${encHeader}.${encPayload}`).digest('base64url');

    if (signature !== expectedSig) return { valid: false, error: 'Invalid signature' };

    const payload = JSON.parse(Buffer.from(encPayload, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'Token expired' };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

/**
 * Refresh a token by issuing a new one with extended expiry.
 *
 * @param {string} token
 * @param {number} [expiresInSec=3600]
 * @returns {Promise<string|null>} New token, or null if original is invalid
 */
export async function refreshToken(token, expiresInSec = 3600) {
  const { valid, payload } = await validateToken(token);
  if (!valid) return null;
  return generateToken(payload.sub, payload.permissions, expiresInSec);
}

// ============================================================================
// Permission Checking
// ============================================================================

/**
 * Check if a decoded auth identity has a specific permission.
 *
 * @param {{ permissions: string[] }} auth
 * @param {string} requiredPermission
 * @returns {boolean}
 */
export function checkPermission(auth, requiredPermission) {
  if (!auth || !Array.isArray(auth.permissions)) return false;
  if (auth.permissions.includes('admin')) return true;
  return auth.permissions.includes(requiredPermission);
}

// ============================================================================
// Express Middleware
// ============================================================================

/**
 * Create Express middleware for A2A authentication.
 *
 * @param {object} [options={}]
 * @param {boolean} [options.required=false]
 * @param {boolean} [options.allowApiKey=true]
 * @param {boolean} [options.allowBearer=true]
 * @returns {function} Express middleware
 */
export function createAuthMiddleware(options = {}) {
  const { required = false, allowApiKey = true, allowBearer = true } = options;

  return async (req, res, next) => {
    req.agent = null;
    const authHeader = req.headers.authorization || '';

    // Try Bearer token
    if (allowBearer && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { valid, payload } = await validateToken(token);
      if (valid) {
        req.agent = { id: payload.sub, permissions: payload.permissions, type: 'bearer' };
        return next();
      }
    }

    // Try API Key
    if (allowApiKey && authHeader.startsWith('ApiKey ')) {
      const key = authHeader.slice(7);
      const { valid, permissions, label } = await validateApiKey(key);
      if (valid) {
        req.agent = { id: label, permissions, type: 'apikey' };
        return next();
      }
    }

    // No valid auth found
    if (required) {
      return res.status(401).json({
        jsonrpc: '2.0',
        error: { code: -32010, message: 'Authentication required' },
        id: null,
      });
    }

    next();
  };
}

// ============================================================================
// Outbound Auth (credentials for connecting to remote agents)
// ============================================================================

/**
 * Store credentials for outbound requests to another agent.
 *
 * @param {string} agentUrl
 * @param {{ type: string, value: string }} credentials
 */
export async function createOutboundAuth(agentUrl, credentials) {
  const store = await readJsonFile(OUTBOUND_FILE, {});
  store[agentUrl] = credentials;
  await writeJsonFile(OUTBOUND_FILE, store);
}

/**
 * Get stored credentials for an agent.
 *
 * @param {string} agentUrl
 * @returns {Promise<{ type: string, value: string }|null>}
 */
export async function getOutboundAuth(agentUrl) {
  const store = await readJsonFile(OUTBOUND_FILE, {});
  return store[agentUrl] || null;
}

/**
 * Apply stored auth headers to an outbound HTTP request options object.
 *
 * @param {object} headers - Headers object to mutate
 * @param {string} agentUrl
 * @returns {Promise<object>} Modified headers
 */
export async function applyAuth(headers, agentUrl) {
  const creds = await getOutboundAuth(agentUrl);
  if (!creds) return headers;
  if (creds.type === 'bearer') {
    headers['Authorization'] = `Bearer ${creds.value}`;
  } else if (creds.type === 'apikey') {
    headers['Authorization'] = `ApiKey ${creds.value}`;
  }
  return headers;
}
