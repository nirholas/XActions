// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * x402 Payment Middleware for MCP HTTP Transport
 *
 * Per-tool-call micropayments for the XActions HTTP MCP server.
 * Free tools (x_login, tools/list, x_get_settings, etc.) pass through
 * without any payment. Priced tools require a USDC x402 micropayment
 * sent via the X-PAYMENT or payment-signature header.
 *
 * Flow:
 *   1. AI agent sends POST /mcp with a tools/call JSON-RPC body
 *   2. If the tool is priced and no payment header is present →
 *      402 Payment Required with x402 requirements JSON
 *   3. Agent signs a USDC EIP-3009 transfer and retries with X-PAYMENT
 *   4. Middleware verifies with the x402 facilitator
 *   5. If valid → executes tool, settles on-chain after response
 *
 * @see https://x402.org
 * @author nichxbt
 */

import {
  PAY_TO_ADDRESS,
  FACILITATOR_URL,
  NETWORK,
  getAcceptedNetworks,
  ensureConfigValidated,
  isX402Configured,
} from '../../api/config/x402-config.js';

// ============================================================================
// Per-tool pricing (USD → paid in USDC on configured network)
// Tools NOT in this map are FREE (tools/list, x_login, x_get_settings, etc.)
// ============================================================================

export const MCP_TOOL_PRICES = {
  // ── Scraping ─────────────────────────────────────────────────
  x_get_profile:              '$0.001',
  x_get_followers:            '$0.01',
  x_get_following:            '$0.01',
  x_get_tweets:               '$0.005',
  x_search_tweets:            '$0.01',
  x_get_thread:               '$0.002',
  x_get_replies:              '$0.005',
  x_get_hashtag:              '$0.01',
  x_get_likers:               '$0.005',
  x_get_retweeters:           '$0.005',
  x_get_media:                '$0.005',
  x_get_mentions:             '$0.01',
  x_get_quote_tweets:         '$0.005',
  x_get_likes:                '$0.005',
  x_get_bookmarks:            '$0.01',
  x_get_non_followers:        '$0.01',

  // ── Actions ──────────────────────────────────────────────────
  x_follow:                   '$0.002',
  x_unfollow:                 '$0.002',
  x_like:                     '$0.002',
  x_unlike:                   '$0.002',
  x_post_tweet:               '$0.005',
  x_post_thread:              '$0.01',
  x_reply:                    '$0.005',
  x_retweet:                  '$0.002',
  x_quote_tweet:              '$0.005',
  x_bookmark:                 '$0.002',
  x_delete_tweet:             '$0.002',
  x_unfollow_non_followers:   '$0.05',
  x_unfollow_all:             '$0.10',
  x_smart_unfollow:           '$0.05',
  x_auto_follow:              '$0.03',
  x_follow_engagers:          '$0.03',
  x_auto_comment:             '$0.03',
  x_auto_retweet:             '$0.02',
  x_bulk_execute:             '$0.05',

  // ── Monitoring & Analysis ────────────────────────────────────
  x_detect_unfollowers:       '$0.02',
  x_monitor_account:          '$0.01',
  x_monitor_keyword:          '$0.02',
  x_follower_alerts:          '$0.01',
  x_track_engagement:         '$0.01',
  x_brand_monitor:            '$0.03',
  x_competitor_analysis:      '$0.03',
  x_detect_bots:              '$0.02',
  x_find_influencers:         '$0.01',
  x_smart_target:             '$0.02',
  x_monitor_reputation:       '$0.01',
  x_reputation_report:        '$0.01',
  x_audience_overlap:         '$0.02',

  // ── AI Tools ─────────────────────────────────────────────────
  x_analyze_voice:            '$0.02',
  x_generate_tweet:           '$0.01',
  x_rewrite_tweet:            '$0.005',
  x_summarize_thread:         '$0.01',
  x_analyze_sentiment:        '$0.01',
  x_grok_query:               '$0.02',
  x_grok_summarize:           '$0.02',
  x_grok_analyze_image:       '$0.02',
  x_crypto_analyze:           '$0.02',

  // ── Analytics ────────────────────────────────────────────────
  x_audience_insights:        '$0.02',
  x_engagement_report:        '$0.01',
  x_get_post_analytics:       '$0.01',
  x_history_get:              '$0.005',
  x_growth_rate:              '$0.005',
  x_compare_accounts:         '$0.01',

  // ── Content & Posting ────────────────────────────────────────
  x_download_video:           '$0.005',
  x_publish_article:          '$0.05',
  x_creator_analytics:        '$0.01',

  // ── Export / Portability ─────────────────────────────────────
  x_export_account:           '$0.05',
  x_migrate_account:          '$0.05',

  // ── Social Graph ─────────────────────────────────────────────
  x_graph_build:              '$0.02',
  x_graph_analyze:            '$0.01',
  x_graph_recommendations:    '$0.01',

  // ── DMs ──────────────────────────────────────────────────────
  x_send_dm:                  '$0.01',
  x_get_dm_conversations:     '$0.005',
  x_export_dms:               '$0.02',

  // ── Spaces ───────────────────────────────────────────────────
  x_space_join:               '$0.005',

  // ── Automation ───────────────────────────────────────────────
  x_workflow_run:             '$0.01',
};

// ============================================================================
// Internal state — lazy-initialized x402HTTPResourceServer
// ============================================================================

let _httpServer = null;
let _initPromise = null;
let _initFailed = false;

/**
 * Initialize the x402 HTTP resource server for MCP.
 * Registers all supported networks and sets up a dynamic price function
 * that reads the tool name from the JSON-RPC request body.
 */
async function getHttpServer() {
  if (_httpServer) return _httpServer;
  if (_initFailed) return null;

  if (!_initPromise) {
    _initPromise = (async () => {
      const {
        x402HTTPResourceServer,
        x402ResourceServer,
        HTTPFacilitatorClient,
      } = await import('@x402/core/server');
      const { ExactEvmScheme } = await import('@x402/evm/exact/server');

      const facilitator = new HTTPFacilitatorClient(FACILITATOR_URL);
      const resourceServer = new x402ResourceServer(facilitator);

      // Register all supported networks
      const includeTestnet = process.env.NODE_ENV !== 'production';
      const networks = getAcceptedNetworks(includeTestnet);
      const networksToRegister = new Set([
        NETWORK,
        ...networks.map(n => n.network),
      ]);

      for (const networkId of networksToRegister) {
        try {
          resourceServer.register(networkId, new ExactEvmScheme());
        } catch { /* ignore: already registered or unsupported network */ }
      }

      // Log settlement events
      resourceServer.onAfterSettle(({ paymentPayload, requirements, result }) => {
        const price = requirements?.maxAmountRequired || requirements?.price || '?';
        const txHash = result?.transaction || result?.transactionHash || null;
        const payer = paymentPayload?.payload?.authorization?.from || 'unknown';
        console.error(`💰 x402 MCP: Settled ${price} USDC (tx: ${txHash}, from: ${payer})`);
      });

      resourceServer.onSettleFailure(({ error }) => {
        console.error('⚠️  x402 MCP: Settlement failed:', error?.message || error);
      });

      resourceServer.onVerifyFailure(({ error }) => {
        console.error('⚠️  x402 MCP: Verification failed:', error?.message || error);
      });

      // Route: POST /mcp with dynamic per-tool pricing.
      // price() is called with the request context — reads tool name from body.
      const routeConfig = {
        accepts: [{
          scheme: 'exact',
          network: NETWORK,
          price: (context) => {
            const body = context.adapter.getBody?.();
            const toolName = body?.params?.name;
            return MCP_TOOL_PRICES[toolName] || '$0.001';
          },
          payTo: PAY_TO_ADDRESS,
          maxTimeoutSeconds: 300,
        }],
        description: 'XActions MCP — per-tool micropayment',
      };

      const httpSrv = new x402HTTPResourceServer(resourceServer, {
        'POST /mcp': routeConfig,
      });

      // Use onProtectedRequest to grant free access for:
      //   - Non-tool-call methods (initialize, tools/list, ping, …)
      //   - Tools that are not in MCP_TOOL_PRICES
      httpSrv.onProtectedRequest(async (context) => {
        const body = context.adapter.getBody?.();

        if (!body || body.method !== 'tools/call') {
          return { grantAccess: true };
        }

        const toolName = body.params?.name;
        if (!toolName || !MCP_TOOL_PRICES[toolName]) {
          return { grantAccess: true };
        }

        // Priced tool — fall through to payment check
      });

      // Initialize: fetches supported payment kinds from the facilitator
      await httpSrv.initialize();

      _httpServer = httpSrv;

      console.error('✅ x402 MCP payment middleware ready');
      console.error(`   💰 Pay to: ${PAY_TO_ADDRESS}`);
      console.error(`   🌐 Network: ${NETWORK}`);
      console.error(`   🔗 Facilitator: ${FACILITATOR_URL}`);
      console.error(`   📋 Priced tools: ${Object.keys(MCP_TOOL_PRICES).length}`);

      return httpSrv;
    })()
      .catch(err => {
        _initFailed = true;
        console.error('❌ x402 MCP init failed:', err.message);
        console.error('   Install missing packages: npm install @x402/core @x402/evm @x402/express');
        return null;
      })
      .finally(() => { _initPromise = null; });
  }

  return _initPromise;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Create x402 payment middleware for the MCP HTTP server.
 *
 * Mount this BEFORE the /mcp handler:
 *   app.use(createMcpPaymentMiddleware());
 *   app.all('/mcp', mcpHandler);
 *
 * @returns Express middleware function
 */
export function createMcpPaymentMiddleware() {
  return async function mcpPaymentMiddleware(req, res, next) {
    // Only intercept POST /mcp
    if (req.method !== 'POST' || req.path !== '/mcp') {
      return next();
    }

    // Skip if x402 not configured (graceful degradation in dev)
    if (!ensureConfigValidated()) {
      if (process.env.NODE_ENV !== 'production') return next();
      return res.status(500).json({ error: 'Payment system not configured' });
    }

    const httpServer = await getHttpServer();
    if (!httpServer) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️  x402 MCP not available — allowing without payment (dev mode)');
        return next();
      }
      return res.status(503).json({ error: 'Payment verification unavailable' });
    }

    const { ExpressAdapter } = await import('@x402/express');
    const adapter = new ExpressAdapter(req);
    const context = {
      adapter,
      path: req.path,
      method: req.method,
      paymentHeader: req.headers['x-payment'] || req.headers['payment-signature'],
    };

    // Quick check — does this request even need payment?
    if (!httpServer.requiresPayment(context)) {
      return next();
    }

    // Full payment processing
    let result;
    try {
      result = await httpServer.processHTTPRequest(context);
    } catch (err) {
      console.error('❌ x402 MCP: processHTTPRequest error:', err.message);
      if (process.env.NODE_ENV !== 'production') return next();
      return res.status(502).json({ error: 'Payment processing error', message: err.message });
    }

    switch (result.type) {
      case 'no-payment-required':
        return next();

      case 'payment-error': {
        const { response } = result;
        res.status(response.status);
        Object.entries(response.headers).forEach(([key, value]) => res.setHeader(key, value));
        return res.json(response.body || {});
      }

      case 'payment-verified': {
        const { paymentPayload, paymentRequirements, declaredExtensions } = result;

        // Buffer the response so we can settle payment before releasing it.
        // This mirrors the @x402/express middleware pattern exactly.
        const origWriteHead  = res.writeHead.bind(res);
        const origWrite      = res.write.bind(res);
        const origEnd        = res.end.bind(res);
        const origFlush      = res.flushHeaders.bind(res);
        let buffered = [];
        let settled  = false;
        let signalEnd;
        const endPromise = new Promise(resolve => { signalEnd = resolve; });

        res.writeHead    = (...a) => { if (!settled) { buffered.push(['writeHead', a]);    return res;  } return origWriteHead(...a); };
        res.write        = (...a) => { if (!settled) { buffered.push(['write', a]);         return true; } return origWrite(...a); };
        res.end          = (...a) => { if (!settled) { buffered.push(['end', a]); signalEnd(); return res; } return origEnd(...a); };
        res.flushHeaders = ()     => { if (!settled) { buffered.push(['flushHeaders', []]); return;      } return origFlush(); };

        next();
        await endPromise;

        // On 4xx/5xx — flush without settling (payment refunded implicitly)
        if (res.statusCode >= 400) {
          settled = true;
          res.writeHead = origWriteHead; res.write = origWrite; res.end = origEnd; res.flushHeaders = origFlush;
          for (const [m, a] of buffered) {
            if (m === 'writeHead') origWriteHead(...a);
            else if (m === 'write') origWrite(...a);
            else if (m === 'end') origEnd(...a);
            else if (m === 'flushHeaders') origFlush();
          }
          return;
        }

        // Settle payment on-chain
        try {
          const responseBody = Buffer.concat(
            buffered.flatMap(([m, a]) =>
              (m === 'write' || m === 'end') && a[0] ? [Buffer.from(a[0])] : []
            )
          );
          const settleResult = await httpServer.processSettlement(
            paymentPayload,
            paymentRequirements,
            declaredExtensions,
            { request: context, responseBody }
          );

          if (!settleResult.success) {
            const { response: fr } = settleResult;
            Object.entries(fr.headers).forEach(([k, v]) => res.setHeader(k, v));
            return res.status(fr.status).json(fr.body ?? {});
          }

          Object.entries(settleResult.headers).forEach(([k, v]) => res.setHeader(k, v));
        } catch (err) {
          console.error('❌ x402 MCP: Settlement error:', err.message);
        }

        // Flush buffered response to the client
        settled = true;
        res.writeHead = origWriteHead; res.write = origWrite; res.end = origEnd; res.flushHeaders = origFlush;
        for (const [m, a] of buffered) {
          if (m === 'writeHead') origWriteHead(...a);
          else if (m === 'write') origWrite(...a);
          else if (m === 'end') origEnd(...a);
          else if (m === 'flushHeaders') origFlush();
        }
        return;
      }
    }
  };
}

/**
 * GET /mcp/pricing — returns per-tool pricing info (no payment required).
 */
export function mcpPricingHandler(_req, res) {
  const configured = isX402Configured();
  const includeTestnet = process.env.NODE_ENV !== 'production';
  const networks = getAcceptedNetworks(includeTestnet);
  const recommended = networks.find(n => n.recommended) || networks[0];

  res.json({
    service: 'XActions MCP',
    x402: {
      enabled: configured,
      version: 2,
      facilitator: FACILITATOR_URL,
      payTo: configured ? PAY_TO_ADDRESS : null,
      network: NETWORK,
      networks: {
        recommended: recommended?.network,
        recommendedName: recommended?.name,
        all: networks.map(n => ({
          network: n.network,
          name: n.name,
          usdc: n.usdc,
          gasCost: n.gasCost,
          recommended: n.recommended || false,
        })),
      },
    },
    pricing: {
      note: 'Tools not listed below are free (tools/list, x_login, x_get_settings, etc.)',
      tools: MCP_TOOL_PRICES,
    },
  });
}
