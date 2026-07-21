// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Webhook Receiver Routes
 * Receive payment notifications from x402 or external services
 * 
 * @author nichxbt
 */

import express from 'express';
import crypto from 'crypto';
import Stripe from 'stripe';
import { handleWebhookEvent } from '../services/stripeService.js';

const router = express.Router();

/**
 * POST /webhooks/stripe
 * Stripe webhook endpoint — must receive raw body for signature verification
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`❌ Stripe webhook signature verification failed: ${err.message}`);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  console.log(`💳 Stripe webhook: ${event.type} (${event.id})`);

  try {
    await handleWebhookEvent(event);
    res.json({ received: true });
  } catch (err) {
    console.error(`❌ Stripe webhook handler error: ${err.message}`);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

/**
 * Verify webhook signature
 */
function verifySignature(payload, signature, secret) {
  // If no secret is configured, skip verification (opt-in)
  if (!secret) return true;
  // Secret is configured — signature is mandatory
  if (!signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);
  // Buffers must be same length for timingSafeEqual
  if (sigBuf.length !== expBuf.length) return false;

  return crypto.timingSafeEqual(sigBuf, expBuf);
}

/**
 * POST /webhooks/payments
 * Receive x402 payment notifications
 */
router.post('/payments', express.json(), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const event = req.headers['x-webhook-event'];
  const webhookId = req.headers['x-webhook-id'];
  
  // Verify signature if secret is configured
  const secret = process.env.WEBHOOK_RECEIVE_SECRET;
  if (secret && !verifySignature(req.body, signature, secret)) {
    console.error('❌ Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const payload = req.body;
  
  console.log('\n' + '='.repeat(60));
  console.log('💰 PAYMENT WEBHOOK RECEIVED');
  console.log('='.repeat(60));
  console.log(`Event: ${event || payload.event}`);
  console.log(`ID: ${webhookId || payload.id}`);
  console.log(`Time: ${payload.timestamp}`);
  
  if (payload.data) {
    console.log(`Amount: ${payload.data.amount}`);
    console.log(`Operation: ${payload.data.operation}`);
    console.log(`Network: ${payload.data.networkName || payload.data.network}`);
    console.log(`Payer: ${payload.data.payer}`);
    if (payload.data.transactionHash) {
      console.log(`TX: ${payload.data.transactionHash}`);
    }
    if (payload.data.explorerUrl) {
      console.log(`Explorer: ${payload.data.explorerUrl}`);
    }
  }
  console.log('='.repeat(60) + '\n');
  
  // TODO: Add your custom logic here
  // - Save to database
  // - Send notification to yourself
  // - Update metrics dashboard
  // - etc.
  
  // Respond quickly to acknowledge receipt
  res.status(200).json({ 
    received: true,
    id: webhookId || payload.id
  });
});

/**
 * GET /webhooks/health
 * Health check for webhook endpoint
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    endpoint: '/webhooks/payments',
    timestamp: new Date().toISOString()
  });
});

export default router;
