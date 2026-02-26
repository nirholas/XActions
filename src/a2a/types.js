/**
 * XActions A2A — Type Definitions and Constants
 *
 * Shared types, constants, factory functions, and validators for the
 * Agent-to-Agent (A2A) protocol implementation (Google A2A spec).
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import crypto from 'crypto';

// ============================================================================
// Constants
// ============================================================================

/** Valid task lifecycle states */
export const TASK_STATES = Object.freeze({
  SUBMITTED: 'submitted',
  WORKING: 'working',
  INPUT_REQUIRED: 'input-required',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELED: 'canceled',
});

/** Valid state transitions: state → allowed next states */
export const VALID_TRANSITIONS = Object.freeze({
  [TASK_STATES.SUBMITTED]: [TASK_STATES.WORKING, TASK_STATES.CANCELED],
  [TASK_STATES.WORKING]: [
    TASK_STATES.COMPLETED,
    TASK_STATES.FAILED,
    TASK_STATES.CANCELED,
    TASK_STATES.INPUT_REQUIRED,
  ],
  [TASK_STATES.INPUT_REQUIRED]: [TASK_STATES.WORKING, TASK_STATES.CANCELED],
  [TASK_STATES.COMPLETED]: [],
  [TASK_STATES.FAILED]: [],
  [TASK_STATES.CANCELED]: [],
});

/** Message roles */
export const MESSAGE_ROLES = Object.freeze({
  AGENT: 'agent',
  USER: 'user',
});

/** Part types for messages */
export const PART_TYPES = Object.freeze({
  TEXT: 'text',
  FILE: 'file',
  DATA: 'data',
});

/** JSON-RPC error codes */
export const ERROR_CODES = Object.freeze({
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  TASK_NOT_FOUND: -32001,
  TASK_INVALID_STATE: -32002,
  SKILL_NOT_FOUND: -32003,
  AUTH_REQUIRED: -32010,
  AUTH_FORBIDDEN: -32011,
});

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an Agent Card describing this agent's capabilities.
 *
 * @param {object} config
 * @param {string} config.name - Agent display name
 * @param {string} config.description - What this agent does
 * @param {string} config.url - Agent's base endpoint URL
 * @param {string} config.version - Agent software version
 * @param {object} [config.capabilities] - Capability flags
 * @param {boolean} [config.capabilities.streaming=true]
 * @param {boolean} [config.capabilities.pushNotifications=true]
 * @param {boolean} [config.capabilities.stateTransitionHistory=true]
 * @param {Array<object>} [config.skills=[]] - Advertised skills
 * @param {object} [config.authentication] - Auth schemes supported
 * @param {string[]} [config.defaultInputModes] - Accepted input MIME types
 * @param {string[]} [config.defaultOutputModes] - Output MIME types
 * @param {object} [config.provider] - Org info
 * @returns {object} A2A Agent Card
 */
export function createAgentCard(config) {
  return {
    name: config.name,
    description: config.description || '',
    url: config.url,
    version: config.version || '1.0.0',
    capabilities: {
      streaming: config.capabilities?.streaming ?? true,
      pushNotifications: config.capabilities?.pushNotifications ?? true,
      stateTransitionHistory: config.capabilities?.stateTransitionHistory ?? true,
    },
    skills: config.skills || [],
    authentication: config.authentication || {
      schemes: ['bearer'],
      credentials: null,
    },
    defaultInputModes: config.defaultInputModes || ['text/plain', 'application/json'],
    defaultOutputModes: config.defaultOutputModes || ['text/plain', 'application/json'],
    provider: config.provider || { organization: 'XActions', url: 'https://xactions.app' },
  };
}

/**
 * Create a new Task object.
 *
 * @param {object} [params={}]
 * @param {string} [params.id] - Optional client-provided task ID
 * @param {string} [params.contextId] - Conversation context
 * @param {object} [params.message] - Initial input message
 * @param {object} [params.metadata={}] - Arbitrary metadata (skillId, etc.)
 * @returns {object} A2A Task
 */
export function createTask(params = {}) {
  const now = new Date().toISOString();
  const id = params.id || crypto.randomUUID();
  return {
    id,
    contextId: params.contextId || crypto.randomUUID(),
    status: {
      state: TASK_STATES.SUBMITTED,
      message: 'Task submitted',
      timestamp: now,
    },
    messages: params.message ? [params.message] : [],
    history: [
      { state: TASK_STATES.SUBMITTED, message: 'Task submitted', timestamp: now },
    ],
    artifacts: [],
    metadata: params.metadata || {},
  };
}

/**
 * Create a structured message.
 *
 * @param {'agent'|'user'} role
 * @param {Array<object>} parts - Array of Part objects
 * @param {object} [metadata={}]
 * @returns {object} A2A Message
 */
export function createMessage(role, parts, metadata = {}) {
  if (role !== MESSAGE_ROLES.AGENT && role !== MESSAGE_ROLES.USER) {
    throw new Error(`Invalid message role: "${role}". Must be "agent" or "user".`);
  }
  return {
    role,
    parts: Array.isArray(parts) ? parts : [parts],
    metadata,
  };
}

/**
 * Create a text part.
 *
 * @param {string} text
 * @returns {object} TextPart
 */
export function createTextPart(text) {
  return { type: PART_TYPES.TEXT, text: String(text) };
}

/**
 * Create a data part (structured JSON data).
 *
 * @param {*} data - JSON-serializable data
 * @param {string} [mimeType='application/json']
 * @returns {object} DataPart
 */
export function createDataPart(data, mimeType = 'application/json') {
  return { type: PART_TYPES.DATA, data, mimeType };
}

/**
 * Create a file part.
 *
 * @param {string} name - File name
 * @param {string} mimeType - MIME type (e.g. 'image/png')
 * @param {string|Buffer} uriOrBytes - URI string or raw bytes
 * @returns {object} FilePart
 */
export function createFilePart(name, mimeType, uriOrBytes) {
  const part = { type: PART_TYPES.FILE, file: { name, mimeType } };
  if (typeof uriOrBytes === 'string') {
    part.file.uri = uriOrBytes;
  } else if (Buffer.isBuffer(uriOrBytes)) {
    part.file.bytes = uriOrBytes.toString('base64');
  }
  return part;
}

// ============================================================================
// Validators
// ============================================================================

/**
 * Validate an Agent Card structure.
 *
 * @param {object} card
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateAgentCard(card) {
  const errors = [];
  if (!card || typeof card !== 'object') {
    return { valid: false, errors: ['Agent card must be an object'] };
  }
  if (!card.name || typeof card.name !== 'string') errors.push('Missing or invalid "name"');
  if (!card.url || typeof card.url !== 'string') errors.push('Missing or invalid "url"');
  if (!card.version || typeof card.version !== 'string') errors.push('Missing or invalid "version"');
  if (!card.capabilities || typeof card.capabilities !== 'object') {
    errors.push('Missing "capabilities" object');
  }
  if (!Array.isArray(card.skills)) {
    errors.push('"skills" must be an array');
  } else {
    card.skills.forEach((s, i) => {
      if (!s.id) errors.push(`Skill [${i}] missing "id"`);
      if (!s.name) errors.push(`Skill [${i}] missing "name"`);
    });
  }
  if (card.authentication && !Array.isArray(card.authentication.schemes)) {
    errors.push('"authentication.schemes" must be an array');
  }
  if (card.defaultInputModes && !Array.isArray(card.defaultInputModes)) {
    errors.push('"defaultInputModes" must be an array');
  }
  if (card.defaultOutputModes && !Array.isArray(card.defaultOutputModes)) {
    errors.push('"defaultOutputModes" must be an array');
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Validate a Task structure.
 *
 * @param {object} task
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateTask(task) {
  const errors = [];
  if (!task || typeof task !== 'object') {
    return { valid: false, errors: ['Task must be an object'] };
  }
  if (!task.id || typeof task.id !== 'string') errors.push('Missing or invalid "id"');
  if (!task.status || typeof task.status !== 'object') {
    errors.push('Missing "status" object');
  } else {
    const validStates = Object.values(TASK_STATES);
    if (!validStates.includes(task.status.state)) {
      errors.push(`Invalid status.state: "${task.status.state}". Valid: ${validStates.join(', ')}`);
    }
  }
  if (!Array.isArray(task.artifacts)) errors.push('"artifacts" must be an array');
  if (!Array.isArray(task.history)) errors.push('"history" must be an array');
  return { valid: errors.length === 0, errors };
}

/**
 * Check whether a state transition is valid.
 *
 * @param {string} from - Current state
 * @param {string} to - Desired state
 * @returns {boolean}
 */
export function isValidTransition(from, to) {
  const allowed = VALID_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

/**
 * Build a JSON-RPC 2.0 success response.
 *
 * @param {*} result
 * @param {string|number} id - Request ID
 * @returns {object}
 */
export function jsonRpcSuccess(result, id) {
  return { jsonrpc: '2.0', result, id };
}

/**
 * Build a JSON-RPC 2.0 error response.
 *
 * @param {number} code
 * @param {string} message
 * @param {*} [data]
 * @param {string|number} [id=null]
 * @returns {object}
 */
export function jsonRpcError(code, message, data, id = null) {
  return { jsonrpc: '2.0', error: { code, message, data }, id };
}
