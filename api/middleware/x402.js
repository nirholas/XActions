// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * x402 Payment Middleware for AI Agent Endpoints
 *
 * Uses the official @x402/express SDK for protocol-compliant payment handling.
 * XActions-specific hooks handle analytics, webhooks, and audit logging.
 *
 * Flow:
 * 1. AI agent calls /api/ai/* endpoint
 * 2. No payment header → 402 Payment Required with requirements
 * 3. Agent signs USDC payment, retries with X-PAYMENT header
 * 4. SDK verifies via facilitator, executes if valid
 * 5. Settlement occurs, response includes payment headers
 *
 * @see https://x402.org
 * @author nichxbt
 */

import { paymentGatePath } from '../utils/paymentGatePath.js';
import {
  PAY_TO_ADDRESS,
  PAY_TO_ADDRESS_SOLANA,
  FACILITATOR_URL,
  NETWORK,
  SOLANA_NETWORK,
  isEvmPayToConfigured,
  AI_OPERATION_PRICES,
  SCRIPT_PRICES,
  SCRIPT_RUN_PRICE,
  getOperationName,
  pathForOperation,
  operationForPath,
  getAcceptedNetworks,
  ensureConfigValidated,
  isX402Configured,
} from '../config/x402-config.js';
import { recordPayment } from '../services/payment-stats.js';
import { notifyPaymentSettled, notifyPaymentFailed } from '../services/payment-webhooks.js';

// Lazy-loaded x402 middleware instance
let _middleware = null;
let _initPromise = null;
let _initFailed = false;
let _initFailedAt = 0;

/** How long a failed initialization is remembered before it is retried. */
const INIT_RETRY_MS = 60_000;

/**
 * Build a single route entry in the shape @x402/core v2 expects.
 *
 * v2 moved the payment terms behind an `accepts` key. The flat
 * `{ price, network, payTo }` shape from v1 makes the SDK's
 * `normalizePaymentOptions()` return `[undefined]`, and
 * `validateRouteConfiguration()` then throws while reading
 * `option.network` — which surfaced as a 500 on every single
 * /api/ai/* request instead of the intended 402.
 *
 * Only the configured NETWORK is listed. `initialize()` throws a
 * RouteConfigurationError if any advertised network lacks a registered
 * scheme or facilitator support, so advertising the full
 * getAcceptedNetworks() list here would take the whole API down the
 * moment one facilitator dropped a chain.
 *
 * @param {string} price - Human price string, e.g. "$0.01"
 * @param {string} description - Shown in the 402 payment requirements
 * @returns {object} Route config for paymentMiddleware()
 */
function paidRoute(price, description) {
  return {
    accepts: {
      scheme: 'exact',
      price,
      network: NETWORK,
      payTo: PAY_TO_ADDRESS,
    },
    description,
  };
}

/**
 * Can this process actually take a payment on the chain it advertises?
 *
 * The EVM scheme is the only one registered here, so the answer is "only with
 * an EVM receiving address". An operator who set X402_PAY_TO_ADDRESS_SOLANA and
 * nothing else passes `isX402Configured()` (Solana alone is a valid setup for
 * the edge deployment, which does offer Solana) and used to reach `paidRoute()`
 * with an empty string for `payTo`. That publishes Base terms payable to
 * nobody: every caller signs a transfer to "" and the payment fails, or worse
 * is aimed at an address the operator does not own. Refusing to start is the
 * only honest answer.
 *
 * @returns {boolean}
 */
function canServeConfiguredNetwork() {
  return isEvmPayToConfigured();
}

/**
 * Build route configuration for the official x402 middleware.
 * Maps each AI operation to its price, network, and payTo address.
 */
function buildRouteConfig() {
  const routes = {};

  for (const [operation, price] of Object.entries(AI_OPERATION_PRICES)) {
    // The whole operation key is the path. Reading only the first two segments
    // here meant a three-segment route could never be protected: its price
    // built a path that did not exist, and the real path matched no route and
    // was served free.
    routes[`POST ${pathForOperation(operation)}`] = paidRoute(price, `XActions ${operation}`);
  }

  // Script download routes
  for (const [scriptPath, price] of Object.entries(SCRIPT_PRICES)) {
    routes[`GET /api/scripts/${scriptPath}`] = paidRoute(
      price,
      `Download the ${scriptPath} browser script`,
    );
  }

  // Script run route — single endpoint, priced higher than download
  routes['POST /api/scripts/run'] = paidRoute(
    SCRIPT_RUN_PRICE,
    'Run a browser script server-side and return its result',
  );

  return routes;
}

/**
 * Initialize the official @x402/express middleware with hooks for
 * XActions analytics, webhooks, and audit logging.
 */
async function initializeMiddleware() {
  if (!canServeConfiguredNetwork()) {
    throw new Error(
      `x402 cannot serve ${NETWORK}: X402_PAY_TO_ADDRESS is not a valid EVM address` +
      (PAY_TO_ADDRESS_SOLANA
        ? `. X402_PAY_TO_ADDRESS_SOLANA is set, but this Express middleware only registers the EVM "exact" scheme, ` +
          `so it cannot take payment on ${SOLANA_NETWORK}. Set an EVM address too, or serve the paid endpoints from ` +
          'the edge deployment (functions/, src/edge/x402.js), which does offer Solana.'
        : '. Set X402_PAY_TO_ADDRESS to the wallet that should receive USDC.')
    );
  }

  const { paymentMiddleware } = await import('@x402/express');
  const { x402ResourceServer, HTTPFacilitatorClient } = await import('@x402/core/server');
  const { ExactEvmScheme } = await import('@x402/evm/exact/server');

  // Create facilitator client
  const facilitator = new HTTPFacilitatorClient(FACILITATOR_URL);

  // Create resource server and register the EVM scheme for the configured network
  const server = new x402ResourceServer(facilitator);
  const includeTestnet = process.env.NODE_ENV !== 'production';
  const networksToRegister = new Set([
    NETWORK,
    ...getAcceptedNetworks(includeTestnet).map((n) => n.network)
  ]);

  for (const networkId of networksToRegister) {
    // ExactEvmScheme speaks EIP-712 and signs an EVM transferWithAuthorization.
    // Registering it against a Solana CAIP-2 id inside a try/catch does not add
    // Solana support; it either throws and is swallowed, or succeeds and leaves
    // a scheme that would mis-verify a Solana payload. Solana is served by the
    // edge deployment instead (src/edge/x402.js).
    if (!networkId.startsWith('eip155:')) continue;
    try {
      server.register(networkId, new ExactEvmScheme());
    } catch {
      // Already registered, or the SDK does not know this chain: neither is
      // fatal, because only NETWORK is ever advertised in a route.
    }
  }

  // Hook: after successful settlement — record analytics and send webhooks
  server.onAfterSettle(async (context) => {
    const { paymentPayload, requirements, result } = context;
    const operation = extractOperation(requirements);
    const price = requirements?.maxAmountRequired || requirements?.price || 'unknown';
    const txHash = result?.transaction || result?.transactionHash || null;

    const auditLog = {
      timestamp: new Date().toISOString(),
      operation,
      price,
      network: requirements?.network || NETWORK,
      payTo: PAY_TO_ADDRESS,
      settled: true,
      txHash,
    };

    console.log(`💰 x402: Settled ${price} for ${operation}`);
    if (process.env.X402_DEBUG === 'true') {
      console.log(`   📝 Audit: ${JSON.stringify(auditLog)}`);
    }

    // Emit realtime event to the admin dashboard only (it once went to every
    // socket, anonymous agent sockets included)
    if (global.io) {
      global.io.to('admins').emit('x402:payment', auditLog);
    }

    // Record for analytics
    recordPayment({
      operation,
      price,
      network: requirements?.network || NETWORK,
      paymentId: txHash,
      payerAddress: paymentPayload?.payload?.authorization?.from || 'unknown',
    });

    // Send webhook (non-blocking)
    notifyPaymentSettled({
      price,
      operation,
      payerAddress: paymentPayload?.payload?.authorization?.from || 'unknown',
      network: requirements?.network || NETWORK,
      transactionHash: txHash,
    }, txHash).catch(() => {});
  });

  // Hook: settlement failure — log and notify
  server.onSettleFailure(async (context) => {
    const { paymentPayload, requirements, error } = context;
    const operation = extractOperation(requirements);
    const price = requirements?.maxAmountRequired || requirements?.price || 'unknown';

    console.error(`🚨 x402: Settlement FAILED for ${operation}: ${error?.message || error}`);

    notifyPaymentFailed({
      price,
      operation,
      payerAddress: paymentPayload?.payload?.authorization?.from || 'unknown',
      network: requirements?.network || NETWORK,
    }, error?.message || 'Settlement failed').catch(() => {});
  });

  // Hook: verification failure — log for monitoring
  server.onVerifyFailure(async (context) => {
    const { paymentPayload, requirements, error } = context;
    const operation = extractOperation(requirements);

    console.warn(`⚠️  x402: Verification failed for ${operation}: ${error?.message || error}`);

    notifyPaymentFailed({
      price: requirements?.maxAmountRequired || 'unknown',
      operation,
      payerAddress: paymentPayload?.payload?.authorization?.from || 'unknown',
      network: requirements?.network || NETWORK,
    }, `Verification failed: ${error?.message || error}`).catch(() => {});
  });

  // Build routes and create the official middleware
  const routes = buildRouteConfig();

  console.log(`✅ x402 payment middleware ready`);
  console.log(`   💰 Pay to: ${PAY_TO_ADDRESS}`);
  console.log(`   🌐 Network: ${NETWORK === 'eip155:8453' ? 'Base Mainnet' : 'Base Sepolia Testnet'} (${NETWORK})`);
  console.log(`   🔗 Facilitator: ${FACILITATOR_URL}`);
  console.log(`   📋 Protected operations: ${Object.keys(routes).length}`);

  return paymentMiddleware(routes, server);
}

/**
 * Extract operation name from payment requirements
 */
function extractOperation(requirements) {
  if (!requirements?.resource) return 'unknown';
  const aiPath = requirements.resource.match(/(\/api\/ai\/[^?]+)/);
  const operation = aiPath ? operationForPath(aiPath[1]) : null;
  if (operation) return operation;
  if (requirements.resource.endsWith('/api/scripts/run')) return 'script:run';
  const scriptMatch = requirements.resource.match(/\/api\/scripts\/((?:automation|src)\/[^/?]+)/);
  if (scriptMatch) return `script:download:${scriptMatch[1]}`;
  return 'unknown';
}

/**
 * x402 Payment Middleware
 *
 * Lazy-initializes the official @x402/express middleware on first request.
 * Falls through gracefully if x402 is not configured (development mode).
 */
export async function x402Middleware(req, res, next) {
  const gatePath = paymentGatePath(req.path);
  const isAiPath = gatePath.startsWith('/api/ai/');
  const isScriptsPath = gatePath.startsWith('/api/scripts/');

  if (!isAiPath && !isScriptsPath) {
    return next();
  }

  // Free endpoints: AI health/pricing + scripts listing + session validation
  if (
    gatePath === '/api/ai/health' ||
    gatePath === '/api/ai/pricing' ||
    gatePath === '/api/ai/action/validate-session'
  ) {
    return next();
  }

  // Check if x402 is configured
  if (!ensureConfigValidated()) {
    // Not configured. Outside production this serves the paid surface free,
    // which is what a developer wants locally and a disaster in a container
    // that simply forgot to set NODE_ENV, so say so on every request rather
    // than only in the log nobody reads at boot.
    if (process.env.NODE_ENV !== 'production') {
      res.setHeader('X-Payment-Bypassed', 'x402-not-configured; NODE_ENV is not production');
      return next();
    }
    return res.status(500).json({ error: 'Payment system not configured', hint: 'Set X402_PAY_TO_ADDRESS to a 0x wallet address on the server' });
  }

  // Lazy-initialize middleware. A failure is remembered only for
  // INIT_RETRY_MS: the usual cause is the facilitator being briefly
  // unreachable, and a paid API that stays 503 until someone restarts the
  // process turns a thirty-second blip into an outage.
  if (!_middleware && _initFailed && Date.now() - _initFailedAt > INIT_RETRY_MS) {
    _initFailed = false;
  }
  if (!_middleware && !_initFailed) {
    if (!_initPromise) {
      _initPromise = initializeMiddleware()
        .then(mw => { _middleware = mw; })
        .catch(err => {
          _initFailed = true;
          _initFailedAt = Date.now();
          console.error('❌ x402 initialization failed:', err.message);
          console.log('   Install packages: npm install @x402/core @x402/evm @x402/express');
        })
        .finally(() => { _initPromise = null; });
    }
    await _initPromise;
  }

  if (!_middleware) {
    // Graceful degradation in development
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`⚠️  x402 not available, allowing ${req.path} without payment`);
      return next();
    }
    return res.status(503).json({ error: 'Payment system unavailable' });
  }

  // Delegate to the official @x402/express middleware
  return _middleware(req, res, next);
}

/**
 * x402 Health Check
 * Returns payment configuration without requiring payment.
 */
export function x402HealthCheck(req, res) {
  const configured = isX402Configured();
  const includeTestnet = process.env.NODE_ENV !== 'production';
  // Only the chain a payment can actually be made on. The full
  // getAcceptedNetworks() table is the set of chains the protocol knows about,
  // not the set this process will accept: every route advertises NETWORK alone,
  // so listing eleven chains here sends an agent to sign on one of the ten that
  // will be rejected.
  const networks = getAcceptedNetworks(includeTestnet).filter(n => n.network === NETWORK);
  const recommendedNetwork = networks.find(n => n.recommended) || networks[0];

  res.json({
    service: 'XActions AI API',
    status: configured ? 'operational' : 'degraded',
    timestamp: new Date().toISOString(),
    x402: {
      enabled: configured,
      available: !_initFailed && configured,
      version: 2,
      facilitator: FACILITATOR_URL,
      payTo: configured ? PAY_TO_ADDRESS : null,
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
    endpoints: Object.keys(AI_OPERATION_PRICES).map(op => ({
      operation: op,
      name: getOperationName(op),
      path: pathForOperation(op),
      price: AI_OPERATION_PRICES[op],
    })),
  });
}

/**
 * Pricing endpoint — returns pricing and network info.
 */
export function x402Pricing(req, res) {
  const includeTestnet = process.env.NODE_ENV !== 'production';
  // Same rule as the health endpoint: advertise only what this process accepts.
  const networks = getAcceptedNetworks(includeTestnet).filter(n => n.network === NETWORK);
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
  });
}

export default x402Middleware;
