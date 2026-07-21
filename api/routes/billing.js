// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Billing Routes
 * Stripe subscription management — checkout, portal, status, cancel.
 *
 * @author nichxbt
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { TIERS } from '../config/subscription-tiers.js';
import {
  createCheckoutSession,
  createPortalSession,
  getSubscriptionStatus,
  cancelSubscription,
} from '../services/stripeService.js';

const router = express.Router();

/**
 * GET /api/billing/plans
 * List available subscription plans (public)
 */
router.get('/plans', (req, res) => {
  const plans = Object.entries(TIERS)
    .filter(([key]) => key !== 'enterprise') // enterprise is custom pricing
    .map(([key, tier]) => ({
      id: key,
      name: tier.name,
      price: tier.price,
      limits: tier.limits,
      features: tier.features,
    }));

  res.json({ plans });
});

/**
 * GET /api/billing/subscription
 * Get current user's subscription status
 */
router.get('/subscription', authMiddleware, async (req, res) => {
  try {
    const status = await getSubscriptionStatus(req.user.id);
    res.json(status);
  } catch (error) {
    console.error('❌ Failed to get subscription:', error.message);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

/**
 * POST /api/billing/checkout
 * Create a Stripe Checkout session for a plan
 * Body: { tier: 'pro' | 'business' }
 */
router.post('/checkout', authMiddleware, async (req, res) => {
  try {
    const { tier } = req.body;

    if (!tier || !TIERS[tier]) {
      return res.status(400).json({ error: 'Invalid tier. Choose: pro, business' });
    }

    if (tier === 'free') {
      return res.status(400).json({ error: 'Free tier does not require checkout' });
    }

    if (tier === 'enterprise') {
      return res.status(400).json({ error: 'Contact sales for enterprise pricing' });
    }

    const session = await createCheckoutSession(req.user, tier);
    res.json({ url: session.url });
  } catch (error) {
    console.error('❌ Checkout error:', error.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * POST /api/billing/portal
 * Create a Stripe Customer Portal session (manage billing, update card, cancel)
 */
router.post('/portal', authMiddleware, async (req, res) => {
  try {
    const session = await createPortalSession(req.user);
    res.json({ url: session.url });
  } catch (error) {
    console.error('❌ Portal error:', error.message);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

/**
 * POST /api/billing/cancel
 * Cancel subscription at end of current billing period
 */
router.post('/cancel', authMiddleware, async (req, res) => {
  try {
    const result = await cancelSubscription(req.user.id);
    res.json({
      message: 'Subscription will be cancelled at end of billing period',
      cancelAt: result.cancelAt,
    });
  } catch (error) {
    console.error('❌ Cancel error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
