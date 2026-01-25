import express from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
import { SUBSCRIPTION_TIERS, CREDIT_PACKAGES } from '../config/subscription-tiers.js';

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();
const prisma = new PrismaClient();

// Create checkout session for subscription
router.post('/create-checkout-session', authMiddleware, async (req, res) => {
  try {
    const { tier } = req.body; // 'basic', 'pro', 'enterprise'
    
    if (!SUBSCRIPTION_TIERS[tier] || tier === 'free') {
      return res.status(400).json({ error: 'Invalid subscription tier' });
    }

    const tierInfo = SUBSCRIPTION_TIERS[tier];

    // Create or get Stripe customer
    let customer;
    if (req.user.subscription?.stripeCustomerId) {
      customer = await stripe.customers.retrieve(req.user.subscription.stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email: req.user.email,
        metadata: {
          userId: req.user.id
        }
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: tierInfo.priceId,
          quantity: 1
        }
      ],
      success_url: `${process.env.FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`,
      metadata: {
        userId: req.user.id,
        tier
      }
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create checkout session for credit purchase
router.post('/buy-credits', authMiddleware, async (req, res) => {
  try {
    const { package: packageName } = req.body; // 'small', 'medium', 'large'
    
    if (!CREDIT_PACKAGES[packageName]) {
      return res.status(400).json({ error: 'Invalid credit package' });
    }

    const packageInfo = CREDIT_PACKAGES[packageName];

    // Create or get Stripe customer
    let customer;
    if (req.user.subscription?.stripeCustomerId) {
      customer = await stripe.customers.retrieve(req.user.subscription.stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email: req.user.email,
        metadata: {
          userId: req.user.id
        }
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price: packageInfo.priceId,
          quantity: 1
        }
      ],
      success_url: `${process.env.FRONTEND_URL}/dashboard?credits_added=true`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard`,
      metadata: {
        userId: req.user.id,
        type: 'credits',
        credits: packageInfo.credits
      }
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Credit purchase error:', error);
    res.status(500).json({ error: 'Failed to process credit purchase' });
  }
});

// Cancel subscription
router.post('/cancel-subscription', authMiddleware, async (req, res) => {
  try {
    if (!req.user.subscription?.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No active subscription' });
    }

    const subscription = await stripe.subscriptions.update(
      req.user.subscription.stripeSubscriptionId,
      { cancel_at_period_end: true }
    );

    // Update database
    await prisma.subscription.update({
      where: { id: req.user.subscription.id },
      data: {
        cancelAt: new Date(subscription.cancel_at * 1000)
      }
    });

    res.json({ message: 'Subscription will be cancelled at period end' });
  } catch (error) {
    console.error('Subscription cancellation error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Get billing portal
router.post('/billing-portal', authMiddleware, async (req, res) => {
  try {
    if (!req.user.subscription?.stripeCustomerId) {
      return res.status(400).json({ error: 'No billing information found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: req.user.subscription.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/dashboard`
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Billing portal error:', error);
    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
});

export default router;
