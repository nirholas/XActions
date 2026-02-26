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
 * @license MIT
 */

import express from 'express';
import { createTaskManager } from './taskManager.js';
import { serveAgentCard } from './agentCard.js';
import { createBridge } from './bridge.js';
import { StreamManager, bridgeTaskStream, attachStreamEndpoint } from './streaming.js';
import { SubscriptionManager } from './push.js';
import { createAuthMiddleware } from './auth.js';
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

/**
 * Create and configure the A2A Express server.
 *
 * @param {object} [options={}]
 * @param {number} [options.port=3100]
 * @param {string} [options.sessionCookie]
 * @param {boolean} [options.enableAuth=true]
 * @param {boolean} [options.enableRateLimit=true]
 * @param {boolean} [options.enableLogging=true]
 * @param {number} [options.rateLimit=100]  - max requests per minute per IP
 * @param {string} [options.mode='local']
 * @param {string} [options.apiUrl]
 * @param {string} [options.baseUrl]
 * @returns {{ app: express.Application, start: function, shutdown: function }}
 */
export function createA2AServer(options = {}) {
  const {
    port = parseInt(process.env.A2A_PORT || '3100', 10),
    sessionCookie = process.env.X_SESSION_COOKIE || '',
    enableAuth = true,
    enableRateLimit = true,
    enableLogging = true,
    rateLimit = 100,
    mode = 'local',
    apiUrl = process.env.XACTIONS_API_URL || 'http://localhost:3000',
    baseUrl = process.env.A2A_BASE_URL || `http://localhost:${port}`,
  } = options;

  const app = express();

  // ------- Core middleware -------
  app.use(express.json({ limit: '1mb' }));

  // CORS
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  if (enableLogging) app.use(requestLogger);
  if (enableRateLimit) app.use(createRateLimiter({ maxRequests: rateLimit }));

  // ------- Internal wiring -------
  const bridge = createBridge({ mode, sessionCookie, apiUrl });
  const { store: taskStore, executor, shutdown: shutdownTasks } = createTaskManager({ bridge });
  const streamManager = new StreamManager();
  const subscriptions = new SubscriptionManager();
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

  // ------- Auth (optional) -------
  if (enableAuth) {
    const auth = createAuthMiddleware({ allowUnauthenticated: true });
    app.use('/a2a', auth);
  }

  // ------- Health endpoint -------
  app.get('/a2a/health', (req, res) => {
    const stats = taskStore.stats();
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
      skills = searchSkills({ query: q, category });
    } else {
      skills = getAllSkills();
    }
    if (limit) skills = skills.slice(0, parseInt(limit, 10));
    res.json({ skills, total: skills.length });
  });

  // ------- Refresh skills -------
  app.post('/a2a/skills/refresh', async (req, res) => {
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

    try {
      const task = taskStore.create({ message: params.message, metadata: params.metadata });

      // Subscribe for push notifications if callback provided
      if (params.pushNotification?.url) {
        subscriptions.subscribe(task.id, params.pushNotification.url, params.pushNotification.headers);
      }

      // Execute in background (don't await for the response)
      const shouldStream = method === 'tasks/sendSubscribe';

      if (shouldStream) {
        // Return task immediately, client should connect to SSE
        res.json(jsonRpcSuccess(id, task));
      } else {
        // Execute and wait — return completed task
        await executor.execute(task.id);
        const final = taskStore.get(task.id);
        res.json(jsonRpcSuccess(id, final));
      }
    } catch (err) {
      console.error('🔴 A2A task creation error:', err);
      res.status(500).json(jsonRpcError(id, ERROR_CODES.INTERNAL, err.message));
    }
  });

  // ------- Get task -------
  app.get('/a2a/tasks/:taskId', (req, res) => {
    const task = taskStore.get(req.params.taskId);
    if (!task) {
      return res.status(404).json(jsonRpcError(null, ERROR_CODES.TASK_NOT_FOUND, 'Task not found'));
    }
    res.json(jsonRpcSuccess(null, task));
  });

  // ------- Cancel task -------
  app.post('/a2a/tasks/:taskId/cancel', (req, res) => {
    const task = taskStore.get(req.params.taskId);
    if (!task) {
      return res.status(404).json(jsonRpcError(null, ERROR_CODES.TASK_NOT_FOUND, 'Task not found'));
    }

    try {
      taskStore.transition(req.params.taskId, 'canceled');
      const updated = taskStore.get(req.params.taskId);
      res.json(jsonRpcSuccess(null, updated));
    } catch (err) {
      res.status(400).json(jsonRpcError(null, ERROR_CODES.INVALID_REQUEST, err.message));
    }
  });

  // ------- SSE stream -------
  attachStreamEndpoint(app, streamManager);

  // ------- Push notification callback -------
  app.post('/a2a/tasks/:taskId/message', (req, res) => {
    const { taskId } = req.params;
    const task = taskStore.get(taskId);
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
      const result = await orchestrator.execute(description, execOptions);
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

  app.post('/a2a/agents/discover', async (req, res) => {
    const { urls } = req.body;
    const results = [];
    for (const url of urls || []) {
      try {
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

  function start(customPort) {
    const p = customPort || port;
    return new Promise((resolve) => {
      server = app.listen(p, () => {
        console.log(`⚡ XActions A2A Agent listening on port ${p}`);
        console.log(`   Agent Card: http://localhost:${p}/.well-known/agent.json`);
        console.log(`   Health:     http://localhost:${p}/a2a/health`);
        console.log(`   Skills:     http://localhost:${p}/a2a/skills`);
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

const isMainModule = process.argv[1]?.includes('a2a/server');

if (isMainModule) {
  const { start } = createA2AServer();
  start().catch((err) => {
    console.error('🔴 Failed to start A2A server:', err);
    process.exit(1);
  });
}
