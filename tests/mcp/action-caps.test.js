// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Daily action caps: the rolling 24h ledger, its overrides, and the
 * write-tool mapping. The ledger is re-imported mid-test to prove a
 * "restart" (fresh module state, same XACTIONS_HOME) keeps the count.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let home;
const prevHome = process.env.XACTIONS_HOME;
const prevCaps = process.env.XACTIONS_ACTION_CAPS;

/** Fresh module instance: what a restarted MCP server would load. */
async function freshCaps() {
  vi.resetModules();
  return import('../../src/mcp/action-caps.js');
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'xactions-caps-'));
  process.env.XACTIONS_HOME = home;
  delete process.env.XACTIONS_ACTION_CAPS;
});

afterEach(() => {
  vi.useRealTimers();
  if (prevHome === undefined) delete process.env.XACTIONS_HOME; else process.env.XACTIONS_HOME = prevHome;
  if (prevCaps === undefined) delete process.env.XACTIONS_ACTION_CAPS; else process.env.XACTIONS_ACTION_CAPS = prevCaps;
  rmSync(home, { recursive: true, force: true });
});

describe('checkAndRecord', () => {
  it('counts actions per account per class and refuses the call over the cap', async () => {
    vi.useFakeTimers({ now: new Date('2026-08-27T12:00:00Z') });
    process.env.XACTIONS_ACTION_CAPS = JSON.stringify({ follow: 3 });
    const caps = await freshCaps();

    for (let i = 1; i <= 3; i++) {
      const r = caps.checkAndRecord('nichxbt', 'follow');
      expect(r).toMatchObject({ account: 'nichxbt', actionClass: 'follow', cap: 3, used: i, remaining: 3 - i });
    }

    let thrown;
    try { caps.checkAndRecord('@NichXBT', 'follow'); } catch (e) { thrown = e; }
    expect(thrown).toBeInstanceOf(caps.ActionCapExceededError);
    expect(thrown.code).toBe('ACTION_CAP_EXCEEDED');
    expect(thrown.account).toBe('nichxbt');
    expect(thrown.used).toBe(3);
    expect(thrown.cap).toBe(3);
    expect(thrown.resetAt).toEqual(new Date('2026-08-28T12:00:00Z'));
    expect(thrown.message).toMatch(/3\/3 in the last 24h/);

    // Other classes and other accounts are separate budgets
    expect(caps.checkAndRecord('nichxbt', 'like').used).toBe(1);
    expect(caps.checkAndRecord('someone_else', 'follow').used).toBe(1);

    // The refused attempt was not recorded
    expect(caps.remaining('nichxbt').classes.follow).toMatchObject({ cap: 3, used: 3, remaining: 0 });
  });

  it('survives a restart: a fresh module import reads the same ledger file', async () => {
    vi.useFakeTimers({ now: new Date('2026-08-27T12:00:00Z') });
    process.env.XACTIONS_ACTION_CAPS = JSON.stringify({ dm: 2 });

    const first = await freshCaps();
    first.checkAndRecord('default', 'dm');
    expect(existsSync(join(home, 'action-ledger.json'))).toBe(true);
    const onDisk = JSON.parse(readFileSync(join(home, 'action-ledger.json'), 'utf8'));
    expect(onDisk.accounts.default.dm).toHaveLength(1);

    const second = await freshCaps();
    expect(second).not.toBe(first);
    expect(second.remaining('default').classes.dm).toMatchObject({ cap: 2, used: 1, remaining: 1 });
    // Six hours later, so the two actions age out of the window separately
    vi.setSystemTime(new Date('2026-08-27T18:00:00Z'));
    second.checkAndRecord('default', 'dm');
    expect(() => second.checkAndRecord('default', 'dm')).toThrow(second.ActionCapExceededError);

    // The window rolls: 24h after the first action, one slot frees
    vi.setSystemTime(new Date('2026-08-28T12:00:00.001Z'));
    const third = await freshCaps();
    expect(third.remaining('default').classes.dm.used).toBe(1);
    expect(third.checkAndRecord('default', 'dm').used).toBe(2);
    expect(() => third.checkAndRecord('default', 'dm')).toThrow(/Daily cap reached/);
  });

  it('charges bulk counts at once and refuses when the batch would overflow', async () => {
    process.env.XACTIONS_ACTION_CAPS = JSON.stringify({ mute: 5 });
    const caps = await freshCaps();
    expect(caps.checkAndRecord('default', 'mute', { count: 3 }).used).toBe(3);
    expect(() => caps.checkAndRecord('default', 'mute', { count: 3 })).toThrow(caps.ActionCapExceededError);
    expect(caps.remaining('default').classes.mute.used).toBe(3);
    expect(caps.checkAndRecord('default', 'mute', { count: 2 }).remaining).toBe(0);
  });

  it('rejects unknown classes and never writes for them', async () => {
    const caps = await freshCaps();
    expect(() => caps.checkAndRecord('default', 'tweet')).toThrow(/Unknown action class "tweet"/);
    expect(existsSync(join(home, 'action-ledger.json'))).toBe(false);
  });
});

describe('caps configuration', () => {
  it('ships the documented defaults', async () => {
    const caps = await freshCaps();
    expect(caps.DEFAULT_CAPS).toEqual({
      post: 2400, reply: 2400, like: 500, repost: 500, follow: 400,
      unfollow: 400, dm: 500, block: 500, mute: 500, delete: 2400,
    });
    expect(Object.keys(caps.DEFAULT_CAPS).sort()).toEqual([...caps.ACTION_CLASSES].sort());
    expect(caps.resolveCaps()).toEqual(caps.DEFAULT_CAPS);
  });

  it('layers action-caps.json under XACTIONS_ACTION_CAPS, with per-account values on top', async () => {
    writeFileSync(join(home, 'action-caps.json'), JSON.stringify({
      follow: 100, like: 50,
      accounts: { brand: { follow: 10 } },
    }));
    process.env.XACTIONS_ACTION_CAPS = JSON.stringify({ like: 75 });
    const caps = await freshCaps();

    expect(caps.resolveCaps('default')).toMatchObject({ follow: 100, like: 75, dm: 500 });
    expect(caps.resolveCaps('@Brand')).toMatchObject({ follow: 10, like: 75 });
  });

  it('a cap of 0 disables a class and reports the reset a full window out', async () => {
    vi.useFakeTimers({ now: new Date('2026-08-27T00:00:00Z') });
    process.env.XACTIONS_ACTION_CAPS = JSON.stringify({ block: 0 });
    const caps = await freshCaps();
    let thrown;
    try { caps.checkAndRecord('default', 'block'); } catch (e) { thrown = e; }
    expect(thrown.cap).toBe(0);
    expect(thrown.resetAt).toEqual(new Date('2026-08-28T00:00:00Z'));
  });

  it('refuses malformed overrides with a pointer to the bad key', async () => {
    process.env.XACTIONS_ACTION_CAPS = '{"tweet": 5}';
    const caps = await freshCaps();
    expect(() => caps.resolveCaps()).toThrow(/XACTIONS_ACTION_CAPS: unknown action class "tweet"/);
    process.env.XACTIONS_ACTION_CAPS = '{"follow": -1}';
    expect(() => caps.resolveCaps()).toThrow(/non-negative/);
    process.env.XACTIONS_ACTION_CAPS = 'nope';
    expect(() => caps.resolveCaps()).toThrow(/not valid JSON/);
  });
});

describe('ledger and reset', () => {
  it('ledger() prunes expired entries and resetLedger() clears them', async () => {
    vi.useFakeTimers({ now: new Date('2026-08-27T12:00:00Z') });
    const caps = await freshCaps();
    caps.checkAndRecord('a', 'post');
    caps.checkAndRecord('b', 'like');
    expect(Object.keys(caps.ledger().accounts).sort()).toEqual(['a', 'b']);

    vi.setSystemTime(new Date('2026-08-29T00:00:00Z'));
    expect(caps.ledger().accounts).toEqual({});

    vi.setSystemTime(new Date('2026-08-29T00:00:01Z'));
    caps.checkAndRecord('a', 'post');
    caps.checkAndRecord('a', 'reply');
    caps.checkAndRecord('b', 'like');
    expect(caps.resetLedger('a')).toBe(2);
    expect(caps.remaining('a').classes.post.used).toBe(0);
    expect(caps.remaining('b').classes.like.used).toBe(1);
    expect(caps.resetLedger()).toBe(1);
  });
});

describe('write-tool mapping', () => {
  it('every WRITE_TOOL is charged to a class, exempt on purpose, or resolved from its arguments', async () => {
    const groups = await import('../../src/mcp/tool-groups.js');
    const caps = await freshCaps();
    const unmapped = [...groups.WRITE_TOOLS].filter(
      (n) => !groups.ACTION_CLASS[n]
        && !groups.UNCAPPED_WRITE_TOOLS.has(n)
        && !groups.ARGUMENT_RESOLVED_WRITE_TOOLS.has(n)
    );
    expect(unmapped).toEqual([]);
    for (const cls of Object.values(groups.ACTION_CLASS)) {
      expect(caps.ACTION_CLASSES).toContain(cls);
    }
    for (const n of Object.keys(groups.ACTION_CLASS)) {
      expect(groups.WRITE_TOOLS.has(n), `${n} is mapped but is not a write tool`).toBe(true);
    }
  });

  it('pins the account-vault approval gate: use/remove stay writes and uncapped', async () => {
    // Regression pin: the vault tools activate/delete local credentials —
    // they must stay behind the approval gate (WRITE_TOOLS) without a daily
    // action-cap class (UNCAPPED_WRITE_TOOLS). Removing either entry would
    // silently ungate destructive local operations.
    const groups = await import('../../src/mcp/tool-groups.js');
    for (const name of ['x_accounts_use', 'x_accounts_remove']) {
      expect(groups.WRITE_TOOLS.has(name), `${name} must be approval-gated`).toBe(true);
      expect(groups.UNCAPPED_WRITE_TOOLS.has(name), `${name} must stay uncapped`).toBe(true);
      expect(groups.isWriteTool(name)).toBe(true);
      expect(groups.resolveActionCharge(name)).toBeNull();
    }
    // The read-side vault tools must NOT be gated.
    for (const name of ['x_accounts_add', 'x_accounts_list', 'x_accounts_test']) {
      expect(groups.WRITE_TOOLS.has(name), `${name} is a read/local op, not a write`).toBe(false);
    }
  });

  it('resolveActionCharge reads the class off bulk arguments and skips dry runs and read tools', async () => {
    const { resolveActionCharge } = await import('../../src/mcp/tool-groups.js');
    expect(resolveActionCharge('x_follow')).toEqual({ actionClass: 'follow', count: 1 });
    expect(resolveActionCharge('x_get_profile')).toBeNull();
    expect(resolveActionCharge('x_update_profile')).toBeNull();
    expect(resolveActionCharge('x_bulk_execute', { action: 'block', usernames: ['a', 'b', 'c'] }))
      .toEqual({ actionClass: 'block', count: 3 });
    expect(resolveActionCharge('x_bulk_execute', { action: 'block', usernames: ['a'], dryRun: true })).toBeNull();
    expect(resolveActionCharge('x_bulk_execute', { action: 'nonsense', usernames: ['a'] })).toBeNull();
  });

  it('resolveActionCharge charges a sweep for every action class it was asked to perform', async () => {
    const { resolveActionCharge } = await import('../../src/mcp/tool-groups.js');
    // A dry run writes nothing, and dryRun defaults to true on x_engage.
    expect(resolveActionCharge('x_engage', { limit: 50 })).toBeNull();
    expect(resolveActionCharge('x_engage', { dryRun: true, limit: 50 })).toBeNull();
    // like is on by default, so a bare live call is charged for likes only.
    expect(resolveActionCharge('x_engage', { dryRun: false, limit: 10 }))
      .toEqual([{ actionClass: 'like', count: 10 }]);
    // Every enabled action draws on its own budget.
    expect(resolveActionCharge('x_engage', { dryRun: false, limit: 5, repost: true, comment: true }))
      .toEqual([
        { actionClass: 'like', count: 5 },
        { actionClass: 'repost', count: 5 },
        { actionClass: 'reply', count: 5 },
      ]);
    // Turning everything off costs nothing; the tool itself rejects that call.
    expect(resolveActionCharge('x_engage', { dryRun: false, like: false })).toBeNull();
    // The limit is clamped the same way the tool clamps it.
    expect(resolveActionCharge('x_engage', { dryRun: false, limit: 5000 }))
      .toEqual([{ actionClass: 'like', count: 200 }]);
  });
});
