// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions A2A — Protocol Bridge (A2A ↔ MCP)
 *
 * Translates A2A task messages into MCP tool calls, executes them,
 * and converts responses back to A2A artifact parts.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { getSkillById } from './skillRegistry.js';
import { createTextPart, createDataPart, createFilePart, PART_TYPES } from './types.js';
import { WRITE_TOOLS, resolveActionCharge } from '../mcp/tool-groups.js';
import { checkAndRecord, ActionCapExceededError, DEFAULT_ACCOUNT } from '../mcp/action-caps.js';

// ============================================================================
// Natural Language Patterns
// ============================================================================

/**
 * NLP patterns for extracting tool intent + params from plain text.
 * Each pattern: { pattern: RegExp, tool: string, extract: (match) => params }
 */
const NL_PATTERNS = [
  // Profile
  { pattern: /(?:get|fetch|show|scrape)\s+(?:the\s+)?profile\s+(?:for\s+|of\s+)?@?(\w+)/i, tool: 'x_get_profile', extract: (m) => ({ username: m[1] }) },
  { pattern: /(?:who\s+is|look\s*up)\s+@?(\w+)/i, tool: 'x_get_profile', extract: (m) => ({ username: m[1] }) },

  // Followers / Following
  { pattern: /(?:get|scrape|show|list)\s+followers?\s+(?:for\s+|of\s+)?@?(\w+)(?:\s+.*?(\d+))?/i, tool: 'x_get_followers', extract: (m) => ({ username: m[1], ...(m[2] && { count: parseInt(m[2]) }) }) },
  { pattern: /(?:get|scrape|show|list)\s+following\s+(?:for\s+|of\s+)?@?(\w+)(?:\s+.*?(\d+))?/i, tool: 'x_get_following', extract: (m) => ({ username: m[1], ...(m[2] && { count: parseInt(m[2]) }) }) },
  { pattern: /(?:find|get|detect)\s+(?:non[ -]?followers|who\s+doesn'?t?\s+follow\s+back)/i, tool: 'x_get_non_followers', extract: () => ({}) },

  // Tweets
  { pattern: /(?:get|scrape|fetch|show)\s+(?:the\s+)?(?:last|recent)?\s*(\d+)?\s*tweets?\s+(?:from|by|of)\s+@?(\w+)/i, tool: 'x_get_tweets', extract: (m) => ({ username: m[2], ...(m[1] && { count: parseInt(m[1]) }) }) },
  { pattern: /(?:search|find)\s+tweets?\s+(?:about|for|matching|containing)\s+['"]?(.+?)['"]?$/i, tool: 'x_search_tweets', extract: (m) => ({ query: m[1].trim() }) },

  // Posting
  { pattern: /(?:post|send|publish|write)\s+(?:a\s+)?tweet\s+(?:saying|with|that\s+says)\s+['"](.+?)['"]/i, tool: 'x_post_tweet', extract: (m) => ({ text: m[1] }) },
  { pattern: /(?:post|send|publish|write)\s+(?:a\s+)?tweet\s+(?:saying|with|that\s+says)\s+(.+)$/i, tool: 'x_post_tweet', extract: (m) => ({ text: m[1].trim() }) },
  { pattern: /(?:tweet|post)\s+['"](.+?)['"]/i, tool: 'x_post_tweet', extract: (m) => ({ text: m[1] }) },

  // Thread
  { pattern: /(?:post|create|publish)\s+(?:a\s+)?thread/i, tool: 'x_post_thread', extract: () => ({}) },

  // Unfollow / Follow. The specific unfollow forms come first, and "follow"
  // is anchored on a word boundary, so "unfollow @nasa" can never be read as
  // a follow (the \b also stops "unfollow" matching inside other words).
  { pattern: /\bunfollow\s+(?:all\s+)?non[ -]?followers/i, tool: 'x_unfollow_non_followers', extract: () => ({}) },
  { pattern: /\bunfollow\s+everyone|\bmass\s+unfollow/i, tool: 'x_unfollow_all', extract: () => ({}) },
  { pattern: /\bunfollow\s+@?(\w+)/i, tool: 'x_unfollow', extract: (m) => ({ username: m[1] }) },
  { pattern: /\bfollow\s+@?(\w+)/i, tool: 'x_follow', extract: (m) => ({ username: m[1] }) },

  // Like / Retweet / Reply
  { pattern: /(?:like)\s+(?:tweet\s+)?(?:https?:\/\/(?:x|twitter)\.com\/\w+\/status\/)?(\d+)/i, tool: 'x_like', extract: (m) => ({ tweetId: m[1] }) },
  { pattern: /(?:retweet|repost)\s+(?:tweet\s+)?(?:https?:\/\/(?:x|twitter)\.com\/\w+\/status\/)?(\d+)/i, tool: 'x_retweet', extract: (m) => ({ tweetId: m[1] }) },
  { pattern: /(?:reply\s+to)\s+(?:tweet\s+)?(?:https?:\/\/(?:x|twitter)\.com\/\w+\/status\/)?(\d+)\s+(?:with|saying)\s+['"](.+?)['"]/i, tool: 'x_reply', extract: (m) => ({ tweetId: m[1], text: m[2] }) },

  // Analytics
  { pattern: /(?:get|show|check)\s+(?:my\s+)?analytics/i, tool: 'x_get_analytics', extract: () => ({}) },
  { pattern: /(?:engagement|analytics)\s+report/i, tool: 'x_engagement_report', extract: () => ({}) },
  { pattern: /(?:best|optimal)\s+time\s+to\s+post/i, tool: 'x_best_time_to_post', extract: () => ({}) },

  // Trends / Explore
  { pattern: /(?:get|show|what'?s?)\s+(?:\w+\s+)?(?:the\s+)?(?:trending|trends)/i, tool: 'x_get_trends', extract: () => ({}) },

  // DMs
  { pattern: /(?:send|dm)\s+(?:a\s+)?(?:dm|message|direct\s+message)\s+to\s+@?(\w+)\s+(?:saying|with)\s+['"](.+?)['"]/i, tool: 'x_send_dm', extract: (m) => ({ username: m[1], message: m[2] }) },

  // Video
  { pattern: /(?:download|save)\s+(?:the\s+)?video\s+(?:from\s+)?(https?:\/\/[^\s]+)/i, tool: 'x_download_video', extract: (m) => ({ tweetUrl: m[1] }) },

  // Bookmarks
  { pattern: /(?:get|show|list)\s+(?:my\s+)?bookmarks/i, tool: 'x_get_bookmarks', extract: () => ({}) },

  // Competitor
  { pattern: /(?:analyze|compare)\s+(?:competitor\s+)?@?(\w+)(?:'?s?)?\s+(?:strategy|account)/i, tool: 'x_competitor_analysis', extract: (m) => ({ competitor: m[1] }) },

  // Sentiment
  { pattern: /(?:analyze|check)\s+sentiment\s+(?:for|of|about)\s+['"]?(.+?)['"]?$/i, tool: 'x_analyze_sentiment', extract: (m) => ({ query: m[1].trim() }) },

  // Persona
  { pattern: /(?:create|make)\s+(?:a\s+)?persona\s+(?:named\s+)?['"]?(\w+)['"]?\s+(?:for|in)\s+(?:the\s+)?['"]?(.+?)['"]?$/i, tool: 'x_persona_create', extract: (m) => ({ name: m[1], niche: m[2].trim() }) },
  { pattern: /(?:list|show)\s+(?:all\s+)?personas/i, tool: 'x_persona_list', extract: () => ({}) },

  // Graph
  { pattern: /(?:build|create)\s+(?:a\s+)?(?:social\s+)?graph\s+(?:for\s+)?@?(\w+)/i, tool: 'x_graph_build', extract: (m) => ({ username: m[1] }) },
];

// ============================================================================
// Write gate helpers
// ============================================================================

/** The narrow permission that also grants a write of this action class. */
const CLASS_PERMISSION = Object.freeze({
  post: 'post', reply: 'post', repost: 'post',
  follow: 'follow', unfollow: 'follow',
});

function truthy(v) {
  return v !== undefined && v !== '' && !['0', 'false', 'no', 'off'].includes(String(v).toLowerCase());
}

let cachedSessionAccount = null;

/**
 * The ledger account a write is charged to, resolved the way the MCP server
 * resolves it so both lanes draw on one budget.
 */
async function resolveAccount(explicit) {
  if (explicit) return explicit;
  if (process.env.XACTIONS_ACCOUNT) return process.env.XACTIONS_ACCOUNT;
  if (cachedSessionAccount === null) {
    try {
      const { getActiveSession } = await import('../client/auth/storage.js');
      cachedSessionAccount = (await getActiveSession())?.username || '';
    } catch {
      cachedSessionAccount = '';
    }
  }
  return cachedSessionAccount || DEFAULT_ACCOUNT;
}

// ============================================================================
// Bridge Factory
// ============================================================================

/**
 * Create an A2A ↔ MCP protocol bridge.
 *
 * @param {object} [options={}]
 * @param {'local'|'remote'} [options.mode='local']
 * @param {string} [options.sessionCookie]
 * @param {string} [options.apiUrl='https://api.xactions.app']
 * @param {number} [options.timeout=60000]
 * @param {boolean} [options.requireApproval] hold write tools as drafts instead
 *   of running them; defaults to XACTIONS_MCP_REQUIRE_APPROVAL, the same switch
 *   the MCP server honours
 * @param {string} [options.account] ledger account write tools are charged
 *   to; defaults to XACTIONS_ACCOUNT, then the active saved session, then
 *   "default" (the same order the MCP server uses)
 * @param {boolean} [options.enforceActionCaps=true] charge write tools against
 *   the persistent daily action caps (src/mcp/action-caps.js)
 * @returns {object} Bridge with execute(), parseNaturalLanguage(), etc.
 */
export function createBridge(options = {}) {
  const {
    mode = 'local',
    sessionCookie,
    apiUrl = 'https://api.xactions.app',
    timeout = 60000,
    enforceActionCaps = true,
    account,
  } = options;
  const requireApproval = options.requireApproval ?? truthy(process.env.XACTIONS_MCP_REQUIRE_APPROVAL);

  // Lazy-loaded local tools module
  let _localTools = null;

  /**
   * Get the local tools module (lazy import to avoid startup side effects).
   */
  async function getLocalTools() {
    if (!_localTools) {
      try {
        _localTools = await import('../mcp/local-tools.js');
      } catch (err) {
        throw new Error(`Failed to load local tools: ${err.message}`, { cause: err });
      }
    }
    return _localTools;
  }

  // ––––––––– Public API –––––––––

  const bridge = {
    mode,

    /**
     * Execute a skill by ID, converting A2A parts to MCP params and back.
     *
     * @param {string} skillId - A2A skill ID (e.g. 'xactions.x_get_profile')
     * @param {Array<object>} inputParts - A2A message parts
     * @param {{ agent?: { id?: string, permissions?: string[] } | null }} [context]
     *   the authenticated caller; when present its permissions are checked
     * @returns {Promise<{ success: boolean, artifacts: object[], error?: string, duration: number }>}
     */
    async execute(skillId, inputParts, context = {}) {
      const start = Date.now();
      try {
        // Resolve tool name from skill ID
        let toolName;
        let params = {};

        if (skillId) {
          toolName = skillId.replace(/^xactions\./, '');
        }

        // Extract params from input parts
        for (const part of inputParts) {
          if (part.type === PART_TYPES.DATA && part.data) {
            // Data parts used directly as params
            if (typeof part.data === 'object') {
              params = { ...params, ...part.data };
              if (part.data.toolName && !toolName) toolName = part.data.toolName;
            }
          } else if (part.type === PART_TYPES.TEXT && part.text) {
            // Try to parse natural language if no explicit skill ID
            if (!toolName) {
              const parsed = bridge.parseNaturalLanguage(part.text);
              if (parsed) {
                toolName = parsed.tool;
                params = { ...params, ...parsed.params };
              }
            }
            // Also check if the text is JSON
            if (!toolName) {
              try {
                const json = JSON.parse(part.text);
                if (json.tool || json.toolName) {
                  toolName = json.tool || json.toolName;
                  params = { ...params, ...json.params, ...json };
                  delete params.tool;
                  delete params.toolName;
                }
              } catch { /* not JSON */ }
            }
          }
        }

        if (!toolName) {
          return {
            success: false,
            artifacts: [createTextPart('Could not determine which tool to invoke. Provide a skillId or clear natural language instruction.')],
            error: 'No tool identified',
            duration: Date.now() - start,
          };
        }

        // Validate tool exists
        const skill = getSkillById(`xactions.${toolName}`) || getSkillById(toolName);
        if (!skill && !toolName.startsWith('x_')) {
          return {
            success: false,
            artifacts: [createTextPart(`Unknown tool: ${toolName}`)],
            error: `Unknown tool: ${toolName}`,
            duration: Date.now() - start,
          };
        }

        // Permission, approval and daily cap checks run before anything
        // reaches X, exactly as they do for an MCP tool call.
        const refusal = await bridge.authorizeTool(toolName, params, context);
        if (refusal) return { ...refusal, duration: Date.now() - start };

        // Execute the tool
        const result = await bridge.getToolResult(toolName, params);
        const artifacts = bridge._convertResultToArtifacts(result);

        return {
          success: true,
          artifacts,
          duration: Date.now() - start,
        };
      } catch (err) {
        return {
          success: false,
          artifacts: [createTextPart(`Execution error: ${err.message}`)],
          error: err.message,
          duration: Date.now() - start,
        };
      }
    },

    /**
     * Decide whether a resolved tool call may run. Returns null when it may,
     * or a finished execute() result (minus duration) when it may not:
     *
     *   1. A caller identity in `context.agent` must hold the permission the
     *      tool needs (write tools need "write", or "post"/"follow" for their
     *      own action class; read tools need "read", "scrape" or "analytics").
     *   2. With approval mode on, a write tool is saved as a draft for a person
     *      to release with `xactions drafts approve <id>` and is not run.
     *   3. Otherwise a write tool is charged against the daily action caps and
     *      refused when the cap is reached.
     *
     * @param {string} toolName
     * @param {object} params
     * @param {{ agent?: { permissions?: string[] } | null }} [context]
     * @returns {Promise<{ success: boolean, artifacts: object[], error?: string, held?: boolean } | null>}
     */
    async authorizeTool(toolName, params, context = {}) {
      const isWrite = WRITE_TOOLS.has(toolName);
      const charge = isWrite ? resolveActionCharge(toolName, params) : null;
      const charges = charge ? (Array.isArray(charge) ? charge : [charge]) : [];

      if (context?.agent) {
        const granted = Array.isArray(context.agent.permissions) ? context.agent.permissions : [];
        const accepted = isWrite
          ? ['write', ...charges.map((c) => CLASS_PERMISSION[c.actionClass]).filter(Boolean)]
          : ['read', 'scrape', 'analytics', 'write'];
        const allowed = granted.includes('admin') || accepted.some((p) => granted.includes(p));
        if (!allowed) {
          const message = `Permission denied: "${toolName}" needs one of [${[...new Set(accepted)].join(', ')}]; this agent has [${granted.join(', ')}]`;
          return { success: false, artifacts: [createTextPart(message)], error: message };
        }
      }

      if (!isWrite) return null;

      if (requireApproval) {
        const { createDraft } = await import('../mcp/drafts.js');
        const draft = createDraft(toolName, params || {});
        const message = `Approval mode is on. "${toolName}" was saved as draft ${draft.id} and has NOT been executed. A person releases it with \`xactions drafts approve ${draft.id}\`.`;
        return {
          success: true,
          held: true,
          artifacts: [createDataPart({ held: true, draftId: draft.id, tool: draft.tool, args: draft.args, createdAt: draft.createdAt, message }, 'application/json')],
        };
      }

      if (enforceActionCaps && charges.length > 0) {
        const ledgerAccount = await resolveAccount(account);
        try {
          for (const one of charges) checkAndRecord(ledgerAccount, one.actionClass, { count: one.count });
        } catch (err) {
          if (!(err instanceof ActionCapExceededError)) throw err;
          return { success: false, artifacts: [createTextPart(err.message)], error: err.message };
        }
      }
      return null;
    },

    /**
     * Parse natural language text to extract tool name and parameters.
     *
     * @param {string} text
     * @returns {{ tool: string, params: object }|null}
     */
    parseNaturalLanguage(text) {
      if (!text || typeof text !== 'string') return null;
      const cleaned = text.trim();
      for (const { pattern, tool, extract } of NL_PATTERNS) {
        const match = cleaned.match(pattern);
        if (match) {
          return { tool, params: extract(match) };
        }
      }
      return null;
    },

    /**
     * Validate parameters against a tool's input schema.
     *
     * @param {string} toolName
     * @param {object} params
     * @returns {{ valid: boolean, errors: string[] }}
     */
    validateToolParams(toolName, params) {
      const skill = getSkillById(`xactions.${toolName}`);
      if (!skill) return { valid: false, errors: [`Unknown tool: ${toolName}`] };

      const schema = skill.inputSchema;
      if (!schema) return { valid: true, errors: [] };

      const errors = [];
      const required = schema.required || [];
      for (const field of required) {
        if (params[field] === undefined || params[field] === null) {
          errors.push(`Missing required parameter: "${field}"`);
        }
      }
      return { valid: errors.length === 0, errors };
    },

    /**
     * Invoke an MCP tool and return the raw result.
     *
     * @param {string} toolName
     * @param {object} params
     * @returns {Promise<*>}
     */
    async getToolResult(toolName, params) {
      if (mode === 'local') {
        const tools = await getLocalTools();
        const fn = tools[toolName];
        if (typeof fn !== 'function') {
          throw new Error(`Local tool function not found: ${toolName}. Available: ${Object.keys(tools).filter(k => typeof tools[k] === 'function').slice(0, 10).join(', ')}...`);
        }

        // Execute with timeout
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        try {
          const result = await fn(params);
          return result;
        } finally {
          clearTimeout(timer);
        }
      } else {
        // Remote mode: HTTP POST to API. The remote API cannot read the
        // caller's local files, so mediaPath / structured thread items are
        // rejected here with the same contract as the MCP server guard.
        if (params && params.mediaPath !== undefined && params.mediaPath !== null) {
          throw new Error(
            `${toolName} mediaPath is not supported in remote mode — run with XACTIONS_MODE=local to attach media`,
          );
        }
        if (
          toolName === 'x_post_thread' &&
          Array.isArray(params?.tweets) &&
          params.tweets.some((t) => t !== null && typeof t === 'object')
        ) {
          throw new Error(
            `${toolName} structured tweet items are not supported in remote mode — send plain text strings, or run with XACTIONS_MODE=local`,
          );
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        try {
          const response = await fetch(`${apiUrl}/api/tools/${toolName}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(sessionCookie && { 'X-Session-Cookie': sessionCookie }),
            },
            body: JSON.stringify(params),
            signal: controller.signal,
          });
          if (!response.ok) {
            const body = await response.text();
            throw new Error(`Remote API error (${response.status}): ${body}`);
          }
          return await response.json();
        } finally {
          clearTimeout(timer);
        }
      }
    },

    /**
     * Execute multiple tool calls in sequence with shared context.
     *
     * @param {Array<{ tool: string, params: object }>} tasks
     * @param {object} [options={}]
     * @param {boolean} [options.stopOnError=true]
     * @param {object} [options.context] caller identity, as for execute()
     * @returns {Promise<{ results: object[], artifacts: object[], errors: string[] }>}
     */
    async batchExecute(tasks, options = {}) {
      const { stopOnError = true } = options;
      const results = [];
      const allArtifacts = [];
      const errors = [];
      const context = {};

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];

        // Support A2A task format { skillId, inputParts } by delegating to execute()
        if (task.inputParts) {
          const execResult = await bridge.execute(task.skillId || null, task.inputParts, options.context);
          results.push(execResult);
          if (execResult.artifacts) allArtifacts.push(...execResult.artifacts);
          if (!execResult.success) {
            errors.push(`Step ${i + 1}: ${execResult.error}`);
            if (stopOnError) break;
          }
          continue;
        }

        // Legacy format { tool, params }
        // Resolve $stepN references in params
        const resolvedParams = bridge._resolveStepRefs(task.params || {}, context);

        try {
          const refusal = await bridge.authorizeTool(task.tool, resolvedParams, options.context);
          if (refusal) throw new Error(refusal.error || 'held for approval');
          const result = await bridge.getToolResult(task.tool, resolvedParams);
          context[`$step${i + 1}`] = result;
          results.push({ step: i + 1, tool: task.tool, success: true, result });
          allArtifacts.push(...bridge._convertResultToArtifacts(result));
        } catch (err) {
          errors.push(`Step ${i + 1} (${task.tool}): ${err.message}`);
          results.push({ step: i + 1, tool: task.tool, success: false, error: err.message });
          if (stopOnError) break;
        }
      }

      return results;
    },

    /**
     * Convert a raw MCP result to A2A artifact parts.
     * @private
     */
    _convertResultToArtifacts(result) {
      if (result === null || result === undefined) {
        return [createTextPart('No result returned')];
      }
      if (typeof result === 'string') {
        return [createTextPart(result)];
      }
      if (Buffer.isBuffer(result)) {
        return [createFilePart('result.bin', 'application/octet-stream', result)];
      }
      if (typeof result === 'object') {
        return [createDataPart(result, 'application/json')];
      }
      return [createTextPart(String(result))];
    },

    /**
     * Resolve $stepN references in an object.
     * @private
     */
    _resolveStepRefs(obj, context) {
      if (typeof obj === 'string') {
        return obj.replace(/\$step(\d+)(?:\.([a-zA-Z0-9_.[\]]+))?/g, (_, num, path) => {
          const stepData = context[`$step${num}`];
          if (!stepData) return '';
          if (!path) return typeof stepData === 'object' ? JSON.stringify(stepData) : String(stepData);
          // Simple dot-path resolution
          let val = stepData;
          for (const seg of path.split('.')) {
            const arrMatch = seg.match(/^(\w+)\[(\d+)\]$/);
            if (arrMatch) {
              val = val?.[arrMatch[1]]?.[parseInt(arrMatch[2])];
            } else {
              val = val?.[seg];
            }
            if (val === undefined) return '';
          }
          return typeof val === 'object' ? JSON.stringify(val) : String(val);
        });
      }
      if (Array.isArray(obj)) return obj.map(v => bridge._resolveStepRefs(v, context));
      if (obj && typeof obj === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
          out[k] = bridge._resolveStepRefs(v, context);
        }
        return out;
      }
      return obj;
    },
  };

  return bridge;
}
