/**
 * XActions Workflow Engine
 * The core execution engine that runs workflow pipelines
 * 
 * Processes workflow steps sequentially, managing context (variables),
 * evaluating conditions, and logging execution results.
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import crypto from 'crypto';
import { executeAction, closeBrowser } from './actions.js';
import { evaluateCondition } from './conditions.js';
import { getStore } from './store.js';

// ============================================================================
// Workflow Engine
// ============================================================================

/**
 * Run a workflow
 * 
 * @param {object} workflow - Workflow definition (JSON)
 * @param {object} [options]
 * @param {string} [options.trigger='manual'] - What triggered this run
 * @param {object} [options.initialContext={}] - Initial variables
 * @param {string} [options.authToken] - X/Twitter session cookie
 * @param {string} [options.userId] - User ID for tracking
 * @param {function} [options.onProgress] - Progress callback: (event) => void
 * @param {function} [options.isCancelled] - Cancellation check: () => boolean
 * @returns {Promise<object>} - Execution result with full log
 */
export async function runWorkflow(workflow, options = {}) {
  const store = await getStore();
  const runId = crypto.randomUUID();
  
  // Initialize execution record
  const run = {
    id: runId,
    workflowId: workflow.id || 'anonymous',
    workflowName: workflow.name || 'Unnamed Workflow',
    status: 'running',
    trigger: options.trigger || 'manual',
    userId: options.userId || 'system',
    startedAt: new Date().toISOString(),
    completedAt: null,
    stepsCompleted: 0,
    totalSteps: workflow.steps?.length || 0,
    steps: [],
    context: {},
    error: null,
    result: null,
  };

  // Save initial run record
  await store.saveRun(run);

  // Workflow execution context (variables passed between steps)
  const context = {
    ...options.initialContext,
    _workflow: { id: workflow.id, name: workflow.name },
    _run: { id: runId, trigger: run.trigger },
    _timestamp: new Date().toISOString(),
    authToken: options.authToken || process.env.XACTIONS_SESSION_COOKIE,
  };

  const notify = options.onProgress || (() => {});

  try {
    notify({ type: 'start', runId, workflow: workflow.name, totalSteps: run.totalSteps });
    
    const steps = workflow.steps || [];
    
    for (let i = 0; i < steps.length; i++) {
      // Check cancellation
      if (options.isCancelled && options.isCancelled()) {
        run.status = 'cancelled';
        run.error = 'Workflow cancelled by user';
        break;
      }

      const step = steps[i];
      const stepLog = {
        index: i,
        type: step.condition ? 'condition' : 'action',
        name: step.action || 'condition',
        startedAt: new Date().toISOString(),
        completedAt: null,
        status: 'running',
        result: null,
        error: null,
      };

      notify({ type: 'step_start', runId, step: i, name: stepLog.name, total: steps.length });

      try {
        if (step.condition) {
          // --- Condition Step ---
          const evaluation = evaluateCondition(step.condition, context);
          stepLog.result = evaluation;
          stepLog.status = 'completed';
          
          if (!evaluation.passed) {
            // Condition failed — skip remaining steps (or jump if configured)
            stepLog.status = 'skipped';
            run.steps.push(stepLog);
            
            if (step.onFail === 'skip') {
              // Skip just this condition, continue to next step
              notify({ type: 'step_skip', runId, step: i, reason: evaluation.details });
              continue;
            }
            
            // Default: stop the workflow
            notify({ type: 'condition_failed', runId, step: i, details: evaluation.details });
            run.status = 'completed';
            run.result = { stoppedAtCondition: i, reason: evaluation.details, context: sanitizeContext(context) };
            break;
          }
          
          notify({ type: 'condition_passed', runId, step: i, details: evaluation.details });
        } else if (step.action) {
          // --- Action Step ---
          const result = await executeAction(step, context);
          
          // Store result in context if output variable specified
          if (step.output) {
            context[step.output] = result;
          }
          
          stepLog.result = summarizeResult(result);
          stepLog.status = 'completed';
          
          notify({ type: 'step_complete', runId, step: i, name: step.action, output: step.output });
        } else {
          stepLog.status = 'skipped';
          stepLog.error = 'Step has no action or condition';
        }
      } catch (error) {
        stepLog.status = 'failed';
        stepLog.error = error.message;
        
        notify({ type: 'step_error', runId, step: i, error: error.message });
        
        // Check error handling strategy
        if (step.onError === 'continue') {
          // Continue to next step despite error
          run.steps.push({ ...stepLog, completedAt: new Date().toISOString() });
          run.stepsCompleted++;
          continue;
        }
        
        // Default: abort workflow
        run.status = 'failed';
        run.error = `Step ${i} (${step.action || 'condition'}) failed: ${error.message}`;
        run.steps.push({ ...stepLog, completedAt: new Date().toISOString() });
        await store.updateRun(run);
        
        notify({ type: 'failed', runId, error: run.error });
        return run;
      }

      stepLog.completedAt = new Date().toISOString();
      run.steps.push(stepLog);
      run.stepsCompleted = i + 1;
      
      // Persist progress periodically
      if (i % 3 === 0 || i === steps.length - 1) {
        await store.updateRun(run);
      }
    }

    // Workflow completed
    if (run.status === 'running') {
      run.status = 'completed';
      run.result = sanitizeContext(context);
    }
    
    run.completedAt = new Date().toISOString();
    run.context = sanitizeContext(context);
    await store.updateRun(run);
    
    notify({ type: 'complete', runId, status: run.status, stepsCompleted: run.stepsCompleted });
    
    return run;
  } catch (error) {
    run.status = 'failed';
    run.error = error.message;
    run.completedAt = new Date().toISOString();
    await store.updateRun(run);
    
    notify({ type: 'failed', runId, error: error.message });
    
    return run;
  } finally {
    // Don't close browser here — it's pooled and reused
    // closeBrowser() should be called on application shutdown
  }
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate a workflow definition
 * @param {object} workflow
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateWorkflow(workflow) {
  const errors = [];
  
  if (!workflow) {
    return { valid: false, errors: ['Workflow is null or undefined'] };
  }
  
  if (!workflow.name || typeof workflow.name !== 'string') {
    errors.push('Workflow must have a "name" (string)');
  }
  
  if (!workflow.steps || !Array.isArray(workflow.steps)) {
    errors.push('Workflow must have a "steps" array');
  } else {
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      if (!step.action && !step.condition) {
        errors.push(`Step ${i}: must have either "action" or "condition"`);
      }
    }
  }
  
  if (workflow.trigger && typeof workflow.trigger === 'object') {
    if (!workflow.trigger.type) {
      errors.push('Trigger must have a "type" field');
    }
    if (workflow.trigger.type === 'schedule' && !workflow.trigger.cron) {
      errors.push('Schedule trigger requires a "cron" field');
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Sanitize context for storage (remove sensitive data, limit size)
 */
function sanitizeContext(context) {
  const safe = {};
  for (const [key, value] of Object.entries(context)) {
    // Skip internal/sensitive keys
    if (key === 'authToken' || key.startsWith('_')) continue;
    
    // Truncate large values
    if (typeof value === 'string' && value.length > 10000) {
      safe[key] = value.slice(0, 10000) + '... (truncated)';
    } else if (Array.isArray(value) && value.length > 100) {
      safe[key] = { _truncated: true, count: value.length, sample: value.slice(0, 5) };
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

/**
 * Summarize a result for logging (avoid storing huge objects)
 */
function summarizeResult(result) {
  if (result === null || result === undefined) return null;
  if (typeof result === 'string') return result.slice(0, 500);
  if (typeof result === 'number' || typeof result === 'boolean') return result;
  if (Array.isArray(result)) {
    return { type: 'array', count: result.length, sample: result.slice(0, 2) };
  }
  if (typeof result === 'object') {
    const keys = Object.keys(result);
    if (keys.length > 20) {
      return { type: 'object', keys: keys.length, topKeys: keys.slice(0, 10) };
    }
    return result;
  }
  return String(result).slice(0, 500);
}
