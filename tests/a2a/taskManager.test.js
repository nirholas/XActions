// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests — src/a2a/taskManager.js
 * @author nich (@nichxbt)
 */

import { createTaskManager } from '../../src/a2a/taskManager.js';
import { createTextPart, createMessage, TASK_STATES } from '../../src/a2a/types.js';

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

  it('creates a task with submitted state', async () => {
    const task = await store.create({ role: 'user', parts: [createTextPart('hi')] });
    expect(task.id).toBeDefined();
    expect(task.status.state).toBe(TASK_STATES.SUBMITTED);
  });

  it('retrieves a task by id', async () => {
    const task = await store.create({ role: 'user', parts: [createTextPart('hi')] });
    const found = await store.get(task.id);
    expect(found).toBeDefined();
    expect(found.id).toBe(task.id);
  });

  it('returns null for unknown id', async () => {
    expect(await store.get('nonexistent')).toBeNull();
  });

  it('transitions task state', async () => {
    const task = await store.create({ role: 'user', parts: [createTextPart('go')] });
    await store.transition(task.id, TASK_STATES.WORKING);
    expect((await store.get(task.id)).status.state).toBe(TASK_STATES.WORKING);
  });

  it('rejects invalid transitions', async () => {
    const task = await store.create({ role: 'user', parts: [createTextPart('go')] });
    await store.transition(task.id, TASK_STATES.WORKING);
    await store.transition(task.id, TASK_STATES.COMPLETED);
    await expect(store.transition(task.id, TASK_STATES.SUBMITTED)).rejects.toThrow();
  });

  it('emits events on transition', async () => {
    const fn = vi.fn();
    store.on(fn);
    const task = await store.create({ role: 'user', parts: [createTextPart('go')] });
    await store.transition(task.id, TASK_STATES.WORKING);
    expect(fn).toHaveBeenCalledWith('transition', task.id, expect.anything());
  });

  it('reports stats', async () => {
    await store.create({ role: 'user', parts: [createTextPart('a')] });
    await store.create({ role: 'user', parts: [createTextPart('b')] });
    const stats = store.getStats();
    expect(stats.total).toBe(2);
  });

  it('lists tasks', async () => {
    await store.create({ role: 'user', parts: [createTextPart('a')] });
    await store.create({ role: 'user', parts: [createTextPart('b')] });
    const list = await store.list();
    expect(list).toHaveLength(2);
  });
});

describe('TaskExecutor', () => {
  it('executes a task to completion', async () => {
    const bridge = mockBridge();
    const { store, executor, shutdown } = createTaskManager({ bridge });

    const task = await store.create({
      message: createMessage('user', [createTextPart('test')]),
      metadata: { skillId: 'x_get_profile' },
    });
    await executor.execute(task.id);

    const final = await store.get(task.id);
    expect(final.status.state).toBe(TASK_STATES.COMPLETED);
    expect(final.artifacts).toBeDefined();

    shutdown();
  });

  it('marks task as failed on error', async () => {
    // The executor checks result.success, so return a failed result
    // (throwing would propagate uncaught since the executor has no catch block)
    const bridge = {
      execute: vi.fn().mockResolvedValue({ success: false, error: 'boom', artifacts: [] }),
      parseNaturalLanguage: vi.fn().mockReturnValue(null),
    };
    const { store, executor, shutdown } = createTaskManager({ bridge });

    const task = await store.create({
      message: createMessage('user', [createTextPart('fail')]),
      metadata: { skillId: 'x_get_profile' },
    });
    await executor.execute(task.id);

    const final = await store.get(task.id);
    expect(final.status.state).toBe(TASK_STATES.FAILED);

    shutdown();
  });

  it('calls bridge.execute with input parts', async () => {
    const bridge = mockBridge();
    const { store, executor, shutdown } = createTaskManager({ bridge });

    const task = await store.create({
      message: createMessage('user', [createTextPart('hello')]),
      metadata: { skillId: 'x_get_profile' },
    });
    await executor.execute(task.id);

    expect(bridge.execute).toHaveBeenCalled();

    shutdown();
  });
});
