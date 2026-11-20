// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions AI - Prompt-driven comment generator
 *
 * Turns a tweet plus a one-line brief from the user ("be supportive and ask a
 * follow-up question", "reply as a skeptical VC", "hype the launch") into a
 * reply that reads like a person wrote it. Shared by the `xactions engage`
 * CLI command, the `/api/ai/writer/comment` endpoint, and (through the
 * extension bridge) the browser sweep script.
 *
 * The default provider, `free`, is XActions' free lane chain
 * (src/ai/freeLLM.js): free tiers and keyless models, no key needed. A user
 * can bring their own key for any OpenAI-compatible endpoint instead:
 * OpenRouter, OpenAI, xAI (Grok), Ollama, or a custom base URL, and Anthropic
 * natively through the Messages API. The provider is a config value, not a
 * code path the caller has to know about.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import { freeChat } from './freeLLM.js';

/** Chat-completions URLs for the OpenAI-compatible providers. */
export const PROVIDER_URLS = {
  free: 'xactions:free-lanes',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
  xai: 'https://api.x.ai/v1/chat/completions',
  ollama: 'http://localhost:11434/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
};

/** Sensible default model per provider. Override with `model`. */
export const DEFAULT_MODELS = {
  free: 'free',
  // Free even on the user's own key; name a paid model to use one.
  openrouter: 'openrouter/free',
  openai: 'gpt-4o-mini',
  xai: 'grok-3-mini',
  ollama: 'llama3.1',
  anthropic: 'claude-haiku-5-5',
  custom: '',
};

/** Env vars checked, in order, when no apiKey is passed for a provider. */
export const PROVIDER_ENV_KEYS = {
  free: [],
  openrouter: ['OPENROUTER_API_KEY'],
  openai: ['OPENAI_API_KEY'],
  xai: ['XAI_API_KEY', 'GROK_API_KEY'],
  anthropic: ['ANTHROPIC_API_KEY'],
  ollama: [],
  custom: ['LLM_API_KEY'],
};

/**
 * Openers that make a reply read as automated. A generated comment that
 * starts with one of these is rejected and regenerated once.
 */
export const GENERIC_OPENERS = [
  'great post',
  'great point',
  'great thread',
  'great take',
  'love this',
  'this is so true',
  'so true',
  'well said',
  'couldn\'t agree more',
  'could not agree more',
  'thanks for sharing',
  'thank you for sharing',
  'interesting take',
  'interesting perspective',
  'as an ai',
  'as a language model',
  'i cannot',
  'i can\'t help',
];

const MAX_TWEET_LENGTH = 280;

/**
 * Build the system prompt that shapes every comment.
 *
 * @param {object} opts
 * @param {string} opts.prompt - The user's brief for how comments should sound
 * @param {string} [opts.persona] - Optional persona line ("You are @nichxbt, a founder in web3")
 * @param {boolean} [opts.allowHashtags=false]
 * @param {boolean} [opts.allowEmoji=true]
 * @param {number} [opts.maxLength=280]
 * @returns {string}
 */
export function buildSystemPrompt({ prompt, persona, allowHashtags = false, allowEmoji = true, maxLength = MAX_TWEET_LENGTH }) {
  const lines = [
    persona ? persona.trim() : 'You are a real person replying to posts on X (Twitter).',
    '',
    'Your brief from the account owner, which you follow exactly:',
    `"""${(prompt || 'Reply naturally and specifically to the post.').trim()}"""`,
    '',
    'Hard rules:',
    `- Under ${Math.min(maxLength, MAX_TWEET_LENGTH)} characters. One to two short sentences unless the brief asks for more.`,
    '- Respond to what THIS post actually says. Quote or reference a concrete detail from it.',
    '- Never open with "Great post", "Love this", "So true", "Thanks for sharing", or any generic praise.',
    '- No hashtags' + (allowHashtags ? ' unless the brief asks for them.' : '.'),
    allowEmoji ? '- Emoji only where a person would naturally use one. Never more than one.' : '- No emoji.',
    '- No links, no mentions of being an AI, no disclaimers, no quotation marks around the reply.',
    '- Do not repeat the post back. Add something: a reaction, a question, a related fact, a joke.',
    '- Match the register of the post: serious gets thoughtful, funny gets witty, technical gets precise.',
    '',
    'Output ONLY the reply text. No preamble, no labels, no markdown.',
  ];
  return lines.join('\n');
}

/**
 * Build the per-tweet user message.
 *
 * @param {object} tweet
 * @param {string} tweet.text
 * @param {string} [tweet.author] - Handle without the @
 * @param {string} [tweet.authorName]
 * @param {string[]} [recent] - Recent replies already posted in this run, so the model varies its phrasing
 * @returns {string}
 */
export function buildUserPrompt(tweet, recent = []) {
  const who = tweet.author
    ? `@${tweet.author}${tweet.authorName ? ` (${tweet.authorName})` : ''}`
    : 'someone';
  const parts = [`Post by ${who}:`, `"""${(tweet.text || '').trim()}"""`];
  if (tweet.quotedText) {
    parts.push('', 'It quotes this post:', `"""${tweet.quotedText.trim()}"""`);
  }
  if (tweet.hasMedia) {
    parts.push('', '(The post has an image or video attached that you cannot see. Do not pretend to describe it.)');
  }
  if (recent.length > 0) {
    parts.push('', 'Replies you already posted in this session. Do not reuse their openers or structure:');
    for (const r of recent.slice(-5)) parts.push(`- ${r}`);
  }
  parts.push('', 'Write the reply now.');
  return parts.join('\n');
}

/**
 * Clean a raw model completion into something postable.
 *
 * Strips code fences, surrounding quotes, "Reply:" labels, leading hashtags
 * when not allowed, and collapses whitespace. Returns an empty string when
 * nothing usable remains.
 *
 * @param {string} raw
 * @param {{ allowHashtags?: boolean, maxLength?: number }} [opts]
 * @returns {string}
 */
export function sanitizeComment(raw, opts = {}) {
  const { allowHashtags = false, maxLength = MAX_TWEET_LENGTH } = opts;
  if (!raw || typeof raw !== 'string') return '';

  let text = raw.trim();

  // Code fences and inline backticks.
  text = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim();

  // A whole reply wrapped in quotes, then a "Reply:" label, then quotes again:
  // models produce every combination of the two.
  const unquote = (s) => {
    const m = s.match(/^["“'‘](.*)["”'’]$/s);
    return m ? m[1].trim() : s;
  };
  text = unquote(text);
  text = text.replace(/^(reply|comment|response|answer)\s*[:\-]\s*/i, '').trim();
  text = unquote(text);

  // Only the first candidate if the model listed several.
  if (/^\s*(1[.)]|-|\*)\s/.test(text) && /\n\s*(2[.)]|-|\*)\s/.test(text)) {
    text = text.split(/\n/)[0].replace(/^\s*(1[.)]|-|\*)\s*/, '').trim();
  }

  if (!allowHashtags) {
    text = text.replace(/(^|\s)#[\w]+/g, '$1').replace(/\s{2,}/g, ' ').trim();
  }

  // Collapse whitespace but keep intentional line breaks.
  text = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

  const limit = Math.min(maxLength, MAX_TWEET_LENGTH);
  if ([...text].length > limit) {
    // Cut at the last sentence boundary that fits, else the last word.
    const clipped = [...text].slice(0, limit).join('');
    const sentenceEnd = Math.max(clipped.lastIndexOf('. '), clipped.lastIndexOf('! '), clipped.lastIndexOf('? '));
    if (sentenceEnd > limit * 0.5) {
      text = clipped.slice(0, sentenceEnd + 1).trim();
    } else {
      const wordEnd = clipped.lastIndexOf(' ');
      text = (wordEnd > 0 ? clipped.slice(0, wordEnd) : clipped).trim();
    }
  }

  return text;
}

/**
 * True when a comment reads as boilerplate and should be regenerated.
 *
 * @param {string} text
 * @returns {boolean}
 */
export function isGenericComment(text) {
  if (!text) return true;
  const lower = text.toLowerCase().replace(/^[^a-z]+/, '');
  if (lower.length < 2) return true;
  return GENERIC_OPENERS.some((opener) => lower.startsWith(opener));
}

/**
 * Resolve the provider config into a request target.
 *
 * @param {object} config
 * @param {string} [config.provider='free'] - free, openrouter, openai, xai, ollama, anthropic or custom (checked at runtime)
 * @param {string} [config.apiKey]
 * @param {string} [config.baseUrl] - Full chat-completions URL; required for `custom`
 * @param {string} [config.model]
 * @param {Record<string,string|undefined>} [env=process.env]
 * @returns {{ provider: string, url: string, apiKey: string, model: string }}
 */
export function resolveProvider(config = {}, env = process.env) {
  const provider = (config.provider || 'free').toLowerCase();
  if (!(provider in DEFAULT_MODELS)) {
    throw new Error(`Unknown LLM provider "${provider}". Use one of: ${Object.keys(DEFAULT_MODELS).join(', ')}`);
  }

  const url = config.baseUrl || PROVIDER_URLS[provider];
  if (!url) {
    throw new Error('provider "custom" needs baseUrl (a full OpenAI-compatible chat-completions URL)');
  }

  let apiKey = config.apiKey || '';
  if (!apiKey) {
    for (const name of PROVIDER_ENV_KEYS[provider] || []) {
      if (env[name]) { apiKey = env[name]; break; }
    }
  }
  if (!apiKey && !['free', 'ollama', 'custom'].includes(provider)) {
    const names = PROVIDER_ENV_KEYS[provider].join(' or ');
    throw new Error(`${provider} needs an API key. Pass apiKey or set ${names}.`);
  }

  const model = config.model || DEFAULT_MODELS[provider];
  if (!model) throw new Error('provider "custom" needs a model name');

  return { provider, url, apiKey, model };
}

/** Providers a server lets a caller choose. */
export const CALLER_PROVIDERS = ['free', 'openrouter', 'openai', 'xai', 'anthropic'];

/**
 * Resolve a provider requested by a remote caller (an API request or a queued
 * job), for code running on a server.
 *
 * Free models unless the caller brings their own key. Never the server's own
 * env keys for a provider the caller names (that would let anyone spend the
 * operator's key on a paid model), and never `custom`, `ollama` or a
 * caller-supplied `baseUrl` (that would let anyone point the server, and
 * LLM_API_KEY, at any URL, including its own network).
 *
 * @param {{ provider?: string, apiKey?: string, model?: string }} [config]
 * @returns {{ provider: string, url: string, apiKey: string, model: string }}
 */
export function resolveCallerProvider(config = {}) {
  const provider = String(config.provider || (config.apiKey ? 'openrouter' : 'free')).toLowerCase();
  if (!CALLER_PROVIDERS.includes(provider)) {
    throw new Error(`provider must be one of: ${CALLER_PROVIDERS.join(', ')}`);
  }
  if (provider === 'free') return resolveProvider({ provider: 'free' });
  if (!config.apiKey) {
    throw new Error(`provider "${provider}" needs your own apiKey. Leave provider out to use free models.`);
  }
  return resolveProvider({ provider, apiKey: config.apiKey, model: config.model }, {});
}

/**
 * Turn an OpenAI-style message list into an Anthropic Messages request body.
 * @param {Array<{role:string,content:string}>} messages
 * @param {{ model: string, temperature: number, maxTokens: number }} opts
 */
function toAnthropicBody(messages, { model, temperature, maxTokens }) {
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const rest = messages.filter((m) => m.role !== 'system');
  return {
    model,
    max_tokens: maxTokens,
    temperature,
    ...(system ? { system } : {}),
    messages: rest.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
  };
}

/**
 * One raw chat completion against the resolved provider, with retry on
 * 429/5xx. Returns the assistant text.
 *
 * @param {{ provider: string, url: string, apiKey: string, model: string }} target
 * @param {Array<{role:string,content:string}>} messages
 * @param {{ temperature?: number, maxTokens?: number, fetchImpl?: typeof fetch, retries?: number }} [opts]
 * @returns {Promise<{ text: string, model: string, usage: object }>}
 */
export async function chatCompletion(target, messages, opts = {}) {
  const { temperature = 0.9, maxTokens = 160, retries = 2 } = opts;
  if (target.provider === 'free') {
    // freeChat already fails over across lanes, so there is no retry here.
    const { text, lane, model } = await freeChat(messages, { temperature, maxTokens });
    return { text, model: `${lane}:${model}`, usage: {} };
  }
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('No fetch implementation available');

  const headers = { 'Content-Type': 'application/json' };
  let body;
  if (target.provider === 'anthropic') {
    headers['x-api-key'] = target.apiKey;
    headers['anthropic-version'] = '2023-06-01';
    body = toAnthropicBody(messages, { model: target.model, temperature, maxTokens });
  } else {
    if (target.apiKey) headers.Authorization = `Bearer ${target.apiKey}`;
    if (target.provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://xactions.app';
      headers['X-Title'] = 'XActions Engage';
    }
    body = { model: target.model, messages, temperature, max_tokens: maxTokens };
  }

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchImpl(target.url, { method: 'POST', headers, body: JSON.stringify(body) });
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`${target.provider} returned HTTP ${res.status}`);
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 800 * 2 ** attempt));
          continue;
        }
        throw lastError;
      }
      if (!res.ok) {
        // A 4xx (bad key, unknown model, bad request) fails the same way on
        // every attempt, so it is thrown past the retry below.
        const detail = await res.text().catch(() => '');
        const err = new Error(`${target.provider} error ${res.status}: ${detail.slice(0, 300)}`);
        err.retryable = false;
        err.status = res.status;
        throw err;
      }
      const data = await res.json();
      const text = target.provider === 'anthropic'
        ? (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('').trim()
        : (data.choices?.[0]?.message?.content || '').trim();
      return { text, model: data.model || target.model, usage: data.usage || {} };
    } catch (err) {
      lastError = err;
      if (err.retryable === false || attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 800 * 2 ** attempt));
    }
  }
  throw lastError;
}

/**
 * Create a comment generator bound to one provider and one brief.
 *
 * @param {object} config
 * @param {string} config.prompt - How the comments should sound
 * @param {string} [config.persona]
 * @param {string} [config.provider]
 * @param {string} [config.apiKey]
 * @param {string} [config.baseUrl]
 * @param {string} [config.model]
 * @param {number} [config.temperature=0.9]
 * @param {number} [config.maxLength=280]
 * @param {boolean} [config.allowHashtags=false]
 * @param {boolean} [config.allowEmoji=true]
 * @param {typeof fetch} [config.fetchImpl]
 * @param {boolean} [config.callerSupplied] - settings came from a remote caller; apply resolveCallerProvider's server rules
 * @returns {{
 *   generate: (tweet: {text:string, author?:string, authorName?:string, quotedText?:string, hasMedia?:boolean}) => Promise<{ text: string, model: string, attempts: number }>,
 *   history: string[],
 *   target: { provider: string, url: string, model: string },
 * }}
 */
export function createCommentGenerator(config) {
  if (!config || !config.prompt) throw new Error('createCommentGenerator needs a prompt describing how comments should sound');
  // callerSupplied: the provider settings came from a remote caller, so apply
  // the server rules in resolveCallerProvider.
  const target = config.callerSupplied ? resolveCallerProvider(config) : resolveProvider(config);
  const systemPrompt = buildSystemPrompt(config);
  const history = [];
  const sanitizeOpts = { allowHashtags: config.allowHashtags, maxLength: config.maxLength };

  async function generate(tweet) {
    if (!tweet || !tweet.text) throw new Error('generate() needs a tweet with text');
    let last = '';
    for (let attempt = 1; attempt <= 2; attempt++) {
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildUserPrompt(tweet, history) },
      ];
      if (attempt === 2 && last) {
        messages.push({ role: 'assistant', content: last });
        messages.push({ role: 'user', content: 'That reads as generic. Rewrite it so it references a specific detail from the post and opens differently. Output only the reply.' });
      }
      const { text: raw, model } = await chatCompletion(target, messages, {
        temperature: config.temperature ?? 0.9,
        maxTokens: 160,
        fetchImpl: config.fetchImpl,
      });
      const text = sanitizeComment(raw, sanitizeOpts);
      last = text;
      if (text && !isGenericComment(text) && !history.includes(text)) {
        history.push(text);
        if (history.length > 50) history.shift();
        return { text, model, attempts: attempt };
      }
    }
    if (last) {
      // Two attempts still generic: post it rather than skip, the user asked for a comment.
      history.push(last);
      return { text: last, model: target.model, attempts: 2 };
    }
    throw new Error(`${target.provider} returned an empty completion for this post`);
  }

  return { generate, history, target: { provider: target.provider, url: target.url, model: target.model } };
}
