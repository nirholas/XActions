/**
 * XActions A2A — Multi-Agent Orchestrator
 *
 * Decomposes complex tasks into sub-tasks, delegates to the best agents
 * (including self), and aggregates results with dependency resolution.
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import { createTextPart, createDataPart, createMessage, TASK_STATES } from './types.js';
import { getAllSkills, getSkillById } from './skillRegistry.js';
import { applyAuth } from './auth.js';

// ============================================================================
// Task Decomposition Patterns
// ============================================================================

const DECOMPOSITION_PATTERNS = [
  // "analyze X and post/tweet about it"
  {
    pattern: /(?:analyze|study|research)\s+@?(\w+)(?:'?s?)?\s+.+?\s+(?:and|then)\s+(?:post|tweet|publish)\s+(.+)/i,
    decompose: (m) => [
      { skill: 'xactions.x_get_profile', params: { username: m[1] }, label: `Get profile: @${m[1]}` },
      { skill: 'xactions.x_get_tweets', params: { username: m[1], count: 100 }, label: `Get tweets: @${m[1]}` },
      { skill: 'xactions.x_engagement_report', params: {}, label: 'Analyze engagement', deps: ['$step1', '$step2'] },
      { skill: 'xactions.x_post_tweet', params: { text: '$step3.summary' }, label: 'Post findings', deps: ['$step3'] },
    ],
  },
  // "compare X and Y"
  {
    pattern: /compare\s+@?(\w+)\s+(?:and|vs|with)\s+@?(\w+)/i,
    decompose: (m) => [
      { skill: 'xactions.x_get_profile', params: { username: m[1] }, label: `Profile: @${m[1]}` },
      { skill: 'xactions.x_get_profile', params: { username: m[2] }, label: `Profile: @${m[2]}` },
      { skill: 'xactions.x_compare_accounts', params: { usernameA: m[1], usernameB: m[2] }, label: 'Compare accounts', deps: ['$step1', '$step2'] },
    ],
  },
  // "find influencers in X and follow"
  {
    pattern: /find\s+influencers?\s+(?:in|for)\s+(.+?)\s+(?:and|then)\s+follow/i,
    decompose: (m) => [
      { skill: 'xactions.x_find_influencers', params: { niche: m[1], count: 10 }, label: `Find influencers: ${m[1]}` },
      { skill: 'xactions.x_auto_follow', params: { query: m[1], count: 10 }, label: 'Follow influencers', deps: ['$step1'] },
    ],
  },
  // "scrape tweets from X and analyze sentiment"
  {
    pattern: /scrape\s+tweets?\s+(?:from|by)\s+@?(\w+)\s+(?:and|then)\s+(?:analyze|check)\s+sentiment/i,
    decompose: (m) => [
      { skill: 'xactions.x_get_tweets', params: { username: m[1], count: 50 }, label: `Scrape tweets: @${m[1]}` },
      { skill: 'xactions.x_analyze_sentiment', params: { query: `from:${m[1]}` }, label: 'Analyze sentiment', deps: ['$step1'] },
    ],
  },
  // "monitor @X and alert on unfollowers"
  {
    pattern: /monitor\s+@?(\w+)\s+(?:and|then)?\s*(?:alert|notify)\s+(?:on\s+)?unfollowers/i,
    decompose: (m) => [
      { skill: 'xactions.x_monitor_account', params: { username: m[1] }, label: `Monitor: @${m[1]}` },
      { skill: 'xactions.x_follower_alerts', params: { username: m[1] }, label: 'Set up alerts' },
    ],
  },
];

// ============================================================================
// TaskDecomposer
// ============================================================================

export class TaskDecomposer {
  /**
   * Decompose a complex natural language task into ordered sub-tasks.
   *
   * @param {string} complexTask
   * @returns {Array<{ skill: string, params: object, label: string, deps?: string[], agent?: string }>}
   */
  decompose(complexTask) {
    if (!complexTask || typeof complexTask !== 'string') return [];

    // Try pattern matching first
    for (const { pattern, decompose } of DECOMPOSITION_PATTERNS) {
      const match = complexTask.match(pattern);
      if (match) {
        return decompose(match).map((step, i) => ({
          ...step,
          agent: 'self',
          stepIndex: i + 1,
        }));
      }
    }

    // Fallback: treat as a single task
    return [{
      skill: null,
      params: {},
      label: complexTask,
      agent: 'self',
      stepIndex: 1,
      rawText: complexTask,
    }];
  }

  /**
   * Identify which steps can run in parallel (no dependency between them).
   *
   * @param {Array<object>} steps
   * @returns {{ parallel: number[][], sequential: number[] }}
   */
  identifyParallelizable(steps) {
    const parallel = [];
    const sequential = [];
    let currentBatch = [];

    for (let i = 0; i < steps.length; i++) {
      const deps = steps[i].deps || [];
      const hasDeps = deps.length > 0;

      if (hasDeps) {
        if (currentBatch.length > 0) parallel.push([...currentBatch]);
        currentBatch = [];
        sequential.push(i + 1);
      } else {
        currentBatch.push(i + 1);
      }
    }

    if (currentBatch.length > 0) parallel.push(currentBatch);

    return { parallel, sequential };
  }
}

// ============================================================================
// Delegator — Route sub-tasks to agents
// ============================================================================

export class Delegator {
  /**
   * @param {import('./discovery.js').AgentRegistry} registry
   * @param {import('./discovery.js').TrustScorer} trust
   */
  constructor(registry, trust) {
    this.registry = registry;
    this.trust = trust;
  }

  /**
   * Select the best agent for a skill.
   *
   * @param {string} skillId
   * @param {Array<{ url: string, card: object }>} availableAgents
   * @returns {Promise<{ agentUrl: string, agentName: string }|null>}
   */
  async selectAgent(skillId, availableAgents = []) {
    // Prefer self (XActions) if skill is local
    const localSkill = getSkillById(skillId);
    if (localSkill) return { agentUrl: 'self', agentName: 'XActions Agent' };

    // Rank remote agents by trust score
    const candidates = [];
    for (const agent of availableAgents) {
      const hasSkill = agent.card?.skills?.some(s => s.id === skillId);
      if (hasSkill) {
        const score = await this.trust.score(agent.url);
        candidates.push({ agentUrl: agent.url, agentName: agent.card?.name || agent.url, score });
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0] || null;
  }

  /**
   * Delegate a task to a remote agent.
   *
   * @param {string} agentUrl
   * @param {{ skillId: string, message: object }} task
   * @returns {Promise<object>} Remote task result
   */
  async delegate(agentUrl, task) {
    const start = Date.now();
    const headers = { 'Content-Type': 'application/json' };
    await applyAuth(headers, agentUrl);

    try {
      const response = await fetch(`${agentUrl.replace(/\/$/, '')}/a2a/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tasks/send',
          params: {
            message: task.message,
            metadata: { skillId: task.skillId },
          },
          id: `xactions-${Date.now()}`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Remote agent returned HTTP ${response.status}`);
      }

      const result = await response.json();
      await this.trust.record(agentUrl, { type: 'success', duration: Date.now() - start });

      // If task needs polling (not immediately completed)
      if (result.result?.status?.state === TASK_STATES.WORKING || result.result?.status?.state === TASK_STATES.SUBMITTED) {
        return await this._pollForCompletion(agentUrl, result.result.id, headers);
      }

      return result.result || result;
    } catch (err) {
      await this.trust.record(agentUrl, { type: 'failure', duration: Date.now() - start });
      throw new Error(`Delegation to ${agentUrl} failed: ${err.message}`);
    }
  }

  /**
   * Poll a remote task until completion.
   * @private
   */
  async _pollForCompletion(agentUrl, taskId, headers, maxWait = 120000) {
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const resp = await fetch(`${agentUrl.replace(/\/$/, '')}/a2a/tasks/${taskId}`, { headers });
        if (!resp.ok) continue;
        const task = await resp.json();
        const state = task.status?.state;
        if ([TASK_STATES.COMPLETED, TASK_STATES.FAILED, TASK_STATES.CANCELED].includes(state)) {
          return task;
        }
      } catch { /* retry */ }
    }
    throw new Error(`Timeout waiting for task ${taskId} on ${agentUrl}`);
  }

  /**
   * Delegate with retry and exponential backoff.
   *
   * @param {string} agentUrl
   * @param {object} task
   * @param {number} [maxRetries=3]
   * @returns {Promise<object>}
   */
  async delegateWithRetry(agentUrl, task, maxRetries = 3) {
    let lastErr;
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await this.delegate(agentUrl, task);
      } catch (err) {
        lastErr = err;
        if (i < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
        }
      }
    }
    throw lastErr;
  }

  /**
   * Try agents in order until one succeeds.
   *
   * @param {Array<{ url: string }>} agents
   * @param {object} task
   * @returns {Promise<object>}
   */
  async delegateWithFallback(agents, task) {
    for (const agent of agents) {
      try {
        return await this.delegate(agent.url, task);
      } catch {
        continue;
      }
    }
    throw new Error('All agents failed to handle the task');
  }
}

// ============================================================================
// Orchestrator
// ============================================================================

export class Orchestrator {
  /**
   * @param {object} deps
   * @param {import('./discovery.js').AgentRegistry} deps.registry
   * @param {import('./discovery.js').TrustScorer} deps.trust
   * @param {import('./taskManager.js').TaskStore} deps.taskStore
   * @param {object} deps.bridge - A2A ↔ MCP bridge
   */
  constructor({ registry, trust, taskStore, bridge }) {
    this.decomposer = new TaskDecomposer();
    this.delegator = new Delegator(registry, trust);
    this.taskStore = taskStore;
    this.bridge = bridge;
    this.registry = registry;
    /** @type {Array<function>} */
    this._progressCallbacks = [];
  }

  /**
   * Register a progress callback.
   * @param {function} fn - (event) => void
   */
  onProgress(fn) {
    this._progressCallbacks.push(fn);
  }

  /** Emit progress */
  _notify(event) {
    for (const fn of this._progressCallbacks) {
      try { fn(event); } catch { /* swallow */ }
    }
  }

  /**
   * Get the execution plan without running it.
   *
   * @param {string} taskDescription
   * @returns {Promise<object>}
   */
  async getExecutionPlan(taskDescription) {
    const steps = this.decomposer.decompose(taskDescription);
    const { parallel, sequential } = this.decomposer.identifyParallelizable(steps);
    const agents = await this.registry.list({ isHealthy: true });

    const plan = steps.map((step, i) => ({
      step: i + 1,
      skill: step.skill,
      label: step.label,
      params: step.params,
      deps: step.deps || [],
      // Determine likely agent
      agent: step.agent === 'self' && getSkillById(step.skill) ? 'XActions (self)' : 'Pending agent selection',
    }));

    return { steps: plan, parallel, sequential, totalSteps: steps.length };
  }

  /**
   * Execute a complex orchestrated task.
   *
   * @param {string} taskDescription
   * @param {object} [options={}]
   * @param {boolean} [options.stopOnError=false]
   * @returns {Promise<{ success: boolean, results: object[], artifacts: object[], errors: string[] }>}
   */
  async execute(taskDescription, options = {}) {
    const { stopOnError = false } = options;
    const steps = this.decomposer.decompose(taskDescription);
    const context = {};
    const results = [];
    const allArtifacts = [];
    const errors = [];
    const agents = await this.registry.list({ isHealthy: true });

    this._notify({ type: 'start', totalSteps: steps.length, description: taskDescription });

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      this._notify({ type: 'step-start', step: i + 1, total: steps.length, label: step.label });

      try {
        // Resolve $stepN references in params
        const resolvedParams = this._resolveRefs(step.params, context);

        let result;
        if (step.skill && getSkillById(step.skill)) {
          // Execute locally via bridge
          const inputParts = [createDataPart(resolvedParams)];
          result = await this.bridge.execute(step.skill, inputParts);
        } else if (step.rawText) {
          // Natural language — try bridge NLP
          const inputParts = [createTextPart(step.rawText)];
          result = await this.bridge.execute(null, inputParts);
        } else if (step.skill) {
          // Try to delegate to a remote agent
          const agent = await this.delegator.selectAgent(step.skill, agents);
          if (agent && agent.agentUrl !== 'self') {
            const remoteResult = await this.delegator.delegate(agent.agentUrl, {
              skillId: step.skill,
              message: createMessage('user', [createDataPart(resolvedParams)]),
            });
            result = { success: true, artifacts: remoteResult.artifacts || [] };
          } else {
            result = { success: false, error: `No agent available for skill: ${step.skill}`, artifacts: [] };
          }
        } else {
          result = { success: false, error: 'No skill identified for this step', artifacts: [] };
        }

        context[`$step${i + 1}`] = result.success ? (result.artifacts?.[0]?.data || result) : null;
        results.push({ step: i + 1, label: step.label, success: result.success, result });
        if (result.artifacts) allArtifacts.push(...result.artifacts);

        this._notify({ type: 'step-complete', step: i + 1, success: result.success });

        if (!result.success && stopOnError) {
          errors.push(`Step ${i + 1} (${step.label}): ${result.error}`);
          break;
        }
        if (!result.success) {
          errors.push(`Step ${i + 1} (${step.label}): ${result.error}`);
        }
      } catch (err) {
        errors.push(`Step ${i + 1} (${step.label}): ${err.message}`);
        results.push({ step: i + 1, label: step.label, success: false, error: err.message });
        this._notify({ type: 'step-error', step: i + 1, error: err.message });
        if (stopOnError) break;
      }
    }

    const success = errors.length === 0;
    this._notify({ type: 'complete', success, totalSteps: steps.length, errors: errors.length });

    return { success, results, artifacts: allArtifacts, errors };
  }

  /**
   * Resolve $stepN references in params.
   * @private
   */
  _resolveRefs(params, context) {
    if (!params || typeof params !== 'object') return params;
    const resolved = {};
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.startsWith('$step')) {
        const match = value.match(/^\$step(\d+)(?:\.(.+))?$/);
        if (match) {
          const stepData = context[`$step${match[1]}`];
          if (match[2] && stepData && typeof stepData === 'object') {
            resolved[key] = stepData[match[2]] ?? value;
          } else {
            resolved[key] = stepData ?? value;
          }
        } else {
          resolved[key] = value;
        }
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create an orchestrator instance.
 *
 * @param {object} deps
 * @returns {Orchestrator}
 */
export function createOrchestrator(deps) {
  return new Orchestrator(deps);
}
