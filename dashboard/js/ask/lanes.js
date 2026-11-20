// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Free LLM lanes for Ask XActions.
 *
 * Every lane is an OpenAI-compatible chat-completions endpoint reached with
 * plain `fetch`, so this file runs unchanged in Node, in the Cloudflare Worker,
 * and in the browser. Lanes are tried in order until one streams an answer;
 * a 402/429/5xx or a network error moves the chain to the next lane.
 *
 * Three lanes need no key at all (LLM7, Pollinations, OVH anonymous tier), so a
 * deployment with an empty env still answers. Lanes marked `browser: false`
 * refuse requests that carry an `Origin` header (LLM7 answers 401 for any
 * browser call), so the in-browser fallback filters them out rather than
 * spending a round trip on a guaranteed rejection.
 *
 * Every lane the server pays for is a free tier, and only free tiers belong
 * here: Groq, Cerebras, NVIDIA NIM, OpenRouter's free models (one lane per key
 * in OPENROUTER_API_KEY / OPENROUTER_API_KEYS, each with its own daily quota),
 * Gemini AI Studio, Mistral and Cloudflare Workers AI, each added only when its
 * env var is present. The one exception is BYOK: a user's own key, spent at
 * that user's choice.
 *
 * Models are named by alias where a provider has one (`openrouter/free`,
 * LLM7's `default`), because individual free model ids are retired without
 * notice. `npm run check:models` checks the OpenRouter ones.
 *
 * @module ask/lanes
 * by nichxbt
 */

/** Providers a user can lead the chain with using their own key (BYOK). */
export const BYOK_PROVIDERS = {
  groq: { label: 'Groq', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'openai/gpt-oss-120b' }, // Groq's free tier, not OpenRouter: check:models ignore
  // openrouter/free, not openrouter/auto: auto routes to paid models.
  openrouter: { label: 'OpenRouter', url: 'https://openrouter.ai/api/v1/chat/completions', model: 'openrouter/free' },
  xai: { label: 'xAI Grok', url: 'https://api.x.ai/v1/chat/completions', model: 'grok-4.1-fast' },
  openai: { label: 'OpenAI', url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4.1-mini' },
  gemini: { label: 'Google Gemini', url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-2.5-flash' },
  mistral: { label: 'Mistral', url: 'https://api.mistral.ai/v1/chat/completions', model: 'mistral-small-latest' },
  cerebras: { label: 'Cerebras', url: 'https://api.cerebras.ai/v1/chat/completions', model: 'llama-3.3-70b' },
};

const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const OPENROUTER_HEADERS = { 'HTTP-Referer': 'https://xactions.app', 'X-Title': 'XActions' };

// Several free models reason before they answer, and the reasoning counts
// against max_tokens: NVIDIA's Nemotron spent 488 of 500 tokens thinking and
// stopped mid-sentence. These per-lane request options turn reasoning off or
// down (each checked against the provider on 2026-11-20). `lane.body` is
// merged into the request.
const NO_REASONING = {
  openrouter: { reasoning: { enabled: false } },
  nvidia: { chat_template_kwargs: { enable_thinking: false } },
};
/** Groq's gpt-oss models take reasoning_effort low; other Groq models may reject it. */
const groqBody = (model) => (/^openai\/gpt-oss/.test(model) ? { reasoning_effort: 'low' } : undefined);

/**
 * Every OpenRouter key in the env, deduplicated: OPENROUTER_API_KEY first,
 * then OPENROUTER_API_KEYS (comma- or whitespace-separated).
 * @param {Record<string, string|undefined>} env
 */
export function openRouterKeys(env = {}) {
  const keys = [env.OPENROUTER_API_KEY, ...String(env.OPENROUTER_API_KEYS || '').split(/[\s,]+/)]
    .map((k) => (k || '').trim())
    .filter(Boolean);
  return [...new Set(keys)];
}

/**
 * The OpenRouter model to ask for: OPENROUTER_FREE_MODEL if it names a free
 * model, else `openrouter/free`, OpenRouter's router over whichever free
 * models are live (it also picks a vision model when the message has an image).
 * A paid id in OPENROUTER_FREE_MODEL is ignored, so a typo cannot start a bill.
 * @param {Record<string, string|undefined>} env
 */
export function freeOpenRouterModel(env = {}) {
  const wanted = env.OPENROUTER_FREE_MODEL;
  return wanted && isFreeOpenRouterModel(wanted) ? wanted : 'openrouter/free';
}

/** True for `openrouter/free` and any `:free` model id. */
export function isFreeOpenRouterModel(id) {
  return id === 'openrouter/free' || /:free$/.test(String(id));
}

/**
 * Lanes that accept an image in the message (`image_url` content parts), for
 * describing media. Only free tiers: OpenRouter's free router (one lane per
 * key) and NVIDIA's vision model. No keyless lane takes images.
 *
 * @param {Record<string, string|undefined>} env
 * @returns {ReturnType<typeof buildLaneChain>}
 */
export function buildVisionChain(env = {}) {
  /** @type {Array<{ name: string, url: string, model: string, key: string, headers?: Record<string, string>, body?: object }>} */
  const chain = openRouterKeys(env).map((key, i) => ({
    name: i === 0 ? 'openrouter:free' : `openrouter:free#${i + 1}`,
    url: BYOK_PROVIDERS.openrouter.url,
    model: 'openrouter/free',
    key,
    headers: OPENROUTER_HEADERS,
    body: NO_REASONING.openrouter,
  }));
  if (env.NVIDIA_API_KEY) {
    chain.push({ name: 'nvidia', url: NVIDIA_URL, model: env.NVIDIA_VISION_MODEL || 'nvidia/nemotron-3.5-super-vl-120b-a12b', key: env.NVIDIA_API_KEY, body: NO_REASONING.nvidia });
  }
  return chain;
}

/**
 * Build the ordered lane chain for one request.
 *
 * @param {Record<string, string|undefined>} env  process.env, the Worker env, or {} in the browser
 * @param {{ byok?: { provider: string, apiKey: string, model?: string }, browserSafe?: boolean }} [opts]
 * @returns {Array<{ name: string, url: string, model: string|(() => Promise<string>), key?: string, headers?: Record<string,string>, body?: object, keyless?: boolean, noStream?: boolean, browser?: boolean }>}
 */
export function buildLaneChain(env = {}, opts = {}) {
  const chain = [];
  const byok = opts.byok;
  if (byok && byok.apiKey && BYOK_PROVIDERS[byok.provider]) {
    const p = BYOK_PROVIDERS[byok.provider];
    chain.push({ name: `byok:${byok.provider}`, url: p.url, model: byok.model || p.model, key: byok.apiKey, byok: true });
  }
  if (env.GROQ_API_KEY) {
    const model = env.GROQ_MODEL || 'openai/gpt-oss-120b'; // Groq's free tier, not OpenRouter: check:models ignore
    chain.push({ name: 'groq', url: BYOK_PROVIDERS.groq.url, model, key: env.GROQ_API_KEY, body: groqBody(model) });
  }
  if (env.CEREBRAS_API_KEY) {
    chain.push({ name: 'cerebras', url: BYOK_PROVIDERS.cerebras.url, model: 'llama-3.3-70b', key: env.CEREBRAS_API_KEY });
  }
  if (env.NVIDIA_API_KEY) {
    chain.push({ name: 'nvidia', url: NVIDIA_URL, model: env.NVIDIA_MODEL || 'nvidia/nemotron-3.5-lightning-30b-a3b', key: env.NVIDIA_API_KEY, body: NO_REASONING.nvidia });
  }
  openRouterKeys(env).forEach((key, i) => {
    chain.push({
      name: i === 0 ? 'openrouter:free' : `openrouter:free#${i + 1}`,
      url: BYOK_PROVIDERS.openrouter.url,
      model: freeOpenRouterModel(env),
      key,
      headers: OPENROUTER_HEADERS,
      body: NO_REASONING.openrouter,
    });
  });
  if (env.GEMINI_API_KEY) {
    chain.push({ name: 'gemini', url: BYOK_PROVIDERS.gemini.url, model: 'gemini-2.5-flash-lite', key: env.GEMINI_API_KEY });
  }
  if (env.MISTRAL_API_KEY) {
    chain.push({ name: 'mistral', url: BYOK_PROVIDERS.mistral.url, model: 'mistral-small-latest', key: env.MISTRAL_API_KEY });
  }
  if (env.CLOUDFLARE_AI_API_TOKEN && env.CLOUDFLARE_ACCOUNT_ID) {
    chain.push({
      name: 'cloudflare',
      url: `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions`,
      model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      key: env.CLOUDFLARE_AI_API_TOKEN,
    });
  }
  // Keyless lanes: always present, so the chain never runs dry. LLM7 streams;
  // Pollinations' legacy anonymous endpoint answers only non-streamed requests
  // (stream:true returns a 402), so it is called with one JSON body; OVH is
  // last because its anonymous tier allows only 2 requests per minute per IP.
  // `default` is LLM7's own alias for a live model; named ids get retired.
  chain.push({ name: 'llm7', url: 'https://api.llm7.io/v1/chat/completions', model: 'default', keyless: true, browser: false });
  chain.push({ name: 'pollinations', url: 'https://text.pollinations.ai/openai', model: 'openai-fast', keyless: true, noStream: true });
  chain.push({ name: 'ovh', url: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions', model: 'Meta-Llama-3_3-70B-Instruct', keyless: true });
  // A BYOK lane always stays: the user's own key authenticates the call, and
  // every BYOK provider here sends permissive CORS headers.
  if (opts.browserSafe) return chain.filter((lane) => lane.browser !== false);
  return chain;
}

/** Read one SSE-framed chat-completions stream and yield content deltas. */
async function* readStream(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return;
      let json;
      try { json = JSON.parse(payload); } catch { continue; }
      const delta = json.choices?.[0]?.delta?.content ?? json.choices?.[0]?.message?.content ?? '';
      if (delta) yield delta;
    }
  }
}

/**
 * Stream a completion through the chain. Calls `onLane(name)` when a lane is
 * selected and `onDelta(text)` for every token. Resolves with the lane that
 * answered and the full text; rejects only when every lane failed.
 *
 * @param {ReturnType<typeof buildLaneChain>} chain
 * @param {Array<{ role: string, content: string | Array<object> }>} messages  content may be OpenAI-style parts (text, image_url)
 * @param {{ onLane?: (name: string) => void, onDelta?: (text: string) => void, timeoutMs?: number, maxTokens?: number, temperature?: number, signal?: AbortSignal }} [opts]
 */
export async function streamCompletion(chain, messages, opts = {}) {
  const errors = [];
  const timeoutMs = opts.timeoutMs ?? 40000;
  for (const lane of chain) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onOuterAbort = () => controller.abort();
    opts.signal?.addEventListener('abort', onOuterAbort, { once: true });
    let produced = '';
    try {
      const model = typeof lane.model === 'function' ? await lane.model() : lane.model;
      const headers = { 'content-type': 'application/json', accept: 'text/event-stream, application/json', ...(lane.headers || {}) };
      if (lane.key) headers.authorization = `Bearer ${lane.key}`;
      const res = await fetch(lane.url, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({ model, messages, stream: !lane.noStream, temperature: opts.temperature ?? 0.2, max_tokens: opts.maxTokens ?? 1200, ...(lane.body || {}) }),
      });
      if (!res.ok) {
        const detail = (await res.text().catch(() => '')).slice(0, 200);
        throw new Error(`HTTP ${res.status} ${detail}`);
      }
      const type = res.headers.get('content-type') || '';
      opts.onLane?.(lane.name);
      if (type.includes('text/event-stream')) {
        for await (const delta of readStream(res.body)) {
          produced += delta;
          opts.onDelta?.(delta);
        }
      } else {
        // A lane that ignored stream:true still answers with one JSON body.
        const json = await res.json();
        const text = json.choices?.[0]?.message?.content || '';
        if (!text) throw new Error('empty completion');
        produced = text;
        opts.onDelta?.(text);
      }
      if (!produced.trim()) throw new Error('empty completion');
      return { lane: lane.name, model, text: produced };
    } catch (err) {
      errors.push(`${lane.name}: ${err.message}`);
      if (opts.signal?.aborted) throw new Error('aborted', { cause: err });
      // A lane that already streamed part of an answer and then died would
      // leave the client with a truncated reply; surface that as the lane's
      // answer rather than restarting on another lane mid-sentence.
      if (produced.trim().length > 200) return { lane: lane.name, model: String(lane.model), text: produced, partial: true };
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener('abort', onOuterAbort);
    }
  }
  throw new Error(`every LLM lane failed: ${errors.join(' | ')}`);
}
