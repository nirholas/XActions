// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Workflow triggers live in memory. A restarted server must register the
 * stored ones again, or every webhook answers 401 and every interval stops
 * until the workflow is saved again.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const home = mkdtempSync(join(tmpdir(), 'xactions-wf-restore-'));
const prevHome = process.env.XACTIONS_HOME;
process.env.XACTIONS_HOME = home;

let workflows;
beforeAll(async () => {
  workflows = (await import('../../src/workflows/index.js')).default;
});

afterAll(async () => {
  await workflows.triggerManager.shutdown();
  if (prevHome === undefined) delete process.env.XACTIONS_HOME;
  else process.env.XACTIONS_HOME = prevHome;
  rmSync(home, { recursive: true, force: true });
});

const step = { action: 'scrapeProfile', params: { username: 'nasa' } };

describe('restoreTriggers', () => {
  it('registers stored, enabled triggers again after a restart', async () => {
    const hook = await workflows.create({
      name: 'restore-hook',
      trigger: { type: 'webhook', webhookId: 'wh-restore-test', secret: 'x'.repeat(32) },
      steps: [step],
    });
    const off = await workflows.create({
      name: 'restore-disabled',
      enabled: false,
      trigger: { type: 'webhook', webhookId: 'wh-disabled-test', secret: 'y'.repeat(32) },
      steps: [step],
    });

    // A restart: the store survives, the in-memory registrations do not.
    await workflows.triggerManager.unregister(hook.id);
    await workflows.triggerManager.unregister(off.id);
    const webhookIds = () => workflows.triggerManager.getRegisteredTriggers()
      .filter((t) => t.type === 'webhook').map((t) => t.webhookId);
    expect(webhookIds()).not.toContain('wh-restore-test');

    const restored = await workflows.restoreTriggers();
    expect(restored).toBe(1);
    expect(webhookIds()).toContain('wh-restore-test');
    expect(webhookIds()).not.toContain('wh-disabled-test');
  });
});
