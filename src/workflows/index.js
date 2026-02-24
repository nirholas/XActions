/**
 * XActions Workflows — Main Entry Point
 * 
 * Usage:
 *   import workflows from './workflows/index.js';
 *   
 *   // Create and run a workflow
 *   const workflow = await workflows.create({ name: 'My Workflow', steps: [...] });
 *   const run = await workflows.run(workflow.id);
 *   
 *   // List workflows and runs
 *   const all = await workflows.list();
 *   const runs = await workflows.runs(workflow.id);
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { runWorkflow, validateWorkflow } from './engine.js';
import { getStore } from './store.js';
import triggerManager from './triggers.js';
import { listActions, registerAction, executeAction, closeBrowser } from './actions.js';
import { evaluateCondition, getAvailableOperators } from './conditions.js';

// ============================================================================
// High-Level Workflow API
// ============================================================================

/**
 * Create a new workflow
 */
async function create(definition) {
  const validation = validateWorkflow(definition);
  if (!validation.valid) {
    throw new Error(`Invalid workflow: ${validation.errors.join(', ')}`);
  }
  
  const store = await getStore();
  const workflow = await store.saveWorkflow({
    ...definition,
    enabled: definition.enabled !== false,
  });

  // Register trigger if defined
  if (workflow.trigger && workflow.trigger.type !== 'manual') {
    await triggerManager.register(workflow.id, workflow.trigger);
  }

  return workflow;
}

/**
 * Get a workflow by ID or name
 */
async function get(idOrName) {
  const store = await getStore();
  let workflow = await store.getWorkflow(idOrName);
  if (!workflow) {
    workflow = await store.findWorkflowByName(idOrName);
  }
  return workflow;
}

/**
 * List all workflows
 */
async function list() {
  const store = await getStore();
  return store.listWorkflows();
}

/**
 * Update a workflow
 */
async function update(id, updates) {
  const store = await getStore();
  const existing = await store.getWorkflow(id);
  if (!existing) {
    throw new Error(`Workflow not found: ${id}`);
  }

  const updated = { ...existing, ...updates, id };
  const validation = validateWorkflow(updated);
  if (!validation.valid) {
    throw new Error(`Invalid workflow: ${validation.errors.join(', ')}`);
  }

  // Re-register trigger if it changed
  if (updates.trigger) {
    await triggerManager.unregister(id);
    if (updated.trigger.type !== 'manual') {
      await triggerManager.register(id, updated.trigger);
    }
  }

  return store.saveWorkflow(updated);
}

/**
 * Delete a workflow
 */
async function remove(id) {
  const store = await getStore();
  await triggerManager.unregister(id);
  return store.deleteWorkflow(id);
}

/**
 * Run a workflow by ID, name, or definition object
 */
async function run(idOrNameOrDef, options = {}) {
  let workflow;

  if (typeof idOrNameOrDef === 'object' && idOrNameOrDef.steps) {
    // Direct workflow definition
    workflow = idOrNameOrDef;
  } else {
    workflow = await get(idOrNameOrDef);
    if (!workflow) {
      throw new Error(`Workflow not found: ${idOrNameOrDef}`);
    }
  }

  return runWorkflow(workflow, options);
}

/**
 * Get execution runs for a workflow
 */
async function runs(workflowId, limit = 20) {
  const store = await getStore();
  return store.listRuns(workflowId, limit);
}

/**
 * Get a specific run
 */
async function getRun(workflowId, runId) {
  const store = await getStore();
  return store.getRun(workflowId, runId);
}

/**
 * Initialize trigger listener (connects triggers to the run engine)
 */
function initTriggers(options = {}) {
  triggerManager.on('trigger', async (event) => {
    console.log(`⚡ Workflow triggered: ${event.workflowId} (${event.type})`);
    try {
      const result = await run(event.workflowId, {
        trigger: event.type,
        initialContext: event.payload || {},
        authToken: options.authToken || process.env.XACTIONS_SESSION_COOKIE,
      });
      console.log(`✅ Workflow ${event.workflowId} completed: ${result.status}`);
    } catch (error) {
      console.error(`❌ Workflow ${event.workflowId} failed:`, error.message);
    }
  });
}

/**
 * Shutdown workflows (clean up triggers, close browsers)
 */
async function shutdown() {
  await triggerManager.shutdown();
  await closeBrowser();
}

// ============================================================================
// Export
// ============================================================================

const workflows = {
  create,
  get,
  list,
  update,
  remove,
  run,
  runs,
  getRun,
  initTriggers,
  shutdown,
  validate: validateWorkflow,
  listActions,
  registerAction,
  executeAction,
  evaluateCondition,
  getAvailableOperators,
  triggerManager,
};

export {
  create,
  get,
  list,
  update,
  remove,
  run,
  runs,
  getRun,
  initTriggers,
  shutdown,
  validateWorkflow,
  listActions,
  registerAction,
  executeAction,
  evaluateCondition,
  getAvailableOperators,
  triggerManager,
};

export default workflows;
