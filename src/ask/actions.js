// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Answer-to-action matching for Ask XActions.
 *
 * An explanation is only half of what someone asking "how do I unfollow
 * everyone" wants. The other half is the thing they run. This ranks the
 * catalog in dashboard/data/ask-actions.json (built by
 * scripts/build-ask-actions.mjs from the real scripts, CLI and MCP surfaces)
 * against a question and the passages retrieval already found, and returns
 * the browser script to paste, the terminal command to type, and the MCP tool
 * an agent should call.
 *
 * The retrieved sources matter as much as the question text: a passage from
 * docs/examples/unfollow-everyone.md is direct evidence that
 * browser/unfollowEveryone.js is the answer, and it survives phrasing
 * ("clean out my following", "start fresh") that no keyword match would.
 *
 * Runs unchanged in Node, the Cloudflare Worker and the browser.
 *
 * @module ask/actions
 * by nichxbt
 */

import { tokenize } from './engine.js';

/** Weighting: an action named by a retrieved source is far stronger evidence than a word overlap. */
const SOURCE_HIT = 12;
const TITLE_HIT = 3;
const TEXT_HIT = 1;
const KIND_INTENT = 4;

/** Phrases that say which surface the asker is on, so the right one leads. */
const INTENT = {
  cli: /\b(cli|terminal|command line|shell|npx|npm|bash|headless|server|cron|script it|automate)\b/i,
  mcp: /\b(mcp|claude|cursor|copilot|agent|ai tool|desktop|tool call)\b/i,
  script: /\b(console|devtools|browser|paste|f12|inspect|no install|without install)\b/i,
};

/**
 * Index a catalog once so repeated questions are cheap.
 *
 * @param {{ actions: Array<object> }} catalog  parsed ask-actions.json
 */
export function createActionMatcher(catalog) {
  const actions = catalog.actions.map((action) => ({
    action,
    terms: new Set([
      ...tokenize(action.title || ''),
      ...tokenize(action.description || ''),
      ...tokenize(action.id.replace(/[-_]/g, ' ')),
      ...tokenize(action.category || ''),
    ]),
    // The file an action came from, so a retrieved passage can name it directly.
    paths: new Set([action.path, action.id].filter(Boolean)),
  }));

  // A term carried by a large share of the catalog identifies nothing. Every
  // CLI title begins "xactions", so without this the product's own name makes
  // "is XActions safe?" look like a request to run something.
  const df = new Map();
  for (const entry of actions) for (const term of entry.terms) df.set(term, (df.get(term) || 0) + 1);
  const common = new Set([...df.entries()].filter(([, n]) => n / actions.length > 0.25).map(([t]) => t));

  /**
   * @param {string} question
   * @param {Array<{ p: string, t: string }>} [sources]  retrieved chunks
   * @param {{ limit?: number, perKind?: number }} [opts]
   * @returns {Array<object>} ranked actions, each with a `why` explaining the match
   */
  function match(question, sources = [], opts = {}) {
    const limit = opts.limit ?? 4;
    const perKind = opts.perKind ?? 2;
    const queryTerms = new Set(tokenize(question));
    if (!queryTerms.size) return [];

    // Every path and title the retrieved passages point at.
    const sourcePaths = new Set();
    const sourceTerms = new Set();
    for (const s of sources) {
      if (s.p) {
        sourcePaths.add(s.p);
        // docs/examples/unfollow-everyone.md -> "unfollow-everyone"
        const stem = s.p.split('/').pop().replace(/\.(md|js|html)$/, '');
        sourcePaths.add(stem);
        for (const t of tokenize(stem.replace(/[-_]/g, ' '))) sourceTerms.add(t);
      }
      for (const t of tokenize(s.t || '')) sourceTerms.add(t);
    }

    const intents = Object.entries(INTENT).filter(([, re]) => re.test(question)).map(([kind]) => kind);

    const scored = [];
    for (const entry of actions) {
      const why = [];

      // Direct evidence: a cited passage names this action's file, or the
      // question's own words match its title and description.
      let namedBySource = false;
      for (const path of entry.paths) {
        if (sourcePaths.has(path)) { namedBySource = true; break; }
      }
      let titleHits = 0;
      for (const term of tokenize(entry.action.title || '')) if (queryTerms.has(term) && !common.has(term)) titleHits++;
      let textHits = 0;
      for (const term of entry.terms) if (queryTerms.has(term) && !common.has(term)) textHits++;

      // One incidental word in common is not a match. Without this floor,
      // "unfollow all users" surfaces Edit Profile for sharing the word "user".
      const eligible = namedBySource || titleHits > 0 || textHits >= 2;
      if (!eligible) continue;

      let score = (namedBySource ? SOURCE_HIT : 0) + titleHits * TITLE_HIT + textHits * TEXT_HIT;
      if (namedBySource) why.push('named by a cited source');
      else if (titleHits) why.push('matches what you asked for');

      // Overlap with the retrieved passages amplifies an action that already
      // matched; it can never make an unrelated one eligible.
      let sourceOverlap = 0;
      for (const term of entry.terms) if (sourceTerms.has(term) && !common.has(term)) sourceOverlap++;
      score += Math.min(sourceOverlap, 6) * 1.5;

      // Intent breaks ties between things that already matched.
      if (intents.includes(entry.action.kind)) {
        score += KIND_INTENT;
        why.push(`you asked about the ${entry.action.kind === 'cli' ? 'terminal' : entry.action.kind}`);
      }

      if (score < 8) continue;
      scored.push({ ...entry.action, score, why: why[0] || 'related to your question' });
    }

    // An explicit surface intent decides which kind leads, rather than nudging
    // it by KIND_INTENT and hoping the margin holds. "scrape followers from the
    // terminal" must answer with the terminal even when a browser script scores
    // higher on word overlap, and a bonus cannot guarantee that: any edit to any
    // description can flip a half-point gap. Ordering by kind first can't.
    const soleIntent = intents.length === 1 ? intents[0] : null;
    scored.sort((a, b) => {
      if (soleIntent) {
        const rank = (x) => (x.kind === soleIntent ? 0 : 1);
        if (rank(a) !== rank(b)) return rank(a) - rank(b);
      }
      return b.score - a.score || a.id.localeCompare(b.id);
    });

    // Spread across surfaces so an answer offers the console script AND the
    // terminal command, rather than four near-identical MCP tools.
    const perKindCount = new Map();
    const picked = [];
    for (const action of scored) {
      const n = perKindCount.get(action.kind) || 0;
      if (n >= perKind) continue;
      perKindCount.set(action.kind, n + 1);
      picked.push(action);
      if (picked.length >= limit) break;
    }
    return picked;
  }

  return { match, size: actions.length, isCommon: (term) => common.has(term) };
}

/**
 * Public shape for the API and the UI: no scores, no internals, and a single
 * `run` field describing exactly what to do with it.
 */
export function publicActions(actions) {
  return actions.map((a) => {
    const base = { kind: a.kind, id: a.id, title: a.title, description: a.description, why: a.why };
    if (a.kind === 'script') {
      return {
        ...base,
        run: a.runOn ? `Open ${a.runOn}, press F12, paste into the Console tab` : 'Open x.com, press F12, paste into the Console tab',
        page: a.page,
        // Only a concrete destination is linkable; x.com/YOUR_USERNAME is an
        // instruction, not a URL, so it stays as text in `run`.
        runOnUrl: a.runOn && !/[<>{}$]|[A-Z_]{4,}/.test(a.runOn) ? `https://${a.runOn}` : null,
        raw: a.raw,
        source: a.source,
        needsCore: a.needsCore,
      };
    }
    if (a.kind === 'cli') return { ...base, run: a.command, install: 'npm install -g xactions' };
    return { ...base, run: `Call ${a.id}${a.required?.length ? ` with ${a.required.join(', ')}` : ''}`, required: a.required || [] };
  });
}
