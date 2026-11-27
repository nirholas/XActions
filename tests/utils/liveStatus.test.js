// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The nightly live check's status file: its shape, the regression rule that
 * decides the exit code and the issue, the `limited` case, the badge, the
 * history, and the issue plan. Offline: pure functions over plain objects.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LIVE_STATUS_URL,
  LIVE_BADGE_URL,
  LIVE_HISTORY_URL,
  ISSUE_LABEL,
  HISTORY_LIMIT,
  appendHistory,
  buildBadge,
  buildStatus,
  classifyError,
  exitCodeFor,
  parseSelectorsDoc,
  planIssueAction,
  validateStatus,
} from '../../src/utils/liveStatus.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const AT = '2026-11-26T04:17:00.000Z';

/** A check result as the probe produces it. */
function check(id, status, extra = {}) {
  return { id, label: id, feature: `feature ${id}`, tier: 'guest', status, ms: 120, detail: `${id} ${status}`, ...extra };
}

function status(checks, previous = null, generatedAt = AT) {
  return buildStatus({ checks, previous, generatedAt, packageVersion: '5.0.0', node: 'v22.20.0', durationMs: 4000 });
}

describe('liveStatus', () => {
  describe('published locations', () => {
    it('reads from the status branch, not from main', () => {
      expect(LIVE_STATUS_URL).toBe('https://raw.githubusercontent.com/nirholas/XActions/status/status.json');
      expect(LIVE_BADGE_URL).toBe('https://raw.githubusercontent.com/nirholas/XActions/status/badge.json');
      expect(LIVE_HISTORY_URL).toBe('https://raw.githubusercontent.com/nirholas/XActions/status/history.json');
      expect(ISSUE_LABEL).toBe('x-changed');
    });
  });

  describe('buildStatus shape', () => {
    it('carries a timestamp, the date, the package version and per-check fields', () => {
      const s = status([check('profile', 'pass'), check('hashtag', 'fail'), check('search', 'skipped'), check('tweets', 'limited')]);
      expect(validateStatus(s)).toEqual([]);
      expect(s.version).toBe(1);
      expect(s.generatedAt).toBe(AT);
      expect(s.date).toBe('2026-11-26');
      expect(s.package).toEqual({ name: 'xactions', version: '5.0.0' });
      expect(s.node).toBe('v22.20.0');
      expect(s.durationMs).toBe(4000);
      expect(s.summary).toEqual({ total: 4, checked: 2, pass: 1, fail: 1, limited: 1, skipped: 1 });
      expect(s.ok).toBe(false);
      for (const c of s.checks) {
        expect(Object.keys(c)).toEqual(expect.arrayContaining(['id', 'label', 'feature', 'tier', 'status', 'ms', 'detail', 'lastPassedAt', 'lastConclusive']));
      }
      expect(s.checks.find((c) => c.id === 'profile').lastPassedAt).toBe(AT);
      expect(s.checks.find((c) => c.id === 'hashtag').lastPassedAt).toBeNull();
    });

    it('is ok when nothing failed, even with limited and skipped checks', () => {
      const s = status([check('profile', 'pass'), check('tweets', 'limited'), check('search', 'skipped')]);
      expect(s.ok).toBe(true);
    });

    it('keeps per-selector items on a check', () => {
      const items = [{ name: 'Tweet', selector: 'article[data-testid="tweet"]', matched: true, count: 4 }];
      const s = status([check('selectors', 'pass', { items })]);
      expect(s.checks[0].items).toEqual(items);
      expect(validateStatus(s)).toEqual([]);
    });

    it('records the run when one is given', () => {
      const s = buildStatus({
        checks: [check('profile', 'pass')],
        generatedAt: AT,
        packageVersion: '5.0.0',
        node: 'v22',
        durationMs: 1,
        run: { url: 'https://github.com/nirholas/XActions/actions/runs/1', sha: 'abc' },
      });
      expect(s.run).toEqual({ url: 'https://github.com/nirholas/XActions/actions/runs/1', sha: 'abc' });
    });

    it('rejects a malformed file', () => {
      expect(validateStatus(null)).not.toEqual([]);
      expect(validateStatus({ version: 2 })).toEqual(expect.arrayContaining([expect.stringMatching(/version/)]));
      const s = status([check('profile', 'pass')]);
      s.checks[0].status = 'great';
      expect(validateStatus(s)).toEqual(expect.arrayContaining([expect.stringMatching(/status/)]));
    });

    it('rejects duplicate check ids', () => {
      expect(() => status([check('profile', 'pass'), check('profile', 'fail')])).toThrow(/duplicate/i);
    });
  });

  describe('the regression rule', () => {
    it('flags a check that passed last time and fails now', () => {
      const first = status([check('profile', 'pass'), check('tweets', 'pass')]);
      const second = status([check('profile', 'fail'), check('tweets', 'pass')], first, '2026-11-27T04:17:00.000Z');
      expect(second.regressions).toEqual(['profile']);
      expect(second.openRegressions).toEqual(['profile']);
      expect(exitCodeFor(second)).toBe(1);
      expect(second.checks.find((c) => c.id === 'profile').lastPassedAt).toBe(AT);
    });

    it('does not flag a check that was already failing', () => {
      const first = status([check('hashtag', 'fail')]);
      const second = status([check('hashtag', 'fail')], first);
      expect(second.regressions).toEqual([]);
      expect(exitCodeFor(second)).toBe(0);
    });

    it('does not flag a failure with no previous run, or a check that is new', () => {
      expect(status([check('hashtag', 'fail')]).regressions).toEqual([]);
      const first = status([check('profile', 'pass')]);
      expect(status([check('profile', 'pass'), check('media', 'fail')], first).regressions).toEqual([]);
    });

    it('looks through a limited or skipped run to the last conclusive result', () => {
      const pass = status([check('profile', 'pass')]);
      const limited = status([check('profile', 'limited')], pass);
      expect(limited.regressions).toEqual([]);
      expect(limited.checks[0].lastConclusive).toBe('pass');
      const fail = status([check('profile', 'fail')], limited);
      expect(fail.regressions).toEqual(['profile']);

      const skipped = status([check('search', 'skipped')], status([check('search', 'pass')]));
      expect(status([check('search', 'fail')], skipped).regressions).toEqual(['search']);
    });

    it('keeps a regression open until that check passes again', () => {
      const pass = status([check('profile', 'pass'), check('tweets', 'pass')]);
      const broke = status([check('profile', 'fail'), check('tweets', 'pass')], pass);
      const stillBroken = status([check('profile', 'fail'), check('tweets', 'pass')], broke);
      expect(stillBroken.regressions).toEqual([]);
      expect(stillBroken.openRegressions).toEqual(['profile']);
      expect(exitCodeFor(stillBroken)).toBe(0);

      const limited = status([check('profile', 'limited'), check('tweets', 'pass')], stillBroken);
      expect(limited.openRegressions).toEqual(['profile']);

      const fixed = status([check('profile', 'pass'), check('tweets', 'pass')], limited);
      expect(fixed.openRegressions).toEqual([]);
    });

    it('drops an open regression for a check that no longer exists', () => {
      const broke = status([check('old', 'fail')], status([check('old', 'pass')]));
      expect(status([check('profile', 'pass')], broke).openRegressions).toEqual([]);
    });

    it('ignores a previous file it cannot read', () => {
      const s = status([check('profile', 'fail')], { version: 99, checks: 'nope' });
      expect(s.regressions).toEqual([]);
    });
  });

  describe('classifyError, the limited case', () => {
    it('treats the client rate-limit errors and a 429 as limited', () => {
      expect(classifyError(Object.assign(new Error('Rate limited (429).'), { code: 'RATE_LIMITED' }))).toBe('limited');
      expect(classifyError(Object.assign(new Error('Too many'), { name: 'RateLimitError' }))).toBe('limited');
      expect(classifyError(Object.assign(new Error('HTTP 429'), { status: 429 }))).toBe('limited');
      expect(classifyError(Object.assign(new Error('x'), { httpStatus: 429 }))).toBe('limited');
      expect(classifyError(new Error('Rate limit exceeded'))).toBe('limited');
    });

    it('treats everything else as a failure', () => {
      expect(classifyError(new Error('Query not found'))).toBe('fail');
      expect(classifyError(Object.assign(new Error('Authentication failed (403)'), { status: 403 }))).toBe('fail');
      expect(classifyError('boom')).toBe('fail');
      expect(classifyError(undefined)).toBe('fail');
    });

    it('never counts a limited check as a regression', () => {
      const s = status([check('profile', 'limited')], status([check('profile', 'pass')]));
      expect(s.regressions).toEqual([]);
      expect(exitCodeFor(s)).toBe(0);
    });
  });

  describe('buildBadge', () => {
    it('is a shields endpoint document with only the keys shields accepts', () => {
      const badge = buildBadge(status([check('profile', 'pass'), check('tweets', 'pass')]));
      expect(badge).toEqual({
        schemaVersion: 1,
        label: 'verified against x.com',
        message: '2026-11-26, 2/2 pass',
        color: 'brightgreen',
        cacheSeconds: 3600,
      });
    });

    it('turns yellow for a known failure and red for an open regression', () => {
      expect(buildBadge(status([check('profile', 'pass'), check('hashtag', 'fail')])).color).toBe('yellow');
      const broke = status([check('profile', 'fail')], status([check('profile', 'pass')]));
      expect(buildBadge(broke)).toMatchObject({ color: 'red', message: '2026-11-26, 0/1 pass' });
    });

    it('does not count limited or skipped checks against the total', () => {
      const badge = buildBadge(status([check('profile', 'pass'), check('tweets', 'limited'), check('search', 'skipped')]));
      expect(badge.message).toBe('2026-11-26, 1/1 pass');
    });
  });

  describe('appendHistory', () => {
    it('adds one entry per run and trims to the limit', () => {
      let history = [];
      for (let day = 1; day <= HISTORY_LIMIT + 5; day++) {
        const at = new Date(Date.UTC(2026, 6, day, 4, 17)).toISOString();
        history = appendHistory(history, status([check('profile', 'pass')], null, at));
      }
      expect(history).toHaveLength(HISTORY_LIMIT);
      expect(history.at(-1)).toMatchObject({ pass: 1, fail: 0, limited: 0, skipped: 0, failing: [], regressions: [] });
    });

    it('records which checks failed and regressed', () => {
      const broke = status([check('profile', 'fail'), check('hashtag', 'fail')], status([check('profile', 'pass'), check('hashtag', 'fail')]));
      const [entry] = appendHistory([], broke);
      expect(entry).toEqual({ generatedAt: AT, date: '2026-11-26', pass: 0, fail: 2, limited: 0, skipped: 0, failing: ['profile', 'hashtag'], regressions: ['profile'] });
    });

    it('starts over from a history file that is not a list', () => {
      expect(appendHistory({ broken: true }, status([check('profile', 'pass')]))).toHaveLength(1);
    });
  });

  describe('planIssueAction', () => {
    const runUrl = 'https://github.com/nirholas/XActions/actions/runs/42';
    const pass = status([check('profile', 'pass'), check('tweets', 'pass'), check('hashtag', 'fail')]);
    const broke = status([check('profile', 'fail', { detail: 'Query not found' }), check('tweets', 'pass'), check('hashtag', 'fail')], pass, '2026-11-27T04:17:00.000Z');

    it('opens one issue on a new failure', () => {
      const plan = planIssueAction({ status: broke, openIssue: null, runUrl });
      expect(plan.action).toBe('open');
      expect(plan.title).toBe('x.com changed: profile failing since 2026-11-27');
      expect(plan.body).toContain('Query not found');
      expect(plan.body).toContain(runUrl);
      expect(plan.body).toContain('https://xactions.app/status');
      expect(plan.body).toContain('**new**');
    });

    it('comments on the open issue instead of opening a second', () => {
      const plan = planIssueAction({ status: broke, openIssue: 17, runUrl });
      expect(plan).toMatchObject({ action: 'comment', issue: 17 });
      expect(plan.body).toContain('profile');
    });

    it('stays quiet while the same checks keep failing', () => {
      const still = status(broke.checks.map((c) => ({ ...c })), broke);
      expect(planIssueAction({ status: still, openIssue: 17, runUrl }).action).toBe('none');
    });

    it('closes the issue once every regressed check passes again', () => {
      const fixed = status([check('profile', 'pass'), check('tweets', 'pass'), check('hashtag', 'fail')], broke);
      const plan = planIssueAction({ status: fixed, openIssue: 17, runUrl });
      expect(plan).toMatchObject({ action: 'close', issue: 17 });
      expect(plan.body).toContain('pass again');
    });

    it('does nothing when there is no issue and nothing regressed', () => {
      expect(planIssueAction({ status: pass, openIssue: null, runUrl }).action).toBe('none');
    });
  });

  describe('parseSelectorsDoc', () => {
    it('reads every row of docs/agents/selectors.md with its section', () => {
      const doc = fs.readFileSync(path.join(ROOT, 'docs/agents/selectors.md'), 'utf8');
      const rows = parseSelectorsDoc(doc);
      expect(rows.length).toBeGreaterThan(50);
      expect(rows).toContainEqual({ section: 'Common', name: 'Tweet', selector: 'article[data-testid="tweet"]' });
      expect(rows).toContainEqual({ section: 'Engagement', name: 'Like button', selector: '[data-testid="like"]' });
      expect(rows.every((r) => r.selector && !r.selector.includes('`'))).toBe(true);
      expect(rows.find((r) => r.name === 'Element')).toBeUndefined();
    });
  });
});
