// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Stripe Billing Service
 * Handles customer creation, subscriptions, and portal sessions.
 *
 * @author nichxbt
 */

import Stripe from 'stripe';
import { prisma } from '../../src/utils/prisma.js';
import { TIERS } from '../config/subscription-tiers.js';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateCustomer(user) {
  const stripe = getStripe();

  // Check if user already has a subscription with a Stripe customer ID
  const existing = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });

  if (existing?.stripeCustomerId) {
    return existing.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: user.email,
    metadata: {
      userId: user.id,
      username: user.username,
    },
  });

  // Upsert subscription record with customer ID
  await prisma.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      tier: 'free',
      status: 'active',
      stripeCustomerId: customer.id,
      startDate: new Date(),
    },
    update: {
      stripeCustomerId: customer.id,
    },
  });

  return customer.id;
}

/**
 * Create a Stripe Checkout session for a subscription
 */
export async function createCheckoutSession(user, tier) {
  const stripe = getStripe();
  const tierConfig = TIERS[tier];

  if (!tierConfig || !tierConfig.stripePriceId) {
    throw new Error(`Invalid or unconfigured tier: ${tier}`);
  }

  const customerId = await getOrCreateCustomer(user);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    // The endive API versions (stripe 23+) replaced payment_method_types with this filter.
    allowed_payment_method_types: ['card'],
    line_items: [
      {
        price: tierConfig.stripePriceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.API_URL || 'http://localhost:3001'}/billing?success=true`,
    cancel_url: `${process.env.API_URL || 'http://localhost:3001'}/billing?canceled=true`,
    metadata: {
      userId: user.id,
      tier,
    },
  });

  return session;
}

/**
 * Create a Stripe Customer Portal session (manage billing, cancel, update card)
 */
export async function createPortalSession(user) {
  const stripe = getStripe();
  const customerId = await getOrCreateCustomer(user);

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.API_URL || 'http://localhost:3001'}/billing`,
  });

  return session;
}

/**
 * Get current subscription status for a user
 */
export async function getSubscriptionStatus(userId) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    return { tier: 'free', status: 'active', limits: TIERS.free.limits, features: TIERS.free.features };
  }

  const tierConfig = TIERS[subscription.tier] || TIERS.free;

  return {
    tier: subscription.tier,
    status: subscription.status,
    currentPeriodEnd: subscription.endDate,
    cancelAt: subscription.cancelAt,
    limits: tierConfig.limits,
    features: tierConfig.features,
  };
}

/**
 * Cancel a subscription (at period end)
 */
export async function cancelSubscription(userId) {
  const stripe = getStripe();

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription?.stripeSubscriptionId) {
    throw new Error('No active subscription found');
  }

  // Cancel at end of billing period, not immediately
  const updated = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  const cancelAt = fromEpoch(updated.cancel_at ?? periodEnd(updated));

  await prisma.subscription.update({
    where: { userId },
    data: { cancelAt },
  });

  return { cancelAt };
}

/**
 * Handle Stripe webhook events — called from the webhook route
 */
export async function handleWebhookEvent(event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.mode === 'subscription') {
        await activateSubscription(session);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object;
      await syncSubscription(sub);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      await deactivateSubscription(sub);
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      await recordPayment(invoice);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      await handleFailedPayment(invoice);
      break;
    }

    default:
      // Unhandled event type — no action needed
      break;
  }
}

// --- Internal helpers ---

/**
 * End of a subscription's current billing period, in epoch seconds.
 *
 * API versions from 2025-03-31 moved `current_period_end` off the
 * subscription and onto each subscription item; the subscription's own period
 * ends with its earliest item. Webhook payloads follow the endpoint's API
 * version rather than this SDK's, so both shapes arrive here.
 */
function periodEnd(subscription) {
  if (subscription.current_period_end) return subscription.current_period_end;
  const ends = (subscription.items?.data || [])
    .map((item) => item.current_period_end)
    .filter(Boolean);
  return ends.length ? Math.min(...ends) : null;
}

function fromEpoch(seconds) {
  return seconds ? new Date(seconds * 1000) : null;
}

/**
 * The PaymentIntent behind an invoice. Older API versions put it on the
 * invoice itself; newer ones list it under `invoice.payments`, which webhook
 * payloads leave unexpanded, so it is fetched when the payload lacks it.
 */
async function invoicePaymentIntentId(invoice) {
  const idOf = (ref) => (typeof ref === 'string' ? ref : ref?.id || null);
  if (invoice.payment_intent) return idOf(invoice.payment_intent);

  let payments = invoice.payments?.data;
  if (!payments) {
    try {
      payments = (await getStripe().invoicePayments.list({ invoice: invoice.id, limit: 10 })).data;
    } catch (err) {
      console.error(`❌ Could not list payments for invoice ${invoice.id}: ${err.message}`);
      return null;
    }
  }
  const match = payments.find((p) => p.payment?.payment_intent);
  return match ? idOf(match.payment.payment_intent) : null;
}

async function activateSubscription(session) {
  const { userId, tier } = session.metadata;
  if (!userId || !tier) return;

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      tier,
      status: 'active',
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      stripePriceId: TIERS[tier]?.stripePriceId || null,
      startDate: new Date(),
    },
    update: {
      tier,
      status: 'active',
      stripeSubscriptionId: session.subscription,
      stripePriceId: TIERS[tier]?.stripePriceId || null,
      cancelAt: null,
    },
  });

  console.log(`✅ Subscription activated: user=${userId} tier=${tier}`);
}

async function syncSubscription(stripeSubscription) {
  const sub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: stripeSubscription.id },
  });

  if (!sub) return;

  const status = stripeSubscription.cancel_at_period_end ? 'cancelled' : mapStripeStatus(stripeSubscription.status);

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status,
      endDate: fromEpoch(periodEnd(stripeSubscription)) ?? undefined,
      cancelAt: fromEpoch(stripeSubscription.cancel_at),
    },
  });
}

async function deactivateSubscription(stripeSubscription) {
  const sub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: stripeSubscription.id },
  });

  if (!sub) return;

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      tier: 'free',
      status: 'expired',
      stripeSubscriptionId: null,
      stripePriceId: null,
      endDate: new Date(),
    },
  });

  console.log(`⚠️ Subscription deactivated: user=${sub.userId}`);
}

async function recordPayment(invoice) {
  if (!invoice.customer) return;

  const sub = await prisma.subscription.findUnique({
    where: { stripeCustomerId: invoice.customer },
  });

  if (!sub) return;

  await prisma.payment.create({
    data: {
      userId: sub.userId,
      type: 'subscription',
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
      stripePaymentId: await invoicePaymentIntentId(invoice),
      stripeInvoiceId: invoice.id,
      status: 'succeeded',
    },
  });
}

async function handleFailedPayment(invoice) {
  if (!invoice.customer) return;

  const sub = await prisma.subscription.findUnique({
    where: { stripeCustomerId: invoice.customer },
  });

  if (!sub) return;

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: 'past_due' },
  });

  await prisma.payment.create({
    data: {
      userId: sub.userId,
      type: 'subscription',
      amount: invoice.amount_due / 100,
      currency: invoice.currency,
      stripePaymentId: await invoicePaymentIntentId(invoice),
      stripeInvoiceId: invoice.id,
      status: 'failed',
    },
  });

  console.log(`❌ Payment failed: user=${sub.userId}`);
}

function mapStripeStatus(stripeStatus) {
  const map = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'expired',
    unpaid: 'past_due',
    incomplete: 'past_due',
    incomplete_expired: 'expired',
    trialing: 'active',
  };
  return map[stripeStatus] || 'active';
}
