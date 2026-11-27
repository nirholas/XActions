// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * scripts/live-check: the probe's checks run against responses recorded from
 * x.com's guest tier and from https://xactions.app/mcp, replayed through the
 * `fetch` the checks accept. Covers a pass, the `limited` case, a rotated
 * query ID turning into a regression, and the runner's single retry.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CHECKS, STABLE, createContext, runCheck, runChecks } from '../../scripts/live-check/checks.mjs';
import { buildStatus, exitCodeFor, validateStatus } from '../../src/utils/liveStatus.js';

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'live-check');
const noSleep = async () => {};

/** Load a recording: `{responses: [{method, url, status, headers, body, request?}]}`. */
function recording(name) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES, `${name}.json`), 'utf8')).responses;
}

/**
 * Serve recorded responses by method and URL (query string ignored). A JSON-RPC
 * recording also matches on the request's `method` field. Every request is
 * logged so a test can count what the check sent.
 */
function replay(responses) {
  const sent = [];
  const fetchFn = async (input, init = {}) => {
    const url = String(input).split('?')[0];
    const method = (init.method || 'GET').toUpperCase();
    let rpc = null;
    if (typeof init.body === 'string') {
      try {
        rpc = JSON.parse(init.body).method ?? null;
      } catch {
        rpc = null;
      }
    }
    sent.push({ method, url, rpc });
    const hit = responses.find((r) => r.method === method && r.url === url && (!r.request || r.request === rpc));
    if (!hit) throw new TypeError(`fetch failed: nothing recorded for ${method} ${url}${rpc ? ` (${rpc})` : ''}`);
    return new Response(hit.body, { status: hit.status, headers: hit.headers });
  };
  return { fetch: fetchFn, sent };
}

const byId = (id) => CHECKS.find((c) => c.id === id);

describe('live-check probe', () => {
  it('declares every check the nightly run reports, with a tier and a feature', () => {
    const ids = CHECKS.map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining([
      'query-ids', 'profile', 'tweets', 'thread', 'media', 'hashtag', 'signing',
      'edge-tools', 'edge-read', 'selectors', 'search', 'followers', 'selectors-session',
    ]));
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of CHECKS) {
      expect(['guest', 'session']).toContain(c.tier);
      expect(c.label).toBeTruthy();
      expect(c.feature).toBeTruthy();
    }
    expect(CHECKS.filter((c) => c.tier === 'session').map((c) => c.id).sort()).toEqual(['followers', 'search', 'selectors-session']);
  });

  it('reads stable public inputs only', () => {
    expect(STABLE.profile).toBe('NASA');
    expect(STABLE.postUrl).toMatch(/^https:\/\/x\.com\/\w+\/status\/\d{15,}$/);
  });

  describe('against recorded responses', () => {
    it('passes the profile read on a real guest-tier answer', async () => {
      const { fetch } = replay(recording('profile-ok'));
      const result = await runCheck(byId('profile'), createContext({ fetch }), { sleep: noSleep });
      expect(result.status).toBe('pass');
      expect(result.detail).toMatch(/^@NASA, [\d,]+ followers$/);
      expect(result.ms).toBeGreaterThanOrEqual(0);
    });

    it('records a rate-limit answer as limited, not as a failure, and does not retry it', async () => {
      const { fetch, sent } = replay(recording('profile-rate-limited'));
      const result = await runCheck(byId('profile'), createContext({ fetch }), { sleep: noSleep });
      expect(result.status).toBe('limited');
      expect(result.detail).toMatch(/429|rate/i);
      // The client's own fresh-token retry is the only repeat: one check attempt.
      const graphql = sent.filter((r) => r.url.includes('/graphql/'));
      expect(graphql).toHaveLength(2);
    });

    it('turns a rotated query ID into a regression after a passing night', async () => {
      const ok = await runCheck(byId('profile'), createContext({ fetch: replay(recording('profile-ok')).fetch }), { sleep: noSleep });
      const lastNight = buildStatus({ checks: [ok], generatedAt: '2026-11-25T04:17:00.000Z', packageVersion: '5.0.0', node: 'v22', durationMs: 1 });

      const { fetch, sent } = replay(recording('profile-query-rotated'));
      const broken = await runCheck(byId('profile'), createContext({ fetch }), { sleep: noSleep, retryDelayMs: 0 });
      expect(broken.status).toBe('fail');
      // A failure is retried once.
      expect(sent.filter((r) => r.url.includes('/graphql/')).length).toBeGreaterThanOrEqual(2);

      const tonight = buildStatus({ checks: [broken], previous: lastNight, generatedAt: '2026-11-26T04:17:00.000Z', packageVersion: '5.0.0', node: 'v22', durationMs: 1 });
      expect(validateStatus(tonight)).toEqual([]);
      expect(tonight.regressions).toEqual(['profile']);
      expect(exitCodeFor(tonight)).toBe(1);
    });

    it('passes the hosted MCP tools/list and the free read', async () => {
      const ctx = createContext({ fetch: replay(recording('edge-ok')).fetch });
      const tools = await runCheck(byId('edge-tools'), ctx, { sleep: noSleep });
      expect(tools.status).toBe('pass');
      expect(tools.detail).toContain('x_post');
      const read = await runCheck(byId('edge-read'), ctx, { sleep: noSleep });
      expect(read.status).toBe('pass');
      expect(read.detail).toContain('@BarackObama');
    });

    it('fails the hosted MCP check when the free read answers with a tool error', async () => {
      const responses = recording('edge-ok').map((r) =>
        r.request === 'tools/call'
          ? { ...r, body: JSON.stringify({ jsonrpc: '2.0', id: 2, result: { content: [{ type: 'text', text: 'Post not found' }], isError: true } }) }
          : r,
      );
      const result = await runCheck(byId('edge-read'), createContext({ fetch: replay(responses).fetch }), { sleep: noSleep, retryDelayMs: 0 });
      expect(result.status).toBe('fail');
      expect(result.detail).toContain('Post not found');
    });

    it('records a 429 from the hosted endpoint as limited', async () => {
      const responses = recording('edge-ok').map((r) => ({ ...r, status: 429, body: 'Too Many Requests' }));
      const result = await runCheck(byId('edge-tools'), createContext({ fetch: replay(responses).fetch }), { sleep: noSleep });
      expect(result.status).toBe('limited');
    });
  });

  describe('runner', () => {
    const def = (run) => ({ id: 'x', label: 'X', feature: 'f', tier: 'guest', run });

    it('retries a failure once, after a backoff, and keeps the second answer', async () => {
      let calls = 0;
      const waits = [];
      const result = await runCheck(def(async () => {
        calls += 1;
        if (calls === 1) throw new Error('flaky');
        return { detail: 'ok on retry' };
      }), createContext({}), { sleep: async (ms) => waits.push(ms), retryDelayMs: 5000 });
      expect(result).toMatchObject({ status: 'pass', detail: 'ok on retry' });
      expect(calls).toBe(2);
      expect(waits).toEqual([5000]);
    });

    it('fails after the one retry', async () => {
      let calls = 0;
      const result = await runCheck(def(async () => {
        calls += 1;
        throw new Error(`still broken ${calls}`);
      }), createContext({}), { sleep: noSleep });
      expect(result).toMatchObject({ status: 'fail', detail: 'still broken 2' });
      expect(calls).toBe(2);
    });

    it('lets a check report itself skipped', async () => {
      const result = await runCheck(def(async () => ({ status: 'skipped', detail: 'no browser' })), createContext({}), { sleep: noSleep });
      expect(result).toMatchObject({ id: 'x', status: 'skipped', detail: 'no browser' });
    });

    it('skips the session checks when no cookie secret is set', async () => {
      const ctx = createContext({ fetch: async () => { throw new Error('no network in this test'); } });
      const results = await runChecks(ctx, { only: ['search', 'followers', 'selectors-session'], sleep: noSleep });
      expect(results.map((r) => r.status)).toEqual(['skipped', 'skipped', 'skipped']);
      expect(results[0].detail).toContain('XACTIONS_LIVE_CHECK_COOKIES');
    });

    it('waits between checks', async () => {
      const waits = [];
      await runChecks(createContext({}), {
        checks: [def(async () => ({ detail: 'a' })), { ...def(async () => ({ detail: 'b' })), id: 'y' }],
        sleep: async (ms) => waits.push(ms),
      });
      expect(waits).toHaveLength(1);
      expect(waits[0]).toBeGreaterThanOrEqual(1000);
      expect(waits[0]).toBeLessThanOrEqual(3000);
    });
  });
});
