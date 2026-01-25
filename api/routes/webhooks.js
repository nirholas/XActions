/**
 * Webhook Receiver Routes
 * Receive payment notifications from x402 or external services
 * 
 * @author nichxbt
 */

import express from 'express';
import crypto from 'crypto';

const router = express.Router();

/**
 * Verify webhook signature
 */
function verifySignature(payload, signature, secret) {
  if (!secret || !signature) return true; // Skip verification if no secret configured
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEquals(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
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
