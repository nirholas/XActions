// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions Licensing & Telemetry
 * 
 * Lightweight enforcement:
 * - Anonymous usage ping (opt-out with XACTIONS_NO_TELEMETRY=1)
 * - License key validation for white-label
 * - "Powered by XActions" branding control
 */

import crypto from 'crypto';
import { validateLicenseKey as dbValidateLicense, activateLicense as dbActivateLicense } from './licenseManager.js';

// License key format: XACT-XXXX-XXXX-XXXX-XXXX
const LICENSE_PREFIX = 'XACT';

// Features unlocked by license tiers
const LICENSE_TIERS = {
  free: {
    showBranding: true,
    maxUsers: 100,
    customDomain: false,
    whiteLabel: false,
    apiAccess: false,
  },
  starter: {
    showBranding: true,
    maxUsers: 500,
    customDomain: true,
    whiteLabel: false,
    apiAccess: false,
  },
  business: {
    showBranding: false,
    maxUsers: 5000,
    customDomain: true,
    whiteLabel: true,
    apiAccess: true,
  },
  enterprise: {
    showBranding: false,
    maxUsers: -1, // unlimited
    customDomain: true,
    whiteLabel: true,
    apiAccess: true,
  }
};

// In-memory cache
let cachedLicense = null;
// A failed lookup (database unreachable) is retried after this long, not cached.
const TRANSIENT_RETRY_MS = 60_000;
let transientLicense = null;
let instanceId = null;

/**
 * Generate a unique instance ID (persisted in env or generated once)
 */
function getInstanceId() {
  if (instanceId) return instanceId;
  
  // Use env var if set, otherwise generate
  if (process.env.XACTIONS_INSTANCE_ID) {
    instanceId = process.env.XACTIONS_INSTANCE_ID;
  } else {
    // Generate from hostname + random
    const hostname = process.env.HOSTNAME || process.env.RAILWAY_SERVICE_NAME || 'unknown';
    instanceId = crypto.createHash('sha256')
      .update(`${hostname}-${Date.now()}-${Math.random()}`)
      .digest('hex')
      .substring(0, 16);
  }
  
  return instanceId;
}

/**
 * Send anonymous usage ping (opt-out with XACTIONS_NO_TELEMETRY=1)
 */
async function sendTelemetryPing() {
  // Respect opt-out
  if (process.env.XACTIONS_NO_TELEMETRY === '1') {
    console.log('📊 Telemetry disabled (XACTIONS_NO_TELEMETRY=1)');
    return;
  }
  
  try {
    const payload = {
      instanceId: getInstanceId(),
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      hasLicense: !!process.env.XACTIONS_LICENSE_KEY,
      timestamp: new Date().toISOString(),
    };
    
    // Fire and forget - don't block startup
    fetch('https://telemetry.xactions.app/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000), // 5s timeout
    }).catch(() => {
      // Silently fail - telemetry should never break the app
    });
    
    console.log('📊 Anonymous telemetry ping sent (opt-out: XACTIONS_NO_TELEMETRY=1)');
  } catch (e) {
    // Silently fail
  }
}

/**
 * Validate a license key format
 */
function isValidKeyFormat(key) {
  if (!key) return false;
  // XACT-XXXX-XXXX-XXXX-XXXX
  const pattern = /^XACT-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return pattern.test(key);
}

/**
 * Validate license key (checks database)
 */
async function validateLicense(licenseKey) {
  if (!licenseKey || !isValidKeyFormat(licenseKey)) {
    return { valid: false, tier: 'free', error: 'Invalid license key format' };
  }
  
  try {
    // Validate against database
    const result = await dbValidateLicense(licenseKey);
    
    if (!result.valid) {
      return { valid: false, tier: 'free', error: result.error };
    }
    
    // Activate on this instance if valid. A refused activation (instance
    // limit reached, key gone) leaves the instance unlicensed.
    const instanceId = getInstanceId();
    const activation = await dbActivateLicense(licenseKey, instanceId);
    if (!activation?.success) {
      return { valid: false, tier: 'free', features: LICENSE_TIERS.free, error: activation?.error || 'License activation failed' };
    }
    
    return {
      valid: true,
      tier: result.tier,
      features: result.features,
      expiresAt: result.expiresAt,
      customer: result.customer,
    };
  } catch (e) {
    // The database was unreachable: no verdict, so this is not cached (see
    // getLicenseStatus) and the next check asks again.
    console.error('❌ License validation error:', e);
    return { valid: false, tier: 'free', features: LICENSE_TIERS.free, error: 'License validation failed', transient: true };
  }
}

/**
 * Get current license status
 */
async function getLicenseStatus() {
  if (cachedLicense) return cachedLicense;
  if (transientLicense && Date.now() - transientLicense.at < TRANSIENT_RETRY_MS) return transientLicense.result;
  
  const licenseKey = process.env.XACTIONS_LICENSE_KEY;
  
  if (!licenseKey) {
    cachedLicense = {
      valid: false,
      tier: 'free',
      features: LICENSE_TIERS.free,
    };
    return cachedLicense;
  }
  
  const result = await validateLicense(licenseKey);
  if (result.transient) {
    // A database error at boot once fixed the instance at "free" until restart.
    transientLicense = { at: Date.now(), result };
    return result;
  }
  transientLicense = null;
  cachedLicense = result;
  return cachedLicense;
}

/**
 * Check if branding should be shown
 */
async function shouldShowBranding() {
  const license = await getLicenseStatus();
  return license.features?.showBranding !== false;
}

/**
 * Check if a feature is enabled
 */
async function isFeatureEnabled(feature) {
  const license = await getLicenseStatus();
  return license.features?.[feature] === true;
}

/**
 * Get branding HTML (for footer injection)
 */
async function getBrandingHtml() {
  if (!(await shouldShowBranding())) {
    return '';
  }
  
  return `
    <div id="xactions-branding" style="
      position: fixed;
      bottom: 12px;
      right: 12px;
      background: rgba(0,0,0,0.8);
      color: #71767b;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      z-index: 9999;
      pointer-events: auto;
    ">
      <a href="https://xactions.app" target="_blank" rel="noopener" style="
        color: #1d9bf0;
        text-decoration: none;
      ">⚡ Powered by XActions</a>
    </div>
  `;
}

/**
 * Initialize licensing on server start
 */
async function initializeLicensing() {
  console.log('🔐 Initializing licensing...');
  
  // Check license
  const license = await getLicenseStatus();
  console.log(`📜 License tier: ${license.tier}`);
  
  if (license.tier === 'free') {
    console.log('💡 Running in free mode - "Powered by XActions" branding will be shown');
    console.log('💡 Get a license at https://xactions.app/enterprise');
  }
  
  // Send telemetry ping
  await sendTelemetryPing();
  
  return license;
}

/** Whether a response with this Content-Type (or none yet, which send() makes text/html) is HTML. */
function isHtmlResponse(res) {
  const type = res.get('Content-Type');
  return !type || /^text\/html\b/i.test(type);
}

/**
 * Express middleware to inject branding.
 *
 * The license is resolved before the request continues, so the wrapped
 * res.send stays synchronous and returns the response as Express's does (it
 * was made async and returned a Promise). Only HTML is touched: any string
 * containing </body>, a JSON body included, once had markup spliced into it.
 */
function brandingMiddleware() {
  return async (req, res, next) => {
    let branding = '';
    try {
      branding = await getBrandingHtml();
    } catch (e) {
      console.warn('⚠️ Branding check failed:', e.message);
    }
    if (!branding) return next();

    const originalSend = res.send;
    res.send = function (body) {
      if (typeof body === 'string' && body.includes('</body>') && isHtmlResponse(this)) {
        body = body.replace('</body>', `${branding}</body>`);
      }
      return originalSend.call(this, body);
    };

    next();
  };
}

export {
  initializeLicensing,
  validateLicense,
  getLicenseStatus,
  shouldShowBranding,
  isFeatureEnabled,
  getBrandingHtml,
  brandingMiddleware,
  sendTelemetryPing,
  getInstanceId,
  LICENSE_TIERS,
};
