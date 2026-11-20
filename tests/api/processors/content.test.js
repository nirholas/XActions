// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests for the content processors (api/services/processors/content.processors.js)
 * and the content routes that read what they store.
 *
 * Nothing of ours is mocked. The network is the only boundary replaced: one
 * fetch answers the way x.com, Grok, OpenRouter and Bluesky's public AppView
 * answer, with bodies shaped from the parsers the processors call. It is
 * handed to the job context (for the X client) and installed as the global
 * fetch (for the language model and third-party lookups). State lives in a
 * temporary XACTIONS_HOME.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import request from 'supertest';
import { createJobContext, JobInputError, isPermanentFailure } from '../../../api/services/processors/context.js';
import { loadProcessors } from '../../../api/services/processors/registry.js';
import processors, {
  llmTarget,
  normalizeImport,
  normalizeStep,
  ownerKeyForSession,
  ownerStore,
  parseGrokStream,
} from '../../../api/services/processors/content.processors.js';

const COOKIE = 'auth_token=tok; ct0=csrf; twid=u%3D999';
const OWNER = 'owner-a';
const LLM_KEYS = ['OPENROUTER_API_KEY', 'OPENROUTER_API_KEYS', 'GROQ_API_KEY', 'NVIDIA_API_KEY', 'CEREBRAS_API_KEY', 'GEMINI_API_KEY', 'MISTRAL_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'XAI_API_KEY', 'GROK_API_KEY', 'XACTIONS_LLM'];
const LLM_HOSTS = new Set(['openrouter.ai', 'api.llm7.io', 'text.pollinations.ai', 'oai.endpoints.kepler.ai.cloud.ovh.net', 'api.groq.com', 'integrate.api.nvidia.com']);

// ── x.com payloads ──────────────────────────────────────────────────────────

function tweetResult(id, text, o = {}) {
  const user = o.user || 'alice';
  return {
    __typename: 'Tweet',
    rest_id: id,
    core: { user_results: { result: { __typename: 'User', rest_id: o.userId || `${user}-id`, legacy: { screen_name: user, name: user.toUpperCase() } } } },
    views: { count: String(o.views ?? 1000) },
    legacy: {
      id_str: id,
      full_text: text,
      created_at: o.createdAt || 'Wed Jan 17 14:00:00 +0000 2024',
      favorite_count: o.likes ?? 0,
      retweet_count: o.retweets ?? 0,
      reply_count: o.replies ?? 0,
      quote_count: o.quotes ?? 0,
      bookmark_count: o.bookmarks ?? 0,
      lang: 'en',
      entities: { hashtags: (o.hashtags || []).map((t) => ({ text: t })), urls: [], user_mentions: [] },
      ...(o.media ? { extended_entities: { media: o.media } } : {}),
    },
  };
}

const timeline = (tweets) => ({
  instructions: [
    {
      type: 'TimelineAddEntries',
      entries: tweets.map((t) => ({ entryId: `tweet-${t.rest_id}`, content: { itemContent: { tweet_results: { result: t } } } })),
    },
  ],
});

const userList = (users) => ({
  data: {
    user: {
      result: {
        timeline: {
          timeline: {
            instructions: [
              {
                type: 'TimelineAddEntries',
                entries: users.map(([id, screen_name, name]) => ({
                  entryId: `user-${id}`,
                  content: { itemContent: { user_results: { result: { __typename: 'User', rest_id: id, legacy: { screen_name, name, description: `Bio of ${name}`, followers_count: 10 } } } } },
                })),
              },
            ],
          },
        },
      },
    },
  },
});

function reply(body, status = 200, headers = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (key) => headers[String(key).toLowerCase()] ?? null, getSetCookie: () => [] },
    json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
    text: async () => text,
    arrayBuffer: async () => (body instanceof Uint8Array ? body.buffer : new TextEncoder().encode(text).buffer),
  };
}

/**
 * The fake network. `world` holds what X knows; tests change it and read
 * `calls` to see what was sent.
 */
function createNetwork() {
  const net = {
    calls: [],
    world: {
      names: { carol: 'Carol ML', dan: 'DAN', me: 'Me' },
      missing: new Set(['ghost', 'zed']),
      timelines: {},
      search: [],
      followers: [],
      following: [],
      tweets: {},
    },
    llm: { status: 200, reply: () => '[]', prompts: [] },
    grok: { status: 200, stream: '', firstStatus: null, attachments: [{ fileName: 'image.jpg', mimeType: 'image/jpeg', url: 'https://ton.x.com/i/ton/data/grok-attachment/1' }] },
    fail: {},
  };

  const graphql = (op, vars, init) => {
    const w = net.world;
    if (net.fail[op]) return reply({ errors: [{ message: 'denied' }] }, net.fail[op]);
    switch (op) {
      case 'UserByScreenName': {
        const name = vars.screen_name;
        if (w.missing.has(name)) return reply({ data: { user: {} } });
        return reply({ data: { user: { result: { __typename: 'User', rest_id: `${name}-id`, legacy: { screen_name: name, name: w.names[name] || name.toUpperCase(), description: `Bio of ${name}`, followers_count: 42 } } } } });
      }
      case 'UserByRestId':
        return reply({ data: { user: { result: { __typename: 'User', rest_id: vars.userId, legacy: { screen_name: 'me', name: 'Me', followers_count: 7 } } } } });
      case 'UserTweets': {
        const user = vars.userId.replace(/-id$/, '');
        return reply({ data: { user: { result: { __typename: 'User', timeline: { timeline: timeline(w.timelines[user] || []) } } } } });
      }
      case 'SearchTimeline':
        return reply({ data: { search_by_raw_query: { search_timeline: { timeline: timeline(w.search) } } } });
      case 'TweetResultByRestId': {
        const tweet = w.tweets[vars.tweetId];
        return reply({ data: { tweetResult: tweet ? { result: tweet } : {} } });
      }
      case 'Followers':
        return reply(userList(w.followers));
      case 'Following':
        return reply(userList(w.following));
      case 'NotificationsTimeline':
        return reply({ data: { viewer_v2: { user_results: { result: { notification_timeline: { timeline: { instructions: [] } } } } } } });
      case 'CreateTweet': {
        const text = JSON.parse(init.body).variables.tweet_text;
        return reply({ data: { create_tweet: { tweet_results: { result: { __typename: 'Tweet', rest_id: String(5000 + net.calls.length), legacy: { full_text: text } } } } } });
      }
      case 'FavoriteTweet':
        return reply({ data: { favorite_tweet: 'Done' } });
      case 'CreateRetweet':
        return reply({ data: { create_retweet: { retweet_results: {} } } });
      case 'CreateGrokConversation':
        return reply({ data: { create_grok_conversation: { conversation_id: 'grok-conv-1' } } });
      default:
        return reply({ errors: [{ message: `unrouted ${op}` }] }, 404);
    }
  };

  net.fetch = async (url, init = {}) => {
    const u = String(url);
    net.calls.push({ url: u, method: init.method || 'GET', body: init.body });
    const parsed = new URL(u);

    // Every free LLM lane (src/ask/lanes.js) answers from the same fake model.
    if (LLM_HOSTS.has(parsed.hostname)) {
      const body = JSON.parse(init.body);
      net.llm.prompts.push(body.messages);
      if (net.llm.status !== 200) return reply('{"error":"bad request"}', net.llm.status);
      return reply({ model: 'test/model', choices: [{ message: { content: net.llm.reply(body.messages) } }], usage: {} });
    }
    if (u.endsWith('/2/grok/add_response.json')) {
      if (parsed.hostname === 'grok.x.com' && net.grok.firstStatus) return reply('', net.grok.firstStatus);
      if (net.grok.status !== 200) return reply('', net.grok.status);
      return reply(net.grok.stream);
    }
    if (u === 'https://x.com/i/api/2/grok/attachment.json') return reply(net.grok.attachments);
    if (parsed.hostname === 'pbs.twimg.com') return reply(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), 200, { 'content-type': 'image/jpeg' });
    if (parsed.hostname === 'public.api.bsky.app') {
      const q = parsed.searchParams.get('q');
      const actors = q === 'alice_dev' ? [{ handle: 'alice_dev.bsky.social', displayName: 'Alice Dev', description: 'Bio of Alice Dev' }] : [];
      return reply({ actors });
    }
    if (parsed.pathname.endsWith('/friendships/create.json') || parsed.pathname.endsWith('/friendships/destroy.json')) {
      return reply({ id_str: new URLSearchParams(init.body).get('user_id') });
    }
    const gql = parsed.pathname.match(/\/graphql\/[^/]+\/([A-Za-z]+)$/);
    if (gql) {
      const vars = init.method === 'POST' ? JSON.parse(init.body).variables : JSON.parse(parsed.searchParams.get('variables') || '{}');
      return graphql(gql[1], vars, init);
    }
    return reply({ errors: [{ message: `unrouted ${u}` }] }, 404);
  };
  return net;
}

// ── job harness ─────────────────────────────────────────────────────────────

let net;
let seq = 0;

function job(type, config = {}, { owner = OWNER, id } = {}) {
  const progress = [];
  const charged = [];
  const data = { type, id: id || `ai-${type}-${++seq}`, sessionHash: owner, config: { sessionCookie: COOKIE, delayMs: 0, ...config } };
  const ctx = createJobContext(
    { id: data.id, name: type, data, progress: (p) => progress.push(p) },
    { fetch: net.fetch, caps: { checkAndRecord: (account, cls, { count }) => charged.push([account, cls, count]) } },
  );
  return { ctx, progress, charged, run: () => processors[type].run(ctx) };
}

const run = (type, config, options) => job(type, config, options).run();
const lastPrompt = () => net.llm.prompts.at(-1).map((m) => m.content).join('\n');

let home;
const savedEnv = {};

beforeAll(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-content-'));
  for (const key of ['XACTIONS_HOME', ...LLM_KEYS]) savedEnv[key] = process.env[key];
  process.env.XACTIONS_HOME = home;
});

afterAll(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.unstubAllGlobals();
  fs.rmSync(home, { recursive: true, force: true });
});

beforeEach(() => {
  net = createNetwork();
  vi.stubGlobal('fetch', net.fetch);
  for (const key of LLM_KEYS) delete process.env[key];
  process.env.OPENROUTER_API_KEY = 'test-key';
  // vitest.config.js turns LLM calls off; these tests answer them from `net`.
  process.env.XACTIONS_LLM = 'on';
});

// ── registry and shared pieces ──────────────────────────────────────────────

describe('content processors', () => {
  it('registers every content job type and no billing job', async () => {
    const all = await loadProcessors();
    const expected = [
      'generateTweet', 'rewriteTweet', 'optimizeTweet', 'generateVariations',
      'grokQuery', 'grokSummarize', 'grokAnalyzeImage',
      'viralResearch', 'viralGenerate', 'viralAnalyze', 'viralTrendingHooks', 'viralHeadlines',
      'personaCreate', 'personaEdit', 'personaDelete', 'personaRun',
      'workflowCreate', 'workflowRun', 'teamCreate',
      'exportAccount', 'migrateAccount', 'diffExports', 'importData',
    ];
    for (const type of expected) expect(all.get(type)?.source).toBe('content.processors.js');
    expect(all.has('billingCheckout')).toBe(false);
    expect(all.get('personaRun').write).toBe(true);
  });

  it('writes with free models, takes a caller\'s own key, and never spends the server\'s', () => {
    expect(llmTarget({}).provider).toBe('free');
    expect(() => llmTarget({ provider: 'ollama' })).toThrow(JobInputError);
    expect(() => llmTarget({ provider: 'custom', apiKey: 'k' })).toThrow(JobInputError);
    process.env.ANTHROPIC_API_KEY = 'server-key';
    expect(() => llmTarget({ provider: 'anthropic' })).toThrow(/needs your own apiKey/);
    expect(llmTarget({ provider: 'openai', apiKey: 'mine' }).apiKey).toBe('mine');
  });

  it('derives the same owner key a job carries for a session', () => {
    const hash = crypto.createHash('sha256').update(COOKIE).digest('hex').slice(0, 32);
    expect(ownerKeyForSession(` ${COOKIE} `)).toBe(`session:${hash}`);
    expect(ownerKeyForSession('')).toBeNull();
  });
});

// ── writing ─────────────────────────────────────────────────────────────────

describe('post writing', () => {
  it('generateTweet learns the voice from real posts and writes drafts', async () => {
    net.world.timelines.alice = [
      tweetResult('1', 'Shipping beats planning. Every time.', { likes: 50 }),
      tweetResult('2', 'What is the one tool you cannot work without?', { likes: 80, replies: 30 }),
    ];
    net.llm.reply = () => '```json\n[{"text":"Ship the eval first.","angle":"contrarian"},{"text":"Benchmarks lie, users do not.","angle":"punchy"}]\n```';
    const result = await run('generateTweet', { username: 'alice', topic: 'AI evals', count: 2 });
    expect(result.tweets).toHaveLength(2);
    expect(result.tweets[0]).toMatchObject({ text: 'Ship the eval first.', angle: 'contrarian', withinLimit: true });
    expect(result.voice.tweetsAnalyzed).toBe(2);
    expect(net.llm.prompts[0][0].content).toMatch(/ghostwriter for @alice/);
    expect(lastPrompt()).toMatch(/AI evals/);
  });

  it('generateTweet rejects missing input and surfaces an X auth failure', async () => {
    await expect(run('generateTweet', { username: 'alice' })).rejects.toThrow('topic is required');
    net.fail.UserByScreenName = 401;
    const err = await run('generateTweet', { username: 'alice', topic: 'x' }).catch((e) => e);
    expect(err.name).toBe('AuthError');
    expect(isPermanentFailure(err)).toBe(true);
  });

  it('writes on a keyless free lane when the server has no key at all', async () => {
    delete process.env.OPENROUTER_API_KEY;
    net.llm.reply = () => '[{"text":"Hi.","change":"cut"}]';
    const result = await run('rewriteTweet', { text: 'hello world' });
    expect(result.rewrites.map((r) => r.text)).toEqual(['Hi.']);
    expect(net.calls.some((c) => c.url.startsWith('https://api.llm7.io/'))).toBe(true);
    expect(net.calls.some((c) => c.url.startsWith('https://openrouter.ai/'))).toBe(false);
  });

  it('rewriteTweet returns rewrites toward the goal, and reports a model error', async () => {
    net.llm.reply = () => '[{"text":"Shorter.","change":"cut"},{"text":"Even shorter","change":"cut more"}]';
    const result = await run('rewriteTweet', { text: 'This is a long post about things', goal: 'shorter' });
    expect(result.goal).toBe('shorter');
    expect(result.rewrites.map((r) => r.text)).toEqual(['Shorter.', 'Even shorter']);
    expect(lastPrompt()).toMatch(/shorter and punchier/);

    net.llm.status = 400;
    await expect(run('rewriteTweet', { text: 'x' })).rejects.toThrow(/every LLM lane failed: openrouter:free: HTTP 400/);
  });

  it('optimizeTweet scores before and after and honours the length constraint', async () => {
    net.llm.reply = () => '{"optimized":"You can ship evals today. Which one first?","changes":["question"],"rationale":"invites replies"}';
    const result = await run('optimizeTweet', { text: 'I shipped evals', goals: ['replies', 'bogus'], constraints: { maxLength: 60 } });
    expect(result.goals).toEqual(['replies']);
    expect(result.length).toMatchObject({ max: 60, withinLimit: true });
    expect(result.heuristicScore.after).toBeGreaterThan(result.heuristicScore.before);
    expect(lastPrompt()).toMatch(/Hard limit: 60 characters/);
  });

  it('generateVariations assigns one style per variation', async () => {
    net.llm.reply = () => '[{"text":"a casual one"},{"text":"a professional one"},{"text":"a casual again"}]';
    const result = await run('generateVariations', { text: 'base post', count: 3, styles: ['casual', 'professional'] });
    expect(result.variations.map((v) => v.style)).toEqual(['casual', 'professional', 'casual']);
  });
});

// ── Grok ────────────────────────────────────────────────────────────────────

const GROK_STREAM = [
  '{"conversationId":"grok-conv-1"}',
  '{"result":{"sender":"ASSISTANT","message":"Hello "}}',
  '{"result":{"sender":"ASSISTANT","isThinking":true,"message":"(thinking)"}}',
  '{"result":{"sender":"ASSISTANT","message":"world","webResults":[{"title":"T","url":"https://example.org/a","preview":"p"}]}}',
  '{"result":{"xPostIds":["11","12"]}}',
].join('\n');

describe('Grok', () => {
  it('parses the streamed answer', () => {
    const parsed = parseGrokStream(GROK_STREAM);
    expect(parsed.answer).toBe('Hello world');
    expect(parsed.webResults).toEqual([{ title: 'T', url: 'https://example.org/a', snippet: 'p' }]);
    expect(parsed.postIds).toEqual(['11', '12']);
  });

  it('grokQuery opens a conversation and asks in the chosen mode', async () => {
    net.grok.stream = GROK_STREAM;
    const result = await run('grokQuery', { query: 'what is new', mode: 'regular' });
    expect(result).toMatchObject({ answer: 'Hello world', conversationId: 'grok-conv-1', mode: 'regular' });
    const sent = JSON.parse(net.calls.find((c) => c.url.includes('add_response')).body);
    expect(sent).toMatchObject({ conversationId: 'grok-conv-1', systemPromptName: '', responses: [{ message: 'what is new', sender: 1 }] });
  });

  it('falls back to the second Grok host on 404, and fails on a refused session or a spent limit', async () => {
    net.grok.stream = GROK_STREAM;
    net.grok.firstStatus = 404;
    await expect(run('grokSummarize', { topic: 'rust' })).resolves.toMatchObject({ summary: 'Hello world' });
    expect(net.calls.some((c) => c.url.startsWith('https://api.x.com/2/grok/add_response.json'))).toBe(true);

    net.grok.firstStatus = null;
    net.grok.status = 403;
    const refused = await run('grokQuery', { query: 'q' }).catch((e) => e);
    expect(refused.name).toBe('AuthError');

    net.grok.status = 200;
    net.grok.stream = '{"result":{"responseType":"limiter","message":"Upgrade for more"}}';
    const limited = await run('grokQuery', { query: 'q' }).catch((e) => e);
    expect(limited.message).toMatch(/Upgrade for more/);
    expect(isPermanentFailure(limited)).toBe(true);
  });

  it('grokAnalyzeImage uploads a post\'s photo and attaches it', async () => {
    net.grok.stream = GROK_STREAM;
    net.world.tweets['77'] = tweetResult('77', 'look at this chart', {
      user: 'bob',
      media: [{ type: 'photo', media_url_https: 'https://pbs.twimg.com/media/chart.jpg', original_info: { width: 10, height: 10 } }],
    });
    const result = await run('grokAnalyzeImage', { tweetUrl: 'https://x.com/bob/status/77', question: 'What does the chart show?' });
    expect(result.image).toMatchObject({ source: 'https://pbs.twimg.com/media/chart.jpg', mimeType: 'image/jpeg', bytes: 4 });
    expect(result.post).toMatchObject({ id: '77', author: 'bob' });
    const sent = JSON.parse(net.calls.find((c) => c.url.includes('add_response')).body);
    expect(sent.responses[0].fileAttachments).toEqual(net.grok.attachments);
    expect(sent.responses[0].message).toMatch(/What does the chart show\?[\s\S]*@bob/);
  });

  it('grokAnalyzeImage refuses private or plain-http image URLs and posts without images', async () => {
    await expect(run('grokAnalyzeImage', { imageUrl: 'http://example.org/a.png' })).rejects.toThrow('https');
    await expect(run('grokAnalyzeImage', { imageUrl: 'https://127.0.0.1/a.png' })).rejects.toThrow('public host');
    await expect(run('grokAnalyzeImage', { imageUrl: 'https://[::1]/a.png' })).rejects.toThrow('public host');
    net.world.tweets['78'] = tweetResult('78', 'text only');
    await expect(run('grokAnalyzeImage', { tweetUrl: '78' })).rejects.toThrow('no image');
  });
});

// ── viral ───────────────────────────────────────────────────────────────────

const VIRAL = () => [
  tweetResult('101', 'Unpopular opinion: most AI demos are staged.\nHere is why.', { user: 'ann', likes: 900, replies: 300, retweets: 100, hashtags: ['AI'] }),
  tweetResult('102', '7 lessons from shipping an AI agent to 10k users', { user: 'ben', likes: 500, retweets: 200, media: [{ type: 'photo', media_url_https: 'https://pbs.twimg.com/media/x.jpg' }] }),
  tweetResult('103', 'What is the hardest part of evals for you?', { user: 'cat', likes: 120, replies: 90 }),
  tweetResult('104', 'RT @ann: staged demos', { user: 'dan', likes: 1, retweets: 0 }),
];

describe('viral research', () => {
  it('viralResearch profiles hooks, formats and top posts from real search results', async () => {
    net.world.search = VIRAL();
    net.world.search[3].legacy.retweeted_status_result = { result: tweetResult('101', 'x') };
    const result = await run('viralResearch', { niche: 'ai agents', minLikes: 100 });
    expect(result.sampled).toBe(3);
    expect(result.topPosts[0].id).toBe('101');
    expect(result.hooks.map((h) => h.pattern).sort()).toEqual(['contrarian', 'number', 'question']);
    expect(result.formats.find((f) => f.format === 'media').count).toBe(1);
    expect(result.hashtags).toEqual([{ tag: '#ai', count: 1 }]);
    const search = net.calls.find((c) => c.url.includes('SearchTimeline'));
    const query = search.method === 'POST' ? JSON.parse(search.body).variables : JSON.parse(new URL(search.url).searchParams.get('variables'));
    expect(query).toMatchObject({ rawQuery: 'ai agents min_faves:100', product: 'Top' });
  });

  it('viralResearch treats an empty sample as an error, and requires a niche', async () => {
    await expect(run('viralResearch', { niche: 'nothing here' })).rejects.toBeInstanceOf(JobInputError);
    await expect(run('viralResearch', {})).rejects.toThrow('niche');
  });

  it('viralAnalyze measures a post against its author\'s baseline', async () => {
    net.world.tweets['500'] = tweetResult('500', 'How I cut our cloud bill by 80%:\n- one\n- two', { user: 'eve', likes: 2000, retweets: 600, replies: 150, bookmarks: 900 });
    net.world.timelines.eve = [
      tweetResult('500', 'same post', { user: 'eve', likes: 2000 }),
      ...[1, 2, 3, 4].map((n) => tweetResult(`50${n}`, `ordinary post ${n}`, { user: 'eve', likes: 20, retweets: 2, replies: 2 })),
    ];
    const result = await run('viralAnalyze', { tweetUrl: 'https://x.com/eve/status/500' });
    expect(result.baseline.sample).toBe(4);
    expect(result.verdict).toBe('viral');
    expect(result.multiple).toBeGreaterThan(10);
    expect(result.features).toMatchObject({ hookPattern: 'how-to', hasList: true, hasNumbers: true });
    expect(result.factors.join(' ')).toMatch(/median engagement/);
  });

  it('viralTrendingHooks ranks openings for a niche', async () => {
    net.world.search = VIRAL().slice(0, 3);
    const result = await run('viralTrendingHooks', { niche: 'ai', limit: 5 });
    expect(result.source).toBe('niche');
    expect(result.hooks[0]).toMatchObject({ pattern: 'contrarian', hook: 'Unpopular opinion: most AI demos are staged.' });
    expect(result.patterns.length).toBe(3);
  });

  it('viralGenerate and viralHeadlines write from what is working', async () => {
    net.world.search = VIRAL().slice(0, 3);
    net.llm.reply = () => '[{"text":"1/3 hook","purpose":"hook"},{"text":"2/3 point","purpose":"point"},{"text":"3/3 follow for more","purpose":"cta"}]';
    const thread = await run('viralGenerate', { topic: 'ai agents', length: 3 });
    expect(thread.thread.map((t) => t.position)).toEqual([1, 2, 3]);
    expect(thread.hook).toBe('1/3 hook');
    expect(thread.research.sampled).toBe(3);
    expect(lastPrompt()).toMatch(/Unpopular opinion/);

    net.llm.reply = () => '[{"text":"Nobody talks about eval debt","pattern":"contrarian"}]';
    const headlines = await run('viralHeadlines', { topic: 'evals', count: 1 });
    expect(headlines.headlines).toEqual([{ text: 'Nobody talks about eval debt', length: 28, withinLimit: true, pattern: 'contrarian' }]);
  });
});

// ── personas ────────────────────────────────────────────────────────────────

// Wider than any session plan can consume (planSession caps likes plus comments
// well under 60), so every planned like finds a post whatever the random plan.
const PERSONA_FEED = (n = 60) =>
  Array.from({ length: n }, (_, i) =>
    tweetResult(String(301 + i), `Interesting thread about AI agent evaluation number ${i}`, { user: `u${i}`, userId: `${301 + i}9` }),
  );

function personaReplies(messages) {
  const prompt = messages.at(-1).content;
  if (prompt.includes('Write a natural reply')) return 'The eval numbers matter more than the headline here.';
  return 'Small evals shipped weekly beat one big benchmark.';
}

describe('personas', () => {
  it('create, edit, dry-run, run and delete a persona, scoped to its owner', async () => {
    net.world.search = PERSONA_FEED();
    net.llm.reply = personaReplies;

    const created = await run('personaCreate', { name: 'Eval Nerd', niche: 'AI', strategy: 'thought-leader', model: 'gpt-4o-mini', targetAudience: 'ML engineers' }, { id: 'ai-persona-1' });
    expect(created).toMatchObject({ personaId: 'ai-persona-1', strategy: 'thoughtleader', preset: 'ai-researcher' });
    expect(created.systemPrompt).toMatch(/YOUR AUDIENCE: ML engineers/);

    const edited = await run('personaEdit', { personaId: 'ai-persona-1', updates: { tone: 'dry and precise', avoidTopics: ['giveaway'] } });
    expect(edited.updated).toEqual(['tone', 'avoidTopics']);
    await expect(run('personaEdit', { personaId: 'ai-persona-1', updates: { mood: 'x' } })).rejects.toThrow(/Unknown persona fields: mood/);

    const before = net.calls.length;
    const dry = await job('personaRun', { personaId: 'ai-persona-1', dryRun: true });
    const dryResult = await dry.run();
    const dryActions = dryResult.sessions[0].actions;
    expect(dry.charged).toEqual([]);
    expect(dryActions.some((a) => a.type === 'like' && a.status === 'planned')).toBe(true);
    expect(dryActions.filter((a) => a.type === 'comment' && a.status === 'planned').every((a) => a.text.includes('eval numbers'))).toBe(true);
    expect(net.calls.slice(before).some((c) => /FavoriteTweet|CreateTweet|friendships\/create/.test(c.url))).toBe(false);

    const live = job('personaRun', { personaId: 'ai-persona-1', sessions: 1 });
    const liveResult = await live.run();
    const done = liveResult.sessions[0].actions.filter((a) => a.status === 'done');
    const doneOf = (type) => done.filter((a) => a.type === type).length;
    const chargedOf = (cls) => live.charged.filter(([, c]) => c === cls).length;
    expect(doneOf('like')).toBeGreaterThan(0);
    expect(chargedOf('like')).toBe(doneOf('like'));
    expect(chargedOf('follow')).toBe(doneOf('follow'));
    expect(chargedOf('reply')).toBe(doneOf('comment'));
    expect(live.charged.every(([account]) => account === `session:${OWNER}`)).toBe(true);
    expect(net.calls.filter((c) => c.url.includes('FavoriteTweet')).length).toBe(doneOf('like'));

    const stored = await ownerStore.get(`session:${OWNER}`, 'personas', 'ai-persona-1');
    expect(stored.state.totalSessions).toBe(1);
    expect(stored.state.totalLikes).toBe(doneOf('like'));

    await expect(run('personaRun', { personaId: 'ai-persona-1', dryRun: true }, { owner: 'someone-else' })).rejects.toThrow(/No persona/);
    await expect(run('personaDelete', { personaId: 'ai-persona-1' })).resolves.toEqual({ personaId: 'ai-persona-1', deleted: true });
    await expect(run('personaDelete', { personaId: 'ai-persona-1' })).rejects.toBeInstanceOf(JobInputError);
  });

  it('rejects an unknown strategy', async () => {
    await expect(run('personaCreate', { name: 'n', niche: 'x', strategy: 'chaos' })).rejects.toThrow(/strategy must be one of/);
  });

  it('the list and status routes read the personas this session saved', async () => {
    const hash = crypto.createHash('sha256').update(COOKIE).digest('hex').slice(0, 32);
    await run('personaCreate', { name: 'Listed', niche: 'crypto' }, { owner: hash, id: 'ai-persona-listed' });
    const { default: router } = await import('../../../api/routes/ai/personas.js');
    const app = express().use(express.json()).use('/p', router);

    const mine = await request(app).post('/p/list').send({ sessionCookie: COOKIE });
    expect(mine.body.data.personas.map((p) => p.personaId)).toContain('ai-persona-listed');
    const status = await request(app).post('/p/status').send({ sessionCookie: COOKIE, personaId: 'ai-persona-listed' });
    expect(status.body.data).toMatchObject({ name: 'Listed', niche: 'crypto', totals: { totalSessions: 0 } });
    const theirs = await request(app).post('/p/list').send({ sessionCookie: 'auth_token=other' });
    expect(theirs.body.data.personas).toEqual([]);
  });
});

// ── workflows ───────────────────────────────────────────────────────────────

const STEPS = [
  { type: 'search', params: { query: 'ai agents', limit: 5 }, output: 'found' },
  { type: 'condition', params: { field: 'found.length', operator: '>', value: 0 } },
  { type: 'like', params: { tweetId: '{{found.0.id}}' } },
  { type: 'post_tweet', params: { text: 'Read {{found.length}} posts today' } },
];

describe('workflows', () => {
  it('saves a workflow and runs it by id, charging each write', async () => {
    net.world.search = PERSONA_FEED(4);
    const created = await run('workflowCreate', { name: 'Morning', steps: STEPS }, { id: 'ai-wf-1' });
    expect(created).toMatchObject({ workflowId: 'ai-wf-1', stepCount: 4 });

    const live = job('workflowRun', { workflowId: 'ai-wf-1', context: {} });
    const result = await live.run();
    expect(result.status).toBe('completed');
    expect(result.steps.map((s) => s.status)).toEqual(['done', 'passed', 'done', 'done']);
    expect(result.steps[2].result).toEqual({ tweetId: '301' });
    const post = net.calls.find((c) => c.url.includes('CreateTweet'));
    expect(JSON.parse(post.body).variables.tweet_text).toBe('Read 4 posts today');
    expect(live.charged.map(([, cls]) => cls)).toEqual(['like', 'post']);
  });

  it('plans writes on a dry run and stops when a condition fails', async () => {
    const dry = job('workflowRun', { workflow: { steps: STEPS }, dryRun: true });
    const result = await dry.run();
    expect(result.status).toBe('stopped');
    expect(result.steps.map((s) => s.status)).toEqual(['done', 'stopped']);
    expect(dry.charged).toEqual([]);

    net.world.search = PERSONA_FEED(4);
    const planned = await run('workflowRun', { workflow: { steps: STEPS }, dryRun: true });
    expect(planned.steps.map((s) => s.status)).toEqual(['done', 'passed', 'planned', 'planned']);
    expect(net.calls.some((c) => /FavoriteTweet|CreateTweet/.test(c.url))).toBe(false);
  });

  it('validates steps and refuses schedules', async () => {
    expect(() => normalizeStep({ type: 'teleport' }, 0)).toThrow(/unknown type "teleport"/);
    expect(() => normalizeStep({ type: 'reply', params: { text: 'hi' } }, 1)).toThrow('Step 2 (reply) needs tweetId');
    expect(normalizeStep({ action: 'scrapeProfile', target: 'nich' }, 0)).toMatchObject({ type: 'scrape_profile', params: { username: 'nich' } });
    await expect(run('workflowCreate', { name: 'x', steps: STEPS, schedule: '0 9 * * *' })).rejects.toThrow(/not supported/);
    await expect(run('workflowRun', { workflowId: 'ai-missing' })).rejects.toThrow(/No workflow/);
  });

  it('records a failed step and stops, unless the step says to continue', async () => {
    net.fail.FavoriteTweet = 500;
    const steps = [{ type: 'like', params: { tweetId: '9' }, onError: 'continue' }, { type: 'like', params: { tweetId: '10' } }, { type: 'delay', params: { seconds: 0 } }];
    const result = await run('workflowRun', { workflow: { steps } });
    expect(result.status).toBe('failed');
    expect(result.steps.map((s) => s.status)).toEqual(['failed', 'failed']);
  });
});

// ── teams ───────────────────────────────────────────────────────────────────

describe('teams', () => {
  it('verifies members on X and keeps the team for its owner', async () => {
    const team = await run('teamCreate', { name: 'Growth', members: ['carol', { username: '@ghost', role: 'admin' }] }, { id: 'ai-team-1' });
    expect(team.members).toEqual([expect.objectContaining({ username: 'carol', userId: 'carol-id', name: 'Carol ML', role: 'editor' })]);
    expect(team.notFound.map((m) => m.username)).toEqual(['ghost']);
    expect(await ownerStore.get(`session:${OWNER}`, 'teams', 'ai-team-1')).toMatchObject({ name: 'Growth' });
    await expect(run('teamCreate', { name: 'x', members: [{ username: 'carol', role: 'boss' }] })).rejects.toThrow(/role must be one of/);
  });
});

// ── portability ─────────────────────────────────────────────────────────────

describe('portability', () => {
  it('exports twice and diffs the two exports by id', async () => {
    net.world.timelines.me = [tweetResult('900', 'my first post', { user: 'me', likes: 3 })];
    net.world.followers = [['1', 'alice_dev', 'Alice Dev'], ['2', 'bob', 'Bob']];
    const first = await run('exportAccount', { sections: ['profile', 'tweets', 'followers', 'dms'], formats: ['json', 'csv', 'txt'], limit: 100 }, { id: 'ai-export-1' });
    expect(first).toMatchObject({ exportId: 'ai-export-1', username: 'me', sections: { profile: { count: 1 }, tweets: { count: 1 }, followers: { count: 2 } } });
    expect(first.errors.map((e) => e.section)).toEqual(['dms']);
    expect(first.data.csv.followers.split('\n')[0]).toMatch(/^id,username,name/);
    expect(first.data.txt.tweets).toMatch(/my first post/);

    net.world.followers = [['2', 'bob', 'Bob'], ['3', 'carol', 'Carol']];
    net.world.timelines.me = [tweetResult('900', 'my first post', { user: 'me', likes: 9 })];
    await run('exportAccount', { sections: ['profile', 'tweets', 'followers'] }, { id: 'ai-export-2' });

    const diff = await run('diffExports', { dirA: 'ai-export-1', dirB: 'ai-export-2' });
    expect(diff.summary).toMatchObject({ followersGained: 1, followersLost: 1, engagementChanges: 1 });
    expect(diff.followers.gained.map((u) => u.username)).toEqual(['carol']);
    expect(diff.report).toMatch(/Export Diff Report/);
    expect(JSON.stringify(diff)).not.toContain(home);
  });

  it('refuses server paths, unknown exports and other owners\' exports', async () => {
    await expect(run('diffExports', { dirA: '/etc', dirB: '../x' })).rejects.toThrow(/exportId/);
    await expect(run('diffExports', { dirA: 'ai-nope', dirB: 'ai-nope2' })).rejects.toThrow(/No export ai-nope/);
    net.world.timelines.me = [];
    await run('exportAccount', { sections: ['profile'] }, { id: 'ai-export-own' });
    await expect(run('diffExports', { dirA: 'ai-export-own', dirB: 'ai-export-own' }, { owner: 'intruder' })).rejects.toThrow(/No export/);
  });

  it('refuses private sections of another account', async () => {
    const result = await run('exportAccount', { username: 'carol', sections: ['profile', 'bookmarks'] });
    expect(result.sections.profile.count).toBe(1);
    expect(result.errors).toEqual([{ section: 'bookmarks', error: "bookmarks can only be exported for the session's own account" }]);
  });

  it('plans a migration from a stored export, matching follows on Bluesky', async () => {
    net.world.timelines.me = [tweetResult('901', 'a'.repeat(320), { user: 'me' }), tweetResult('902', 'short post', { user: 'me' })];
    net.world.following = [['1', 'alice_dev', 'Alice Dev'], ['9', 'nobody_here', 'Nobody']];
    await run('exportAccount', { sections: ['tweets', 'following'] }, { id: 'ai-export-mig' });

    await expect(run('migrateAccount', { username: 'me', platform: 'bluesky', dryRun: false })).rejects.toThrow(/credentials/);
    const plan = await run('migrateAccount', { username: 'me', platform: 'bluesky', dryRun: true, exportDir: 'ai-export-mig' });
    expect(plan.source).toEqual({ exportId: 'ai-export-mig' });
    expect(plan.posts).toMatchObject({ total: 2, truncated: 1 });
    expect([...plan.posts.items[0].text].length).toBe(300);
    expect(plan.follows.items).toEqual([
      expect.objectContaining({ twitterUser: 'alice_dev', match: 'alice_dev.bsky.social', method: 'exact-username' }),
      expect.objectContaining({ twitterUser: 'nobody_here', match: null }),
    ]);

    const nostr = await run('migrateAccount', { username: 'me', platform: 'nostr', dryRun: true, exportDir: 'ai-export-mig' });
    expect(nostr.follows.matched).toBe(0);
    expect(nostr.follows.items[0].reason).toMatch(/Nostr/);
  });

  it('reads exports from other platforms', () => {
    const mastodon = normalizeImport({ statuses: [{ content: '<p>Hello &amp; welcome</p>' }, { content: '<p>Hello &amp; welcome</p>' }], following: [{ acct: 'carol@mastodon.social', display_name: 'Carol ML' }] }, 'mastodon');
    expect(mastodon.posts).toEqual(['Hello & welcome']);
    expect(mastodon.follows[0]).toMatchObject({ candidate: 'carol', name: 'Carol ML' });
    expect(normalizeImport([{ record: { text: 'sky post' } }], 'bluesky').posts).toEqual(['sky post']);
    expect(normalizeImport({ notes: [{ kind: 1, content: 'note' }, { kind: 7, content: '+' }] }, 'nostr').posts).toEqual(['note']);
  });

  it('imports posts and confident follow matches, dry and live', async () => {
    const data = {
      statuses: [{ content: '<p>Hello from Mastodon</p>' }],
      following: [
        { acct: 'carol@mastodon.social', display_name: 'Carol ML' },
        { acct: 'dan@mastodon.social', display_name: 'Daniel Smith' },
        { acct: 'zed@x.y', display_name: 'Zed' },
      ],
    };
    const dry = await run('importData', { from: 'mastodon', data, dryRun: true });
    expect(dry.posts).toMatchObject({ planned: 1, done: 0 });
    expect(dry.follows).toMatchObject({ planned: 1, unconfirmed: 1, unmatched: 1 });

    const live = job('importData', { from: 'mastodon', data, dryRun: false });
    const result = await live.run();
    expect(result.posts.done).toBe(1);
    expect(result.follows.done).toBe(1);
    expect(live.charged.map(([, cls]) => cls)).toEqual(['post', 'follow']);
    expect(net.calls.filter((c) => c.url.includes('friendships/create')).length).toBe(1);

    await expect(run('importData', { from: 'threads', data })).rejects.toThrow(/from must be one of/);
    await expect(run('importData', { from: 'bluesky', data: { unrelated: [] } })).rejects.toThrow(/No posts or follows/);
  });
});

// ── routes ──────────────────────────────────────────────────────────────────

describe('content routes', () => {
  it('billing checkout needs an account and answers synchronously', async () => {
    const { default: router } = await import('../../../api/routes/ai/billing.js');
    const app = express().use(express.json()).use('/b', router);

    const anonymous = await request(app).post('/b/checkout').send({ plan: 'pro' });
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.error).toBe('ACCOUNT_REQUIRED');

    const plans = await request(app).post('/b/plans').send({});
    expect(plans.body.data.plans.find((p) => p.id === 'pro')).toMatchObject({ name: 'Pro', checkout: true });
    expect(plans.body.data.plans.find((p) => p.id === 'free').checkout).toBe(false);
  });

  it('migrate refuses a live run before queueing, and workflows refuse schedules', async () => {
    const portability = (await import('../../../api/routes/ai/portability.js')).default;
    const workflows = (await import('../../../api/routes/ai/workflows.js')).default;
    const app = express().use(express.json()).use('/port', portability).use('/wf', workflows);

    const live = await request(app).post('/port/migrate').send({ sessionCookie: COOKIE, username: 'me', platform: 'bluesky', dryRun: false });
    expect(live.status).toBe(400);
    expect(live.body.error).toBe('LIVE_MIGRATION_UNAVAILABLE');
    const scheduled = await request(app).post('/wf/create').send({ sessionCookie: COOKIE, name: 'x', steps: STEPS, schedule: '0 9 * * *' });
    expect(scheduled.status).toBe(400);
  });
});
