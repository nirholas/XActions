import express from 'express';
import crypto from 'crypto';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();
const prisma = new PrismaClient();

// Stripe webhook endpoint
router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

async function handleCheckoutCompleted(session) {
  const userId = session.metadata.userId;

  if (session.mode === 'subscription') {
    // Handle subscription
    const tier = session.metadata.tier;
    const subscription = await stripe.subscriptions.retrieve(session.subscription);

    await prisma.subscription.upsert({
      where: { userId },
      update: {
        tier,
        status: 'active',
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        stripePriceId: subscription.items.data[0].price.id,
        startDate: new Date(subscription.current_period_start * 1000),
        endDate: new Date(subscription.current_period_end * 1000)
      },
      create: {
        userId,
        tier,
        status: 'active',
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        stripePriceId: subscription.items.data[0].price.id,
        startDate: new Date(subscription.current_period_start * 1000),
        endDate: new Date(subscription.current_period_end * 1000)
      }
    });

    await prisma.payment.create({
      data: {
        userId,
        type: 'subscription',
        amount: session.amount_total / 100,
        currency: session.currency,
        stripePaymentId: session.payment_intent,
        status: 'succeeded',
        metadata: { tier }
      }
    });

    console.log(`✅ Subscription created for user ${userId}: ${tier}`);
  } else if (session.mode === 'payment') {
    // Handle credit purchase
    const credits = parseInt(session.metadata.credits);

    await prisma.user.update({
      where: { id: userId },
      data: {
        credits: {
          increment: credits
        }
      }
    });

    await prisma.payment.create({
      data: {
        userId,
        type: 'credits',
        amount: session.amount_total / 100,
        currency: session.currency,
        stripePaymentId: session.payment_intent,
        status: 'succeeded',
        creditsAdded: credits
      }
    });

    console.log(`✅ Credits added for user ${userId}: ${credits}`);
  }
}

async function handleSubscriptionUpdated(subscription) {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: subscription.status,
      endDate: new Date(subscription.current_period_end * 1000),
      cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null
    }
  });

  console.log(`✅ Subscription updated: ${subscription.id}`);
}

async function handleSubscriptionDeleted(subscription) {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: 'cancelled',
      endDate: new Date()
    }
  });

  // Downgrade to free tier
  const sub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id }
  });

  if (sub) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        tier: 'free',
        status: 'active',
        stripeSubscriptionId: null,
        stripePriceId: null
      }
    });

    // Reset credits to free tier amount
    await prisma.user.update({
      where: { id: sub.userId },
      data: { credits: 50 }
    });
  }

  console.log(`✅ Subscription cancelled: ${subscription.id}`);
}

async function handlePaymentSucceeded(invoice) {
  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: invoice.subscription }
  });

  if (subscription) {
    await prisma.payment.create({
      data: {
        userId: subscription.userId,
        type: 'subscription',
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        stripePaymentId: invoice.payment_intent,
        stripeInvoiceId: invoice.id,
        status: 'succeeded'
      }
    });
  }

  console.log(`✅ Payment succeeded: ${invoice.id}`);
}

async function handlePaymentFailed(invoice) {
  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: invoice.subscription }
  });

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'past_due' }
    });

    await prisma.payment.create({
      data: {
        userId: subscription.userId,
        type: 'subscription',
        amount: invoice.amount_due / 100,
        currency: invoice.currency,
        stripeInvoiceId: invoice.id,
        status: 'failed'
      }
    });
  }

  console.log(`❌ Payment failed: ${invoice.id}`);
}

// Coinbase Commerce webhook handler
async function handleCoinbaseWebhook(req, res) {
  const signature = req.headers['x-cc-webhook-signature'];
  
  if (!signature) {
    return res.status(400).json({ error: 'Missing signature' });
  }

  try {
    // Verify webhook signature
    const hmac = crypto.createHmac('sha256', process.env.COINBASE_WEBHOOK_SECRET);
    hmac.update(JSON.stringify(req.body));
    const expectedSignature = hmac.digest('hex');

    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    const { type, data } = event;

    if (type === 'charge:confirmed' || type === 'charge:completed') {
      const paymentId = data.metadata?.paymentId;
      
      if (paymentId) {
        await confirmCryptoPayment(paymentId, data.code);
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Coinbase webhook error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

// NOWPayments webhook handler  
async function handleNowPaymentsWebhook(req, res) {
  try {
    const { payment_status, order_id, payment_id } = req.body;

    // Verify IPN signature
    const hmac = crypto.createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET);
    hmac.update(JSON.stringify(req.body));
    const signature = hmac.digest('hex');

    if (req.headers['x-nowpayments-sig'] !== signature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    if (payment_status === 'confirmed' || payment_status === 'finished') {
      await confirmCryptoPayment(order_id, payment_id);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('NOWPayments webhook error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

// BTCPay Server webhook handler
async function handleBTCPayWebhook(req, res) {
  try {
    const { type, invoiceId, metadata } = req.body;

    // Verify webhook signature
    const signature = req.headers['btcpay-sig'];
    const hmac = crypto.createHmac('sha256', process.env.BTCPAY_WEBHOOK_SECRET);
    hmac.update(JSON.stringify(req.body));
    const expectedSignature = `sha256=${hmac.digest('hex')}`;

    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    if (type === 'InvoiceSettled' || type === 'InvoicePaymentSettled') {
      const paymentId = metadata?.orderId;
      if (paymentId) {
        await confirmCryptoPayment(paymentId, invoiceId);
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('BTCPay webhook error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

// Common function to confirm crypto payments and add credits
async function confirmCryptoPayment(paymentId, txHash) {
  const payment = await prisma.cryptoPayment.findUnique({
    where: { paymentId }
  });

  if (!payment) {
    console.error(`Payment not found: ${paymentId}`);
    return;
  }

  if (payment.status === 'completed') {
    console.log(`Payment already confirmed: ${paymentId}`);
    return;
  }

  // Update payment status
  await prisma.cryptoPayment.update({
    where: { paymentId },
    data: {
      status: 'completed',
      txHash,
      confirmedAt: new Date()
    }
  });

  // Add credits to user
  if (payment.userId) {
    await prisma.user.update({
      where: { id: payment.userId },
      data: {
        credits: { increment: payment.credits }
      }
    });

    // Create payment record
    await prisma.payment.create({
      data: {
        userId: payment.userId,
        type: 'crypto_credits',
        amount: payment.amountUSD,
        currency: 'USD',
        status: 'succeeded',
        metadata: {
          package: payment.package,
          credits: payment.credits,
          cryptoCurrency: payment.currency,
          cryptoAmount: payment.amount,
          txHash,
          paymentId
        }
      }
    });

    console.log(`✅ Crypto payment confirmed: ${paymentId}, Credits added: ${payment.credits}`);
  }
}

// Register crypto webhook routes
router.post('/coinbase', handleCoinbaseWebhook);
router.post('/nowpayments', handleNowPaymentsWebhook);
router.post('/btcpay', handleBTCPayWebhook);

export default router;
