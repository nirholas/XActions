/**
 * x402 Payment Middleware for AI Agent Endpoints
 * 
 * This middleware protects AI-specific endpoints with x402 payments.
 * Human-facing routes remain free (browser scripts, dashboard, etc.)
 * 
 * Flow:
 * 1. AI agent calls /api/ai/* endpoint
 * 2. No payment header → 402 Payment Required with requirements
 * 3. Agent signs USDC payment, retries with X-PAYMENT header
 * 4. Middleware verifies via facilitator, executes if valid
 * 5. Settlement occurs, response includes PAYMENT-RESPONSE header
 */

import { 
  PAY_TO_ADDRESS, 
  FACILITATOR_URL, 
  NETWORK,
  AI_OPERATION_PRICES,
  getOperationName,
  SUPPORTED_NETWORKS,
  getAcceptedNetworks,
  getNetworkConfig,
  ensureConfigValidated,
  isX402Configured
} from '../config/x402-config.js';
import { recordPayment } from '../services/payment-stats.js';
import { 
  notifyPaymentReceived, 
  notifyPaymentFailed,
  notifyPaymentSettled,
  PAYMENT_EVENTS 
} from '../services/payment-webhooks.js';

// Facilitator client for payment verification and settlement
let facilitatorClient = null;
let resourceServer = null;
let x402Available = null; // null = unknown, true/false after first check
let configChecked = false; // Track if config has been validated

/**
 * Initialize x402 components lazily (only when first AI request comes in)
 */
async function initializeX402() {
  if (resourceServer) return resourceServer;
  if (x402Available === false) return null;
  
  // Validate configuration on first initialization
  if (!configChecked) {
    configChecked = true;
    const configured = ensureConfigValidated();
    
    if (!configured) {
      console.log('❌ x402: Payment address not configured - x402 payments disabled');
      console.log('   Set X402_PAY_TO_ADDRESS environment variable to enable payments');
      x402Available = false;
      return null;
    }
    
    console.log('🔧 x402: Initializing payment middleware...');
    console.log(`   💰 Payment address: ${PAY_TO_ADDRESS}`);
    console.log(`   🌐 Network: ${NETWORK === 'eip155:8453' ? 'Base Mainnet' : 'Base Sepolia Testnet'} (${NETWORK})`);
    console.log(`   🔗 Facilitator: ${FACILITATOR_URL}`);
  }
  
  try {
    // Dynamic imports to avoid breaking if packages not installed
    const { x402ResourceServer, HTTPFacilitatorClient } = await import('@x402/core/server');
    const { ExactEvmScheme } = await import('@x402/evm/exact/server');
    
    facilitatorClient = new HTTPFacilitatorClient({
      url: FACILITATOR_URL,
    });
    
    resourceServer = new x402ResourceServer(facilitatorClient)
      .register(NETWORK, new ExactEvmScheme());
    
    // Initialize (sync with facilitator)
    await resourceServer.initialize();
    
    x402Available = true;
    console.log('✅ x402 payment middleware ready');
    
    return resourceServer;
  } catch (error) {
    x402Available = false;
    console.error('❌ x402 initialization failed:', error.message);
    console.log('   To enable x402 payments, run: npm install @x402/core @x402/evm @x402/express');
    return null;
  }
}

/**
 * Check if a route requires payment and get its price
 */
function getOperationPrice(path, method) {
  // Only POST/GET to /api/ai/* require payment
  if (!path.startsWith('/api/ai/')) return null;
  
  // Extract operation from path: /api/ai/scrape/profile → scrape:profile
  const match = path.match(/^\/api\/ai\/([^/]+)\/([^/?]+)/);
  if (!match) return null;
  
  const operation = `${match[1]}:${match[2]}`;
  return AI_OPERATION_PRICES[operation] || null;
}

/**
 * Extract operation from path
 */
function getOperation(path) {
  const match = path.match(/^\/api\/ai\/([^/]+)\/([^/?]+)/);
  if (!match) return null;
  return `${match[1]}:${match[2]}`;
}

/**
 * Build payment requirements for 402 response
 * Returns multiple network options for payers to choose from
 */
function buildPaymentRequirements(price, resourceUrl, description) {
  const includeTestnet = process.env.NODE_ENV !== 'production';
  const networks = getAcceptedNetworks(includeTestnet);
  
  return {
    x402Version: 2,
    accepts: networks.map(net => ({
      scheme: 'exact',
      network: net.network,
      maxAmountRequired: price,
      payTo: PAY_TO_ADDRESS,
      asset: net.usdc,
      description,
      mimeType: 'application/json',
      maxTimeoutSeconds: 300,
      extra: {
        networkName: net.name,
        gasCost: net.gasCost,
        recommended: net.recommended || false,
        testnet: net.testnet || false,
        service: 'XActions AI API',
        docs: 'https://xactions.app/docs/ai-api',
      }
    })),
    resource: resourceUrl
  };
}

/**
 * Build single network payment requirement (for verification)
 * @deprecated Use buildPaymentRequirements for 402 responses
 */
function buildSingleNetworkRequirement(price, resourceUrl, description, networkId) {
  const netConfig = getNetworkConfig(networkId) || SUPPORTED_NETWORKS[NETWORK];
  return {
    scheme: 'exact',
    network: networkId || NETWORK,
    maxAmountRequired: price,
    resource: resourceUrl,
    description,
    mimeType: 'application/json',
    payTo: PAY_TO_ADDRESS,
    asset: netConfig?.usdc,
    maxTimeoutSeconds: 300,
    extra: {
      service: 'XActions AI API',
      docs: 'https://xactions.app/docs/ai-api',
    },
  };
}

/**
 * x402 Payment Middleware
 * 
 * Protects /api/ai/* routes with cryptocurrency payments.
 */
export async function x402Middleware(req, res, next) {
  // Only protect AI endpoints
  if (!req.path.startsWith('/api/ai/')) {
    return next();
  }
  
  // Health check endpoint is free
  if (req.path === '/api/ai/health') {
    return next();
  }
  
  const operation = getOperation(req.path);
  const price = getOperationPrice(req.path, req.method);
  
  if (!price) {
    // Unknown route - let it 404 naturally or proceed
    return next();
  }
  
  const resourceUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const operationName = getOperationName(operation);
  const description = `XActions AI: ${operationName}`;
  
  // Check for payment header (X-PAYMENT or PAYMENT-SIGNATURE)
  const paymentHeader = req.headers['x-payment'] || req.headers['payment-signature'];
  
  if (!paymentHeader) {
    // No payment - return 402 with requirements (multiple networks)
    const requirements = buildPaymentRequirements(price, resourceUrl, description);
    
    // Encode as base64 for PAYMENT-REQUIRED header
    const encodedRequirements = Buffer.from(JSON.stringify(requirements)).toString('base64');
    
    // Get network summary for response body
    const includeTestnet = process.env.NODE_ENV !== 'production';
    const networks = getAcceptedNetworks(includeTestnet);
    const recommendedNetwork = networks.find(n => n.recommended) || networks[0];
    
    res.status(402);
    res.set('PAYMENT-REQUIRED', encodedRequirements);
    res.set('Content-Type', 'application/json');
    res.set('X-XActions-Operation', operation);
    
    return res.json({
      error: 'Payment Required',
      message: 'This endpoint requires payment. AI agents must include X-PAYMENT header.',
      operation,
      operationName,
      price,
      payTo: PAY_TO_ADDRESS,
      networks: {
        supported: networks.map(n => ({
          network: n.network,
          name: n.name,
          usdc: n.usdc,
          gasCost: n.gasCost,
          recommended: n.recommended || false,
          testnet: n.testnet || false
        })),
        recommended: recommendedNetwork?.network,
        recommendedName: recommendedNetwork?.name
      },
      humanAlternative: 'Use free browser scripts at https://xactions.app/run.html',
      docs: 'https://xactions.app/docs/ai-api',
      x402: {
        version: 2,
        facilitator: FACILITATOR_URL,
        accepts: requirements.accepts
      },
    });
  }
  
  // Payment provided - verify with facilitator
  try {
    const server = await initializeX402();
    if (!server) {
      // x402 not available - allow request (graceful degradation for development)
      console.warn(`⚠️ x402 not initialized, allowing request to ${req.path} without payment`);
      req.x402 = { skipped: true, reason: 'x402_not_available' };
      return next();
    }
    
    // Decode payment payload
    let paymentPayload;
    try {
      paymentPayload = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf-8'));
    } catch (e) {
      return res.status(400).json({
        error: 'Invalid payment header',
        message: 'X-PAYMENT header must be base64-encoded JSON',
      });
    }
    
    // Determine which network the payment was made on
    const paymentNetwork = paymentPayload.network || paymentPayload.payload?.network || NETWORK;
    
    // Build requirements for verification using the specific network used for payment
    const requirements = buildSingleNetworkRequirement(price, resourceUrl, description, paymentNetwork);
    
    // Verify payment with facilitator
    const verifyResult = await server.verifyPayment(paymentPayload, requirements);
    
    if (!verifyResult.isValid) {
      // Notify about verification failure (non-blocking)
      notifyPaymentFailed({
        price,
        operation,
        payerAddress: paymentPayload?.payer || 'unknown',
        network: paymentNetwork,
      }, verifyResult.invalidReason || 'Verification failed').catch(() => {});
      
      return res.status(402).json({
        error: 'Payment verification failed',
        reason: verifyResult.invalidReason,
        message: 'Please ensure sufficient USDC balance and try again',
        price,
        network: NETWORK,
      });
    }
    
    // Store payment info for settlement after response
    req.x402 = {
      paymentPayload,
      requirements,
      server,
      price,
      operation,
      verified: true,
    };
    
    // Execute the route handler and settle payment after
    const originalSend = res.send.bind(res);
    res.send = async function(body) {
      // Settle payment after successful response
      if (res.statusCode >= 200 && res.statusCode < 300 && req.x402?.verified) {
        try {
          const settleResult = await req.x402.server.settlePayment(
            req.x402.paymentPayload,
            req.x402.requirements
          );
          
          if (settleResult.success) {
            const settlementHeader = Buffer.from(JSON.stringify(settleResult)).toString('base64');
            res.set('PAYMENT-RESPONSE', settlementHeader);
            res.set('X-Payment-Settled', 'true');
            
            // Audit log for payment tracking
            const auditLog = {
              timestamp: new Date().toISOString(),
              operation: req.x402.operation,
              price: req.x402.price,
              network: NETWORK,
              payTo: PAY_TO_ADDRESS,
              settled: true,
              txHash: settleResult.transactionHash || null,
            };
            console.log(`💰 x402: Settled ${req.x402.price} for ${req.x402.operation}`);
            console.log(`   📝 Audit: ${JSON.stringify(auditLog)}`);
            
            // Emit payment event for webhooks/monitoring
            if (global.io) {
              global.io.emit('x402:payment', auditLog);
            }
            
            // Record payment for analytics
            recordPayment({
              operation: req.x402.operation,
              price: req.x402.price,
              network: NETWORK,
              paymentId: settleResult.transactionHash || settleResult.id,
              payerAddress: req.x402.paymentPayload?.payer || 'unknown',
            });
            
            // Send webhook notification (non-blocking)
            notifyPaymentSettled({
              price: req.x402.price,
              operation: req.x402.operation,
              payerAddress: req.x402.paymentPayload?.payer || 'unknown',
              network: NETWORK,
              transactionHash: settleResult.transactionHash || null,
            }, settleResult.transactionHash || settleResult.id).catch(() => {}); // Silently catch - don't block response
          } else {
            // Settlement failed but payment was verified - log for manual review
            const failedSettlement = {
              timestamp: new Date().toISOString(),
              operation: req.x402.operation,
              price: req.x402.price,
              network: NETWORK,
              payTo: PAY_TO_ADDRESS,
              settled: false,
              reason: settleResult.error || 'Settlement returned non-success',
            };
            console.error(`🚨 x402: Settlement FAILED for ${req.x402.operation}`);
            console.error(`   📝 Failed settlement: ${JSON.stringify(failedSettlement)}`);
            
            // Notify about settlement failure (non-blocking)
            notifyPaymentFailed({
              price: req.x402.price,
              operation: req.x402.operation,
              payerAddress: req.x402.paymentPayload?.payer || 'unknown',
              network: NETWORK,
            }, settleResult.error || 'Settlement returned non-success').catch(() => {});
          }
        } catch (err) {
          // Settlement error - payment was verified but settlement threw
          const settlementError = {
            timestamp: new Date().toISOString(),
            operation: req.x402.operation,
            price: req.x402.price,
            network: NETWORK,
            error: err.message,
          };
          console.error(`🚨 x402: Settlement ERROR for ${req.x402.operation}: ${err.message}`);
          console.error(`   📝 Error details: ${JSON.stringify(settlementError)}`);
          
          // Notify about settlement error (non-blocking)
          notifyPaymentFailed({
            price: req.x402.price,
            operation: req.x402.operation,
            payerAddress: req.x402.paymentPayload?.payer || 'unknown',
            network: NETWORK,
          }, `Settlement exception: ${err.message}`).catch(() => {});
          
          // Don't fail the request - payment was verified, settlement can be retried
        }
      }
      
      return originalSend(body);
    };
    
    next();
  } catch (error) {
    console.error('x402 verification error:', error);
    return res.status(402).json({
      error: 'Payment processing failed',
      message: error.message,
      hint: 'Ensure your payment is signed correctly and has sufficient funds',
    });
  }
}

/**
 * x402 Health Check
 * Returns payment configuration without requiring payment
 */
export function x402HealthCheck(req, res) {
  const configured = isX402Configured();
  const includeTestnet = process.env.NODE_ENV !== 'production';
  const networks = getAcceptedNetworks(includeTestnet);
  const recommendedNetwork = networks.find(n => n.recommended) || networks[0];
  
  res.json({
    service: 'XActions AI API',
    status: configured ? 'operational' : 'degraded',
    timestamp: new Date().toISOString(),
    x402: {
      enabled: configured,
      available: x402Available !== false && configured,
      configured,
      version: 2,
      facilitator: FACILITATOR_URL,
      payTo: configured ? PAY_TO_ADDRESS : null,
      configurationRequired: !configured ? 'Set X402_PAY_TO_ADDRESS environment variable' : null,
      networks: {
        supported: networks.map(n => ({
          network: n.network,
          name: n.name,
          usdc: n.usdc,
          gasCost: n.gasCost,
          recommended: n.recommended || false,
          testnet: n.testnet || false
        })),
        recommended: recommendedNetwork?.network,
        recommendedName: recommendedNetwork?.name,
        defaultNetwork: NETWORK
      }
    },
    pricing: AI_OPERATION_PRICES,
    endpoints: Object.keys(AI_OPERATION_PRICES).map(op => {
      const [category, action] = op.split(':');
      return {
        operation: op,
        name: getOperationName(op),
        path: `/api/ai/${category}/${action}`,
        price: AI_OPERATION_PRICES[op],
        available: configured,
      };
    }),
    docs: 'https://xactions.app/docs/ai-api',
    humanAccess: {
      message: 'Humans can use free browser scripts',
      url: 'https://xactions.app/run.html',
    },
  });
}

/**
 * Pricing endpoint - returns just the pricing info
 */
export function x402Pricing(req, res) {
  const includeTestnet = process.env.NODE_ENV !== 'production';
  const networks = getAcceptedNetworks(includeTestnet);
  const recommendedNetwork = networks.find(n => n.recommended) || networks[0];
  
  res.json({
    currency: 'USDC',
    networks: networks.map(n => ({
      network: n.network,
      name: n.name,
      usdc: n.usdc,
      gasCost: n.gasCost,
      recommended: n.recommended || false
    })),
    recommendedNetwork: recommendedNetwork?.network,
    pricing: AI_OPERATION_PRICES,
    note: 'Prices are in USD, paid in USDC. Multiple networks supported - Base recommended for low gas fees.',
  });
}

export default x402Middleware;
