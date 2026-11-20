// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests: listing saved workflows, runs and graphs reports a corrupt file
 * instead of dropping it silently, and still lists the rest.
 *
 * Offline: everything lives in a temp XACTIONS_HOME.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

let home;
let previousHome;
let FileStore;
let listGraphs;

beforeAll(async () => {
  home = await fs.mkdtemp(path.join(os.tmpdir(), 'xactions-wfstore-'));
  previousHome = process.env.XACTIONS_HOME;
  process.env.XACTIONS_HOME = home;
  // The store resolves its directories at import, so import after XACTIONS_HOME is set.
  ({ FileStore } = await import('../../src/workflows/store.js'));
  ({ list: listGraphs } = await import('../../src/graph/index.js'));
});

afterAll(async () => {
  if (previousHome === undefined) delete process.env.XACTIONS_HOME;
  else process.env.XACTIONS_HOME = previousHome;
  await fs.rm(home, { recursive: true, force: true });
});

afterEach(() => vi.restoreAllMocks());

describe('FileStore', () => {
  it('lists the readable workflows and warns about a corrupt one', async () => {
    const store = new FileStore();
    const saved = await store.saveWorkflow({ name: 'kept', steps: [] });
    await fs.writeFile(path.join(home, 'workflows', 'broken.json'), '{ not json');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const list = await store.listWorkflows();

    expect(list.map((w) => w.id)).toEqual([saved.id]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('broken.json'));
  });

  it('lists the readable runs and warns about a corrupt one', async () => {
    const store = new FileStore();
    const dir = path.join(home, 'workflow-runs', 'wf-1');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'a.json'), JSON.stringify({ id: 'run-a', workflowId: 'wf-1', status: 'completed' }));
    await fs.writeFile(path.join(dir, 'b.json'), '{ not json');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const runs = await store.listRuns('wf-1');

    expect(runs.map((r) => r.id)).toEqual(['run-a']);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('wf-1/b.json'));
  });
});

describe('graph list', () => {
  it('lists the readable graphs and warns about a corrupt one', async () => {
    const dir = path.join(home, 'graphs');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'g1.json'), JSON.stringify({ id: 'g1', seed: 'nichxbt', nodes: [], edges: [] }));
    await fs.writeFile(path.join(dir, 'g2.json'), '{ not json');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const graphs = await listGraphs();

    expect(graphs.map((g) => g.id)).toEqual(['g1']);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('g2.json'));
  });
});
