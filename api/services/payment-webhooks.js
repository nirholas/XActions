/**
 * Payment Webhook Service for x402 Revenue Tracking
 * 
 * Production-grade webhook system for payment notifications.
 * Supports custom webhooks, Discord, and Slack with:
 * - Retry logic with exponential backoff
 * - Signature verification for security
 * - Multiple event types
 * - Delivery status tracking
 * - Timeout handling
 * 
 * @module services/payment-webhooks
 * @author nichxbt
 */

import crypto from 'crypto';

// Configuration
const WEBHOOK_URL = process.env.X402_WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.X402_WEBHOOK_SECRET;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000; // 1 second
const WEBHOOK_TIMEOUT_MS = 10000; // 10 seconds

// Event types
export const PAYMENT_EVENTS = {
  RECEIVED: 'payment.received',
  SETTLED: 'payment.settled',
  FAILED: 'payment.failed',
  VERIFICATION_FAILED: 'payment.verification_failed',
};

// Delivery status tracking (in-memory, consider Redis for production persistence)
const deliveryLog = {
  total: 0,
  successful: 0,
  failed: 0,
  retried: 0,
  recentDeliveries: [], // Last 100 deliveries
};

/**
 * Generate HMAC signature for webhook payload
 * 
 * @param {string} payload - JSON string payload
 * @param {string} secret - Webhook secret key
 * @param {string} timestamp - ISO timestamp
 * @returns {string} HMAC-SHA256 signature
 */
function generateSignature(payload, secret, timestamp) {
  const signaturePayload = `${timestamp}.${payload}`;
  return crypto
    .createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');
}

/**
 * Create a payment event payload
 * 
 * @param {string} eventType - One of PAYMENT_EVENTS
 * @param {Object} payment - Payment details
 * @returns {Object} Formatted event payload
 */
function createEventPayload(eventType, payment) {
  const timestamp = new Date().toISOString();
  const eventId = `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  
  return {
    id: eventId,
    event: eventType,
    timestamp,
    apiVersion: '2024-01-01',
    data: {
      amount: payment.price,
      amountCents: parseAmountToCents(payment.price),
      currency: 'USDC',
      operation: payment.operation,
      operationCategory: payment.operation?.split(':')[0] || 'unknown',
      payer: payment.payerAddress,
      payerShort: payment.payerAddress 
        ? `${payment.payerAddress.slice(0, 6)}...${payment.payerAddress.slice(-4)}`
        : null,
      network: payment.network,
      networkName: getNetworkName(payment.network),
      transactionHash: payment.transactionHash || null,
      settlementId: payment.settlementId || null,
      metadata: payment.metadata || {},
    },
    source: {
      service: 'XActions',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    },
  };
}

/**
 * Parse price string to cents
 * @param {string} price - Price string like "$0.05"
 * @returns {number} Amount in cents
 */
function parseAmountToCents(price) {
  if (!price) return 0;
  const numericValue = parseFloat(price.replace(/[^0-9.]/g, ''));
  return Math.round(numericValue * 100);
}

/**
 * Get human-readable network name
 * @param {string} network - Network ID like "eip155:8453"
 * @returns {string} Network name
 */
function getNetworkName(network) {
  const networks = {
    'eip155:8453': 'Base',
    'eip155:84532': 'Base Sepolia (Testnet)',
    'eip155:1': 'Ethereum',
    'eip155:42161': 'Arbitrum One',
  };
  return networks[network] || network || 'Unknown';
}

/**
 * Fetch with timeout support
 * 
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options, timeout = WEBHOOK_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Send webhook with retry logic and exponential backoff
 * 
 * @param {string} url - Webhook URL
 * @param {Object} payload - Event payload
 * @param {Object} options - Additional options
 * @returns {Promise<{success: boolean, attempts: number, error?: string}>}
 */
async function sendWithRetry(url, payload, options = {}) {
  const payloadString = JSON.stringify(payload);
  let lastError = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const timestamp = new Date().toISOString();
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'XActions-Webhook/1.0',
        'X-Webhook-Event': payload.event,
        'X-Webhook-ID': payload.id,
        'X-Webhook-Timestamp': timestamp,
        ...options.headers,
      };
      
      // Add signature if secret is configured
      if (WEBHOOK_SECRET) {
        headers['X-Webhook-Signature'] = generateSignature(payloadString, WEBHOOK_SECRET, timestamp);
      }
      
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers,
        body: payloadString,
      });
      
      if (response.ok) {
        return { success: true, attempts: attempt, statusCode: response.status };
      }
      
      // Non-retryable status codes
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return { 
          success: false, 
          attempts: attempt, 
          statusCode: response.status,
          error: `HTTP ${response.status}: ${errorText.slice(0, 200)}` 
        };
      }
      
      lastError = `HTTP ${response.status}`;
    } catch (err) {
      lastError = err.name === 'AbortError' ? 'Timeout' : err.message;
    }
    
    // Exponential backoff before retry
    if (attempt < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      deliveryLog.retried++;
    }
  }
  
  return { success: false, attempts: MAX_RETRIES, error: lastError };
}

/**
 * Log delivery result
 * 
 * @param {string} destination - Webhook destination type
 * @param {Object} result - Delivery result
 * @param {Object} payload - Original payload
 */
function logDelivery(destination, result, payload) {
  deliveryLog.total++;
  
  if (result.success) {
    deliveryLog.successful++;
    console.log(`✅ Webhook delivered to ${destination} (${result.attempts} attempt${result.attempts > 1 ? 's' : ''})`);
  } else {
    deliveryLog.failed++;
    console.error(`❌ Webhook delivery to ${destination} failed after ${result.attempts} attempts: ${result.error}`);
  }
  
  // Keep last 100 deliveries
  deliveryLog.recentDeliveries.unshift({
    timestamp: new Date().toISOString(),
    destination,
    eventType: payload.event,
    eventId: payload.id,
    success: result.success,
    attempts: result.attempts,
    error: result.error || null,
  });
  
  if (deliveryLog.recentDeliveries.length > 100) {
    deliveryLog.recentDeliveries.pop();
  }
}

/**
 * Send payment notification to custom webhook URL
 * 
 * @param {Object} payload - Event payload
 * @returns {Promise<{success: boolean}>}
 */
async function sendCustomWebhook(payload) {
  if (!WEBHOOK_URL) return { success: false, error: 'Not configured' };
  
  const result = await sendWithRetry(WEBHOOK_URL, payload);
  logDelivery('custom', result, payload);
  return result;
}

/**
 * Send payment notification to Discord webhook
 * 
 * @param {Object} payload - Event payload
 * @returns {Promise<{success: boolean}>}
 */
async function sendDiscordNotification(payload) {
  if (!DISCORD_WEBHOOK) return { success: false, error: 'Not configured' };
  
  const data = payload.data;
  const isTestnet = data.network?.includes('84532') || data.networkName?.includes('Testnet');
  
  // Color coding by event type and network
  const colors = {
    [PAYMENT_EVENTS.RECEIVED]: isTestnet ? 0x3498db : 0x00ff00, // Blue for testnet, Green for mainnet
    [PAYMENT_EVENTS.SETTLED]: 0x2ecc71,   // Emerald
    [PAYMENT_EVENTS.FAILED]: 0xe74c3c,    // Red
    [PAYMENT_EVENTS.VERIFICATION_FAILED]: 0xe67e22, // Orange
  };
  
  const titles = {
    [PAYMENT_EVENTS.RECEIVED]: '💰 Payment Received',
    [PAYMENT_EVENTS.SETTLED]: '✅ Payment Settled',
    [PAYMENT_EVENTS.FAILED]: '❌ Payment Failed',
    [PAYMENT_EVENTS.VERIFICATION_FAILED]: '⚠️ Verification Failed',
  };
  
  const embed = {
    title: titles[payload.event] || '💰 Payment Event',
    color: colors[payload.event] || 0x7289da,
    fields: [
      { name: '💵 Amount', value: data.amount || 'N/A', inline: true },
      { name: '⚙️ Operation', value: data.operation || 'N/A', inline: true },
      { name: '🌐 Network', value: data.networkName || data.network || 'N/A', inline: true },
    ],
    timestamp: payload.timestamp,
    footer: {
      text: `XActions x402 • ${payload.source.environment}`,
    },
  };
  
  // Add payer address
  if (data.payerShort) {
    embed.fields.push({
      name: '👤 Payer',
      value: `\`${data.payerShort}\``,
      inline: true,
    });
  }
  
  // Add transaction hash with link
  if (data.transactionHash) {
    const explorerUrl = getExplorerUrl(data.network, data.transactionHash);
    embed.fields.push({
      name: '🔗 Transaction',
      value: explorerUrl 
        ? `[View on Explorer](${explorerUrl})`
        : `\`${data.transactionHash.slice(0, 16)}...\``,
      inline: true,
    });
  }
  
  // Testnet warning
  if (isTestnet) {
    embed.fields.push({
      name: '⚠️ Note',
      value: 'This is a TESTNET transaction',
      inline: false,
    });
  }
  
  const discordPayload = { 
    embeds: [embed],
    username: 'XActions Payments',
  };
  
  const result = await sendWithRetry(DISCORD_WEBHOOK, discordPayload);
  logDelivery('discord', result, payload);
  return result;
}

/**
 * Send payment notification to Slack webhook
 * 
 * @param {Object} payload - Event payload
 * @returns {Promise<{success: boolean}>}
 */
async function sendSlackNotification(payload) {
  if (!SLACK_WEBHOOK) return { success: false, error: 'Not configured' };
  
  const data = payload.data;
  const isTestnet = data.network?.includes('84532');
  
  const icons = {
    [PAYMENT_EVENTS.RECEIVED]: '💰',
    [PAYMENT_EVENTS.SETTLED]: '✅',
    [PAYMENT_EVENTS.FAILED]: '❌',
    [PAYMENT_EVENTS.VERIFICATION_FAILED]: '⚠️',
  };
  
  const colors = {
    [PAYMENT_EVENTS.RECEIVED]: isTestnet ? '#3498db' : '#00ff00',
    [PAYMENT_EVENTS.SETTLED]: '#2ecc71',
    [PAYMENT_EVENTS.FAILED]: '#e74c3c',
    [PAYMENT_EVENTS.VERIFICATION_FAILED]: '#e67e22',
  };
  
  const slackPayload = {
    attachments: [{
      color: colors[payload.event] || '#7289da',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${icons[payload.event] || '💰'} Payment ${payload.event.split('.')[1]}`,
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Amount:*\n${data.amount}` },
            { type: 'mrkdwn', text: `*Operation:*\n${data.operation}` },
            { type: 'mrkdwn', text: `*Network:*\n${data.networkName}` },
            { type: 'mrkdwn', text: `*Payer:*\n\`${data.payerShort || 'N/A'}\`` },
          ],
        },
      ],
    }],
  };
  
  // Add transaction link if available
  if (data.transactionHash) {
    const explorerUrl = getExplorerUrl(data.network, data.transactionHash);
    slackPayload.attachments[0].blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: explorerUrl 
          ? `<${explorerUrl}|View Transaction on Explorer>`
          : `Transaction: \`${data.transactionHash.slice(0, 20)}...\``,
      },
    });
  }
  
  // Add testnet warning
  if (isTestnet) {
    slackPayload.attachments[0].blocks.push({
      type: 'context',
      elements: [{
        type: 'mrkdwn',
        text: '⚠️ This is a TESTNET transaction',
      }],
    });
  }
  
  const result = await sendWithRetry(SLACK_WEBHOOK, slackPayload);
  logDelivery('slack', result, payload);
  return result;
}

/**
 * Get block explorer URL for a transaction
 * 
 * @param {string} network - Network ID
 * @param {string} txHash - Transaction hash
 * @returns {string|null} Explorer URL or null
 */
function getExplorerUrl(network, txHash) {
  if (!txHash) return null;
  
  const explorers = {
    'eip155:8453': `https://basescan.org/tx/${txHash}`,
    'eip155:84532': `https://sepolia.basescan.org/tx/${txHash}`,
    'eip155:1': `https://etherscan.io/tx/${txHash}`,
    'eip155:42161': `https://arbiscan.io/tx/${txHash}`,
  };
  
  return explorers[network] || null;
}

/**
 * Notify all configured endpoints about a payment event
 * 
 * @param {Object} payment - Payment details
 * @param {string} payment.price - Amount paid
 * @param {string} payment.operation - Operation that was paid for
 * @param {string} payment.payerAddress - Address that paid
 * @param {string} payment.network - Blockchain network used
 * @param {string} [payment.transactionHash] - Transaction hash if available
 * @param {string} [eventType] - Event type (defaults to RECEIVED)
 */
export async function notifyPaymentReceived(payment, eventType = PAYMENT_EVENTS.RECEIVED) {
  // Skip if no webhooks configured
  if (!hasWebhooksConfigured()) {
    return { skipped: true, reason: 'No webhooks configured' };
  }
  
  const payload = createEventPayload(eventType, payment);
  
  // Send to all configured destinations in parallel
  const results = await Promise.allSettled([
    sendCustomWebhook(payload),
    sendDiscordNotification(payload),
    sendSlackNotification(payload),
  ]);
  
  const summary = {
    eventId: payload.id,
    eventType,
    destinations: {
      custom: results[0].status === 'fulfilled' ? results[0].value : { success: false, error: results[0].reason?.message },
      discord: results[1].status === 'fulfilled' ? results[1].value : { success: false, error: results[1].reason?.message },
      slack: results[2].status === 'fulfilled' ? results[2].value : { success: false, error: results[2].reason?.message },
    },
    anySuccessful: results.some(r => r.status === 'fulfilled' && r.value?.success),
  };
  
  return summary;
}

/**
 * Notify about a failed payment (verification or settlement failure)
 * 
 * @param {Object} payment - Payment details
 * @param {string} reason - Failure reason
 */
export async function notifyPaymentFailed(payment, reason) {
  return notifyPaymentReceived(
    { ...payment, metadata: { failureReason: reason } },
    PAYMENT_EVENTS.FAILED
  );
}

/**
 * Notify about a successfully settled payment
 * 
 * @param {Object} payment - Payment details
 * @param {string} settlementId - Settlement transaction ID
 */
export async function notifyPaymentSettled(payment, settlementId) {
  return notifyPaymentReceived(
    { ...payment, settlementId },
    PAYMENT_EVENTS.SETTLED
  );
}

/**
 * Check if any webhook notifications are configured
 * 
 * @returns {boolean} True if at least one webhook is configured
 */
export function hasWebhooksConfigured() {
  return !!(WEBHOOK_URL || DISCORD_WEBHOOK || SLACK_WEBHOOK);
}

/**
 * Get webhook configuration status (for health checks)
 * 
 * @returns {Object} Configuration and delivery statistics
 */
export function getWebhookStatus() {
  return {
    configured: {
      customWebhook: !!WEBHOOK_URL,
      discord: !!DISCORD_WEBHOOK,
      slack: !!SLACK_WEBHOOK,
      signatureEnabled: !!WEBHOOK_SECRET,
    },
    delivery: {
      total: deliveryLog.total,
      successful: deliveryLog.successful,
      failed: deliveryLog.failed,
      retried: deliveryLog.retried,
      successRate: deliveryLog.total > 0 
        ? ((deliveryLog.successful / deliveryLog.total) * 100).toFixed(1) + '%'
        : 'N/A',
    },
    recentDeliveries: deliveryLog.recentDeliveries.slice(0, 10),
  };
}

/**
 * Test webhook connectivity
 * Sends a test event to all configured webhooks
 * 
 * @returns {Promise<Object>} Test results for each destination
 */
export async function testWebhooks() {
  const testPayment = {
    price: '$0.00',
    operation: 'test:webhook',
    payerAddress: '0x0000000000000000000000000000000000000000',
    network: process.env.X402_NETWORK || 'eip155:84532',
    transactionHash: '0x' + '0'.repeat(64),
    metadata: { test: true },
  };
  
  const payload = createEventPayload('test.webhook', testPayment);
  
  const results = {
    timestamp: new Date().toISOString(),
    eventId: payload.id,
    destinations: {},
  };
  
  if (WEBHOOK_URL) {
    results.destinations.custom = await sendWithRetry(WEBHOOK_URL, payload);
  }
  
  if (DISCORD_WEBHOOK) {
    // Send a test message to Discord
    const testEmbed = {
      title: '🧪 Webhook Test',
      description: 'This is a test notification from XActions payment webhook system.',
      color: 0x7289da,
      timestamp: new Date().toISOString(),
      footer: { text: 'XActions Webhook Test' },
    };
    results.destinations.discord = await sendWithRetry(DISCORD_WEBHOOK, { embeds: [testEmbed] });
  }
  
  if (SLACK_WEBHOOK) {
    const testSlack = {
      text: '🧪 *Webhook Test*\nThis is a test notification from XActions payment webhook system.',
    };
    results.destinations.slack = await sendWithRetry(SLACK_WEBHOOK, testSlack);
  }
  
  return results;
}

export default { 
  notifyPaymentReceived, 
  notifyPaymentFailed,
  notifyPaymentSettled,
  hasWebhooksConfigured,
  getWebhookStatus,
  testWebhooks,
  PAYMENT_EVENTS,
};
