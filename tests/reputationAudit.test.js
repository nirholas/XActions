// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * reputationAudit Test Suite
 *
 * browser/reputationAudit.js is a paste-in console script: eval the real
 * source inside a jsdom window pointed at a real x.com profile URL, then
 * drive the risk-parsing helpers and panel it exposes on window.
 *
 * @author nichxbt
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE_URL = 'https://x.com/cryptopumps';

function articleHtml({ author, id, text, when, isReply = false }) {
  return `
    <article data-testid="tweet" role="article">
      ${isReply ? '<div data-testid="socialContext">Replying to</div>' : ''}
      <div data-testid="User-Name"><span>${author} display</span><span>@${author}</span></div>
      <a href="/${author}/status/${id}"><time datetime="${when}">time</time></a>
      <div data-testid="tweetText">${text}</div>
      <button data-testid="reply" aria-label="Reply"></button>
      <button data-testid="retweet" aria-label="0 reposts. Repost"></button>
      <button data-testid="like" aria-label="0 Likes. Like"></button>
      <button data-testid="caret" aria-label="More"></button>
    </article>`;
}

const POSTS = [
  articleHtml({ author: 'cryptopumps', id: '2000000000000000001', text: 'Shipped the v2 dashboard today', when: '2026-06-01T10:00:00.000Z' }),
  articleHtml({ author: 'cryptopumps', id: '2000000000000000002', text: 'Fire that idiot from accounting', when: '2026-06-02T10:00:00.000Z', isReply: true }),
];

let win;

function loadScript() {
  const source = readFileSync(resolve(ROOT, 'browser', 'reputationAudit.js'), 'utf8');
  const dom = new JSDOM(
    `<!DOCTYPE html><html><head></head><body>
       <nav><a data-testid="AppTabBar_Profile_Link" href="/cryptopumps">Profile</a></nav>
       <main>${POSTS.join('')}</main>
     </body></html>`,
    { url: PROFILE_URL, pretendToBeVisual: true, runScripts: 'outside-only' },
  );
  dom.window.eval(source);
  return dom.window;
}

beforeAll(() => {
  win = loadScript();
});

describe('reputationAudit: loading', () => {
  it('mounts its panel and exposes the console API on your own profile', () => {
    expect(win.document.getElementById('xra-panel')).toBeTruthy();
    expect(typeof win.XReputationAudit.scan).toBe('function');
    expect(typeof win.XReputationAudit.clearCache).toBe('function');
  });

  it('refuses to run on someone else\'s profile', () => {
    const dom = new JSDOM(
      `<!DOCTYPE html><html><body>
         <nav><a data-testid="AppTabBar_Profile_Link" href="/cryptopumps">Profile</a></nav>
       </body></html>`,
      { url: 'https://x.com/nichxbt', pretendToBeVisual: true, runScripts: 'outside-only' },
    );
    const source = readFileSync(resolve(ROOT, 'browser', 'reputationAudit.js'), 'utf8');
    dom.window.eval(source);
    expect(dom.window.document.getElementById('xra-panel')).toBeFalsy();
  });

  it('starts with all four built-in dimensions selected and cleanup in dry run', () => {
    const { config } = win.XReputationAudit;
    expect(config.dimensions).toEqual({ professional: true, hostile: true, legal: true, spam: true });
    expect(config.cleanup.dryRun).toBe(true);
  });
});

describe('reputationAudit: panel controls', () => {
  const el = (id) => win.document.getElementById(id);

  it('toggles a dimension chip off and on', () => {
    expect(el('xra-chip-spam').classList.contains('on')).toBe(true);
    el('xra-d-spam').checked = false;
    el('xra-d-spam').dispatchEvent(new win.Event('change', { bubbles: true }));
    expect(win.XReputationAudit.config.dimensions.spam).toBe(false);
    expect(el('xra-chip-spam').classList.contains('on')).toBe(false);
    el('xra-d-spam').checked = true;
    el('xra-d-spam').dispatchEvent(new win.Event('change', { bubbles: true }));
  });

  it('reads a custom risk question into config', () => {
    el('xra-custom').value = 'Does this reveal a home address?';
    el('xra-custom').dispatchEvent(new win.Event('input', { bubbles: true }));
    expect(win.XReputationAudit.config.customQuestion).toBe('Does this reveal a home address?');
    el('xra-custom').value = '';
    el('xra-custom').dispatchEvent(new win.Event('input', { bubbles: true }));
  });

  it('the report and flagged sections stay hidden before a scan runs', () => {
    expect(el('xra-report-section').style.display).toBe('none');
    expect(el('xra-flagged-section').style.display).toBe('none');
  });
});

describe('reputationAudit: reading and eligibility', () => {
  it('reads both posts and marks the reply eligible for scoring', () => {
    const rows = win.XReputationAudit.preview();
    expect(rows).toHaveLength(2);
    const [first, second] = rows;
    expect(first.id).toBe('2000000000000000001');
    expect(first.isMine).toBe(true);
    expect(second.isReply).toBe(true);
    expect(second.eligible).toBe(true);
  });

  it('marks a post from another author ineligible', () => {
    const dom = new JSDOM(
      `<!DOCTYPE html><html><body>
         <nav><a data-testid="AppTabBar_Profile_Link" href="/cryptopumps">Profile</a></nav>
         <main>${articleHtml({ author: 'someoneelse', id: '2000000000000000009', text: 'not mine', when: '2026-06-03T10:00:00.000Z' })}</main>
       </body></html>`,
      { url: PROFILE_URL, pretendToBeVisual: true, runScripts: 'outside-only' },
    );
    const source = readFileSync(resolve(ROOT, 'browser', 'reputationAudit.js'), 'utf8');
    dom.window.eval(source);
    const rows = dom.window.XReputationAudit.preview();
    expect(rows[0].eligible).toBe(false);
  });
});

describe('reputationAudit: risk-response parsing (same contract as src/ai/reputationScorer.js)', () => {
  const CLEAN_JSON = JSON.stringify({
    professional: { score: 5, reason: 'ordinary update' },
    hostile: { score: 0, reason: 'no target' },
    legal: { score: 0, reason: 'no claims' },
    spam: { score: 10, reason: 'plain announcement' },
  });
  const FLAGGED_JSON = JSON.stringify({
    professional: { score: 92, reason: 'insults a named coworker' },
    hostile: { score: 88, reason: 'direct personal attack' },
    legal: { score: 20, reason: 'no explicit threat' },
    spam: { score: 0, reason: 'not spam' },
  });

  it('builds a system prompt naming every active dimension with a strict JSON contract', () => {
    const dims = [
      { key: 'professional', label: 'Professional', question: 'Would this embarrass the author?' },
      { key: 'hostile', label: 'Hostile', question: 'Is this hostile?' },
    ];
    const prompt = win.XReputationAudit.buildRiskSystemPrompt(dims);
    expect(prompt).toContain('professional:');
    expect(prompt).toContain('hostile:');
    expect(prompt).toContain('ONLY a single JSON object');
  });

  it('parses a clean verdict as clean', () => {
    const dims = [
      { key: 'professional', label: 'Professional' }, { key: 'hostile', label: 'Hostile' },
      { key: 'legal', label: 'Legal exposure' }, { key: 'spam', label: 'Low value' },
    ];
    const result = win.XReputationAudit.parseRiskResponse(CLEAN_JSON, dims);
    expect(result.verdict).toBe('clean');
    expect(result.overall).toBe(10);
  });

  it('parses a flagged verdict, keyed to the worst dimension, and unwraps a code fence', () => {
    const dims = [
      { key: 'professional', label: 'Professional' }, { key: 'hostile', label: 'Hostile' },
      { key: 'legal', label: 'Legal exposure' }, { key: 'spam', label: 'Low value' },
    ];
    const result = win.XReputationAudit.parseRiskResponse('```json\n' + FLAGGED_JSON + '\n```', dims);
    expect(result.verdict).toBe('flagged');
    expect(result.overall).toBe(92);
    expect(result.worstDimension).toBe('professional');
  });
});
