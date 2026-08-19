// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions Workflow Conditions
 * Conditional logic for workflow steps
 * 
 * Evaluates expressions against the workflow context to determine
 * whether to continue, skip, or branch.
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

// ============================================================================
// Built-in Condition Evaluators
// ============================================================================

import { Worker } from 'node:worker_threads';

// ReDoS guardrails for the 'matches' operator: workflow authors fully control
// the pattern text, so cap its length/the string it runs against, and run
// the actual match on a worker thread with a hard wall-clock timeout. A
// regex-source heuristic can only ever recognize the specific catastrophic-
// backtracking *shapes* it was written for (nested quantifiers, alternation
// ambiguity, etc. are all different shapes) — it cannot enumerate them all,
// so it is not a sound defense. Only a timeout that can forcibly interrupt
// the runaway match is: the main thread can't preempt synchronous JS, but a
// worker thread can be terminated from outside while it's still running.
const MAX_MATCHES_PATTERN_LENGTH = 200;
const MAX_MATCHES_INPUT_LENGTH = 10000;
const MATCHES_TIMEOUT_MS = 250;

// The parent package is ESM ("type": "module"), so an eval-mode Worker
// inherits that and has no CommonJS require() — use static import instead.
const REGEX_WORKER_SRC = `
  import { parentPort, workerData } from 'node:worker_threads';
  const { pattern, flags, str } = workerData;
  let result = false;
  try {
    result = new RegExp(pattern, flags).test(str);
  } catch {
    result = false;
  }
  parentPort.postMessage(result);
`;

/**
 * Run a regex .test() on a worker thread with a hard timeout, so a
 * catastrophic-backtracking pattern can be forcibly killed instead of
 * hanging the main event loop. Resolves false if the pattern doesn't match,
 * errors, or times out.
 */
function safeRegexTest(pattern, flags, str, timeoutMs = MATCHES_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let settled = false;
    const worker = new Worker(REGEX_WORKER_SRC, { eval: true, workerData: { pattern, flags, str } });

    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate().catch(() => {});
      resolve(value);
    };

    const timer = setTimeout(() => finish(false), timeoutMs);

    worker.once('message', (result) => finish(!!result));
    worker.once('error', () => finish(false));
    worker.once('exit', () => finish(false));
  });
}

const OPERATORS = {
  '>': (a, b) => Number(a) > Number(b),
  '<': (a, b) => Number(a) < Number(b),
  '>=': (a, b) => Number(a) >= Number(b),
  '<=': (a, b) => Number(a) <= Number(b),
  '==': (a, b) => String(a) === String(b),
  '!=': (a, b) => String(a) !== String(b),
  'contains': (a, b) => String(a).toLowerCase().includes(String(b).toLowerCase()),
  'not_contains': (a, b) => !String(a).toLowerCase().includes(String(b).toLowerCase()),
  'matches': async (a, b) => {
    const str = String(a);
    const pattern = String(b);
    if (typeof pattern !== 'string' || pattern.length > MAX_MATCHES_PATTERN_LENGTH) return false;
    if (str.length > MAX_MATCHES_INPUT_LENGTH) return false;
    return safeRegexTest(pattern, 'i', str);
  },
  'exists': (a) => a !== undefined && a !== null,
  'empty': (a) => !a || (Array.isArray(a) && a.length === 0) || (typeof a === 'string' && a.trim() === ''),
  'not_empty': (a) => a && (!Array.isArray(a) || a.length > 0) && (typeof a !== 'string' || a.trim() !== ''),
};

/**
 * Resolve a dot-notated path from the context
 * Supports: "profile.followers", "profile.tweets[0].text", "profile.tweets.length"
 */
function resolveValue(path, context) {
  if (path === undefined || path === null) return path;
  
  // If it's a literal value (quoted string or number)
  if (typeof path === 'number' || typeof path === 'boolean') return path;
  if (typeof path === 'string') {
    // Quoted string literal
    if ((path.startsWith('"') && path.endsWith('"')) || (path.startsWith("'") && path.endsWith("'"))) {
      return path.slice(1, -1);
    }
    // Numeric literal
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    // Boolean literal
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
  }

  // Duration literal (e.g., "30m", "1h", "2d") → returns milliseconds
  const durationMatch = String(path).match(/^(\d+)(ms|s|m|h|d)$/);
  if (durationMatch) {
    const value = Number(durationMatch[1]);
    const unit = durationMatch[2];
    const multipliers = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return value * multipliers[unit];
  }

  // Resolve from context via dot notation
  const parts = String(path).replace(/\[(\d+)\]/g, '.$1').split('.');
  let current = context;
  
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  
  return current;
}

/**
 * Parse a simple condition expression string
 * Formats:
 *   "profile.followers > 1000"
 *   "profile.tweets[0].text contains 'keyword'"
 *   "profile.tweets[0].age < 30m"
 *   "results.length > 0"
 */
function parseExpression(expression) {
  expression = expression.trim();
  
  // Try each operator (longest first to avoid partial matches)
  const operatorList = ['not_contains', 'not_empty', 'contains', 'matches', '>=', '<=', '!=', '==', '>', '<', 'exists', 'empty'];
  
  for (const op of operatorList) {
    // For word operators, use word boundary matching
    const regex = /^[a-z]/.test(op)
      ? new RegExp(`^(.+?)\\s+${op}(?:\\s+(.+))?$`, 'i')
      : new RegExp(`^(.+?)\\s*${op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(.+)?$`);
    
    const match = expression.match(regex);
    if (match) {
      return {
        left: match[1].trim(),
        operator: op,
        right: match[2]?.trim(),
      };
    }
  }
  
  // If no operator found, treat as truthy check
  return {
    left: expression,
    operator: 'exists',
    right: undefined,
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Evaluate a condition step against the workflow context
 * 
 * Supported formats:
 * 1. Simple expression string: { "condition": "profile.followers > 1000" }
 * 2. Structured condition: { "condition": { "left": "profile.followers", "operator": ">", "right": 1000 } }
 * 3. AND conditions: { "condition": { "all": ["expr1", "expr2"] } }
 * 4. OR conditions: { "condition": { "any": ["expr1", "expr2"] } }
 * 
 * @param {string|object} condition - The condition to evaluate
 * @param {object} context - The workflow variable context
 * @returns {Promise<{ passed: boolean, details: string }>}
 */
export async function evaluateCondition(condition, context) {
  try {
    if (typeof condition === 'string') {
      return await evaluateExpression(condition, context);
    }

    if (typeof condition === 'object') {
      // AND conditions
      if (condition.all && Array.isArray(condition.all)) {
        const results = await Promise.all(condition.all.map(expr => evaluateExpression(expr, context)));
        const passed = results.every(r => r.passed);
        return {
          passed,
          details: `ALL(${results.map(r => `${r.details}=${r.passed}`).join(', ')})`,
        };
      }

      // OR conditions
      if (condition.any && Array.isArray(condition.any)) {
        const results = await Promise.all(condition.any.map(expr => evaluateExpression(expr, context)));
        const passed = results.some(r => r.passed);
        return {
          passed,
          details: `ANY(${results.map(r => `${r.details}=${r.passed}`).join(', ')})`,
        };
      }
      
      // Structured condition { left, operator, right }
      if (condition.left && condition.operator) {
        const leftVal = resolveValue(condition.left, context);
        const rightVal = condition.right !== undefined ? resolveValue(condition.right, context) : undefined;
        const op = OPERATORS[condition.operator];
        
        if (!op) {
          return { passed: false, details: `Unknown operator: ${condition.operator}` };
        }

        const passed = await op(leftVal, rightVal);
        return {
          passed,
          details: `${condition.left}(${leftVal}) ${condition.operator} ${condition.right ?? ''}(${rightVal ?? ''})`,
        };
      }
    }

    return { passed: false, details: 'Invalid condition format' };
  } catch (error) {
    return { passed: false, details: `Condition error: ${error.message}` };
  }
}

/**
 * Evaluate a single expression string
 */
async function evaluateExpression(expression, context) {
  const parsed = parseExpression(expression);
  const leftVal = resolveValue(parsed.left, context);
  const rightVal = parsed.right !== undefined ? resolveValue(parsed.right, context) : undefined;
  const op = OPERATORS[parsed.operator];

  if (!op) {
    return { passed: false, details: `Unknown operator: ${parsed.operator}` };
  }

  const passed = await op(leftVal, rightVal);
  return {
    passed,
    details: `${parsed.left}(${JSON.stringify(leftVal)}) ${parsed.operator} ${parsed.right ?? ''}`,
  };
}

/**
 * Get list of available operators
 */
export function getAvailableOperators() {
  return Object.keys(OPERATORS);
}

export { resolveValue, parseExpression };
