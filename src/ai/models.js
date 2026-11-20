// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Default OpenRouter model ids, in one place.
 *
 * OpenRouter retires model ids, and a retired id fails every request. Before
 * this module existed, seven model ids used across the code had been retired
 * (gemini-flash-1.5, gemini-flash-2.0, llama-3-8b-instruct:free,
 * claude-3.5-haiku, grok-2-vision-1212, ...), and each feature fell back to
 * its offline path or failed without saying why. `npm run check:models`
 * checks every id here, and every other literal under api/ and src/, against
 * OpenRouter's live list.
 *
 * Paste-in browser scripts (src/automation/*.js) cannot import this module and
 * carry their own literal, which check:models also covers.
 *
 * @author nich (@nichxbt)
 */

/**
 * OpenRouter's router over its free models. Individual `:free` ids are
 * retired without notice; this alias always points at one that is live.
 */
export const OPENROUTER_FREE_MODEL = 'openrouter/free';

/** Cheap, fast, multimodal (text and images) default for paid calls. */
export const OPENROUTER_DEFAULT_MODEL = 'google/gemini-2.5-flash';

/**
 * Defaults for the agent's three tiers (src/agents).
 * @type {Readonly<{ fast: string, mid: string, smart: string }>}
 */
export const AGENT_MODELS = Object.freeze({
  fast: 'deepseek/deepseek-chat',
  mid: 'anthropic/claude-haiku-5.5',
  smart: 'anthropic/claude-sonnet-5.5',
});

// by nichxbt
