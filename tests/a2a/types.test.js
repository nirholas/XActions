/**
 * Tests — src/a2a/types.js
 * @author nich (@nichxbt)
 */

import {
  TASK_STATES,
  VALID_TRANSITIONS,
  MESSAGE_ROLES,
  PART_TYPES,
  ERROR_CODES,
  createAgentCard,
  createTask,
  createMessage,
  createTextPart,
  createDataPart,
  createFilePart,
  validateAgentCard,
  validateTask,
  isValidTransition,
  jsonRpcSuccess,
  jsonRpcError,
} from '../../src/a2a/types.js';

// ── Constants ────────────────────────────────────────────────────────────────

describe('TASK_STATES', () => {
  it('should contain all required states', () => {
    expect(TASK_STATES.SUBMITTED).toBe('submitted');
    expect(TASK_STATES.WORKING).toBe('working');
    expect(TASK_STATES.COMPLETED).toBe('completed');
    expect(TASK_STATES.FAILED).toBe('failed');
    expect(TASK_STATES.CANCELED).toBe('canceled');
    expect(TASK_STATES.INPUT_REQUIRED).toBe('input-required');
  });
});

describe('VALID_TRANSITIONS', () => {
  it('allows submitted → working', () => {
    expect(VALID_TRANSITIONS.submitted).toContain('working');
  });

  it('disallows completed → working', () => {
    expect(VALID_TRANSITIONS.completed).toBeUndefined();
  });
});

describe('ERROR_CODES', () => {
  it('has standard JSON-RPC codes', () => {
    expect(ERROR_CODES.INVALID_REQUEST).toBe(-32600);
    expect(ERROR_CODES.TASK_NOT_FOUND).toBe(-32001);
  });
});

// ── Factory functions ────────────────────────────────────────────────────────

describe('createAgentCard', () => {
  it('returns a card with required fields', () => {
    const card = createAgentCard({ url: 'http://localhost:3100' });
    expect(card.name).toBe('XActions Agent');
    expect(card.url).toBe('http://localhost:3100');
    expect(card.version).toBe('1.0.0');
    expect(card.capabilities).toBeDefined();
    expect(Array.isArray(card.skills)).toBe(true);
  });

  it('accepts skill overrides', () => {
    const skills = [{ id: 'test', name: 'Test Skill' }];
    const card = createAgentCard({ skills });
    expect(card.skills).toEqual(skills);
  });
});

describe('createTask', () => {
  it('generates id and timestamps', () => {
    const task = createTask({ role: 'user', parts: [{ type: 'text', text: 'hello' }] });
    expect(task.id).toBeDefined();
    expect(task.status.state).toBe(TASK_STATES.SUBMITTED);
    expect(task.status.timestamp).toBeDefined();
    expect(task.history).toHaveLength(1);
  });
});

describe('createMessage', () => {
  it('creates a message with role and parts', () => {
    const msg = createMessage('agent', [createTextPart('hi')]);
    expect(msg.role).toBe('agent');
    expect(msg.parts[0].type).toBe('text');
    expect(msg.parts[0].text).toBe('hi');
  });
});

describe('createTextPart', () => {
  it('creates a text part', () => {
    const p = createTextPart('hello world');
    expect(p.type).toBe('text');
    expect(p.text).toBe('hello world');
  });
});

describe('createDataPart', () => {
  it('creates a data part', () => {
    const p = createDataPart({ key: 'val' });
    expect(p.type).toBe('data');
    expect(p.data).toEqual({ key: 'val' });
  });
});

describe('createFilePart', () => {
  it('creates a file part', () => {
    const p = createFilePart('report.csv', 'text/csv', 'data:...');
    expect(p.type).toBe('file');
    expect(p.file.name).toBe('report.csv');
    expect(p.file.mimeType).toBe('text/csv');
  });
});

// ── Validators ───────────────────────────────────────────────────────────────

describe('validateAgentCard', () => {
  it('returns valid for correct card', () => {
    const card = createAgentCard({ url: 'http://localhost:3100' });
    const result = validateAgentCard(card);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns errors when name is missing', () => {
    const result = validateAgentCard({ url: 'http://x.com' });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('validateTask', () => {
  it('accepts a valid task', () => {
    const task = createTask({ role: 'user', parts: [createTextPart('test')] });
    const result = validateTask(task);
    expect(result.valid).toBe(true);
  });

  it('rejects task without id', () => {
    const result = validateTask({ status: { state: 'submitted' } });
    expect(result.valid).toBe(false);
  });
});

describe('isValidTransition', () => {
  it('allows submitted → working', () => {
    expect(isValidTransition('submitted', 'working')).toBe(true);
  });

  it('rejects completed → submitted', () => {
    expect(isValidTransition('completed', 'submitted')).toBe(false);
  });

  it('allows working → completed', () => {
    expect(isValidTransition('working', 'completed')).toBe(true);
  });
});

// ── JSON-RPC helpers ─────────────────────────────────────────────────────────

describe('jsonRpcSuccess', () => {
  it('wraps result correctly', () => {
    const resp = jsonRpcSuccess('req-1', { data: 42 });
    expect(resp.jsonrpc).toBe('2.0');
    expect(resp.id).toBe('req-1');
    expect(resp.result.data).toBe(42);
  });
});

describe('jsonRpcError', () => {
  it('wraps error correctly', () => {
    const resp = jsonRpcError('req-2', -32600, 'Bad request');
    expect(resp.jsonrpc).toBe('2.0');
    expect(resp.id).toBe('req-2');
    expect(resp.error.code).toBe(-32600);
    expect(resp.error.message).toBe('Bad request');
  });
});
