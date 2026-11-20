// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * One way for XActions code to ask an LLM: free models only.
 *
 * Every feature that writes, summarizes, scores or describes with an LLM calls
 * `freeChat()`. It runs the request through the free lane chain in
 * src/ask/lanes.js: free tiers keyed from the environment (Groq, Cerebras,
 * NVIDIA NIM, OpenRouter's free models, Gemini AI Studio, Mistral, Cloudflare
 * Workers AI), then three keyless lanes, so it answers even with no key at
 * all. Nothing here can reach a paid model.
 *
 * Environment (all optional):
 *   GROQ_API_KEY, NVIDIA_API_KEY, OPENROUTER_API_KEY, OPENROUTER_API_KEYS,
 *   CEREBRAS_API_KEY, GEMINI_API_KEY, MISTRAL_API_KEY,
 *   CLOUDFLARE_AI_API_TOKEN + CLOUDFLARE_ACCOUNT_ID
 *   XACTIONS_LLM=off   turn LLM calls off; callers fall back to their
 *                      offline path (the test suite sets this)
 *
 * @module ai/freeLLM
 * @author nich (@nichxbt)
 */

import { buildLaneChain, buildVisionChain, streamCompletion } from '../ask/lanes.js';

/** Thrown when LLM calls are switched off or no lane can take the request. */
export class LLMUnavailableError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'LLMUnavailableError';
  }
}

/**
 * False when XACTIONS_LLM is `off` (or `0`/`false`).
 * @param {Record<string, string|undefined>} [env]
 */
export function llmEnabled(env = process.env) {
  return !/^(off|0|false|no)$/i.test(String(env.XACTIONS_LLM ?? '').trim());
}

/**
 * Complete a chat through the free lanes.
 *
 * @param {Array<{ role: string, content: string | Array<object> }>} messages
 * @param {{
 *   maxTokens?: number,
 *   temperature?: number,
 *   timeoutMs?: number,
 *   vision?: boolean,
 *   signal?: AbortSignal,
 *   env?: Record<string, string|undefined>,
 * }} [opts]  `vision: true` uses only lanes that accept image parts.
 * @returns {Promise<{ text: string, lane: string, model: string }>}
 */
export async function freeChat(messages, opts = {}) {
  const env = opts.env ?? process.env;
  if (!llmEnabled(env)) throw new LLMUnavailableError('LLM calls are turned off (XACTIONS_LLM=off)');
  const chain = opts.vision ? buildVisionChain(env) : buildLaneChain(env);
  if (!chain.length) {
    throw new LLMUnavailableError('No free vision lane is configured. Set OPENROUTER_API_KEY or NVIDIA_API_KEY (both have free tiers).');
  }
  try {
    const { text, lane, model } = await streamCompletion(chain, messages, {
      maxTokens: opts.maxTokens ?? 1024,
      temperature: opts.temperature ?? 0.7,
      timeoutMs: opts.timeoutMs ?? 45_000,
      signal: opts.signal,
    });
    return { text: text.trim(), lane, model: String(model) };
  } catch (error) {
    if (opts.signal?.aborted) throw error;
    throw new LLMUnavailableError(error.message, { cause: error });
  }
}

/**
 * Shorthand for one system + user exchange.
 * @param {string} system
 * @param {string} user
 * @param {Parameters<typeof freeChat>[1]} [opts]
 */
export async function freeAsk(system, user, opts) {
  const messages = system ? [{ role: 'system', content: system }, { role: 'user', content: user }] : [{ role: 'user', content: user }];
  return (await freeChat(messages, opts)).text;
}

/** Label for logs and saved configs that used to name a model. */
export const FREE_LLM_LABEL = 'free models (XActions lane chain)';

// by nichxbt
