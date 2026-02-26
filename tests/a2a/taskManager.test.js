/**
 * Tests — src/a2a/taskManager.js
 * @author nich (@nichxbt)
 */

import { createTaskManager } from '../../src/a2a/taskManager.js';
import { createTextPart, TASK_STATES } from '../../src/a2a/types.js';

// Mock bridge that always succeeds
function mockBridge(result = { success: true }) {
  return {
    execute: vi.fn().mockResolvedValue({
      success: true,
      artifacts: [{ name: 'result', data: { text: 'ok' } }],
      ...result,
    }),
    parseNaturalLanguage: vi.fn().mockReturnValue(null),
  };
}

describe('TaskStore', () => {
  let store, shutdown;

  beforeEach(() => {
    const mgr = createTaskManager({ bridge: mockBridge() });
    store = mgr.store;
    shutdown = mgr.shutdown;
  });

  afterEach(() => shutdown());

  it('creates a task with submitted state', () => {
    const task = store.create({ role: 'user', parts: [createTextPart('hi')] });
    expect(task.id).toBeDefined();
    expect(task.status.state).toBe(TASK_STATES.SUBMITTED);
  });

  it('retrieves a task by id', () => {
    const task = store.create({ role: 'user', parts: [createTextPart('hi')] });
    const found = store.get(task.id);
    expect(found).toBeDefined();
    expect(found.id).toBe(task.id);
  });

  it('returns undefined for unknown id', () => {
    expect(store.get('nonexistent')).toBeUndefined();
  });

  it('transitions task state', () => {
    const task = store.create({ role: 'user', parts: [createTextPart('go')] });
    store.transition(task.id, TASK_STATES.WORKING);
    expect(store.get(task.id).status.state).toBe(TASK_STATES.WORKING);
  });

  it('rejects invalid transitions', () => {
    const task = store.create({ role: 'user', parts: [createTextPart('go')] });
    store.transition(task.id, TASK_STATES.WORKING);
    store.transition(task.id, TASK_STATES.COMPLETED);
    expect(() => store.transition(task.id, TASK_STATES.SUBMITTED)).toThrow();
  });

  it('emits events on transition', () => {
    const fn = vi.fn();
    store.on(fn);
    const task = store.create({ role: 'user', parts: [createTextPart('go')] });
    store.transition(task.id, TASK_STATES.WORKING);
    expect(fn).toHaveBeenCalledWith('transition', task.id, expect.anything());
  });

  it('reports stats', () => {
    store.create({ role: 'user', parts: [createTextPart('a')] });
    store.create({ role: 'user', parts: [createTextPart('b')] });
    const stats = store.stats();
    expect(stats.total).toBe(2);
  });

  it('lists tasks', () => {
    store.create({ role: 'user', parts: [createTextPart('a')] });
    store.create({ role: 'user', parts: [createTextPart('b')] });
    const list = store.list();
    expect(list).toHaveLength(2);
  });
});

describe('TaskExecutor', () => {
  it('executes a task to completion', async () => {
    const bridge = mockBridge();
    const { store, executor, shutdown } = createTaskManager({ bridge });

    const task = store.create({ role: 'user', parts: [createTextPart('test')] });
    await executor.execute(task.id);

    const final = store.get(task.id);
    expect(final.status.state).toBe(TASK_STATES.COMPLETED);
    expect(final.artifacts).toBeDefined();

    shutdown();
  });

  it('marks task as failed on error', async () => {
    const bridge = {
      execute: vi.fn().mockRejectedValue(new Error('boom')),
      parseNaturalLanguage: vi.fn().mockReturnValue(null),
    };
    const { store, executor, shutdown } = createTaskManager({ bridge });

    const task = store.create({ role: 'user', parts: [createTextPart('fail')] });
    await executor.execute(task.id);

    const final = store.get(task.id);
    expect(final.status.state).toBe(TASK_STATES.FAILED);

    shutdown();
  });

  it('calls bridge.execute with input parts', async () => {
    const bridge = mockBridge();
    const { store, executor, shutdown } = createTaskManager({ bridge });

    const task = store.create({ role: 'user', parts: [createTextPart('hello')] });
    await executor.execute(task.id);

    expect(bridge.execute).toHaveBeenCalled();

    shutdown();
  });
});
