// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions Workflow API Routes
 * CRUD for workflows + run/history endpoints
 * 
 * Routes:
 *   POST   /api/workflows           — Create a workflow
 *   GET    /api/workflows            — List all workflows
 *   GET    /api/workflows/:id        — Get a workflow
 *   PUT    /api/workflows/:id        — Update a workflow
 *   DELETE /api/workflows/:id        — Delete a workflow
 *   POST   /api/workflows/:id/run    — Run a workflow
 *   GET    /api/workflows/:id/runs   — Get execution history
 *   GET    /api/workflows/:id/runs/:runId — Get a specific run
 *   GET    /api/workflows/actions    — List available actions
 *   POST   /api/workflows/webhook/:webhookId — Trigger workflow via webhook
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import crypto from 'node:crypto';
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { authTokenForUser } from '../services/xSession.js';

const router = express.Router();

// ============================================================================
// Webhook Trigger
// ============================================================================

/** Header an external sender puts the workflow's webhook secret in. */
const WEBHOOK_SECRET_HEADER = 'x-webhook-secret';

/** Constant-time comparison of two secrets of any length. */
function secretsMatch(expected, provided) {
  if (typeof expected !== 'string' || !expected || typeof provided !== 'string' || !provided) return false;
  const a = crypto.createHash('sha256').update(expected).digest();
  const b = crypto.createHash('sha256').update(provided).digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * A webhook trigger with a server-chosen id and secret. A caller-supplied
 * webhookId could take over another workflow's id, and a generated one was
 * derived from the workflow id and a timestamp. The previous trigger's id and
 * secret are kept when it was already a webhook, so the sender's URL and
 * header keep working across edits.
 */
function webhookTrigger(trigger, previous) {
  if (trigger?.type !== 'webhook') return trigger;
  const kept = previous?.type === 'webhook' && previous.webhookId && previous.secret ? previous : null;
  return {
    ...trigger,
    webhookId: kept ? kept.webhookId : `wh-${crypto.randomBytes(16).toString('hex')}`,
    secret: kept ? kept.secret : crypto.randomBytes(32).toString('hex'),
  };
}

/**
 * POST /api/workflows/webhook/:webhookId — External webhook trigger
 *
 * Mounted before authentication: the sender is an outside service with no
 * XActions session (behind auth it always got 401), and any signed-in user
 * could trigger anyone's workflow by its webhook id. The sender proves itself
 * with the workflow's secret in the X-Webhook-Secret header.
 */
router.post('/webhook/:webhookId', async (req, res) => {
  try {
    const workflows = await getWorkflows();
    const { webhookId } = req.params;
    const registered = workflows.triggerManager
      .getRegisteredTriggers()
      .find((t) => t.type === 'webhook' && t.webhookId === webhookId);
    const workflow = registered ? await workflows.get(registered.workflowId) : null;

    if (!workflow || !secretsMatch(workflow.trigger?.secret, req.get(WEBHOOK_SECRET_HEADER))) {
      return res.status(401).json({ error: 'Unknown webhook ID or wrong X-Webhook-Secret' });
    }

    workflows.triggerManager.handleWebhook(webhookId, req.body);
    res.json({ success: true, message: 'Workflow triggered' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Automation routes control the owner's account, so they carry the same
// authentication as /api/crm and /api/automations. A public deployment
// (the repo ships Railway, Fly, Render and Docker configs) would
// otherwise let anyone list and trigger the owner's automations.
router.use(authMiddleware);

/** Whether this user may see and run the workflow. */
const ownsWorkflow = (req, workflow) =>
  Boolean(workflow) && (req.user.isAdmin || workflow.userId === req.user.id);

/**
 * Continue only for the workflow's owner (or an admin); anyone else gets a
 * 404. Every signed-in user could once read, edit, run or delete anyone's
 * workflow.
 */
async function requireOwnWorkflow(req, res, next) {
  try {
    const workflows = await getWorkflows();
    const workflow = await workflows.get(req.params.id);
    if (!ownsWorkflow(req, workflow)) return res.status(404).json({ error: 'Workflow not found' });
    req.workflow = workflow;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}


/**
 * What a workflow run started from the API fails with when its owner has no
 * saved X session. Runs here act as the workflow's owner; they never fall back
 * to the operator's XACTIONS_SESSION_COOKIE.
 */
const NO_OWNER_SESSION =
  "The workflow's owner has no saved X session. Save one with POST /api/session/save-session, then run it again.";

// Lazy-load workflow module to avoid circular deps. Loading it also connects
// triggers (webhooks, intervals) to the run engine, once per process, with each
// triggered run using the session of the workflow's owner.
let _workflows = null;
function getWorkflows() {
  _workflows ??= import('../../src/workflows/index.js').then(async (mod) => {
    mod.initTriggers({
      authTokenFor: (workflow) => authTokenForUser(workflow.userId),
      noSessionError: NO_OWNER_SESSION,
    });
    // Re-register stored triggers before any request is answered, so a
    // webhook arriving right after a restart finds its workflow.
    const restored = await mod.restoreTriggers();
    if (restored) console.log(`⚡ Restored ${restored} workflow trigger(s)`);
    return mod.default;
  }).catch((error) => {
    _workflows = null; // let the next request try again
    throw error;
  });
  return _workflows;
}

/**
 * Bring workflow triggers up at server start, so interval and schedule
 * triggers resume without waiting for the first workflow request.
 * @returns {Promise<void>}
 */
export async function startWorkflowTriggers() {
  await getWorkflows();
}

// ============================================================================
// Workflow CRUD
// ============================================================================

/**
 * POST /api/workflows — Create a new workflow
 * Body: { name, description?, trigger?, steps[], enabled? }
 */
router.post('/', async (req, res) => {
  try {
    const workflows = await getWorkflows();
    const { name, description, trigger, steps, enabled } = req.body;
    
    if (!name || !steps || !Array.isArray(steps)) {
      return res.status(400).json({
        error: 'Invalid workflow: "name" and "steps" array are required',
      });
    }

    const validation = workflows.validate({ name, steps, trigger });
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }

    const workflow = await workflows.create({
      name,
      description: description || '',
      trigger: webhookTrigger(trigger || { type: 'manual' }),
      steps,
      enabled: enabled !== false,
      userId: req.user?.id || 'anonymous',
    });

    res.status(201).json(workflow);
  } catch (error) {
    console.error('❌ Create workflow error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workflows — List all workflows
 */
router.get('/', async (req, res) => {
  try {
    const workflows = await getWorkflows();
    const list = (await workflows.list()).filter((workflow) => ownsWorkflow(req, workflow));
    res.json({ workflows: list, count: list.length });
  } catch (error) {
    console.error('❌ List workflows error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workflows/actions — List available workflow actions
 */
router.get('/actions', async (req, res) => {
  try {
    const workflows = await getWorkflows();
    const actions = workflows.listActions();
    const operators = workflows.getAvailableOperators();
    res.json({ actions, operators });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workflows/:id — Get a specific workflow
 */
router.get('/:id', requireOwnWorkflow, async (req, res) => {
  try {
    res.json(req.workflow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/workflows/:id — Update a workflow
 */
router.put('/:id', requireOwnWorkflow, async (req, res) => {
  try {
    const workflows = await getWorkflows();
    const { userId: _ignored, ...changes } = req.body || {};
    if (changes.trigger) changes.trigger = webhookTrigger(changes.trigger, req.workflow.trigger);
    const updated = await workflows.update(req.params.id, changes);
    res.json(updated);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/workflows/:id — Delete a workflow
 */
router.delete('/:id', requireOwnWorkflow, async (req, res) => {
  try {
    const workflows = await getWorkflows();
    const deleted = await workflows.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json({ success: true, message: 'Workflow deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Workflow Execution
// ============================================================================

/**
 * POST /api/workflows/:id/run — Manually run a workflow
 * Body: { context?: {}, authToken?: string }
 */
router.post('/:id/run', requireOwnWorkflow, async (req, res) => {
  try {
    const workflows = await getWorkflows();
    const workflow = await workflows.get(req.params.id);
    
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const { context, authToken } = req.body || {};

    // Start execution (non-blocking — returns immediately, runs in background)
    const runPromise = workflows.run(workflow, {
      trigger: 'manual',
      initialContext: context || {},
      // The run acts as the workflow's owner (the caller, unless an admin is
      // running someone else's workflow).
      authToken: authToken || (await authTokenForUser(workflow.userId)),
      useEnvSession: false,
      noSessionError: NO_OWNER_SESSION,
      userId: req.user?.id || 'anonymous',
      onProgress: (event) => {
        // Could emit via Socket.IO here
        if (event.type === 'step_error') {
          console.error(`⚠️ Workflow step error: ${event.error}`);
        }
      },
    });

    // If the workflow has few steps, wait for it
    if (workflow.steps?.length <= 3) {
      const result = await runPromise;
      return res.json(result);
    }

    // For longer workflows, return immediately with the run ID
    runPromise.then(result => {
      console.log(`✅ Workflow ${workflow.name} run completed: ${result.status}`);
    }).catch(err => {
      console.error(`❌ Workflow ${workflow.name} run failed: ${err.message}`);
    });

    res.status(202).json({
      message: 'Workflow execution started',
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: 'running',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workflows/:id/runs — Get execution history
 * Query: ?limit=20
 */
router.get('/:id/runs', requireOwnWorkflow, async (req, res) => {
  try {
    const workflows = await getWorkflows();
    const limit = parseInt(req.query.limit) || 20;
    const runsList = await workflows.runs(req.params.id, limit);
    res.json({ runs: runsList, count: runsList.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workflows/:id/runs/:runId — Get a specific run
 */
router.get('/:id/runs/:runId', requireOwnWorkflow, async (req, res) => {
  try {
    const workflows = await getWorkflows();
    const run = await workflows.getRun(req.params.id, req.params.runId);
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    res.json(run);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
