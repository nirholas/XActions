// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Ask XActions engine: retrieval over the docs index, a live GitHub lane, and
 * a grounded answer streamed through the free LLM chain.
 *
 * Runs unchanged in Node (Express route), the Cloudflare Worker (edge route),
 * and the browser (the /ask page falls back to it when no API is reachable),
 * so it only uses `fetch` and plain JavaScript.
 *
 * The index is built by `scripts/build-ask-index.mjs` from docs/, skills/,
 * tutorials/, the browser scripts, and the dashboard pages, and served as
 * /data/ask-index.json.
 *
 * @module ask/engine
 * by nichxbt
 */

import { buildLaneChain, streamCompletion } from './lanes.js';
import { publicActions } from './actions.js';

export const REPO = 'nirholas/XActions';
export const SITE = 'https://xactions.app';

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'is', 'it', 'do', 'i', 'how', 'can', 'my', 'me', 'with', 'this', 'that', 'be', 'are', 'was', 'what', 'which', 'from', 'by', 'at', 'as', 'you', 'your', 'we', 'our', 'does', 'did', 'have', 'has', 'use', 'using', 'get', 'want', 'need', 'please', 'there', 'should', 'would', 'could', 'into', 'about', 'if', 'so', 'not', 'no', 'yes']);

// Vocabulary bridges between how people ask and how the docs are written.
const SYNONYMS = {
  all: ['everyone', 'every', 'mass', 'bulk'],
  everyone: ['all', 'mass'],
  everybody: ['everyone', 'all'],
  twitter: ['x'],
  tweet: ['post'],
  tweets: ['posts'],
  post: ['tweet'],
  posts: ['tweets'],
  retweet: ['repost'],
  repost: ['retweet'],
  unfollowers: ['unfollow', 'detect'],
  unfollow: ['unfollowing', 'following'],
  followers: ['follower'],
  install: ['setup', 'npm', 'getting', 'started'],
  setup: ['install', 'configure'],
  bot: ['automation', 'agent'],
  claude: ['mcp'],
  chatgpt: ['gpt', 'openai', 'mcp'],
  cursor: ['mcp'],
  scrape: ['scraper', 'scraping', 'export'],
  download: ['video', 'export', 'save'],
  delete: ['remove', 'cleanup', 'clear'],
  remove: ['delete', 'clear'],
  dm: ['message', 'messages', 'direct'],
  dms: ['messages', 'direct'],
  price: ['pricing', 'cost', 'free'],
  cost: ['pricing', 'free'],
  safe: ['ban', 'rate', 'limit', 'security'],
  banned: ['suspended', 'rate', 'limit', 'safe'],
  cookie: ['session', 'auth_token', 'login'],
  login: ['auth', 'session', 'cookie'],
  key: ['api', 'token'],
  console: ['browser', 'devtools', 'script'],
  devtools: ['console', 'browser'],
  extension: ['chrome', 'browser'],
  cli: ['command', 'terminal', 'xactions'],
  terminal: ['cli', 'command'],
};

function stem(w) {
  if (w.length <= 3) return w;
  return w.replace(/(ing|ers|ies|ed|es|s)$/, (m) => (m === 'ies' ? 'y' : m === 'ers' ? 'er' : ''));
}

/** Lowercase word tokens with light stemming; underscores and dots split too. */
export function tokenize(text) {
  return String(text)
    .toLowerCase()
    .split(/[^a-z0-9@#]+/)
    .filter((t) => t.length >= 2 && !STOP.has(t))
    .map(stem);
}

function expandQuery(question) {
  const raw = String(question).toLowerCase().split(/[^a-z0-9@#_]+/).filter(Boolean);
  const terms = new Set();
  for (const w of raw) {
    if (STOP.has(w) || w.length < 2) continue;
    terms.add(stem(w));
    for (const s of SYNONYMS[w] || []) terms.add(stem(s));
  }
  return [...terms];
}

/**
 * Build a BM25 searcher over the index chunks. Cheap enough to do on every
 * cold start (a few thousand chunks); cache the result per process.
 */
export function createSearcher(index) {
  const chunks = index.chunks;
  const df = new Map();
  const docTerms = chunks.map((c) => {
    const tf = new Map();
    const tokens = tokenize(`${c.t} ${c.t} ${c.x}`);
    for (const tok of tokens) tf.set(tok, (tf.get(tok) || 0) + 1);
    for (const tok of tf.keys()) df.set(tok, (df.get(tok) || 0) + 1);
    return { tf, len: tokens.length };
  });
  const avgLen = docTerms.reduce((a, d) => a + d.len, 0) / Math.max(1, docTerms.length);
  const N = chunks.length;
  const k1 = 1.4;
  const b = 0.75;

  function search(question, { limit = 8, perDoc = 3 } = {}) {
    const terms = expandQuery(question);
    if (!terms.length) return [];
    const scored = [];
    for (let i = 0; i < N; i++) {
      const { tf, len } = docTerms[i];
      let score = 0;
      for (const term of terms) {
        const f = tf.get(term);
        if (!f) continue;
        const n = df.get(term) || 0;
        const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
        score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * len) / avgLen)));
      }
      if (score <= 0) continue;
      const titleTokens = new Set(tokenize(chunks[i].t));
      let titleHits = 0;
      for (const term of terms) if (titleTokens.has(term)) titleHits++;
      score *= 1 + 0.35 * titleHits;
      if (chunks[i].k === 'doc' || chunks[i].k === 'skill') score *= 1.15;
      scored.push({ i, score });
    }
    scored.sort((a, b2) => b2.score - a.score);
    const perDocCount = new Map();
    const out = [];
    for (const { i, score } of scored) {
      const c = chunks[i];
      const seen = perDocCount.get(c.p) || 0;
      if (seen >= perDoc) continue;
      perDocCount.set(c.p, seen + 1);
      out.push({ ...c, score });
      if (out.length >= limit) break;
    }
    return out;
  }

  return { search, size: N };
}

/**
 * Live GitHub lane: open issues and discussions that match the question. No
 * key needed for search/issues; a GITHUB_TOKEN raises the rate limit and
 * unlocks code search.
 */
export async function searchGitHub(question, { token, timeoutMs = 5000 } = {}) {
  const q = String(question).replace(/[^\w\s]/g, ' ').trim().split(/\s+/).slice(0, 8).join(' ');
  if (!q) return [];
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'xactions-ask' };
  if (token) headers.authorization = `Bearer ${token}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const requests = [
      fetch(`https://api.github.com/search/issues?q=${encodeURIComponent(`repo:${REPO} ${q}`)}&per_page=4`, { headers, signal: controller.signal }),
    ];
    if (token) {
      requests.push(fetch(`https://api.github.com/search/code?q=${encodeURIComponent(`repo:${REPO} ${q}`)}&per_page=3`, { headers, signal: controller.signal }));
    }
    const responses = await Promise.allSettled(requests);
    const out = [];
    const issues = responses[0].status === 'fulfilled' && responses[0].value.ok ? await responses[0].value.json() : null;
    for (const item of issues?.items || []) {
      out.push({
        t: `${item.pull_request ? 'PR' : 'Issue'} #${item.number}: ${item.title}`,
        u: item.html_url,
        p: `github:${item.number}`,
        k: item.pull_request ? 'pr' : 'issue',
        x: `${item.state} · ${String(item.body || '').replace(/\s+/g, ' ').slice(0, 600)}`,
      });
    }
    const code = responses[1]?.status === 'fulfilled' && responses[1].value.ok ? await responses[1].value.json() : null;
    for (const item of code?.items || []) {
      out.push({ t: item.path, u: item.html_url, p: item.path, k: 'code', x: `Source file in ${REPO}: ${item.path}` });
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Format retrieved sources as a plain digest of what the documentation says.
 *
 * Used when every LLM lane is exhausted (all the keyless lanes are rate limited
 * per IP, so this is reachable in practice). The user still gets the real
 * passages that matched their question and the links to read further, which is
 * strictly more useful than an error. It is generated text from the index, not
 * a model answer, and the caller labels it as such.
 */
export function docsDigest(question, sources) {
  if (!sources.length) return '';
  const lines = sources.slice(0, 5).map((s, i) => {
    const body = s.x
      .split(/\n\[\.\.\.\]\n/)[0]
      .replace(/\s+/g, ' ')
      .slice(0, 420)
      .trim();
    return `**[${i + 1}] [${s.t}](${s.u})**\n\n${body}${body.length >= 420 ? '...' : ''}`;
  });
  return `The model lanes are all busy right now, so here are the passages that match **${question.replace(/[*_`]/g, '')}**, straight from the documentation:\n\n${lines.join('\n\n')}\n\nOpen a source above for the full page, or ask again in a moment for a written answer.`;
}

const SYSTEM_PROMPT = `You are Ask XActions, the assistant for XActions (https://xactions.app), the open-source X/Twitter automation toolkit by @nichxbt: 208 browser console scripts, a CLI (npx xactions), an MCP server for AI agents, a Node.js library, a REST API and a browser extension. No X API fees.

Answer the user's question using the numbered SOURCES. Rules:
- Be concrete: name the exact script file, command, page, or MCP tool. Give the steps. Include copy-pasteable commands or code when the sources contain them.
- Cite sources inline with bracketed numbers like [1] or [2][3] right after the sentence they support. Only cite numbers that exist.
- If the sources do not cover the question, say what XActions does have that is closest, and point to the docs at https://xactions.app/docs. Never invent script names, flags, or endpoints.
- Browser scripts are pasted into the DevTools console on x.com while logged in; mention that for any console script.
- Keep it tight: short paragraphs, numbered steps, one code block when useful. Markdown only, no HTML.`;

function sourcesBlock(sources) {
  return sources
    .map((s, i) => `[${i + 1}] ${s.t}\nURL: ${s.u}\n${s.x}`)
    .join('\n\n');
}

/**
 * Merge chunks that share a URL into one numbered source, so the numbers the
 * model cites are exactly the chips the client renders. Text from the merged
 * chunks is joined, best-scoring first, up to a cap.
 */
export function mergeSources(sources, { maxChars = 2600 } = {}) {
  const byUrl = new Map();
  for (const s of sources) {
    const existing = byUrl.get(s.u);
    if (!existing) {
      byUrl.set(s.u, { ...s, t: s.t.split(' › ')[0] || s.t });
    } else if (existing.x.length < maxChars) {
      existing.x = `${existing.x}\n[...]\n${s.x}`.slice(0, maxChars);
    }
  }
  return [...byUrl.values()];
}

/** Strip a merged source list to what the client needs. */
export function publicSources(sources) {
  return sources.map((s, i) => ({ n: i + 1, title: s.t, url: s.u, kind: s.k, path: s.p }));
}

/**
 * Answer one question. Emits events through `onEvent`:
 *   { type: 'sources', sources }   retrieval finished
 *   { type: 'lane', lane }         a lane accepted the request
 *   { type: 'delta', text }        streamed answer text
 *   { type: 'done', lane, model, sources }
 *
 * @param {object} args
 * @param {string} args.question
 * @param {Array<{ role: 'user'|'assistant', content: string }>} [args.history]
 * @param {{ search: Function }} args.searcher
 * @param {Record<string, string|undefined>} [args.env]
 * @param {{ provider: string, apiKey: string, model?: string }} [args.byok]
 * @param {boolean} [args.browserSafe]  drop lanes that reject browser origins
 * @param {{ match: Function }} [args.matcher]  action matcher; when present the
 *   answer is followed by the scripts, commands and MCP tools that run it
 * @param {(event: object) => void} args.onEvent
 * @param {AbortSignal} [args.signal]
 */
export async function ask({ question, history = [], searcher, matcher, env = {}, byok, browserSafe = false, onEvent, signal }) {
  const q = String(question || '').trim().slice(0, 2000);
  if (!q) throw new Error('question is required');
  const [local, live] = await Promise.all([
    Promise.resolve(searcher.search(q, { limit: 8 })),
    searchGitHub(q, { token: env.GITHUB_TOKEN }),
  ]);
  const sources = mergeSources([...local, ...live.slice(0, 3)]);
  const pub = publicSources(sources);
  onEvent({ type: 'sources', sources: pub });

  // Emitted before the answer streams so the page can show what to run while
  // the prose is still arriving, and so the model can point at it by name.
  const actions = matcher ? publicActions(matcher.match(q, sources)) : [];
  if (actions.length) onEvent({ type: 'actions', actions });

  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
  for (const turn of history.slice(-6)) {
    if ((turn.role === 'user' || turn.role === 'assistant') && typeof turn.content === 'string') {
      messages.push({ role: turn.role, content: turn.content.slice(0, 4000) });
    }
  }
  const actionsBlock = actions.length
    ? `\n\nRUNNABLE (the reader sees these as buttons under your answer; refer to them by name, never invent others):\n${actions
        .map((a) => `- ${a.kind}: ${a.title} — ${a.run}`)
        .join('\n')}`
    : '';
  messages.push({
    role: 'user',
    content: sources.length
      ? `SOURCES:\n\n${sourcesBlock(sources)}${actionsBlock}\n\nQUESTION: ${q}`
      : `No sources matched. Answer from general XActions knowledge only if you are certain, otherwise point to https://xactions.app/docs.\n\nQUESTION: ${q}`,
  });

  const chain = buildLaneChain(env, { byok, browserSafe });
  let result;
  try {
    result = await streamCompletion(chain, messages, {
      signal,
      onLane: (lane) => onEvent({ type: 'lane', lane }),
      onDelta: (text) => onEvent({ type: 'delta', text }),
    });
  } catch (error) {
    // Never answer a question with nothing when the index already found the
    // passages: fall back to the documentation digest.
    const digest = signal?.aborted ? '' : docsDigest(q, sources);
    if (!digest) throw error;
    onEvent({ type: 'lane', lane: 'docs' });
    onEvent({ type: 'delta', text: digest });
    onEvent({ type: 'done', lane: 'docs', model: 'retrieval', digest: true, sources: pub, actions });
    return { lane: 'docs', model: 'retrieval', text: digest, digest: true, sources: pub, actions };
  }
  onEvent({ type: 'done', lane: result.lane, model: result.model, partial: Boolean(result.partial), sources: pub, actions });
  return { ...result, sources: pub, actions };
}

/** Suggested questions shown on the empty state; every one resolves against the index. */
export const SUGGESTED_QUESTIONS = [
  'How do I unfollow everyone I follow?',
  'How do I unfollow people who do not follow me back?',
  'How do I connect XActions to Claude Desktop with MCP?',
  'How do I download a video from a post?',
  'How do I scrape the followers of an account?',
  'Is XActions free, and is it safe for my account?',
  'How do I like, repost, and reply to every post on a profile?',
  'How do I run a browser script in the DevTools console?',
];
