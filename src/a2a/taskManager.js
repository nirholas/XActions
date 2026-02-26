/**
 * XActions A2A — Task Manager
 *
 * Full lifecycle management for A2A tasks: creation, state transitions,
 * artifact storage, history tracking, execution, and cleanup.
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import {
  TASK_STATES,
  VALID_TRANSITIONS,
  createTask,
  createMessage,
  createTextPart,
  createDataPart,
  isValidTransition,
} from './types.js';

// ============================================================================
// TaskStore — In-memory task storage with lifecycle management
// ============================================================================

export class TaskStore {
  /**
   * @param {object} [options={}]
   * @param {number} [options.maxTasks=10000]
   * @param {number} [options.ttlMs=86400000] - Task TTL (default 24h)
   */
  constructor(options = {}) {
    this.maxTasks = options.maxTasks || 10000;
    this.ttlMs = options.ttlMs || 24 * 60 * 60 * 1000;
    /** @type {Map<string, object>} */
    this.tasks = new Map();
    /** @type {Set<string>} locked task IDs */
    this._locks = new Set();
    /** @type {Array<function>} event listeners */
    this._listeners = [];
  }

  /**
   * Register an event listener for task changes.
   * @param {function} fn - (event: string, taskId: string, data: object) => void
   */
  on(fn) {
    this._listeners.push(fn);
  }

  /** Emit an event to all listeners */
  _emit(event, taskId, data) {
    for (const fn of this._listeners) {
      try { fn(event, taskId, data); } catch { /* swallow listener errors */ }
    }
  }

  /**
   * Create a new task.
   *
   * @param {object} [params={}]
   * @param {string} [params.id] - Client-provided task ID
   * @param {string} [params.contextId] - Conversation context
   * @param {object} [params.message] - Initial message
   * @param {object} [params.metadata] - Arbitrary metadata
   * @returns {object} The created task
   */
  async create(params = {}) {
    if (this.tasks.size >= this.maxTasks) {
      this.cleanup(); // Try to free space
      if (this.tasks.size >= this.maxTasks) {
        throw new Error(`Task store full (max ${this.maxTasks}). Cannot create new task.`);
      }
    }
    const task = createTask(params);
    this.tasks.set(task.id, task);
    this._emit('created', task.id, task);
    return task;
  }

  /**
   * Get a task by ID.
   *
   * @param {string} taskId
   * @returns {object|null}
   */
  async get(taskId) {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Partial update of a task.
   *
   * @param {string} taskId
   * @param {object} updates
   * @returns {object} Updated task
   */
  async update(taskId, updates) {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    Object.assign(task, updates);
    this._emit('updated', taskId, updates);
    return task;
  }

  /**
   * Transition a task to a new state with validation.
   *
   * @param {string} taskId
   * @param {string} newState
   * @param {string} [message='']
   * @returns {object} Updated task
   */
  async transition(taskId, newState, message = '') {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    const currentState = task.status.state;
    if (!isValidTransition(currentState, newState)) {
      const allowed = VALID_TRANSITIONS[currentState]?.join(', ') || 'none';
      throw new Error(
        `Invalid state transition: "${currentState}" → "${newState}". Allowed: ${allowed}`
      );
    }

    const now = new Date().toISOString();
    task.status = { state: newState, message: message || `Transitioned to ${newState}`, timestamp: now };
    task.history.push({ state: newState, message: task.status.message, timestamp: now });
    this._emit('transition', taskId, { from: currentState, to: newState, message: task.status.message });
    return task;
  }

  /**
   * Add an artifact to a task.
   *
   * @param {string} taskId
   * @param {object} artifact - { name, description, parts, index? }
   * @returns {object} Updated task
   */
  async addArtifact(taskId, artifact) {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    const idx = artifact.index ?? task.artifacts.length;
    task.artifacts.push({ ...artifact, index: idx });
    this._emit('artifact', taskId, artifact);
    return task;
  }

  /**
   * Append a message to a task's message log.
   *
   * @param {string} taskId
   * @param {object} message - A2A Message object
   * @returns {object} Updated task
   */
  async addMessage(taskId, message) {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    task.messages.push(message);
    this._emit('message', taskId, message);
    return task;
  }

  /**
   * List tasks with optional filtering.
   *
   * @param {object} [filters={}]
   * @param {string} [filters.state]
   * @param {string} [filters.contextId]
   * @param {string} [filters.before] - ISO date
   * @param {string} [filters.after] - ISO date
   * @param {number} [filters.limit=50]
   * @param {number} [filters.offset=0]
   * @returns {object[]}
   */
  async list(filters = {}) {
    let results = Array.from(this.tasks.values());

    if (filters.state) results = results.filter(t => t.status.state === filters.state);
    if (filters.contextId) results = results.filter(t => t.contextId === filters.contextId);
    if (filters.after) {
      const after = new Date(filters.after).getTime();
      results = results.filter(t => new Date(t.status.timestamp).getTime() > after);
    }
    if (filters.before) {
      const before = new Date(filters.before).getTime();
      results = results.filter(t => new Date(t.status.timestamp).getTime() < before);
    }

    // Sort by newest first
    results.sort((a, b) => new Date(b.status.timestamp) - new Date(a.status.timestamp));

    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    return results.slice(offset, offset + limit);
  }

  /**
   * Delete a task.
   *
   * @param {string} taskId
   * @returns {boolean}
   */
  async delete(taskId) {
    const existed = this.tasks.delete(taskId);
    if (existed) this._emit('deleted', taskId, {});
    return existed;
  }

  /**
   * Remove expired tasks older than TTL.
   *
   * @returns {number} Number of tasks purged
   */
  cleanup() {
    const cutoff = Date.now() - this.ttlMs;
    let purged = 0;
    for (const [id, task] of this.tasks) {
      const ts = new Date(task.status.timestamp).getTime();
      if (ts < cutoff) {
        this.tasks.delete(id);
        purged++;
      }
    }
    if (purged > 0) console.log(`🧹 A2A TaskStore cleanup: purged ${purged} expired tasks`);
    return purged;
  }

  /**
   * Get task store statistics.
   *
   * @returns {object} { total, byState, oldest, newest }
   */
  getStats() {
    const byState = {};
    for (const state of Object.values(TASK_STATES)) byState[state] = 0;
    let oldest = null;
    let newest = null;

    for (const task of this.tasks.values()) {
      byState[task.status.state] = (byState[task.status.state] || 0) + 1;
      const ts = task.status.timestamp;
      if (!oldest || ts < oldest) oldest = ts;
      if (!newest || ts > newest) newest = ts;
    }

    return { total: this.tasks.size, byState, oldest, newest };
  }

  /**
   * Acquire a lock for a task (for concurrency control).
   *
   * @param {string} taskId
   * @returns {boolean} true if lock acquired
   */
  acquireLock(taskId) {
    if (this._locks.has(taskId)) return false;
    this._locks.add(taskId);
    return true;
  }

  /**
   * Release a task lock.
   *
   * @param {string} taskId
   */
  releaseLock(taskId) {
    this._locks.delete(taskId);
  }
}

// ============================================================================
// TaskExecutor — Executes tasks by routing to MCP tools
// ============================================================================

export class TaskExecutor {
  /**
   * @param {TaskStore} taskStore
   * @param {object} mcpBridge - Bridge object with execute(skillId, inputParts) method
   */
  constructor(taskStore, mcpBridge) {
    this.store = taskStore;
    this.bridge = mcpBridge;
    /** @type {Map<string, { step: number, total: number, description: string }>} */
    this._progress = new Map();
  }

  /**
   * Execute a task end-to-end.
   *
   * @param {string} taskId
   * @returns {Promise<object>} Final task state
   */
  async execute(taskId) {
    // Acquire lock to prevent double execution
    if (!this.store.acquireLock(taskId)) {
      throw new Error(`Task ${taskId} is already executing`);
    }

    try {
      const task = await this.store.get(taskId);
      if (!task) throw new Error(`Task not found: ${taskId}`);

      // Transition to working
      await this.store.transition(taskId, TASK_STATES.WORKING, 'Executing task');

      this._progress.set(taskId, { step: 0, total: 1, description: 'Parsing input' });

      // Determine which skill to invoke
      const skillId = task.metadata?.skillId;
      const inputParts = task.messages?.[0]?.parts || [];

      if (!skillId && inputParts.length === 0) {
        await this.store.transition(taskId, TASK_STATES.FAILED, 'No skill ID or input provided');
        return this.store.get(taskId);
      }

      this._progress.set(taskId, { step: 0, total: 1, description: `Executing ${skillId || 'task'}` });

      // Execute via bridge
      const result = await this.bridge.execute(skillId, inputParts);

      if (result.success) {
        // Add result as artifact
        await this.store.addArtifact(taskId, {
          name: 'result',
          description: `Output from ${skillId || 'execution'}`,
          parts: result.artifacts || [],
        });
        // Add agent response message
        const responseParts = result.artifacts?.length > 0
          ? result.artifacts
          : [createTextPart('Task completed successfully')];
        await this.store.addMessage(taskId, createMessage('agent', responseParts));
        await this.store.transition(taskId, TASK_STATES.COMPLETED, 'Task completed successfully');
      } else {
        await this.store.addMessage(
          taskId,
          createMessage('agent', [createTextPart(`Error: ${result.error}`)])
        );
        await this.store.transition(taskId, TASK_STATES.FAILED, result.error || 'Execution failed');
      }

      this._progress.delete(taskId);
      return this.store.get(taskId);
    } finally {
      this.store.releaseLock(taskId);
    }
  }

  /**
   * Cancel a running task.
   *
   * @param {string} taskId
   * @returns {Promise<object>}
   */
  async cancel(taskId) {
    const task = await this.store.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    await this.store.transition(taskId, TASK_STATES.CANCELED, 'Task canceled by request');
    this._progress.delete(taskId);
    return this.store.get(taskId);
  }

  /**
   * Get progress info for a running task.
   *
   * @param {string} taskId
   * @returns {object|null}
   */
  getProgress(taskId) {
    return this._progress.get(taskId) || null;
  }
}

// ============================================================================
// Factory
// ============================================================================

let _cleanupInterval = null;

/**
 * Create a TaskManager instance (store + executor).
 *
 * @param {object} [options={}]
 * @param {object} options.bridge - MCP bridge with execute() method
 * @param {number} [options.maxTasks=10000]
 * @param {number} [options.ttlMs=86400000]
 * @param {number} [options.cleanupIntervalMs=3600000] - Cleanup interval (default 1h)
 * @returns {{ store: TaskStore, executor: TaskExecutor, shutdown: function }}
 */
export function createTaskManager(options = {}) {
  const store = new TaskStore({
    maxTasks: options.maxTasks,
    ttlMs: options.ttlMs,
  });
  const executor = new TaskExecutor(store, options.bridge || { execute: async () => ({ success: false, error: 'No bridge configured', artifacts: [] }) });

  // Background cleanup
  const interval = options.cleanupIntervalMs || 60 * 60 * 1000;
  _cleanupInterval = setInterval(() => store.cleanup(), interval);

  const shutdown = () => {
    if (_cleanupInterval) {
      clearInterval(_cleanupInterval);
      _cleanupInterval = null;
    }
  };

  return { store, executor, shutdown };
}
