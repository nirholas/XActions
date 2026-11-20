// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions A2A — HTTP Server
 *
 * Express server implementing the A2A protocol endpoints.
 * Can run standalone (`node src/a2a/server.js`) or be mounted into
 * an existing Express app.
 *
 * Endpoints:
 *   GET  /.well-known/agent.json   — Agent Card
 *   POST /a2a/tasks                — tasks/send, tasks/sendSubscribe
 *   GET  /a2a/tasks/:taskId        — tasks/get
 *   POST /a2a/tasks/:taskId/cancel — tasks/cancel
 *   GET  /a2a/tasks/:taskId/stream — SSE stream
 *   POST /a2a/tasks/:taskId/message — tasks/pushNotification
 *   GET  /a2a/health               — Health check
 *   GET  /a2a/skills               — List skills
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import express from 'express';
import { createTaskManager, ownerKey, canAccessTask } from './taskManager.js';
import { serveAgentCard } from './agentCard.js';
import { createBridge } from './bridge.js';
import { StreamManager, bridgeTaskStream, attachStreamEndpoint } from './streaming.js';
import { SubscriptionManager } from './push.js';
import { createAuthMiddleware, checkPermission } from './auth.js';
import { assertSafeOutboundUrl, privateUrlsAllowedByEnv, UnsafeUrlError } from './urlGuard.js';
import { createDiscovery } from './discovery.js';
import { createOrchestrator } from './orchestrator.js';
import { getAllSkills, searchSkills, refreshSkills } from './skillRegistry.js';
import {
  jsonRpcSuccess,
  jsonRpcError,
  createMessage,
  createTextPart,
  createDataPart,
  ERROR_CODES,
} from './types.js';
import { isEntryPoint } from '../utils/entryPoint.js';

// ============================================================================
// Rate Limiter (in-memory, per IP)
// ============================================================================

function createRateLimiter({ windowMs = 60000, maxRequests = 100 } = {}) {
  const hits = new Map();

  // Cleanup old entries periodically
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now - entry.start > windowMs) hits.delete(key);
    }
  }, windowMs);
  if (cleanup.unref) cleanup.unref();

  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    let entry = hits.get(ip);

    if (!entry || now - entry.start > windowMs) {
      entry = { start: now, count: 0 };
      hits.set(ip, entry);
    }

    entry.count++;

    if (entry.count > maxRequests) {
      return res.status(429).json(
        jsonRpcError(null, ERROR_CODES.INTERNAL, 'Rate limit exceeded — try again later')
      );
    }

    next();
  };
}

// ============================================================================
// Request Logger
// ============================================================================

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    const level = status >= 500 ? '🔴' : status >= 400 ? '🟡' : '🟢';
    console.log(`${level} A2A ${req.method} ${req.originalUrl} → ${status} (${ms}ms)`);
  });
  next();
}

// ============================================================================
// Create Server
// ============================================================================

function truthy(v) {
  return v !== undefined && v !== '' && !['0', 'false', 'no', 'off'].includes(String(v).toLowerCase());
}

function isLoopbackHost(host) {
  return host === 'localhost' || host === '::1' || /^127\./.test(host);
}

/**
 * Create and configure the A2A Express server.
 *
 * The server can post, follow, DM and delete as the logged-in account, so it
 * is locked down by default:
 *
 * - every /a2a route needs an API key or bearer token (`createAuthMiddleware`);
 *   anonymous access needs an explicit `enableAuth: false` or
 *   XACTIONS_A2A_ALLOW_UNAUTHENTICATED=1, and logs a warning when on;
 * - it listens on 127.0.0.1 unless `host` / A2A_HOST says otherwise;
 * - browsers get CORS only for origins in `corsOrigins` / A2A_CORS_ORIGINS,
 *   and a request carrying any other Origin is refused;
 * - write tools need the caller's "write" permission, are charged against the
 *   daily action caps, and are held as drafts when
 *   XACTIONS_MCP_REQUIRE_APPROVAL is set (see bridge.authorizeTool);
 * - push callback and discovery URLs must resolve to public addresses unless
 *   `allowPrivateUrls` / XACTIONS_A2A_ALLOW_PRIVATE=true.
 *
 * @param {object} [options={}]
 * @param {number} [options.port=3100]
 * @param {string} [options.host='127.0.0.1'] interface to bind (A2A_HOST)
 * @param {string} [options.sessionCookie]
 * @param {boolean} [options.enableAuth=true] false (or
 *   XACTIONS_A2A_ALLOW_UNAUTHENTICATED=1) serves anonymous callers
 * @param {string[]|string} [options.corsOrigins=[]] browser origins allowed to
 *   call the API (A2A_CORS_ORIGINS, comma separated)
 * @param {boolean} [options.allowPrivateUrls=false] let push callbacks and
 *   discovery reach loopback and private-network hosts
 * @param {boolean} [options.requireApproval] hold write tools as drafts
 *   (default XACTIONS_MCP_REQUIRE_APPROVAL)
 * @param {string} [options.account] ledger account for the daily action caps
 * @param {boolean} [options.enableRateLimit=true]
 * @param {boolean} [options.enableLogging=true] request log, startup banner
 *   and the authentication-off notice. The warning that the server is
 *   reachable from other machines is printed regardless.
 * @param {number} [options.rateLimit=100]  - max requests per minute per IP
 * @param {string} [options.mode='local']
 * @param {string} [options.apiUrl]
 * @param {string} [options.baseUrl]
 * @returns {{ app: express.Application, start: function, shutdown: function }}
 */
export function createA2AServer(options = {}) {
  const {
    port = parseInt(process.env.A2A_PORT || '3100', 10),
    host = process.env.A2A_HOST || '127.0.0.1',
    sessionCookie = process.env.X_SESSION_COOKIE || '',
    enableRateLimit = true,
    enableLogging = true,
    rateLimit = 100,
    mode = 'local',
    apiUrl = process.env.XACTIONS_API_URL || 'http://localhost:3000',
    baseUrl = process.env.A2A_BASE_URL || `http://localhost:${port}`,
    requireApproval,
    account,
  } = options;
  const enableAuth = options.enableAuth !== false && !truthy(process.env.XACTIONS_A2A_ALLOW_UNAUTHENTICATED);
  const allowPrivateUrls = options.allowPrivateUrls ?? privateUrlsAllowedByEnv();
  const rawOrigins = options.corsOrigins ?? process.env.A2A_CORS_ORIGINS ?? [];
  const corsOrigins = new Set(
    (Array.isArray(rawOrigins) ? rawOrigins : String(rawOrigins).split(','))
      .map((o) => String(o).trim().replace(/\/$/, ''))
      .filter(Boolean),
  );

  if (!enableAuth && enableLogging) {
    console.warn(
      '⚠️  A2A authentication is OFF. Anyone who can reach this server can run every tool, writes included, ' +
        'as the logged-in account. Only do this on a machine nobody else can reach.',
    );
  }

  const app = express();

  // ------- Core middleware -------
  app.use(express.json({ limit: '1mb' }));
  // Express 5's parsers leave req.body undefined when none of them ran (no body,
  // or another content type); handlers read fields off it, as they could on 4.
  app.use((req, res, next) => {
    req.body ??= {};
    next();
  });

  // CORS: an allowlist, never a wildcard. A page on some other site must not be
  // able to drive this server from a visitor's browser, so a request whose
  // Origin is not allowed is refused outright (non-browser clients send no
  // Origin and are unaffected). The agent card is public metadata and stays
  // readable from anywhere.
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (req.path === '/.well-known/agent.json') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (req.method === 'OPTIONS') return res.sendStatus(204);
      return next();
    }
    if (origin) {
      if (!corsOrigins.has(origin)) {
        return res.status(403).json(jsonRpcError(null, ERROR_CODES.AUTH_FORBIDDEN, `Origin ${origin} is not allowed`));
      }
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  if (enableLogging) app.use(requestLogger);
  if (enableRateLimit) app.use(createRateLimiter({ maxRequests: rateLimit }));

  // ------- Internal wiring -------
  const bridge = createBridge({ mode, sessionCookie, apiUrl, requireApproval, account });
  const { store: taskStore, executor, shutdown: shutdownTasks } = createTaskManager({ bridge });
  const streamManager = new StreamManager();
  const subscriptions = new SubscriptionManager({ allowPrivateUrls });
  const discovery = createDiscovery();
  const orchestrator = createOrchestrator({
    registry: discovery.registry,
    trust: discovery.trust,
    taskStore,
    bridge,
  });

  // Wire task events → SSE streams
  bridgeTaskStream(taskStore, streamManager);

  // Wire task events → push notifications
  taskStore.on((event, taskId, data) => {
    subscriptions.notifySubscribers(taskId, data).catch(() => {});
  });

  // ------- Agent Card -------
  serveAgentCard(app, {
    url: baseUrl,
    capabilities: {
      streaming: true,
      pushNotifications: true,
    },
  });

  // ------- Auth -------
  if (enableAuth) {
    app.use('/a2a', createAuthMiddleware({ required: true }));
  }

  // The caller identity handed to the bridge. With auth on it is always set
  // (the middleware refused everyone else); with auth explicitly off it is
  // null and the bridge skips the permission check.
  const callerOf = (req) => ({ agent: enableAuth ? req.agent : null });

  /** Refuse unless the caller holds `permission` (always passes with auth off). */
  const requirePermission = (permission) => (req, res, next) => {
    if (!enableAuth || checkPermission(req.agent, permission)) return next();
    return res.status(403).json(jsonRpcError(null, ERROR_CODES.AUTH_FORBIDDEN, `This agent lacks the "${permission}" permission`));
  };

  // A task belongs to the caller that created it. With auth on, every other
  // caller (unless it holds "admin") gets the same 404 as for a task that does
  // not exist, so task ids cannot be probed. With auth explicitly off there are
  // no identities and every caller sees every task, as before.
  const canAccess = (req, task) => !enableAuth || canAccessTask(task, req.agent);

  /** The task named by :taskId, or null when it is missing or not the caller's. */
  const taskFor = async (req) => {
    const task = await taskStore.get(req.params.taskId);
    return task && canAccess(req, task) ? task : null;
  };

  // ------- Health endpoint -------
  app.get('/a2a/health', (req, res) => {
    const stats = taskStore.getStats();
    res.json({
      status: 'healthy',
      agent: 'XActions A2A Agent',
      version: '1.0.0',
      uptime: process.uptime(),
      tasks: stats,
      skills: getAllSkills().length,
    });
  });

  // ------- Skills endpoint -------
  app.get('/a2a/skills', (req, res) => {
    const { q, category, limit } = req.query;
    let skills;
    if (q || category) {
      skills = searchSkills(q || '', category ? [category] : []);
    } else {
      skills = getAllSkills();
    }
    if (limit) skills = skills.slice(0, parseInt(limit, 10));
    res.json({ skills, total: skills.length });
  });

  // ------- Refresh skills -------
  app.post('/a2a/skills/refresh', requirePermission('admin'), async (req, res) => {
    await refreshSkills();
    res.json({ ok: true, skills: getAllSkills().length });
  });

  // ------- Task creation (tasks/send, tasks/sendSubscribe) -------
  app.post('/a2a/tasks', async (req, res) => {
    const { jsonrpc, method, params, id } = req.body;

    if (jsonrpc !== '2.0') {
      return res.status(400).json(jsonRpcError(id, ERROR_CODES.INVALID_REQUEST, 'JSON-RPC 2.0 required'));
    }

    if (!params?.message) {
      return res.status(400).json(jsonRpcError(id, ERROR_CODES.INVALID_PARAMS, 'message required'));
    }

    // The agent POSTs task updates to this URL, so it must not point at
    // loopback, the private network, or a cloud metadata endpoint.
    if (params.pushNotification?.url) {
      try {
        await assertSafeOutboundUrl(params.pushNotification.url, { label: 'pushNotification.url', allowPrivate: allowPrivateUrls });
      } catch (err) {
        if (err instanceof UnsafeUrlError) {
          return res.status(400).json(jsonRpcError(id, ERROR_CODES.INVALID_PARAMS, err.message));
        }
        throw err;
      }
    }

    try {
      const task = await taskStore.create({
        message: params.message,
        metadata: params.metadata,
        owner: enableAuth ? ownerKey(req.agent) : null,
      });

      // Subscribe for push notifications if callback provided
      if (params.pushNotification?.url) {
        subscriptions.subscribe(task.id, params.pushNotification.url, params.pushNotification.headers);
      }

      const shouldStream = method === 'tasks/sendSubscribe';

      if (shouldStream) {
        // Return the task at once and run it in the background; the client
        // follows progress on GET /a2a/tasks/:id/stream.
        res.json(jsonRpcSuccess(id, task));
        executor.execute(task.id, callerOf(req)).catch((err) => {
          console.error(`🔴 A2A task ${task.id} failed:`, err.message);
        });
      } else {
        // Execute and wait — return completed task
        await executor.execute(task.id, callerOf(req));
        const final = await taskStore.get(task.id);
        res.json(jsonRpcSuccess(id, final));
      }
    } catch (err) {
      console.error('🔴 A2A task creation error:', err);
      res.status(500).json(jsonRpcError(id, ERROR_CODES.INTERNAL, err.message));
    }
  });

  // ------- Get task -------
  app.get('/a2a/tasks/:taskId', async (req, res) => {
    const task = await taskFor(req);
    if (!task) {
      return res.status(404).json(jsonRpcError(null, ERROR_CODES.TASK_NOT_FOUND, 'Task not found'));
    }
    res.json(jsonRpcSuccess(null, task));
  });

  // ------- Cancel task -------
  app.post('/a2a/tasks/:taskId/cancel', async (req, res) => {
    const task = await taskFor(req);
    if (!task) {
      return res.status(404).json(jsonRpcError(null, ERROR_CODES.TASK_NOT_FOUND, 'Task not found'));
    }

    try {
      await taskStore.transition(req.params.taskId, 'canceled');
      const updated = await taskStore.get(req.params.taskId);
      res.json(jsonRpcSuccess(null, updated));
    } catch (err) {
      res.status(400).json(jsonRpcError(null, ERROR_CODES.INVALID_REQUEST, err.message));
    }
  });

  // ------- SSE stream -------
  attachStreamEndpoint(app, streamManager, taskStore, { canAccess });

  // ------- Push notification callback -------
  app.post('/a2a/tasks/:taskId/message', async (req, res) => {
    const { taskId } = req.params;
    const task = await taskFor(req);
    if (!task) {
      return res.status(404).json(jsonRpcError(null, ERROR_CODES.TASK_NOT_FOUND, 'Task not found'));
    }

    // Append incoming message to task history
    if (req.body?.params?.message) {
      task.history = task.history || [];
      task.history.push(req.body.params.message);
    }

    res.json(jsonRpcSuccess(null, { taskId, accepted: true }));
  });

  // ------- Orchestration endpoint -------
  app.post('/a2a/orchestrate', async (req, res) => {
    const { description, options: execOptions } = req.body;
    if (!description) {
      return res.status(400).json({ error: 'description required' });
    }

    try {
      const result = await orchestrator.execute(description, execOptions, callerOf(req));
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ------- Execution plan (dry run) -------
  app.post('/a2a/orchestrate/plan', async (req, res) => {
    const { description } = req.body;
    if (!description) {
      return res.status(400).json({ error: 'description required' });
    }
    const plan = await orchestrator.getExecutionPlan(description);
    res.json(plan);
  });

  // ------- Discovery endpoint -------
  app.get('/a2a/agents', async (req, res) => {
    const agents = await discovery.registry.list();
    res.json({ agents, total: agents.length });
  });

  // Registering an agent makes this server fetch the URL, now and on every
  // refresh, and later delegate tasks to it: admin only, public hosts only.
  app.post('/a2a/agents/discover', requirePermission('admin'), async (req, res) => {
    const { urls } = req.body;
    const results = [];
    for (const url of Array.isArray(urls) ? urls : []) {
      try {
        await assertSafeOutboundUrl(url, { label: 'Agent URL', allowPrivate: allowPrivateUrls });
        const agent = await discovery.registry.register(url);
        results.push({ url, status: 'registered', agent });
      } catch (err) {
        results.push({ url, status: 'failed', error: err.message });
      }
    }
    res.json({ results });
  });

  // ------- Error handler -------
  app.use((err, req, res, _next) => {
    console.error('🔴 A2A unhandled error:', err);
    res.status(500).json(jsonRpcError(null, ERROR_CODES.INTERNAL, 'Internal server error'));
  });

  // ------- Lifecycle -------
  let server = null;

  /**
   * Listen on `customPort` (0 picks a free port) and `customHost`, defaulting
   * to the options. The default host is loopback only.
   */
  function start(customPort, customHost) {
    const p = customPort ?? port;
    const h = customHost ?? host;
    return new Promise((resolve, reject) => {
      // Express 5 hands a listen failure (EADDRINUSE, EACCES) to this callback.
      server = app.listen(p, h, (err) => {
        if (err) return reject(err);
        const bound = server.address()?.port ?? p;
        const shown = h.includes(':') ? `[${h}]` : h;
        if (enableLogging) {
          console.log(`⚡ XActions A2A Agent listening on ${shown}:${bound}`);
          console.log(`   Agent Card: http://${shown}:${bound}/.well-known/agent.json`);
          console.log(`   Health:     http://${shown}:${bound}/a2a/health`);
          console.log(`   Skills:     http://${shown}:${bound}/a2a/skills (${getAllSkills().length} registered)`);
        }
        if (!isLoopbackHost(h)) {
          console.warn(`⚠️  A2A server is reachable from other machines on ${shown}.${enableAuth ? '' : ' Authentication is OFF.'}`);
        }
        resolve(server);
      });
    });
  }

  function shutdown() {
    shutdownTasks();
    streamManager.closeAll?.();
    if (server) server.close();
  }

  return {
    app,
    start,
    shutdown,
    // Expose internals for integration/testing
    taskStore,
    executor,
    bridge,
    streamManager,
    subscriptions,
    discovery,
    orchestrator,
  };
}

// ============================================================================
// Standalone start
// ============================================================================

if (isEntryPoint(import.meta.url)) {
  const { start } = createA2AServer();
  start().catch((err) => {
    console.error('🔴 Failed to start A2A server:', err);
    process.exit(1);
  });
}
