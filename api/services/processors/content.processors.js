// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Content processors: AI post writing and optimisation, Grok, viral research,
 * personas, workflows, teams and account portability.
 *
 * Three engines do the work:
 *
 *  - X, through the logged-in HTTP client (`ctx.http()`), for every read and
 *    write on the account. Grok is reached the way x.com's own client reaches
 *    it: a CreateGrokConversation mutation, then a streaming add_response
 *    request whose body is newline-delimited JSON.
 *  - A language model for writing, through the provider layer in
 *    src/ai/commentGenerator.js. The server writes only with free models (the
 *    `free` provider, src/ai/freeLLM.js). A caller can bring their own key by
 *    sending `provider` and `apiKey`; the server never spends its own key on
 *    a provider the caller names.
 *  - An owner-scoped file store under `$XACTIONS_HOME/owners/<hash>/` for what
 *    outlives a job (personas, workflows, teams, exports). The record formats
 *    are the ones src/personaEngine.js and src/workflows/store.js already
 *    write; only the root is per caller, so no caller sees another's data.
 *
 * Bulk writes pause between actions (`delayMs` when the job carries one,
 * otherwise 3 to 7 seconds), charge the account's daily caps before each
 * action, and honour `dryRun` and cancellation.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

import { JobInputError, ownerKeyForSession } from './context.js';
import { chatCompletion, resolveCallerProvider, sanitizeComment } from '../../../src/ai/commentGenerator.js';
import { analyzeVoice, buildVoicePrompt } from '../../../src/ai/voiceAnalyzer.js';
import { predictPerformance } from '../../../src/ai/contentOptimizer.js';
import {
  createPersona,
  buildPersonaSystemPrompt,
  buildCommentPrompt,
  buildPostPrompt,
  planSession,
  getDelayUntilNextSession,
  NICHE_PRESETS,
  ACTIVITY_PATTERNS,
  ENGAGEMENT_STRATEGIES,
} from '../../../src/personaEngine.js';
import { evaluateCondition, resolveValue } from '../../../src/workflows/conditions.js';
import {
  toCSV,
  tweetsToMarkdown,
  usersToMarkdown,
  profileToMarkdown,
  bookmarksToMarkdown,
} from '../../../src/portability/exporter.js';
import { diffExports as diffExportDirs, generateReport } from '../../../src/portability/differ.js';
import { findMatch, similarity } from '../../../src/portability/importer.js';
import { scrapeProfile, scrapeProfileById } from '../../../src/scrapers/twitter/http/profile.js';
import { scrapeTweets, scrapeTweetById } from '../../../src/scrapers/twitter/http/tweets.js';
import { searchTweets } from '../../../src/scrapers/twitter/http/search.js';
import { scrapeFollowers, scrapeFollowing } from '../../../src/scrapers/twitter/http/relationships.js';
import { scrapeTrends } from '../../../src/scrapers/twitter/http/explore.js';
import { scrapeNotifications } from '../../../src/scrapers/twitter/http/notifications.js';
import { postTweet, replyToTweet } from '../../../src/scrapers/twitter/http/actions.js';
import { likeTweet, retweet, followUser, unfollowUser } from '../../../src/scrapers/twitter/http/engagement.js';
import { sendDMByUsername } from '../../../src/scrapers/twitter/http/dm.js';
import { GRAPHQL, REST_BASE } from '../../../src/scrapers/twitter/http/endpoints.js';
import { OPERATIONS } from '../../../src/scrapers/twitter/http/x-endpoints.generated.js';
import { parseTimelineInstructions, userTimelineInstructions } from '../../../src/scrapers/twitter/http/parse/tweet.js';
import { AuthError, RateLimitError, TwitterApiError } from '../../../src/scrapers/twitter/http/errors.js';

const TWEET_LIMIT = 280;

// ============================================================================
// Small helpers
// ============================================================================

function clampInt(value, min, max, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
}

const cleanUsername = (value) => String(value ?? '').trim().replace(/^@/, '');

/** A required string field, trimmed. */
function requireText(ctx, field, label = field) {
  const value = ctx.require(field, label);
  if (typeof value !== 'string' || !value.trim()) throw new JobInputError(`${label} must be a non-empty string`);
  return value.trim();
}

/** The numeric id in a post URL, or the value itself when it is already an id. */
function tweetIdOf(value) {
  const raw = String(value ?? '').trim();
  if (/^\d{1,25}$/.test(raw)) return raw;
  const match = raw.match(/status(?:es)?\/(\d{1,25})/);
  return match ? match[1] : null;
}

const median = (values) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const percentile = (values, p) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
};

const round = (n, digits = 2) => Math.round(n * 10 ** digits) / 10 ** digits;

/** A parsed X post flattened into the shape exports, analysers and reports share. */
export function flattenTweet(t) {
  const author = t.author?.username || '';
  const metrics = t.metrics || {};
  return {
    id: t.id,
    url: author && t.id ? `https://x.com/${author}/status/${t.id}` : null,
    text: t.text || '',
    createdAt: t.createdAt || null,
    author,
    authorName: t.author?.name || '',
    authorId: t.author?.id || null,
    verified: Boolean(t.author?.verified),
    likes: metrics.likes ?? 0,
    retweets: metrics.retweets ?? 0,
    replies: metrics.replies ?? 0,
    quotes: metrics.quotes ?? 0,
    bookmarks: metrics.bookmarks ?? 0,
    views: metrics.views ?? 0,
    hasMedia: (t.media?.length ?? 0) > 0,
    media: (t.media || []).map((m) => ({ type: m.type, url: m.url })),
    hashtags: t.hashtags || [],
    links: (t.urls || []).map((u) => u.expandedUrl).filter(Boolean),
    isReply: Boolean(t.isReply),
    isRetweet: Boolean(t.isRetweet),
    lang: t.lang || null,
  };
}

/** Weighted engagement: a reply costs the reader most, a like least. */
const engagementOf = (t) => t.likes + 2 * t.retweets + 3 * t.replies + 2 * t.quotes;

/** Milliseconds to wait between actions: the job's `delayMs`, else 3 to 7 s. */
function pauseMs(ctx) {
  const configured = ctx.config.delayMs;
  if (configured !== undefined && configured !== null && Number.isFinite(Number(configured))) {
    return Math.max(0, Number(configured));
  }
  return 3000 + Math.floor(Math.random() * 4000);
}

async function pause(ctx) {
  const ms = pauseMs(ctx);
  if (ms > 0) await ctx.sleep(ms);
  else ctx.throwIfCancelled();
}

/** The id of a post X just created, or the reason it did not. */
function postedTweetId(created) {
  const id = created?.rest_id || created?.legacy?.id_str;
  if (id) return id;
  const reason = (created?.errors || []).map((e) => e.message).filter(Boolean).join('; ');
  throw new TwitterApiError(`X did not create the post${reason ? `: ${reason}` : ''}`, { data: created });
}

/** The logged-in account's user id, from the twid cookie. */
function sessionUserId(client) {
  const twid = decodeURIComponent(client._cookies?.twid || '');
  const id = twid.replace(/^u=/, '');
  return /^\d+$/.test(id) ? id : null;
}

/** The logged-in account's screen name. */
async function sessionUsername(client) {
  const userId = sessionUserId(client);
  if (userId) {
    const profile = await scrapeProfileById(client, userId);
    if (profile?.username) return profile.username;
  }
  const settings = await client.request(`${REST_BASE}/1.1/account/settings.json`, { method: 'GET' });
  if (!settings?.screen_name) throw new AuthError('Could not tell which account this session belongs to');
  return settings.screen_name;
}

/** Errors that must end the job instead of being recorded against one action. */
function isFatal(err) {
  return ['AuthError', 'ActionCapExceededError', 'JobCancelledError', 'XSessionError', 'JobInputError'].includes(err?.name);
}

// ============================================================================
// Owner-scoped store
// ============================================================================

const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

function xactionsHome() {
  return process.env.XACTIONS_HOME || path.join(os.homedir(), '.xactions');
}

function ownerRoot(ownerKey) {
  if (!ownerKey) {
    throw new JobInputError('This operation stores data for its caller, and the job carries no session or user to key it by.');
  }
  const digest = crypto.createHash('sha256').update(ownerKey).digest('hex').slice(0, 32);
  return path.join(xactionsHome(), 'owners', digest);
}

export { ownerKeyForSession };

async function writeJsonAtomic(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2));
  await fs.rename(tmp, file);
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

/** Records kept per owner: `kind` is personas, workflows, teams or exports. */
export const ownerStore = {
  async get(ownerKey, kind, id) {
    if (!SAFE_ID.test(String(id ?? ''))) return null;
    return readJson(path.join(ownerRoot(ownerKey), kind, `${id}.json`));
  },

  async put(ownerKey, kind, record) {
    if (!SAFE_ID.test(String(record.id ?? ''))) throw new JobInputError(`Invalid ${kind} id`);
    await writeJsonAtomic(path.join(ownerRoot(ownerKey), kind, `${record.id}.json`), record);
    return record;
  },

  async remove(ownerKey, kind, id) {
    if (!SAFE_ID.test(String(id ?? ''))) return false;
    try {
      await fs.unlink(path.join(ownerRoot(ownerKey), kind, `${id}.json`));
      return true;
    } catch (err) {
      if (err.code === 'ENOENT') return false;
      throw err;
    }
  },

  async list(ownerKey, kind) {
    const dir = path.join(ownerRoot(ownerKey), kind);
    let files;
    try {
      files = (await fs.readdir(dir)).filter((f) => f.endsWith('.json'));
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
    const records = await Promise.all(files.map((f) => readJson(path.join(dir, f))));
    return records
      .filter(Boolean)
      .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
  },

  /** The directory holding one export's section files. */
  exportDir(ownerKey, id) {
    if (!SAFE_ID.test(String(id ?? ''))) return null;
    return path.join(ownerRoot(ownerKey), 'exports', id);
  },
};

// ============================================================================
// Language model
// ============================================================================

/**
 * The model endpoint a job writes with: free models, unless the job brings
 * its own key (`provider` + `apiKey`).
 *
 * The server never falls back to its own env keys for a provider the caller
 * names: that would let any caller spend the operator's key on a paid model.
 *
 * @param {object} [config] job config (`provider`, `apiKey`, `model` for BYOK)
 */
export function llmTarget(config = {}) {
  try {
    return resolveCallerProvider(config);
  } catch (err) {
    throw new JobInputError(err.message);
  }
}

/** Whether a model name belongs to the provider it would be sent to. */
function modelFits(provider, model) {
  if (typeof model !== 'string' || !model) return false;
  if (provider === 'openrouter') return model.includes('/');
  if (provider === 'openai') return /^(gpt|o\d|chatgpt)/i.test(model);
  if (provider === 'anthropic') return /^claude/i.test(model);
  if (provider === 'xai') return /^grok/i.test(model);
  return false;
}

async function complete(ctx, messages, { temperature = 0.8, maxTokens = 1000, model } = {}) {
  const target = llmTarget(ctx.config);
  const chosen = model && modelFits(target.provider, model) ? { ...target, model } : target;
  const { text, model: used } = await chatCompletion(chosen, messages, { temperature, maxTokens });
  if (!text) throw new Error(`${target.provider} returned an empty completion`);
  return { text, model: used, provider: target.provider };
}

/** Parse the JSON a model was asked for, tolerating code fences and prose around it. */
export function parseModelJson(text) {
  const attempts = [text, text.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1], text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/)?.[1]];
  for (const candidate of attempts) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate.trim());
    } catch {
      continue;
    }
  }
  throw new Error('The model did not answer with the JSON it was asked for');
}

async function completeJson(ctx, system, user, options) {
  const result = await complete(ctx, [{ role: 'system', content: system }, { role: 'user', content: user }], options);
  return { ...result, data: parseModelJson(result.text) };
}

/**
 * Tidy one drafted post without shortening it: code fences, wrapping quotes
 * and stray whitespace go, the words stay. Length is reported, not enforced,
 * so a caller sees an over-long draft instead of a silently cut one.
 */
function cleanDraft(raw) {
  let text = String(raw ?? '').trim().replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim();
  const quoted = text.match(/^["“](.*)["”]$/s);
  if (quoted) text = quoted[1].trim();
  return text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
}

/** Normalise a model's list of drafts into `{ text, length, withinLimit, ...extra }`. */
function drafts(data, limit, extraFields = []) {
  const list = Array.isArray(data) ? data : Array.isArray(data?.tweets) ? data.tweets : [data];
  return list
    .map((item) => (typeof item === 'string' ? { text: item } : item || {}))
    .map((item) => {
      const text = cleanDraft(item.text);
      const out = { text, length: [...text].length, withinLimit: [...text].length <= TWEET_LIMIT };
      for (const field of extraFields) if (item[field] !== undefined) out[field] = item[field];
      return out;
    })
    .filter((d) => d.text)
    .slice(0, limit);
}

// ============================================================================
// Post writing and optimisation
// ============================================================================

const REWRITE_GOALS = {
  improve: 'Improve clarity and impact while keeping the meaning and the author\'s voice.',
  shorter: 'Make it shorter and punchier; cut every word that does not carry weight.',
  longer: 'Expand it with one concrete supporting detail or example, still under 280 characters.',
  'more-engaging': 'Make it more likely to earn replies and reposts: a sharper hook, a clear stake, an open question.',
  professional: 'Make it sound professional and authoritative without becoming stiff.',
  casual: 'Make it sound casual and conversational, like a person talking.',
};

const OPTIMIZE_GOALS = {
  engagement: 'overall engagement (likes, replies, reposts)',
  clicks: 'link clicks',
  replies: 'replies and conversation',
  retweets: 'reposts and quote posts',
  followers: 'new followers for the author',
};

async function generateTweetJob(ctx) {
  const username = cleanUsername(requireText(ctx, 'username'));
  const topic = requireText(ctx, 'topic');
  const count = clampInt(ctx.config.count, 1, 10, 3);
  const style = ctx.config.style || null;
  llmTarget(ctx.config);

  const client = await ctx.http();
  ctx.progress(`Reading @${username}'s recent posts`);
  const tweets = (await scrapeTweets(client, username, { limit: 100 })).map(flattenTweet).filter((t) => !t.isRetweet);
  if (!tweets.length) throw new JobInputError(`@${username} has no public posts to learn a voice from`);

  const voice = analyzeVoice(username, tweets, { minTweets: 0 });
  ctx.progress(`Writing ${count} posts in @${username}'s voice`);
  const { data, model, provider } = await completeJson(
    ctx,
    buildVoicePrompt(voice),
    [
      `Write ${count} distinct posts about: "${topic}".`,
      style ? `Style: ${style}.` : '',
      'Each post must be under 280 characters, match the voice exactly, and take a different angle from the others.',
      'Answer with ONLY a JSON array: [{"text": "...", "angle": "...", "reasoning": "why it should perform"}]',
    ].filter(Boolean).join('\n'),
    { temperature: 0.85, maxTokens: 400 + count * 200 },
  );

  const posts = drafts(data, count, ['angle', 'reasoning']);
  if (!posts.length) throw new Error('The model returned no usable posts');
  return {
    username,
    topic,
    style,
    count: posts.length,
    tweets: posts,
    voice: {
      tweetsAnalyzed: voice.tweetCount,
      avgLength: voice.style.avgLength,
      tone: voice.tone,
      contentPillars: voice.contentPillars.slice(0, 5).map((p) => p.topic),
    },
    model,
    provider,
  };
}

async function rewriteTweetJob(ctx) {
  const text = requireText(ctx, 'text');
  const goal = REWRITE_GOALS[ctx.config.goal] ? ctx.config.goal : 'improve';
  const style = ctx.config.style || null;
  const { data, model, provider } = await completeJson(
    ctx,
    'You are an editor for posts on X. You keep the author\'s meaning, never invent facts, and write like a person, not a brand.',
    [
      `Rewrite this post 3 different ways.`,
      `Original: """${text}"""`,
      `Goal: ${REWRITE_GOALS[goal]}`,
      style ? `Style: ${style}.` : '',
      'Every rewrite must be under 280 characters and meaningfully different from the others.',
      'Answer with ONLY a JSON array: [{"text": "...", "change": "what changed and why"}]',
    ].filter(Boolean).join('\n'),
    { temperature: 0.8, maxTokens: 900 },
  );
  const rewrites = drafts(data, 3, ['change']);
  if (!rewrites.length) throw new Error('The model returned no usable rewrites');
  return { original: text, goal, style, rewrites, model, provider };
}

async function optimizeTweetJob(ctx) {
  const text = requireText(ctx, 'text');
  const goals = (Array.isArray(ctx.config.goals) ? ctx.config.goals : []).filter((g) => OPTIMIZE_GOALS[g]);
  const effectiveGoals = goals.length ? goals : ['engagement'];
  const constraints = ctx.config.constraints && typeof ctx.config.constraints === 'object' ? ctx.config.constraints : {};
  const maxLength = clampInt(constraints.maxLength, 1, TWEET_LIMIT, TWEET_LIMIT);

  const { data, model, provider } = await completeJson(
    ctx,
    'You optimise posts for X. You keep the author\'s claim and voice, never invent facts or numbers, and explain each change in one line.',
    [
      `Optimise this post for ${effectiveGoals.map((g) => OPTIMIZE_GOALS[g]).join(', ')}.`,
      `Original: """${text}"""`,
      `Hard limit: ${maxLength} characters.`,
      Object.keys(constraints).length ? `Constraints from the author (follow them exactly): ${JSON.stringify(constraints)}` : '',
      'Answer with ONLY a JSON object: {"optimized": "...", "changes": ["..."], "rationale": "..."}',
    ].filter(Boolean).join('\n'),
    { temperature: 0.6, maxTokens: 700 },
  );

  const optimized = cleanDraft(data?.optimized);
  if (!optimized) throw new Error('The model returned no optimised post');
  const before = predictPerformance(text);
  const after = predictPerformance(optimized);
  return {
    original: text,
    optimized,
    goals: effectiveGoals,
    constraints,
    changes: Array.isArray(data.changes) ? data.changes.map(String) : [],
    rationale: typeof data.rationale === 'string' ? data.rationale : '',
    length: { before: [...text].length, after: [...optimized].length, max: maxLength, withinLimit: [...optimized].length <= maxLength },
    heuristicScore: { before: before.score, after: after.score, remainingSuggestions: after.suggestions },
    model,
    provider,
  };
}

async function generateVariationsJob(ctx) {
  const text = requireText(ctx, 'text');
  const count = clampInt(ctx.config.count, 1, 10, 5);
  const styles = (Array.isArray(ctx.config.styles) ? ctx.config.styles : []).map(String).filter(Boolean);
  const effectiveStyles = styles.length ? styles : ['casual', 'professional', 'viral', 'concise', 'detailed'];
  const plan = Array.from({ length: count }, (_, i) => effectiveStyles[i % effectiveStyles.length]);

  const { data, model, provider } = await completeJson(
    ctx,
    'You write variations of posts for X. Each keeps the original claim, never invents facts, and reads like a person wrote it.',
    [
      `Write ${count} variations of this post, one per style, in this order: ${plan.join(', ')}.`,
      `Original: """${text}"""`,
      'Each must be under 280 characters and open differently from the others.',
      'Answer with ONLY a JSON array: [{"style": "...", "text": "..."}]',
    ].join('\n'),
    { temperature: 0.9, maxTokens: 300 + count * 150 },
  );

  const variations = drafts(data, count, ['style']).map((v, i) => ({ ...v, style: v.style || plan[i] }));
  if (!variations.length) throw new Error('The model returned no usable variations');
  return { original: text, count: variations.length, variations, model, provider };
}

// ============================================================================
// Grok
// ============================================================================

const GROK_RESPONSE_URLS = ['https://grok.x.com/2/grok/add_response.json', 'https://api.x.com/2/grok/add_response.json'];
const GROK_ATTACHMENT_URL = 'https://x.com/i/api/2/grok/attachment.json';
const GROK_MODEL = 'grok-3';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

async function grokHeaders(client, method, url, { json = true } = {}) {
  const headers = { ...client._buildHeaders(true) };
  if (!json) delete headers['content-type'];
  await client._signRequest(method, url, headers);
  return headers;
}

function grokHttpError(status, body, what) {
  if (status === 401 || status === 403) {
    return new AuthError(`X refused ${what} for this session (HTTP ${status}). Grok needs an account with Grok access.`, { status });
  }
  if (status === 429) return new RateLimitError(`${what} is rate limited for this account (HTTP 429)`, { status });
  return new TwitterApiError(`${what} failed (HTTP ${status})${body ? `: ${String(body).slice(0, 200)}` : ''}`, { status });
}

/**
 * Read Grok's streamed answer: one JSON object per line, the answer spread
 * across `result.message` fragments, sources and cited posts alongside.
 * @param {string} raw
 */
export function parseGrokStream(raw) {
  const parts = [];
  const webResults = new Map();
  const postIds = new Set();
  let limiter = null;
  let conversationId = null;
  for (const line of String(raw).split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let chunk;
    try {
      chunk = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (chunk.conversationId) conversationId = String(chunk.conversationId);
    const r = chunk.result ?? chunk;
    if (r.responseType === 'limiter') {
      limiter = r;
      continue;
    }
    if (typeof r.message === 'string' && !r.isThinking) parts.push(r.message);
    for (const w of r.webResults || []) {
      const url = w.url || w.link;
      if (url && !webResults.has(url)) webResults.set(url, { title: w.title || '', url, snippet: w.preview || w.snippet || '' });
    }
    for (const id of r.xPostIds || r.postIds || []) postIds.add(String(id));
  }
  return { answer: parts.join('').trim(), webResults: [...webResults.values()], postIds: [...postIds], limiter, conversationId };
}

async function createGrokConversation(client) {
  const json = await client.graphql(OPERATIONS.CreateGrokConversation.queryId, 'CreateGrokConversation', {}, { mutation: true });
  const id = json?.data?.create_grok_conversation?.conversation_id;
  if (!id) throw new TwitterApiError('X did not open a Grok conversation', { data: json });
  return String(id);
}

async function askGrok(ctx, message, { mode = 'regular', attachments = [] } = {}) {
  const client = await ctx.http();
  const conversationId = await createGrokConversation(client);
  const body = JSON.stringify({
    responses: [{ message, sender: 1, promptSource: '', fileAttachments: attachments }],
    systemPromptName: mode === 'fun' ? 'fun' : '',
    grokModelOptionId: GROK_MODEL,
    conversationId,
    returnSearchResults: true,
    returnCitations: true,
    promptMetadata: { promptSource: 'NATURAL', action: 'INPUT' },
    imageGenerationCount: 4,
    requestFeatures: { eagerTweets: true, serverHistory: true },
  });

  let lastError = null;
  for (const url of GROK_RESPONSE_URLS) {
    ctx.throwIfCancelled();
    const headers = await grokHeaders(client, 'POST', url);
    const res = await client._fetch(url, { method: 'POST', headers, body });
    const text = await res.text();
    if (res.status === 404) {
      lastError = grokHttpError(404, text, 'Grok');
      continue;
    }
    if (res.status >= 400) throw grokHttpError(res.status, text, 'Grok');
    const parsed = parseGrokStream(text);
    if (parsed.limiter && !parsed.answer) {
      const err = new Error(`Grok's limit for this account is reached: ${parsed.limiter.message || 'try again later'}`);
      err.retryable = false;
      throw err;
    }
    if (!parsed.answer) throw new TwitterApiError('Grok returned no answer');
    const id = parsed.conversationId || conversationId;
    return {
      answer: parsed.answer,
      conversationId: id,
      conversationUrl: `https://x.com/i/grok?conversation=${id}`,
      webResults: parsed.webResults.slice(0, 10),
      postIds: parsed.postIds,
    };
  }
  throw lastError;
}

function isPrivateAddress(address) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224
    );
  }
  const lower = address.toLowerCase();
  if (lower === '::' || lower === '::1') return true;
  if (lower.startsWith('::ffff:')) return isPrivateAddress(lower.slice(7));
  return /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower);
}

/** Refuse image URLs that would make the server fetch from its own network. */
async function assertPublicImageUrl(raw) {
  let url;
  try {
    url = new URL(String(raw));
  } catch {
    throw new JobInputError('imageUrl is not a valid URL');
  }
  if (url.protocol !== 'https:') throw new JobInputError('imageUrl must be an https URL');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  let addresses;
  if (net.isIP(host)) addresses = [host];
  else {
    try {
      addresses = (await dns.lookup(host, { all: true })).map((a) => a.address);
    } catch {
      throw new JobInputError(`imageUrl host ${host} does not resolve`);
    }
  }
  if (!addresses.length || addresses.some(isPrivateAddress)) throw new JobInputError('imageUrl must point to a public host');
  return url.href;
}

async function downloadImage(fetchImpl, url) {
  const res = await fetchImpl(url, { method: 'GET', redirect: 'error' });
  if (!res.ok) throw new JobInputError(`Could not download the image (HTTP ${res.status})`);
  const type = String(res.headers?.get?.('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!type.startsWith('image/')) throw new JobInputError(`The URL did not return an image (content-type ${type || 'missing'})`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (!bytes.byteLength) throw new JobInputError('The image is empty');
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new JobInputError('The image is larger than 10 MB');
  return { bytes, type };
}

async function uploadGrokImage(client, { bytes, type }) {
  const form = new FormData();
  const extension = type.split('/')[1]?.replace('jpeg', 'jpg') || 'img';
  form.append('image', new Blob([bytes], { type }), `image.${extension}`);
  const headers = await grokHeaders(client, 'POST', GROK_ATTACHMENT_URL, { json: false });
  const res = await client._fetch(GROK_ATTACHMENT_URL, { method: 'POST', headers, body: form });
  const text = await res.text();
  if (res.status >= 400) throw grokHttpError(res.status, text, 'The Grok image upload');
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new TwitterApiError('The Grok image upload returned no JSON');
  }
  const attachments = (Array.isArray(json) ? json : [json]).filter((a) => a && typeof a === 'object' && Object.keys(a).length);
  if (!attachments.length) throw new TwitterApiError('Grok accepted the upload but returned no attachment');
  return attachments;
}

async function grokQueryJob(ctx) {
  const query = requireText(ctx, 'query');
  if (query.length > 4000) throw new JobInputError('query exceeds 4,000 characters');
  const mode = ctx.config.mode === 'regular' ? 'regular' : 'fun';
  ctx.progress('Asking Grok');
  const answer = await askGrok(ctx, query, { mode });
  return { query, mode, ...answer };
}

async function grokSummarizeJob(ctx) {
  const topic = requireText(ctx, 'topic');
  const context = typeof ctx.config.context === 'string' && ctx.config.context.trim() ? ctx.config.context.trim() : null;
  const prompt = [
    `Summarize what is being said on X about "${topic}" right now.`,
    'Give the key points, the main viewpoints and where they disagree, and the most notable posts.',
    context ? `Context from the person asking: ${context}` : '',
  ].filter(Boolean).join('\n');
  ctx.progress(`Asking Grok about ${topic}`);
  const answer = await askGrok(ctx, prompt, { mode: 'regular' });
  return { topic, context, summary: answer.answer, ...answer };
}

async function grokAnalyzeImageJob(ctx) {
  const { imageUrl, tweetUrl } = ctx.config;
  if (!imageUrl && !tweetUrl) throw new JobInputError('imageUrl or tweetUrl is required');
  const question = typeof ctx.config.question === 'string' && ctx.config.question.trim() ? ctx.config.question.trim() : 'What is in this image?';
  const client = await ctx.http();

  let source;
  let post = null;
  if (imageUrl) {
    source = await assertPublicImageUrl(imageUrl);
  } else {
    const id = tweetIdOf(tweetUrl);
    if (!id) throw new JobInputError('tweetUrl must be a post URL or id');
    const tweet = flattenTweet(await scrapeTweetById(client, id));
    const photo = tweet.media.find((m) => m.type === 'photo' && m.url);
    if (!photo) throw new JobInputError('That post has no image to analyse');
    source = photo.url;
    post = { id: tweet.id, url: tweet.url, author: tweet.author, text: tweet.text };
  }

  ctx.progress('Uploading the image to Grok');
  const image = await downloadImage(client._fetch, source);
  const attachments = await uploadGrokImage(client, image);
  const message = post ? `${question}\n\nThe image is attached to this post by @${post.author}: "${post.text}" (${post.url})` : question;
  ctx.progress('Asking Grok about the image');
  const answer = await askGrok(ctx, message, { mode: 'regular', attachments });
  return { question, image: { source, mimeType: image.type, bytes: image.bytes.byteLength }, post, ...answer };
}

// ============================================================================
// Viral research
// ============================================================================

const HOOK_PATTERNS = [
  ['thread', /(🧵|\bthread\b|\(1\/|^1\/\d)/i],
  ['question', /\?/],
  ['number', /^\s*\d+|\b\d+\s+(ways|things|lessons|tips|mistakes|reasons|tools|steps|rules|ideas|books|habits)\b/i],
  ['how-to', /^(how\s+(to|i|we)\b|here'?s how)/i],
  ['contrarian', /(unpopular opinion|hot take|nobody (talks|tells)|stop\s|is dead|overrated|myth|wrong about)/i],
  ['announcement', /^(breaking|just (launched|shipped|announced|released)|introducing|new:|we('re| are) (launching|hiring)|big news)/i],
  ['story', /^(i\s|i'm|i've|my\s|last (week|month|year)|yesterday|today i|when i)/i],
];

/** The opening line of a post: what a reader sees before deciding to stop. */
function hookOf(text) {
  const first = String(text).split('\n').map((l) => l.trim()).find(Boolean) || '';
  const sentence = first.match(/^(.{20,160}?[.!?])(\s|$)/)?.[1] || first;
  return sentence.slice(0, 160);
}

function hookPattern(text) {
  const hook = hookOf(text);
  const found = HOOK_PATTERNS.find(([, re]) => re.test(hook) || (hook.length < 40 && re.test(text)));
  return found ? found[0] : 'statement';
}

function summarisePost(t) {
  return {
    id: t.id,
    url: t.url,
    author: t.author,
    text: t.text,
    createdAt: t.createdAt,
    likes: t.likes,
    retweets: t.retweets,
    replies: t.replies,
    quotes: t.quotes,
    views: t.views,
    engagement: engagementOf(t),
  };
}

/** High-engagement original posts about a query, best first. */
async function viralSample(ctx, query, { limit, minLikes }) {
  const client = await ctx.http();
  const raw = await searchTweets(client, query, { limit, type: 'Top', minLikes: minLikes || undefined });
  const seen = new Set();
  return raw
    .map(flattenTweet)
    .filter((t) => !t.isRetweet && t.text && !seen.has(t.id) && seen.add(t.id))
    .sort((a, b) => engagementOf(b) - engagementOf(a));
}

function groupStats(posts, keyOf) {
  const groups = new Map();
  for (const t of posts) {
    const key = keyOf(t);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }
  return [...groups.entries()]
    .map(([key, items]) => ({
      key,
      count: items.length,
      share: round(items.length / posts.length),
      avgEngagement: Math.round(items.reduce((s, t) => s + engagementOf(t), 0) / items.length),
      example: summarisePost(items.sort((a, b) => engagementOf(b) - engagementOf(a))[0]),
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);
}

function researchQuery(ctx) {
  const value = ctx.config.niche || ctx.config.query || ctx.config.topic || ctx.config.keyword;
  if (typeof value !== 'string' || !value.trim()) throw new JobInputError('niche (or query) is required');
  return value.trim();
}

function analyseSample(posts) {
  const scores = posts.map(engagementOf);
  const hashtags = new Map();
  const authors = new Map();
  const hours = new Map();
  for (const t of posts) {
    for (const tag of t.hashtags) hashtags.set(tag.toLowerCase(), (hashtags.get(tag.toLowerCase()) || 0) + 1);
    const a = authors.get(t.author) || { username: t.author, posts: 0, totalEngagement: 0 };
    a.posts++;
    a.totalEngagement += engagementOf(t);
    authors.set(t.author, a);
    if (t.createdAt) {
      const hour = new Date(t.createdAt).getUTCHours();
      const h = hours.get(hour) || { hourUtc: hour, count: 0, total: 0 };
      h.count++;
      h.total += engagementOf(t);
      hours.set(hour, h);
    }
  }
  const lengthBucket = (t) => {
    const n = [...t.text].length;
    return n <= 70 ? '0-70' : n <= 140 ? '71-140' : n <= 200 ? '141-200' : n <= 280 ? '201-280' : '281+';
  };
  const format = (t) => (t.hasMedia ? 'media' : t.links.length ? 'link' : 'text-only');
  return {
    engagement: {
      median: median(scores),
      p90: percentile(scores, 0.9),
      avgLikes: Math.round(posts.reduce((s, t) => s + t.likes, 0) / posts.length),
      avgReplies: Math.round(posts.reduce((s, t) => s + t.replies, 0) / posts.length),
      avgRetweets: Math.round(posts.reduce((s, t) => s + t.retweets, 0) / posts.length),
    },
    hooks: groupStats(posts, (t) => hookPattern(t.text)).map(({ key, ...rest }) => ({ pattern: key, ...rest })),
    formats: groupStats(posts, format).map(({ key, ...rest }) => ({ format: key, ...rest })),
    length: groupStats(posts, lengthBucket).map(({ key, ...rest }) => ({ range: key, ...rest })),
    hashtags: [...hashtags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag, count]) => ({ tag: `#${tag}`, count })),
    topAuthors: [...authors.values()].sort((a, b) => b.totalEngagement - a.totalEngagement).slice(0, 10),
    bestHoursUtc: [...hours.values()]
      .map((h) => ({ hourUtc: h.hourUtc, posts: h.count, avgEngagement: Math.round(h.total / h.count) }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 5),
  };
}

async function viralResearchJob(ctx) {
  const query = researchQuery(ctx);
  const limit = clampInt(ctx.config.limit, 10, 200, 50);
  const minLikes = clampInt(ctx.config.minLikes, 0, 1_000_000, 50);
  ctx.progress(`Collecting top posts about ${query}`);
  const posts = await viralSample(ctx, query, { limit, minLikes });
  if (!posts.length) {
    throw new JobInputError(`X returned no posts about "${query}" with at least ${minLikes} likes. Lower minLikes or broaden the query.`);
  }
  const dates = posts.map((t) => t.createdAt).filter(Boolean).sort();
  return {
    query,
    minLikes,
    sampled: posts.length,
    window: { from: dates[0] || null, to: dates[dates.length - 1] || null },
    ...analyseSample(posts),
    topPosts: posts.slice(0, 10).map(summarisePost),
  };
}

async function viralAnalyzeJob(ctx) {
  const id = tweetIdOf(ctx.config.tweetId || ctx.config.tweetUrl || ctx.config.url);
  if (!id) throw new JobInputError('tweetId (or tweetUrl) is required');
  const client = await ctx.http();
  ctx.progress(`Reading post ${id}`);
  const tweet = flattenTweet(await scrapeTweetById(client, id));
  ctx.progress(`Reading @${tweet.author}'s recent posts for a baseline`);
  const history = (await scrapeTweets(client, tweet.author, { limit: 50 }))
    .map(flattenTweet)
    .filter((t) => t.id !== tweet.id && !t.isRetweet);

  const score = engagementOf(tweet);
  const baselineScores = history.map(engagementOf);
  const baselineMedian = median(baselineScores);
  const multiple = baselineMedian > 0 ? round(score / baselineMedian, 1) : null;
  const share = (pred) => (history.length ? round(history.filter(pred).length / history.length) : null);
  const hook = hookOf(tweet.text);
  const features = {
    hook,
    hookPattern: hookPattern(tweet.text),
    length: [...tweet.text].length,
    hasMedia: tweet.hasMedia,
    mediaTypes: [...new Set(tweet.media.map((m) => m.type))],
    hasQuestion: tweet.text.includes('?'),
    hasNumbers: /\d/.test(tweet.text),
    hasList: /(^|\n)\s*([-•*]|\d+[.)])\s/.test(tweet.text),
    hasLink: tweet.links.length > 0,
    hashtags: tweet.hashtags.length,
    postedAtUtc: tweet.createdAt ? { hour: new Date(tweet.createdAt).getUTCHours(), weekday: new Date(tweet.createdAt).getUTCDay() } : null,
  };
  const ratios = {
    repliesPerLike: tweet.likes ? round(tweet.replies / tweet.likes, 3) : null,
    retweetsPerLike: tweet.likes ? round(tweet.retweets / tweet.likes, 3) : null,
    bookmarksPerLike: tweet.likes ? round(tweet.bookmarks / tweet.likes, 3) : null,
    engagementRate: tweet.views ? round((tweet.likes + tweet.retweets + tweet.replies + tweet.quotes) / tweet.views, 4) : null,
  };
  const baselineRatio = (field) => {
    const withLikes = history.filter((t) => t.likes > 0);
    return withLikes.length ? median(withLikes.map((t) => t[field] / t.likes)) : null;
  };

  const factors = [];
  if (multiple !== null) factors.push(`${multiple}x the author's median engagement over their last ${history.length} posts`);
  if (features.hasMedia && share((t) => t.hasMedia) !== null && share((t) => t.hasMedia) < 0.5) {
    factors.push(`Carries ${features.mediaTypes.join('/')} media, which only ${Math.round(share((t) => t.hasMedia) * 100)}% of the author's posts do`);
  }
  const rpl = baselineRatio('replies');
  if (ratios.repliesPerLike !== null && rpl !== null && ratios.repliesPerLike > rpl * 1.5) {
    factors.push(`Drew conversation: ${ratios.repliesPerLike} replies per like against the author's usual ${round(rpl, 3)}`);
  }
  const rtl = baselineRatio('retweets');
  if (ratios.retweetsPerLike !== null && rtl !== null && ratios.retweetsPerLike > rtl * 1.5) {
    factors.push(`Unusually shareable: ${ratios.retweetsPerLike} reposts per like against the author's usual ${round(rtl, 3)}`);
  }
  if (tweet.quotes > tweet.retweets && tweet.quotes > 10) factors.push('More quote posts than reposts: people argued with it or added to it');
  if (features.hookPattern !== 'statement') factors.push(`Opens with a ${features.hookPattern} hook: "${hook}"`);
  if (ratios.bookmarksPerLike !== null && ratios.bookmarksPerLike > 0.3) factors.push('High bookmark rate: readers saved it to come back to');

  const verdict =
    multiple === null ? 'no-baseline' : multiple >= 10 ? 'viral' : multiple >= 3 ? 'breakout' : multiple >= 1.5 ? 'above-average' : 'typical';
  return {
    tweet: summarisePost(tweet),
    verdict,
    multiple,
    baseline: {
      sample: history.length,
      medianEngagement: baselineMedian,
      p90Engagement: percentile(baselineScores, 0.9),
      medianLikes: median(history.map((t) => t.likes)),
    },
    ratios,
    features,
    factors,
  };
}

async function viralTrendingHooksJob(ctx) {
  const limit = clampInt(ctx.config.limit, 5, 100, 30);
  const niche = ctx.config.niche || ctx.config.query || ctx.config.topic;
  const client = await ctx.http();

  let queries;
  if (typeof niche === 'string' && niche.trim()) {
    queries = [niche.trim()];
  } else {
    ctx.progress('Reading what is trending');
    const trends = (await scrapeTrends(client, { limit: 20 })).filter((t) => !t.promoted);
    if (!trends.length) throw new TwitterApiError('X returned no trends to read hooks from');
    queries = trends.slice(0, 5).map((t) => t.query || t.name);
  }

  const posts = new Map();
  for (const [i, query] of queries.entries()) {
    ctx.throwIfCancelled();
    ctx.progress(`Reading top posts for ${query}`, { done: i, total: queries.length });
    for (const t of await viralSample(ctx, query, { limit: Math.max(20, Math.ceil((limit * 2) / queries.length)), minLikes: 0 })) {
      if (!posts.has(t.id)) posts.set(t.id, { ...t, query });
    }
    if (i < queries.length - 1) await ctx.sleep(Math.min(pauseMs(ctx), 2000));
  }
  const ranked = [...posts.values()].sort((a, b) => engagementOf(b) - engagementOf(a));
  if (!ranked.length) throw new JobInputError(`X returned no posts for ${queries.join(', ')}`);

  const hooks = ranked.slice(0, limit).map((t) => ({
    hook: hookOf(t.text),
    pattern: hookPattern(t.text),
    query: t.query,
    engagement: engagementOf(t),
    likes: t.likes,
    replies: t.replies,
    retweets: t.retweets,
    author: t.author,
    url: t.url,
  }));
  return {
    source: niche ? 'niche' : 'trends',
    queries,
    sampled: ranked.length,
    hooks,
    patterns: groupStats(ranked, (t) => hookPattern(t.text)).map(({ key, example, ...rest }) => ({
      pattern: key,
      ...rest,
      example: hookOf(example.text),
    })),
  };
}

/** Top posts about a topic, compressed for a prompt. */
function examplesForPrompt(posts, n = 8) {
  return posts
    .slice(0, n)
    .map((t, i) => `${i + 1}. [${hookPattern(t.text)}; ${t.likes} likes, ${t.replies} replies] ${t.text.replace(/\s+/g, ' ').slice(0, 240)}`)
    .join('\n');
}

async function viralGenerateJob(ctx) {
  const topic = requireText(ctx, 'topic');
  const length = clampInt(ctx.config.length ?? ctx.config.tweets, 3, 15, 7);
  const style = ctx.config.style || null;
  llmTarget(ctx.config);

  ctx.progress(`Studying top posts about ${topic}`);
  const posts = await viralSample(ctx, ctx.config.niche ? `${topic} ${ctx.config.niche}` : topic, { limit: 30, minLikes: clampInt(ctx.config.minLikes, 0, 1_000_000, 20) });
  const patterns = posts.length ? analyseSample(posts).hooks.slice(0, 4) : [];

  ctx.progress(`Writing a ${length}-post thread`);
  const { data, model, provider } = await completeJson(
    ctx,
    'You write threads for X that people finish reading. Every post stands alone and pulls the reader to the next. You never invent statistics, quotes or events.',
    [
      `Write a ${length}-post thread about: "${topic}".`,
      style ? `Style: ${style}.` : '',
      posts.length
        ? `These are the best-performing recent posts on the topic. Learn what their openings do; do not copy them.\n${examplesForPrompt(posts)}`
        : '',
      patterns.length ? `Hook patterns that are earning the most engagement right now: ${patterns.map((p) => `${p.pattern} (avg ${p.avgEngagement})`).join(', ')}.` : '',
      `Post 1 is the hook. The last post closes with a reason to follow or reply. Number the posts 1/${length} to ${length}/${length}. Each under 280 characters.`,
      'Answer with ONLY a JSON array: [{"position": 1, "text": "...", "purpose": "hook|point|example|cta"}]',
    ].filter(Boolean).join('\n\n'),
    { temperature: 0.85, maxTokens: 400 + length * 180 },
  );
  const thread = drafts(data, length, ['purpose']).map((t, i) => ({ position: i + 1, ...t }));
  if (thread.length < 2) throw new Error('The model returned no usable thread');
  return {
    topic,
    length: thread.length,
    hook: thread[0].text,
    thread,
    research: { sampled: posts.length, patterns, examples: posts.slice(0, 5).map((t) => t.url) },
    model,
    provider,
  };
}

async function viralHeadlinesJob(ctx) {
  const topic = requireText(ctx, 'topic');
  const count = clampInt(ctx.config.count, 1, 25, 10);
  llmTarget(ctx.config);
  ctx.progress(`Studying top posts about ${topic}`);
  const posts = await viralSample(ctx, topic, { limit: 30, minLikes: clampInt(ctx.config.minLikes, 0, 1_000_000, 20) });

  const { data, model, provider } = await completeJson(
    ctx,
    'You write opening lines for posts on X: the line a reader sees before deciding to stop scrolling. Specific beats clever. No clickbait promises the post cannot keep.',
    [
      `Write ${count} different opening lines (headlines) for a post about: "${topic}".`,
      ctx.config.style ? `Style: ${ctx.config.style}.` : '',
      posts.length ? `Openings that are working on this topic right now:\n${posts.slice(0, 8).map((t) => `- ${hookOf(t.text)} (${t.likes} likes)`).join('\n')}` : '',
      `Use a mix of patterns: ${HOOK_PATTERNS.map(([name]) => name).join(', ')}. Each under 120 characters.`,
      'Answer with ONLY a JSON array: [{"text": "...", "pattern": "..."}]',
    ].filter(Boolean).join('\n\n'),
    { temperature: 0.95, maxTokens: 200 + count * 80 },
  );
  const headlines = drafts(data, count, ['pattern']);
  if (!headlines.length) throw new Error('The model returned no usable headlines');
  return {
    topic,
    count: headlines.length,
    headlines,
    research: { sampled: posts.length, examples: posts.slice(0, 5).map((t) => ({ hook: hookOf(t.text), likes: t.likes, url: t.url })) },
    model,
    provider,
  };
}

// ============================================================================
// Personas
// ============================================================================

/** Route strategy names mapped onto the persona engine's strategies. */
const STRATEGY_ALIASES = {
  'thought-leader': 'thoughtleader',
  'growth-hacker': 'aggressive',
  'crypto-influencer': 'moderate',
  'content-creator': 'moderate',
  'b2b-lead-gen': 'conservative',
};

const NICHE_KEYWORDS = [
  ['crypto-degen', /crypto|web3|defi|bitcoin|ethereum|solana|nft|onchain/i],
  ['ai-researcher', /\bai\b|artificial intelligence|machine learning|\bml\b|llm|agents?\b/i],
  ['tech-builder', /tech|dev|programming|software|startup|saas|indie|open source|coding/i],
  ['growth-marketer', /marketing|growth|creator|content|brand|copywriting/i],
  ['finance-investor', /financ|invest|stock|market|trading|economics|real estate/i],
  ['creative-writer', /writ|book|fiction|poetry|story|journalism/i],
];

function strategyKey(value) {
  const key = STRATEGY_ALIASES[value] || value || 'moderate';
  if (!ENGAGEMENT_STRATEGIES[key]) {
    throw new JobInputError(`strategy must be one of: ${[...Object.keys(STRATEGY_ALIASES), ...Object.keys(ENGAGEMENT_STRATEGIES)].join(', ')}`);
  }
  return key;
}

function activityKey(value) {
  if (value === undefined || value === null || value === '') return 'always-on';
  if (typeof value === 'string') {
    if (!ACTIVITY_PATTERNS[value]) throw new JobInputError(`activityPattern must be one of: ${Object.keys(ACTIVITY_PATTERNS).join(', ')}`);
    return value;
  }
  if (typeof value === 'object' && typeof value.preset === 'string') return activityKey(value.preset);
  return 'always-on';
}

function nicheOptions(niche) {
  const text = String(niche).trim();
  if (NICHE_PRESETS[text] && text !== 'custom') return { preset: text };
  const matched = NICHE_KEYWORDS.find(([, re]) => re.test(text));
  if (matched) {
    const preset = NICHE_PRESETS[matched[0]];
    return {
      preset: matched[0],
      topics: [text, ...preset.topics.filter((t) => t.toLowerCase() !== text.toLowerCase())],
      searchTerms: [text, ...preset.searchTerms],
    };
  }
  return {
    preset: 'custom',
    topics: [text],
    searchTerms: [text],
    postTopics: [text],
    tone: `knowledgeable and direct about ${text}`,
    commentStyle: `adds a specific, useful point about ${text} or asks a sharp follow-up question`,
  };
}

/** A persona as JSON, the way src/personaEngine.js writes it to disk. */
function serialisePersona(persona) {
  return { ...persona, state: { ...persona.state, engagedPosts: [...(persona.state.engagedPosts || [])] } };
}

async function loadOwnedPersona(ctx) {
  const personaId = requireText(ctx, 'personaId');
  const persona = await ownerStore.get(ctx.ownerKey, 'personas', personaId);
  if (!persona) throw new JobInputError(`No persona ${personaId} belongs to this session`);
  return persona;
}

function describePersona(persona) {
  return {
    personaId: persona.id,
    name: persona.name,
    niche: persona.nicheLabel,
    preset: persona.preset,
    strategy: persona.strategy?.preset,
    activityPattern: persona.activityPattern?.preset,
    targetAudience: persona.targetAudience || null,
    model: persona.llm?.models?.post || null,
    createdAt: persona.createdAt,
    updatedAt: persona.updatedAt,
  };
}

function personaPrompt(persona) {
  const base = buildPersonaSystemPrompt(persona);
  return persona.targetAudience && !persona.llm.systemPrompt ? `${base}\n\nYOUR AUDIENCE: ${persona.targetAudience}` : base;
}

async function personaCreateJob(ctx) {
  const name = requireText(ctx, 'name');
  const niche = requireText(ctx, 'niche');
  const { systemPrompt, activityPattern, targetAudience, model } = ctx.config;
  const persona = createPersona({
    id: ctx.operationId,
    name,
    ...nicheOptions(niche),
    strategy: strategyKey(ctx.config.strategy),
    activityPattern: activityKey(activityPattern),
    systemPrompt: typeof systemPrompt === 'string' && systemPrompt.trim() ? systemPrompt.trim() : null,
    commentModel: model || undefined,
    postModel: model || undefined,
    replyModel: model || undefined,
  });
  persona.nicheLabel = niche;
  persona.targetAudience = typeof targetAudience === 'string' ? targetAudience : targetAudience ? JSON.stringify(targetAudience) : null;
  if (activityPattern && typeof activityPattern === 'object') persona.activityPreferences = activityPattern;
  await ownerStore.put(ctx.ownerKey, 'personas', serialisePersona(persona));
  return { ...describePersona(persona), systemPrompt: personaPrompt(persona), persona: serialisePersona(persona) };
}

const PERSONA_FIELDS = {
  name: (p, v) => { p.name = String(v); },
  niche: (p, v) => {
    const options = nicheOptions(v);
    p.nicheLabel = String(v);
    p.preset = options.preset;
    const preset = NICHE_PRESETS[options.preset];
    p.niche.topics = options.topics || [...preset.topics];
    p.niche.searchTerms = options.searchTerms || [...preset.searchTerms];
    if (options.postTopics) p.voice.postTopics = options.postTopics;
  },
  topics: (p, v) => { p.niche.topics = [].concat(v).map(String); },
  searchTerms: (p, v) => { p.niche.searchTerms = [].concat(v).map(String); },
  targetAccounts: (p, v) => { p.niche.targetAccounts = [].concat(v).map(cleanUsername); },
  avoidTopics: (p, v) => { p.niche.avoidTopics = [].concat(v).map(String); },
  avoidAccounts: (p, v) => { p.niche.avoidAccounts = [].concat(v).map(cleanUsername); },
  tone: (p, v) => { p.voice.tone = String(v); },
  commentStyle: (p, v) => { p.voice.commentStyle = String(v); },
  postTopics: (p, v) => { p.voice.postTopics = [].concat(v).map(String); },
  emojiUsage: (p, v) => { p.voice.emojiUsage = String(v); },
  hashtagUsage: (p, v) => { p.voice.hashtagUsage = String(v); },
  language: (p, v) => { p.voice.language = String(v); },
  maxCommentLength: (p, v) => { p.voice.maxCommentLength = clampInt(v, 20, TWEET_LIMIT, p.voice.maxCommentLength); },
  maxPostLength: (p, v) => { p.voice.maxPostLength = clampInt(v, 20, TWEET_LIMIT, p.voice.maxPostLength); },
  strategy: (p, v) => {
    const key = strategyKey(v);
    p.strategy = { preset: key, ...ENGAGEMENT_STRATEGIES[key] };
  },
  activityPattern: (p, v) => {
    const key = activityKey(v);
    p.activityPattern = { preset: key, ...ACTIVITY_PATTERNS[key], timezone: p.activityPattern?.timezone };
    if (v && typeof v === 'object') p.activityPreferences = v;
  },
  timezone: (p, v) => { p.activityPattern.timezone = String(v); },
  systemPrompt: (p, v) => { p.llm.systemPrompt = v ? String(v) : null; },
  model: (p, v) => { p.llm.models = { comment: String(v), post: String(v), reply: String(v) }; },
  temperature: (p, v) => { p.llm.temperature = Math.min(Math.max(Number(v) || 0.85, 0), 2); },
  targetAudience: (p, v) => { p.targetAudience = v ? String(v) : null; },
};

async function personaEditJob(ctx) {
  const persona = await loadOwnedPersona(ctx);
  const updates = ctx.require('updates');
  if (typeof updates !== 'object' || Array.isArray(updates)) throw new JobInputError('updates must be an object');
  const unknown = Object.keys(updates).filter((k) => !PERSONA_FIELDS[k]);
  if (unknown.length) {
    throw new JobInputError(`Unknown persona fields: ${unknown.join(', ')}. Editable: ${Object.keys(PERSONA_FIELDS).join(', ')}`);
  }
  for (const [field, value] of Object.entries(updates)) PERSONA_FIELDS[field](persona, value);
  persona.updatedAt = new Date().toISOString();
  await ownerStore.put(ctx.ownerKey, 'personas', persona);
  return { ...describePersona(persona), updated: Object.keys(updates), persona };
}

async function personaDeleteJob(ctx) {
  const personaId = requireText(ctx, 'personaId');
  const removed = await ownerStore.remove(ctx.ownerKey, 'personas', personaId);
  if (!removed) throw new JobInputError(`No persona ${personaId} belongs to this session`);
  return { personaId, deleted: true };
}

/** Activities the HTTP engine runs; the rest of a plan is reported as not run. */
const PERSONA_ACTIVITIES = new Set(['search', 'browse_home', 'like', 'follow', 'comment', 'profile_visit', 'create_post', 'check_notifications']);
const PERSONA_CHARGES = { like: 'like', follow: 'follow', comment: 'reply', create_post: 'post' };

function avoided(persona, tweet) {
  const text = tweet.text.toLowerCase();
  return (
    (persona.niche.avoidTopics || []).some((t) => text.includes(String(t).toLowerCase())) ||
    (persona.niche.avoidAccounts || []).map((a) => a.toLowerCase()).includes(tweet.author.toLowerCase())
  );
}

async function runPersonaSession(ctx, client, persona, index, { dryRun, selfId }) {
  const plan = planSession(persona);
  const planned = {};
  for (const a of plan.activities) planned[a.type] = (planned[a.type] || 0) + 1;
  const pool = [];
  const pooled = new Set();
  const engaged = new Set(persona.state.engagedPosts || []);
  const followed = persona.state.followedUsers || {};
  const actions = [];
  const record = (entry) => {
    actions.push(entry);
    return entry;
  };
  const addToPool = (tweets, source) => {
    for (const t of tweets.map(flattenTweet)) {
      if (t.isRetweet || !t.id || pooled.has(t.id) || t.authorId === selfId || avoided(persona, t)) continue;
      pooled.add(t.id);
      pool.push({ ...t, source });
    }
  };
  const nextTweet = (predicate) => {
    const i = pool.findIndex((t) => !engaged.has(t.id) && predicate(t));
    return i === -1 ? null : pool[i];
  };
  const randomTerm = () => persona.niche.searchTerms[Math.floor(Math.random() * persona.niche.searchTerms.length)];
  let consecutiveFailures = 0;

  const system = personaPrompt(persona);
  const model = persona.llm?.models?.post;

  for (const activity of plan.activities) {
    ctx.throwIfCancelled();
    if (!PERSONA_ACTIVITIES.has(activity.type)) {
      record({ type: activity.type, status: 'not-run', reason: 'Not available on the HTTP engine' });
      continue;
    }
    if (consecutiveFailures >= 3) {
      record({ type: activity.type, status: 'skipped', reason: 'Stopped after three failures in a row' });
      continue;
    }
    try {
      switch (activity.type) {
        case 'search':
        case 'browse_home': {
          const term = activity.term || randomTerm();
          if (!term) {
            record({ type: activity.type, status: 'skipped', reason: 'The persona has no search terms' });
            break;
          }
          const results = await searchTweets(client, term, { limit: 20, type: activity.tab === 'top' ? 'Top' : 'Latest' });
          addToPool(results, `search:${term}`);
          record({ type: 'search', term, status: 'done', found: results.length });
          break;
        }
        case 'profile_visit': {
          const accounts = persona.niche.targetAccounts || [];
          const target = accounts[Math.floor(Math.random() * accounts.length)];
          if (!target) {
            record({ type: activity.type, status: 'skipped', reason: 'The persona has no target accounts' });
            break;
          }
          const tweets = await scrapeTweets(client, target, { limit: 10 });
          addToPool(tweets, `profile:${target}`);
          record({ type: activity.type, target, status: 'done', found: tweets.length });
          break;
        }
        case 'check_notifications': {
          const items = await scrapeNotifications(client, { type: 'mentions', limit: 20 });
          record({ type: activity.type, status: 'done', found: Array.isArray(items) ? items.length : items?.items?.length ?? 0 });
          break;
        }
        case 'like': {
          const tweet = nextTweet(() => true);
          if (!tweet) {
            record({ type: 'like', status: 'skipped', reason: 'No unseen on-topic posts left this session' });
            break;
          }
          engaged.add(tweet.id);
          if (dryRun) {
            record({ type: 'like', target: tweet.url, status: 'planned' });
            break;
          }
          await ctx.charge('like');
          await pause(ctx);
          await likeTweet(client, tweet.id);
          persona.state.totalLikes++;
          record({ type: 'like', target: tweet.url, status: 'done' });
          break;
        }
        case 'follow': {
          const tweet = pool.find((t) => t.authorId && !followed[t.author] && t.author);
          if (!tweet) {
            record({ type: 'follow', status: 'skipped', reason: 'No new accounts found this session' });
            break;
          }
          followed[tweet.author] = { userId: tweet.authorId, followedAt: dryRun ? null : new Date().toISOString(), planned: dryRun };
          if (dryRun) {
            record({ type: 'follow', target: tweet.author, status: 'planned' });
            break;
          }
          await ctx.charge('follow');
          await pause(ctx);
          await followUser(client, tweet.authorId);
          persona.state.totalFollows++;
          record({ type: 'follow', target: tweet.author, status: 'done' });
          break;
        }
        case 'comment': {
          const tweet = nextTweet((t) => t.text.length > 20 && !t.isReply);
          if (!tweet) {
            record({ type: 'comment', status: 'skipped', reason: 'No unseen on-topic posts left this session' });
            break;
          }
          engaged.add(tweet.id);
          const { text } = await complete(
            ctx,
            [{ role: 'system', content: system }, { role: 'user', content: buildCommentPrompt(persona, tweet.text, tweet.author) }],
            { temperature: persona.llm.temperature ?? 0.85, maxTokens: 200, model },
          );
          const reply = sanitizeComment(text, { allowHashtags: persona.voice.hashtagUsage !== 'none', maxLength: persona.voice.maxCommentLength });
          if (!reply) {
            record({ type: 'comment', target: tweet.url, status: 'failed', error: 'The model returned no usable reply' });
            break;
          }
          if (dryRun) {
            record({ type: 'comment', target: tweet.url, text: reply, status: 'planned' });
            break;
          }
          await ctx.charge('reply');
          await pause(ctx);
          const id = postedTweetId(await replyToTweet(client, tweet.id, reply));
          persona.state.totalComments++;
          record({ type: 'comment', target: tweet.url, text: reply, status: 'done', id });
          break;
        }
        case 'create_post': {
          const { text } = await complete(
            ctx,
            [{ role: 'system', content: system }, { role: 'user', content: buildPostPrompt(persona) }],
            { temperature: persona.llm.temperature ?? 0.85, maxTokens: 300, model },
          );
          const post = sanitizeComment(text, { allowHashtags: persona.voice.hashtagUsage !== 'none', maxLength: persona.voice.maxPostLength });
          if (!post) {
            record({ type: 'create_post', status: 'failed', error: 'The model returned no usable post' });
            break;
          }
          if (dryRun) {
            record({ type: 'create_post', text: post, status: 'planned' });
            break;
          }
          await ctx.charge('post');
          await pause(ctx);
          const id = postedTweetId(await postTweet(client, post));
          persona.state.totalPosts++;
          persona.state.lastPostAt = new Date().toISOString();
          record({ type: 'create_post', text: post, status: 'done', id });
          break;
        }
      }
      if (activity.type === 'search' || activity.type === 'browse_home') persona.state.totalSearches++;
      if (activity.type === 'profile_visit') persona.state.totalProfileVisits++;
      consecutiveFailures = 0;
    } catch (err) {
      if (isFatal(err)) throw err;
      consecutiveFailures++;
      record({ type: activity.type, status: 'failed', error: err.message });
    }
  }

  persona.state.engagedPosts = [...engaged].slice(-2000);
  persona.state.followedUsers = Object.fromEntries(Object.entries(followed).filter(([, v]) => !v.planned));
  const counts = {};
  for (const a of actions) counts[`${a.type}:${a.status}`] = (counts[`${a.type}:${a.status}`] || 0) + 1;
  return { index, planned, counts, actions, charged: Object.fromEntries(Object.entries(PERSONA_CHARGES).map(([t, c]) => [c, actions.filter((a) => a.type === t && a.status === 'done').length])) };
}

async function personaRunJob(ctx) {
  const persona = await loadOwnedPersona(ctx);
  const dryRun = Boolean(ctx.config.dryRun);
  const sessions = clampInt(ctx.config.sessions, 1, 5, 1);
  llmTarget(ctx.config);
  const client = await ctx.http();
  const selfId = sessionUserId(client);
  const results = [];

  for (let i = 0; i < sessions; i++) {
    ctx.progress(`Persona ${persona.name}: session ${i + 1} of ${sessions}`, { done: i, total: sessions });
    const startedAt = new Date().toISOString();
    const session = await runPersonaSession(ctx, client, persona, i + 1, { dryRun, selfId });
    results.push({ ...session, startedAt, completedAt: new Date().toISOString() });
    if (!dryRun) {
      persona.state.totalSessions++;
      persona.state.lastSessionAt = new Date().toISOString();
      persona.updatedAt = persona.state.lastSessionAt;
      await ownerStore.put(ctx.ownerKey, 'personas', persona);
    }
    if (i < sessions - 1 && !dryRun) {
      const gap = ctx.config.delayMs !== undefined && ctx.config.delayMs !== null ? pauseMs(ctx) : getDelayUntilNextSession(persona) * 60_000;
      ctx.progress(`Resting ${Math.round(gap / 60_000)} min before the next session`);
      await ctx.sleep(gap);
    }
  }

  const totals = {};
  for (const s of results) for (const [k, v] of Object.entries(s.counts)) totals[k] = (totals[k] || 0) + v;
  return { personaId: persona.id, name: persona.name, dryRun, sessions: results, totals };
}

// ============================================================================
// Workflows
// ============================================================================

/** The step vocabulary POST /api/ai/workflows/actions documents. */
const WORKFLOW_STEPS = {
  scrape_profile: { required: ['username'] },
  scrape_tweets: { required: ['username'] },
  search: { required: ['query'] },
  follow: { required: ['username'], charge: 'follow' },
  unfollow: { required: ['username'], charge: 'unfollow' },
  like: { required: ['tweetId'], charge: 'like' },
  retweet: { required: ['tweetId'], charge: 'repost' },
  post_tweet: { required: ['text'], charge: 'post' },
  reply: { required: ['tweetId', 'text'], charge: 'reply' },
  send_dm: { required: ['username', 'message'], charge: 'dm' },
  auto_like: { oneOf: ['username', 'hashtag', 'keyword'], charge: 'like' },
  auto_follow: { oneOf: ['username', 'hashtag', 'keyword'], charge: 'follow' },
  delay: { required: ['seconds'] },
  condition: { required: ['field', 'operator'] },
};

/** Step names src/workflows uses, read as their documented equivalents. */
const STEP_ALIASES = { scrapeProfile: 'scrape_profile', scrapeTweets: 'scrape_tweets', searchTweets: 'search', postTweet: 'post_tweet' };
const STEP_META_KEYS = new Set(['type', 'action', 'params', 'output', 'onError', 'onFail', 'condition']);

/** Validate and normalise one step into `{ type, params, output, onError, onFail }`. */
export function normalizeStep(raw, index) {
  if (!raw || typeof raw !== 'object') throw new JobInputError(`Step ${index + 1} must be an object`);
  if (typeof raw.condition === 'string' || (raw.condition && typeof raw.condition === 'object')) {
    return { type: 'condition', params: { expression: raw.condition }, output: raw.output || null, onError: 'stop', onFail: raw.onFail === 'skip' ? 'skip' : 'stop' };
  }
  const name = STEP_ALIASES[raw.type || raw.action] || raw.type || raw.action;
  const spec = WORKFLOW_STEPS[name];
  if (!spec) throw new JobInputError(`Step ${index + 1}: unknown type "${name}". Available: ${Object.keys(WORKFLOW_STEPS).join(', ')}`);
  const params = raw.params && typeof raw.params === 'object' ? { ...raw.params } : Object.fromEntries(Object.entries(raw).filter(([k]) => !STEP_META_KEYS.has(k)));
  if (['like', 'retweet', 'reply'].includes(name) && !params.tweetId && (params.url || params.tweetUrl)) params.tweetId = params.url || params.tweetUrl;
  if (name === 'scrape_profile' && !params.username && params.target) params.username = params.target;
  if (name === 'scrape_tweets' && !params.username && params.target) params.username = params.target;
  const present = (key) => params[key] !== undefined && params[key] !== null && params[key] !== '';
  const missing = (spec.required || []).filter((k) => !present(k));
  if (missing.length) throw new JobInputError(`Step ${index + 1} (${name}) needs ${missing.join(', ')}`);
  if (spec.oneOf && !spec.oneOf.some(present)) throw new JobInputError(`Step ${index + 1} (${name}) needs one of ${spec.oneOf.join(', ')}`);
  return {
    type: name,
    params,
    output: typeof raw.output === 'string' && raw.output ? raw.output : null,
    onError: raw.onError === 'continue' ? 'continue' : 'stop',
    onFail: raw.onFail === 'skip' || params.onFail === 'skip' ? 'skip' : 'stop',
  };
}

function normalizeSteps(steps) {
  if (!Array.isArray(steps) || !steps.length) throw new JobInputError('steps must be a non-empty array');
  if (steps.length > 50) throw new JobInputError('A workflow can have at most 50 steps');
  return steps.map(normalizeStep);
}

/** Resolve `{{path}}` references against the run's variables. */
function resolveTemplates(value, context) {
  if (typeof value === 'string') {
    const whole = value.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
    if (whole) return resolveValue(whole[1], context);
    return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, ref) => {
      const resolved = resolveValue(ref, context);
      if (resolved === undefined || resolved === null) return match;
      return typeof resolved === 'object' ? JSON.stringify(resolved) : String(resolved);
    });
  }
  if (Array.isArray(value)) return value.map((v) => resolveTemplates(v, context));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveTemplates(v, context)]));
  return value;
}

/** Posts or accounts an auto_* step works through. */
async function autoTargets(client, params, kind, max) {
  if (params.username) {
    const username = cleanUsername(params.username);
    if (kind === 'follow') return (await scrapeFollowers(client, username, { limit: max * 2 })).filter((u) => u.id && !u.protected).map((u) => ({ id: u.id, username: u.username }));
    return (await scrapeTweets(client, username, { limit: max * 2 })).map(flattenTweet).filter((t) => !t.isRetweet);
  }
  const query = params.hashtag ? `#${String(params.hashtag).replace(/^#/, '')}` : String(params.keyword);
  const tweets = (await searchTweets(client, query, { limit: max * 3, type: 'Latest' })).map(flattenTweet).filter((t) => !t.isRetweet);
  if (kind === 'like') return tweets;
  const seen = new Set();
  return tweets.filter((t) => t.authorId && !seen.has(t.authorId) && seen.add(t.authorId)).map((t) => ({ id: t.authorId, username: t.author }));
}

async function runWorkflowStep(ctx, client, step, { dryRun }) {
  const p = step.params;
  const spec = WORKFLOW_STEPS[step.type];
  const write = async (describe, perform) => {
    if (dryRun) return { status: 'planned', result: describe };
    await ctx.charge(spec.charge);
    await pause(ctx);
    return { status: 'done', result: { ...describe, ...(await perform()) } };
  };

  switch (step.type) {
    case 'scrape_profile':
      return { status: 'done', result: await scrapeProfile(client, cleanUsername(p.username)) };
    case 'scrape_tweets':
      return { status: 'done', result: (await scrapeTweets(client, cleanUsername(p.username), { limit: clampInt(p.limit, 1, 200, 20) })).map(flattenTweet) };
    case 'search': {
      const type = String(p.filter || p.type || 'latest').toLowerCase() === 'top' ? 'Top' : 'Latest';
      return { status: 'done', result: (await searchTweets(client, String(p.query), { limit: clampInt(p.limit, 1, 200, 20), type })).map(flattenTweet) };
    }
    case 'follow': {
      const username = cleanUsername(p.username);
      return write({ username }, async () => {
        const profile = await scrapeProfile(client, username);
        await followUser(client, profile.id);
        return { userId: profile.id };
      });
    }
    case 'unfollow': {
      const username = cleanUsername(p.username);
      return write({ username }, async () => {
        const profile = await scrapeProfile(client, username);
        await unfollowUser(client, profile.id);
        return { userId: profile.id };
      });
    }
    case 'like':
    case 'retweet': {
      const tweetId = tweetIdOf(p.tweetId);
      if (!tweetId) throw new JobInputError(`${step.type}: tweetId "${p.tweetId}" is not a post id or URL`);
      return write({ tweetId }, async () => {
        await (step.type === 'like' ? likeTweet(client, tweetId) : retweet(client, tweetId));
        return {};
      });
    }
    case 'post_tweet':
      return write({ text: String(p.text) }, async () => ({ id: postedTweetId(await postTweet(client, String(p.text))) }));
    case 'reply': {
      const tweetId = tweetIdOf(p.tweetId);
      if (!tweetId) throw new JobInputError(`reply: tweetId "${p.tweetId}" is not a post id or URL`);
      return write({ tweetId, text: String(p.text) }, async () => ({ id: postedTweetId(await replyToTweet(client, tweetId, String(p.text))) }));
    }
    case 'send_dm': {
      const username = cleanUsername(p.username);
      return write({ username, message: String(p.message) }, async () => sendDMByUsername(client, username, String(p.message)));
    }
    case 'auto_like':
    case 'auto_follow': {
      const kind = step.type === 'auto_like' ? 'like' : 'follow';
      const max = clampInt(kind === 'like' ? p.maxLikes ?? p.max : p.maxFollows ?? p.max, 1, 50, 10);
      const targets = (await autoTargets(client, p, kind, max)).slice(0, max);
      const items = [];
      for (const target of targets) {
        ctx.throwIfCancelled();
        const label = kind === 'like' ? { tweetId: target.id, url: target.url } : { username: target.username };
        if (dryRun) {
          items.push({ ...label, status: 'planned' });
          continue;
        }
        try {
          await ctx.charge(spec.charge);
          await pause(ctx);
          await (kind === 'like' ? likeTweet(client, target.id) : followUser(client, target.id));
          items.push({ ...label, status: 'done' });
        } catch (err) {
          if (isFatal(err)) throw err;
          items.push({ ...label, status: 'failed', error: err.message });
        }
      }
      return {
        status: dryRun ? 'planned' : 'done',
        result: { found: targets.length, done: items.filter((i) => i.status === 'done').length, items },
      };
    }
    case 'delay': {
      const seconds = Math.min(Math.max(Number(p.seconds) || 0, 0), 300);
      await ctx.sleep(seconds * 1000);
      return { status: 'done', result: { waitedSeconds: seconds } };
    }
    default:
      throw new JobInputError(`Unknown step type ${step.type}`);
  }
}

/** Keep stored run variables small: long lists become their size plus a sample. */
function compactValue(value) {
  if (Array.isArray(value)) return value.length > 50 ? { count: value.length, sample: value.slice(0, 5) } : value;
  return value;
}

async function workflowCreateJob(ctx) {
  const name = requireText(ctx, 'name');
  if (ctx.config.schedule) {
    throw new JobInputError('Scheduled workflows are not supported. Save the workflow and trigger POST /api/ai/workflows/run from your own scheduler.');
  }
  const steps = normalizeSteps(ctx.config.steps);
  const now = new Date().toISOString();
  const workflow = {
    id: ctx.operationId,
    name,
    description: ctx.config.description || null,
    enabled: true,
    steps,
    createdAt: now,
    updatedAt: now,
  };
  await ownerStore.put(ctx.ownerKey, 'workflows', workflow);
  return { workflowId: workflow.id, name, description: workflow.description, stepCount: steps.length, steps, createdAt: now };
}

async function workflowRunJob(ctx) {
  let workflow;
  if (ctx.config.workflowId) {
    workflow = await ownerStore.get(ctx.ownerKey, 'workflows', ctx.config.workflowId);
    if (!workflow) throw new JobInputError(`No workflow ${ctx.config.workflowId} belongs to this session`);
  } else if (ctx.config.workflow && typeof ctx.config.workflow === 'object') {
    workflow = { id: null, name: ctx.config.workflow.name || 'Inline workflow', steps: ctx.config.workflow.steps };
  } else {
    throw new JobInputError('workflowId or workflow is required');
  }
  const steps = normalizeSteps(workflow.steps);
  const dryRun = Boolean(ctx.config.dryRun);
  const initial = ctx.config.context && typeof ctx.config.context === 'object' ? ctx.config.context : {};
  const context = { ...initial };
  const client = await ctx.http();
  const log = [];
  let status = 'completed';

  for (const [i, step] of steps.entries()) {
    ctx.throwIfCancelled();
    ctx.progress(`Step ${i + 1} of ${steps.length}: ${step.type}`, { done: i, total: steps.length });
    const entry = { index: i + 1, type: step.type };
    try {
      if (step.type === 'condition') {
        const condition =
          step.params.expression ??
          { left: step.params.field, operator: step.params.operator, right: typeof step.params.value === 'string' ? JSON.stringify(step.params.value) : step.params.value };
        const evaluation = evaluateCondition(resolveTemplates(condition, context), context);
        entry.status = evaluation.passed ? 'passed' : step.onFail === 'skip' ? 'skipped' : 'stopped';
        entry.result = evaluation.details;
        log.push(entry);
        if (!evaluation.passed && step.onFail !== 'skip') {
          status = 'stopped';
          break;
        }
        continue;
      }
      const resolved = { ...step, params: resolveTemplates(step.params, context) };
      const { status: stepStatus, result } = await runWorkflowStep(ctx, client, resolved, { dryRun });
      entry.status = stepStatus;
      entry.result = compactValue(result);
      context[step.output || `step${i + 1}`] = result;
      context.last = result;
    } catch (err) {
      if (isFatal(err)) throw err;
      entry.status = 'failed';
      entry.error = err.message;
      if (step.onError !== 'continue') {
        log.push(entry);
        status = 'failed';
        break;
      }
    }
    log.push(entry);
  }

  return {
    workflowId: workflow.id,
    name: workflow.name,
    dryRun,
    status,
    stepsRun: log.length,
    totalSteps: steps.length,
    steps: log,
    variables: Object.fromEntries(Object.entries(context).map(([k, v]) => [k, compactValue(v)])),
  };
}

// ============================================================================
// Teams
// ============================================================================

const TEAM_ROLES = ['owner', 'admin', 'editor', 'viewer'];

async function teamCreateJob(ctx) {
  const name = requireText(ctx, 'name');
  const raw = Array.isArray(ctx.config.members) ? ctx.config.members.slice(0, 20) : [];
  const requested = raw.map((m, i) => {
    const username = cleanUsername(typeof m === 'string' ? m : m?.username);
    if (!/^[A-Za-z0-9_]{1,15}$/.test(username)) throw new JobInputError(`Member ${i + 1} needs a valid X username`);
    const role = typeof m === 'object' && m?.role ? String(m.role) : 'editor';
    if (!TEAM_ROLES.includes(role)) throw new JobInputError(`Member @${username}: role must be one of ${TEAM_ROLES.join(', ')}`);
    return { username, role };
  });

  const client = requested.length ? await ctx.http() : null;
  const members = [];
  const notFound = [];
  for (const [i, m] of requested.entries()) {
    ctx.throwIfCancelled();
    ctx.progress(`Checking @${m.username}`, { done: i, total: requested.length });
    try {
      const profile = await scrapeProfile(client, m.username);
      members.push({
        username: profile.username,
        role: m.role,
        userId: profile.id,
        name: profile.name,
        avatar: profile.avatar,
        verified: Boolean(profile.verified),
        followers: profile.followers,
      });
    } catch (err) {
      if (err.name !== 'NotFoundError') throw err;
      notFound.push({ username: m.username, error: err.message });
    }
    if (i < requested.length - 1) await ctx.sleep(Math.min(pauseMs(ctx), 1500));
  }

  const now = new Date().toISOString();
  const team = {
    id: ctx.operationId,
    name,
    description: ctx.config.description || null,
    members,
    notFound,
    createdAt: now,
    updatedAt: now,
  };
  await ownerStore.put(ctx.ownerKey, 'teams', team);
  return { teamId: team.id, ...team, memberCount: members.length };
}

// ============================================================================
// Account portability
// ============================================================================

const EXPORT_SECTIONS = ['profile', 'tweets', 'followers', 'following', 'bookmarks', 'likes', 'dms'];
const PRIVATE_SECTIONS = new Set(['bookmarks', 'likes', 'dms']);

/** Page a timeline query until `limit` posts are read. */
async function timelinePosts(client, operation, variables, instructionsOf, limit) {
  const posts = [];
  let cursor = null;
  while (posts.length < limit) {
    const response = await client.graphql(operation.queryId, operation.operationName, cursor ? { ...variables, cursor } : variables);
    const { tweets, cursor: next } = parseTimelineInstructions(instructionsOf(response?.data) || []);
    posts.push(...tweets.map(flattenTweet));
    if (!next || !tweets.length) break;
    cursor = next;
  }
  return posts.slice(0, limit);
}

async function exportSection(ctx, client, section, { username, own, limit }) {
  if (PRIVATE_SECTIONS.has(section) && !own) {
    throw new JobInputError(`${section} can only be exported for the session's own account`);
  }
  switch (section) {
    case 'profile':
      return scrapeProfile(client, username);
    case 'tweets':
      return (await scrapeTweets(client, username, { limit })).map(flattenTweet);
    case 'followers':
      return scrapeFollowers(client, username, { limit });
    case 'following':
      return scrapeFollowing(client, username, { limit });
    case 'bookmarks':
      return timelinePosts(client, GRAPHQL.BookmarkTimeline, { count: 20, includePromotedContent: false }, (d) => d?.bookmark_timeline_v2?.timeline?.instructions, limit);
    case 'likes': {
      const profile = await scrapeProfile(client, username);
      return timelinePosts(
        client,
        GRAPHQL.UserLikes,
        { userId: profile.id, count: 20, includePromotedContent: false, withClientEventToken: false, withBirdwatchNotes: false, withVoice: true },
        userTimelineInstructions,
        limit,
      );
    }
    case 'dms': {
      const { listDmConversations } = await import('../xSession.js');
      return listDmConversations(await ctx.scraper(), Math.min(limit, 500));
    }
    default:
      throw new JobInputError(`Unknown section ${section}`);
  }
}

/** Readable text for one exported section, using the exporter's renderers. */
function sectionText(section, data, username) {
  const asTimestamped = (posts) => posts.map((t) => ({ ...t, timestamp: t.createdAt }));
  switch (section) {
    case 'profile':
      return profileToMarkdown(data);
    case 'tweets':
      return tweetsToMarkdown(asTimestamped(data), username);
    case 'likes':
      return tweetsToMarkdown(asTimestamped(data), `${username}'s likes`);
    case 'followers':
      return usersToMarkdown(data, `Followers of @${username}`);
    case 'following':
      return usersToMarkdown(data, `@${username} follows`);
    case 'bookmarks':
      return bookmarksToMarkdown(data.map((t) => ({ ...t, link: t.url })));
    case 'dms':
      return data.map((c) => `${c.id || c.conversationId}: ${JSON.stringify(c.lastMessage ?? '')}`).join('\n');
    default:
      return '';
  }
}

async function exportAccountJob(ctx) {
  const formats = (Array.isArray(ctx.config.formats) ? ctx.config.formats : []).filter((f) => ['json', 'csv', 'txt'].includes(f));
  const effectiveFormats = formats.length ? formats : ['json'];
  const sections = (Array.isArray(ctx.config.sections) ? ctx.config.sections : EXPORT_SECTIONS).filter((s) => EXPORT_SECTIONS.includes(s));
  if (!sections.length) throw new JobInputError(`sections must include at least one of ${EXPORT_SECTIONS.join(', ')}`);
  const limit = clampInt(ctx.config.limit, 1, 10_000, 1000);
  const dir = ownerStore.exportDir(ctx.ownerKey, ctx.operationId);
  if (!dir) throw new JobInputError('This job id cannot name an export');

  const client = await ctx.http();
  const self = await sessionUsername(client);
  const username = ctx.config.username ? cleanUsername(ctx.config.username) : self;
  const own = username.toLowerCase() === self.toLowerCase();

  const data = {};
  const summary = {};
  const errors = [];
  for (const [i, section] of sections.entries()) {
    ctx.throwIfCancelled();
    ctx.progress(`Exporting ${section}`, { done: i, total: sections.length });
    try {
      data[section] = await exportSection(ctx, client, section, { username, own, limit });
      summary[section] = { count: Array.isArray(data[section]) ? data[section].length : 1 };
      await writeJsonAtomic(path.join(dir, `${section}.json`), data[section]);
    } catch (err) {
      if (err.name === 'JobCancelledError' || err.name === 'XSessionError') throw err;
      errors.push({ section, error: err.message });
    }
  }
  if (!Object.keys(data).length) throw new Error(`Nothing could be exported: ${errors.map((e) => `${e.section}: ${e.error}`).join('; ')}`);

  const meta = { id: ctx.operationId, username, own, sections: summary, errors, limit, createdAt: new Date().toISOString() };
  await writeJsonAtomic(path.join(dir, 'summary.json'), meta);

  const output = {};
  for (const format of effectiveFormats) {
    output[format] = {};
    for (const [section, value] of Object.entries(data)) {
      if (format === 'json') output.json[section] = value;
      else if (format === 'csv') output.csv[section] = Array.isArray(value) ? toCSV(value) : toCSV([value]);
      else output.txt[section] = sectionText(section, value, username);
    }
  }
  return { exportId: ctx.operationId, username, formats: effectiveFormats, sections: summary, errors, data: output };
}

/** An export id the owner may read, as a directory. Paths are refused. */
async function ownedExportDir(ctx, value, label) {
  const id = String(value ?? '').trim();
  if (!id) throw new JobInputError(`${label} is required`);
  if (!SAFE_ID.test(id)) {
    throw new JobInputError(`${label} must be an exportId returned by POST /api/ai/portability/export-account; server paths are not accepted`);
  }
  const dir = ownerStore.exportDir(ctx.ownerKey, id);
  try {
    await fs.access(path.join(dir, 'summary.json'));
  } catch {
    throw new JobInputError(`No export ${id} belongs to this session`);
  }
  return { id, dir };
}

async function diffExportsJob(ctx) {
  const a = await ownedExportDir(ctx, ctx.config.dirA ?? ctx.config.exportA, 'dirA');
  const b = await ownedExportDir(ctx, ctx.config.dirB ?? ctx.config.exportB, 'dirB');
  ctx.progress(`Comparing ${a.id} with ${b.id}`);
  const { dirA, dirB, ...rest } = await diffExportDirs(a.dir, b.dir);
  // The report names its inputs; name them by export id, never by server path.
  const report = generateReport({ ...rest, dirA: a.id, dirB: b.id });
  return { exportA: a.id, exportB: b.id, ...rest, report };
}

const PLATFORM_POST_LIMITS = { bluesky: 300, mastodon: 500, nostr: null };

/** A post's text with t.co links expanded, fitted to the target's length limit. */
function fitPost(tweet, max) {
  let text = tweet.text || '';
  for (const link of tweet.links || []) text = text.replace(/https:\/\/t\.co\/\w+/, link);
  text = text.replace(/\s*https:\/\/t\.co\/\w+$/g, '').trim();
  if (!max || [...text].length <= max) return { text, truncated: false };
  return { text: `${[...text].slice(0, max - 1).join('').trimEnd()}…`, truncated: true };
}

async function findOnPlatform(platform, handle) {
  if (platform === 'bluesky') {
    const res = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.searchActors?q=${encodeURIComponent(handle)}&limit=5`);
    if (!res.ok) throw new Error(`Bluesky search returned HTTP ${res.status}`);
    const { actors = [] } = await res.json();
    return actors.map((a) => ({ username: String(a.handle || '').split('.')[0], handle: a.handle, name: a.displayName || '', bio: a.description || '' }));
  }
  if (platform === 'mastodon') {
    const res = await fetch(`https://mastodon.social/api/v2/search?q=${encodeURIComponent(handle)}&type=accounts&limit=5`);
    if (!res.ok) throw new Error(`Mastodon search returned HTTP ${res.status}`);
    const { accounts = [] } = await res.json();
    return accounts.map((a) => ({ username: a.username, handle: a.acct, name: a.display_name || '', bio: String(a.note || '').replace(/<[^>]+>/g, ' ') }));
  }
  return null;
}

async function migrateAccountJob(ctx) {
  const platform = ctx.require('platform');
  if (!(platform in PLATFORM_POST_LIMITS)) throw new JobInputError(`platform must be one of: ${Object.keys(PLATFORM_POST_LIMITS).join(', ')}`);
  if (!ctx.config.dryRun) {
    throw new JobInputError('Live migration needs credentials for the target platform, which this API does not accept. Run with dryRun: true for the migration plan.');
  }
  const username = cleanUsername(requireText(ctx, 'username'));

  let tweets;
  let following;
  let source;
  if (ctx.config.exportDir) {
    const { id, dir } = await ownedExportDir(ctx, ctx.config.exportDir, 'exportDir');
    tweets = (await readJson(path.join(dir, 'tweets.json'))) || [];
    following = (await readJson(path.join(dir, 'following.json'))) || [];
    source = { exportId: id };
  } else {
    const client = await ctx.http();
    ctx.progress(`Reading @${username}'s posts`);
    tweets = (await scrapeTweets(client, username, { limit: 50 })).map(flattenTweet);
    ctx.progress(`Reading who @${username} follows`);
    following = await scrapeFollowing(client, username, { limit: 200 });
    source = { live: true };
  }

  const originals = tweets.filter((t) => !t.isRetweet && !t.isReply && (t.text || '').trim()).slice(0, 50);
  const max = PLATFORM_POST_LIMITS[platform];
  const posts = originals.map((t) => {
    const fitted = fitPost(t, max);
    return { tweetId: t.id, originalUrl: t.url, ...fitted, mediaNotMigrated: Boolean(t.hasMedia) };
  });

  const follows = [];
  const lookups = following.slice(0, 100);
  for (const [i, user] of lookups.entries()) {
    ctx.throwIfCancelled();
    const handle = user.username || user.handle;
    if (!handle) continue;
    if (platform === 'nostr') {
      follows.push({ twitterUser: handle, match: null, reason: 'Nostr has no public account directory to match against' });
      continue;
    }
    if (i % 10 === 0) ctx.progress(`Matching follows on ${platform}`, { done: i, total: lookups.length });
    try {
      const found = await findOnPlatform(platform, handle);
      const best = findMatch({ username: handle, bio: user.bio || '' }, found);
      follows.push(best
        ? { twitterUser: handle, match: best.match.handle, name: best.match.name, score: round(best.score), method: best.method }
        : { twitterUser: handle, match: null, reason: 'No account with a similar handle' });
    } catch (err) {
      follows.push({ twitterUser: handle, match: null, error: err.message });
    }
    await ctx.sleep(250);
  }

  return {
    platform,
    username,
    dryRun: true,
    source,
    posts: { total: posts.length, truncated: posts.filter((p) => p.truncated).length, withMedia: posts.filter((p) => p.mediaNotMigrated).length, items: posts },
    follows: { total: follows.length, matched: follows.filter((f) => f.match).length, items: follows },
  };
}

const IMPORT_PLATFORMS = ['bluesky', 'mastodon', 'nostr', 'twitter'];

const stripHtml = (html) =>
  String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

function importedPostText(item, from) {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return '';
  if (from === 'bluesky') return item.record?.text ?? item.post?.record?.text ?? item.text ?? '';
  if (from === 'mastodon') return item.content ? stripHtml(item.content) : item.text ?? '';
  if (from === 'nostr') return item.kind === undefined || item.kind === 1 ? item.content ?? '' : '';
  return item.text ?? item.full_text ?? item.tweet?.full_text ?? '';
}

function importedHandle(item, from) {
  const raw = typeof item === 'string' ? item : item?.handle ?? item?.acct ?? item?.username ?? item?.screen_name ?? item?.name ?? item?.nip05 ?? '';
  const value = String(raw).replace(/^@/, '').trim();
  if (from === 'bluesky') return value.split('.')[0];
  if (from === 'mastodon' || from === 'nostr') return value.split('@')[0];
  return value;
}

/** Split an export from another platform into posts and follows. */
export function normalizeImport(data, from) {
  const pick = (obj, keys) => keys.map((k) => obj?.[k]).find(Array.isArray) || [];
  const postItems = Array.isArray(data) ? data : pick(data, ['posts', 'tweets', 'statuses', 'notes', 'feed']);
  const followItems = Array.isArray(data) ? [] : pick(data, ['following', 'follows', 'followings', 'contacts']);
  const seen = new Set();
  const posts = postItems
    .map((item) => importedPostText(item, from).trim())
    .filter((text) => text && !seen.has(text) && seen.add(text));
  const follows = followItems.map((item) => ({
    candidate: importedHandle(item, from),
    source: typeof item === 'string' ? item : item?.handle ?? item?.acct ?? item?.username ?? item?.name ?? null,
    name: typeof item === 'object' ? item?.displayName ?? item?.display_name ?? item?.name ?? '' : '',
  }));
  return { posts, follows };
}

async function importDataJob(ctx) {
  const from = String(ctx.require('from')).toLowerCase();
  if (!IMPORT_PLATFORMS.includes(from)) throw new JobInputError(`from must be one of: ${IMPORT_PLATFORMS.join(', ')}`);
  const data = ctx.require('data');
  const dryRun = Boolean(ctx.config.dryRun);
  const { posts, follows } = normalizeImport(data, from);
  if (!posts.length && !follows.length) throw new JobInputError(`No posts or follows were found in the ${from} data`);
  const maxPosts = clampInt(ctx.config.maxPosts, 0, 50, 25);
  const maxFollows = clampInt(ctx.config.maxFollows, 0, 100, 50);
  const client = await ctx.http();

  const postItems = [];
  for (const [i, text] of posts.slice(0, maxPosts).entries()) {
    ctx.throwIfCancelled();
    const fitted = [...text].length > TWEET_LIMIT ? `${[...text].slice(0, TWEET_LIMIT - 1).join('').trimEnd()}…` : text;
    const item = { text: fitted, truncated: fitted !== text };
    if (dryRun) {
      postItems.push({ ...item, status: 'planned' });
      continue;
    }
    ctx.progress(`Posting ${i + 1} of ${Math.min(posts.length, maxPosts)}`);
    try {
      await ctx.charge('post');
      await pause(ctx);
      postItems.push({ ...item, status: 'done', id: postedTweetId(await postTweet(client, fitted)) });
    } catch (err) {
      if (isFatal(err)) throw err;
      postItems.push({ ...item, status: 'failed', error: err.message });
    }
  }

  const followItems = [];
  for (const [i, f] of follows.slice(0, maxFollows).entries()) {
    ctx.throwIfCancelled();
    const base = { source: f.source, candidate: f.candidate };
    if (!/^[A-Za-z0-9_]{1,15}$/.test(f.candidate)) {
      followItems.push({ ...base, status: 'unmatched', reason: 'Not a valid X username' });
      continue;
    }
    if (i % 10 === 0) ctx.progress(`Matching follows on X`, { done: i, total: Math.min(follows.length, maxFollows) });
    let profile;
    try {
      profile = await scrapeProfile(client, f.candidate);
    } catch (err) {
      if (err.name !== 'NotFoundError') throw err;
      followItems.push({ ...base, status: 'unmatched', reason: 'No X account with that username' });
      await ctx.sleep(Math.min(pauseMs(ctx), 1000));
      continue;
    }
    const nameScore = f.name ? similarity(f.name, profile.name) : null;
    const bioMentions = profile.bio?.toLowerCase().includes(String(f.source || '').toLowerCase()) ?? false;
    const confident = bioMentions || (nameScore !== null && nameScore >= 0.6);
    const match = { ...base, xUsername: profile.username, xName: profile.name, nameSimilarity: nameScore === null ? null : round(nameScore), confident };
    if (!confident) {
      followItems.push({ ...match, status: 'unconfirmed', reason: 'Same username, but neither the name nor the bio confirms it is the same person' });
    } else if (dryRun) {
      followItems.push({ ...match, status: 'planned' });
    } else {
      try {
        await ctx.charge('follow');
        await pause(ctx);
        await followUser(client, profile.id);
        followItems.push({ ...match, status: 'done' });
        continue;
      } catch (err) {
        if (isFatal(err)) throw err;
        followItems.push({ ...match, status: 'failed', error: err.message });
      }
    }
    // Profile lookups are reads, but a burst of them still looks automated.
    await ctx.sleep(Math.min(pauseMs(ctx), 1000));
  }

  const tally = (items, status) => items.filter((i) => i.status === status).length;
  return {
    from,
    dryRun,
    posts: { found: posts.length, considered: postItems.length, done: tally(postItems, 'done'), planned: tally(postItems, 'planned'), failed: tally(postItems, 'failed'), items: postItems },
    follows: {
      found: follows.length,
      considered: followItems.length,
      done: tally(followItems, 'done'),
      planned: tally(followItems, 'planned'),
      unconfirmed: tally(followItems, 'unconfirmed'),
      unmatched: tally(followItems, 'unmatched'),
      items: followItems,
    },
  };
}

// ============================================================================
// Registry
// ============================================================================

export default {
  generateTweet: { run: generateTweetJob, concurrency: 3, description: 'Write posts in an account\'s voice' },
  rewriteTweet: { run: rewriteTweetJob, concurrency: 4, description: 'Rewrite a post toward a goal' },
  optimizeTweet: { run: optimizeTweetJob, concurrency: 4, description: 'Optimise a post for engagement goals' },
  generateVariations: { run: generateVariationsJob, concurrency: 4, description: 'Write style variations of a post' },

  grokQuery: { run: grokQueryJob, concurrency: 2, description: 'Ask Grok as the session' },
  grokSummarize: { run: grokSummarizeJob, concurrency: 2, description: 'Have Grok summarise a topic on X' },
  grokAnalyzeImage: { run: grokAnalyzeImageJob, concurrency: 2, description: 'Have Grok analyse an image or a post\'s image' },

  viralResearch: { run: viralResearchJob, concurrency: 2, description: 'What the top posts in a niche have in common' },
  viralGenerate: { run: viralGenerateJob, concurrency: 2, description: 'Write a thread modelled on what performs' },
  viralAnalyze: { run: viralAnalyzeJob, concurrency: 3, description: 'Why one post outperformed its author\'s baseline' },
  viralTrendingHooks: { run: viralTrendingHooksJob, concurrency: 2, description: 'Opening lines earning the most engagement now' },
  viralHeadlines: { run: viralHeadlinesJob, concurrency: 3, description: 'Write opening lines for a topic' },

  personaCreate: { run: personaCreateJob, concurrency: 4, description: 'Save a posting persona' },
  personaEdit: { run: personaEditJob, concurrency: 4, description: 'Change a saved persona' },
  personaDelete: { run: personaDeleteJob, concurrency: 4, description: 'Delete a saved persona' },
  // Sessions with rests of many minutes between them: hours, so it does not wait in a shared slot.
  personaRun: { run: personaRunJob, concurrency: 2, ownQueue: true, write: true, description: 'Run engagement sessions as a persona' },

  workflowCreate: { run: workflowCreateJob, concurrency: 4, description: 'Save a multi-step workflow' },
  workflowRun: { run: workflowRunJob, concurrency: 2, write: true, description: 'Run a workflow' },

  teamCreate: { run: teamCreateJob, concurrency: 3, description: 'Create a team of verified X accounts' },

  exportAccount: { run: exportAccountJob, concurrency: 2, description: 'Export an account\'s data' },
  migrateAccount: { run: migrateAccountJob, concurrency: 2, description: 'Plan a migration to Bluesky, Mastodon or Nostr' },
  diffExports: { run: diffExportsJob, concurrency: 3, description: 'Compare two exports' },
  importData: { run: importDataJob, concurrency: 2, write: true, description: 'Import posts and follows from another platform' },
};
