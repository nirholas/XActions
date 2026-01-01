/**
 * Admin routes for license management
 * 
 * These routes require admin authentication
 */

import { Router } from 'express';
import { 
  createLicense,
  validateLicenseKey,
  activateLicense,
  revokeLicense,
  listLicenses,
  getLicense,
  TIER_FEATURES,
} from '../services/licenseManager.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/admin/licenses
 * Create a new license key
 */
router.post('/licenses', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      tier = 'starter',
      customerName,
      customerEmail,
      companyName,
      expiresInDays,
      maxInstances,
      notes,
      paymentId,
      amountPaid,
    } = req.body;

    // Calculate expiry date if specified
    let expiresAt = null;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));
    }

    const license = await createLicense({
      tier,
      customerName,
      customerEmail,
      companyName,
      expiresAt,
      maxInstances,
      notes,
      paymentId,
      amountPaid,
    });

    res.status(201).json({
      success: true,
      license: {
        key: license.key,
        tier: license.tier,
        customerName: license.customerName,
        customerEmail: license.customerEmail,
        companyName: license.companyName,
        maxUsers: license.maxUsers,
        maxInstances: license.maxInstances,
        whiteLabel: license.whiteLabel,
        customDomain: license.customDomain,
        apiAccess: license.apiAccess,
        expiresAt: license.expiresAt,
        createdAt: license.createdAt,
      },
      message: `License key created: ${license.key}`,
    });
  } catch (error) {
    console.error('Create license error:', error);
    res.status(500).json({ error: 'Failed to create license' });
  }
});

/**
 * GET /api/admin/licenses
 * List all licenses
 */
router.get('/licenses', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, tier, limit = 100, offset = 0 } = req.query;

    const result = await listLicenses({
      status,
      tier,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json(result);
  } catch (error) {
    console.error('List licenses error:', error);
    res.status(500).json({ error: 'Failed to list licenses' });
  }
});

/**
 * GET /api/admin/licenses/:key
 * Get license details
 */
router.get('/licenses/:key', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const license = await getLicense(key);

    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    res.json({ license });
  } catch (error) {
    console.error('Get license error:', error);
    res.status(500).json({ error: 'Failed to get license' });
  }
});

/**
 * POST /api/admin/licenses/:key/revoke
 * Revoke a license
 */
router.post('/licenses/:key/revoke', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const { reason } = req.body;

    const license = await revokeLicense(key, reason);

    res.json({
      success: true,
      message: 'License revoked',
      license: {
        key: license.key,
        status: license.status,
      },
    });
  } catch (error) {
    console.error('Revoke license error:', error);
    res.status(500).json({ error: 'Failed to revoke license' });
  }
});

/**
 * GET /api/admin/licenses/tiers
 * Get available license tiers and features
 */
router.get('/tiers', authenticateToken, requireAdmin, async (req, res) => {
  res.json({ tiers: TIER_FEATURES });
});

/**
 * POST /api/admin/licenses/:key/validate
 * Validate a license key
 */
router.post('/licenses/:key/validate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const result = await validateLicenseKey(key);
    res.json(result);
  } catch (error) {
    console.error('Validate license error:', error);
    res.status(500).json({ error: 'Failed to validate license' });
  }
});

export default router;
