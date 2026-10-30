// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * AI Billing Management Endpoints
 *
 * A subscription belongs to an XActions account, so every endpoint here except
 * the price list needs the account's token (`Authorization: Bearer <jwt>`).
 * Checkout answers at once with the Stripe Checkout URL: creating the session
 * is one Stripe call, and a queued job would only have made the caller poll
 * for a link they need now. Agents paying per call with x402 have no account
 * and need no subscription.
 *
 * @module api/routes/ai/billing
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import express from 'express';
import { prisma } from '../../../src/utils/prisma.js';
import { authMiddleware } from '../../middleware/auth.js';
import { TIERS } from '../../config/subscription-tiers.js';
import { createCheckoutSession, createPortalSession, getSubscriptionStatus } from '../../services/stripeService.js';

const router = express.Router();

/** Tiers a caller can buy through Checkout. */
const PURCHASABLE = Object.keys(TIERS).filter((key) => key !== 'free' && key !== 'enterprise');

const failure = (res, status, error, message) =>
  res.status(status).json({ success: false, error, message, timestamp: new Date().toISOString() });

/** Explain what an anonymous caller is missing before the generic auth check answers. */
function requireAccount(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return failure(
      res,
      401,
      'ACCOUNT_REQUIRED',
      'Subscriptions belong to an XActions account. Sign in and send Authorization: Bearer <token>. Paying per call with x402 needs no subscription.',
    );
  }
  return authMiddleware(req, res, next);
}

/** POST /api/ai/billing/checkout: a Stripe Checkout URL for a plan. Body: { plan } */
router.post('/checkout', requireAccount, async (req, res) => {
  const plan = req.body?.plan || req.body?.tier;
  if (!PURCHASABLE.includes(plan)) {
    const hint = plan === 'enterprise' ? ' Enterprise pricing is arranged with sales.' : '';
    return failure(res, 400, 'INVALID_PLAN', `plan must be one of: ${PURCHASABLE.join(', ')}.${hint}`);
  }
  if (!process.env.STRIPE_SECRET_KEY || !TIERS[plan].stripePriceId) {
    return failure(res, 503, 'BILLING_NOT_CONFIGURED', `Checkout for ${plan} is not configured on this server.`);
  }
  try {
    const session = await createCheckoutSession(req.user, plan);
    return res.json({ success: true, data: { plan, url: session.url, sessionId: session.id, expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null } });
  } catch (error) {
    console.error('❌ Checkout error:', error.message);
    return failure(res, 502, 'CHECKOUT_FAILED', 'Stripe could not create a checkout session. Try again shortly.');
  }
});

/** POST /api/ai/billing/portal: a Stripe Customer Portal URL for the account. */
router.post('/portal', requireAccount, async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) return failure(res, 503, 'BILLING_NOT_CONFIGURED', 'Billing is not configured on this server.');
  try {
    const session = await createPortalSession(req.user);
    return res.json({ success: true, data: { url: session.url } });
  } catch (error) {
    console.error('❌ Portal error:', error.message);
    return failure(res, 502, 'PORTAL_FAILED', 'Stripe could not open the billing portal. Try again shortly.');
  }
});

/** POST /api/ai/billing/plans: the price list. */
router.post('/plans', (req, res) => {
  const plans = Object.entries(TIERS).map(([id, tier]) => ({
    id,
    name: tier.name,
    price: tier.price ?? null,
    limits: tier.limits,
    features: tier.features,
    checkout: PURCHASABLE.includes(id),
  }));
  return res.json({ success: true, data: { plans } });
});

/** POST /api/ai/billing/usage: the account's plan, its limits, and today's operations. */
router.post('/usage', requireAccount, async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const [subscription, operationsToday] = await Promise.all([
      getSubscriptionStatus(req.user.id),
      prisma.operation.count({ where: { userId: req.user.id, createdAt: { gte: startOfDay } } }),
    ]);
    return res.json({
      success: true,
      data: { ...subscription, usage: { operationsToday, periodStart: startOfDay.toISOString() } },
    });
  } catch (error) {
    console.error('❌ Usage error:', error.message);
    return failure(res, 500, 'USAGE_FAILED', 'Could not read usage for this account.');
  }
});

/** POST /api/ai/billing/invoices: the account's recorded payments, newest first. */
router.post('/invoices', requireAccount, async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.body?.limit, 10) || 20, 1), 100);
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, type: true, amount: true, currency: true, status: true, stripeInvoiceId: true, createdAt: true },
    });
    return res.json({ success: true, data: { invoices: payments, count: payments.length } });
  } catch (error) {
    console.error('❌ Invoices error:', error.message);
    return failure(res, 500, 'INVOICES_FAILED', 'Could not read invoices for this account.');
  }
});

export default router;
