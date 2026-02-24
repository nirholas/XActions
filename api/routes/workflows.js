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
 * @license MIT
 */

import express from 'express';

const router = express.Router();

// Lazy-load workflow module to avoid circular deps
let _workflows = null;
async function getWorkflows() {
  if (!_workflows) {
    const mod = await import('../../src/workflows/index.js');
    _workflows = mod.default;
  }
  return _workflows;
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
      trigger: trigger || { type: 'manual' },
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
    const list = await workflows.list();
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
router.get('/:id', async (req, res) => {
  try {
    const workflows = await getWorkflows();
    const workflow = await workflows.get(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/workflows/:id — Update a workflow
 */
router.put('/:id', async (req, res) => {
  try {
    const workflows = await getWorkflows();
    const updated = await workflows.update(req.params.id, req.body);
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
router.delete('/:id', async (req, res) => {
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
router.post('/:id/run', async (req, res) => {
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
      authToken: authToken || req.user?.sessionCookie,
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
router.get('/:id/runs', async (req, res) => {
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
router.get('/:id/runs/:runId', async (req, res) => {
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

// ============================================================================
// Webhook Trigger
// ============================================================================

/**
 * POST /api/workflows/webhook/:webhookId — External webhook trigger
 */
router.post('/webhook/:webhookId', async (req, res) => {
  try {
    const workflows = await getWorkflows();
    const handled = workflows.triggerManager.handleWebhook(req.params.webhookId, req.body);
    
    if (!handled) {
      return res.status(404).json({ error: 'Unknown webhook ID' });
    }

    res.json({ success: true, message: 'Workflow triggered' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
