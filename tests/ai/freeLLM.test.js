// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions uses free LLMs only. These tests hold that in place without the
 * network:
 *
 *   - LLM traffic goes through the free lane chain. Only the files allowed
 *     below may name an LLM endpoint: the chain itself, the bring-your-own-key
 *     comment generator, the agent's local Ollama option, and two paste-in
 *     browser scripts that run on the user's own key.
 *   - The chain built from the server's env has only free lanes: OpenRouter
 *     lanes ask for free models only, and no paid provider gets a lane.
 *   - freeChat() fails over, honours XACTIONS_LLM=off, and refuses a vision
 *     request when no vision lane is configured.
 *
 * `npm run check:models` covers the live side (OpenRouter ids still served,
 * and free).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLaneChain, buildVisionChain, openRouterKeys, freeOpenRouterModel, isFreeOpenRouterModel } from '../../src/ask/lanes.js';
import { freeChat, llmEnabled, LLMUnavailableError } from '../../src/ai/freeLLM.js';
import { resolveCallerProvider, resolveProvider } from '../../src/ai/commentGenerator.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(c|m)?js$/.test(entry.name)) yield full;
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LLM traffic goes through the free lanes', () => {
  // Each entry says why the file may talk to an LLM endpoint directly.
  const ALLOWED = {
    'src/ask/lanes.js': 'the free lane chain itself',
    'src/ai/commentGenerator.js': 'bring-your-own-key providers (default is the free chain)',
    'src/agents/llmBrain.js': 'local Ollama (default is the free chain)',
    'src/automation/algorithmBuilder.js': 'paste-in browser script, runs on the user\'s own key with openrouter/free',
    'src/automation/controlPanel.js': 'paste-in browser script, runs on the user\'s own key with openrouter/free',
  };
  const ENDPOINT = /chat\/completions|api\.anthropic\.com|\/v1\/messages\b|localhost:11434/;

  it('no other file under api/, src/ or functions/ names an LLM endpoint', () => {
    const offenders = [];
    for (const dir of ['api', 'src', 'functions']) {
      for (const file of walk(path.join(ROOT, dir))) {
        const rel = path.relative(ROOT, file);
        if (ALLOWED[rel]) continue;
        readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
          if (ENDPOINT.test(line)) offenders.push(`${rel}:${i + 1}`);
        });
      }
    }
    expect(offenders, `call freeChat() from src/ai/freeLLM.js instead:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('hardcodes no individual :free model id (they are retired without notice)', () => {
    const hits = [];
    for (const dir of ['api', 'src']) {
      for (const file of walk(path.join(ROOT, dir))) {
        readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
          if (/['"`][a-z0-9-]+\/[\w.-]+:free['"`]/.test(line)) hits.push(`${path.relative(ROOT, file)}:${i + 1}`);
        });
      }
    }
    expect(hits, `use 'openrouter/free' instead:\n${hits.join('\n')}`).toEqual([]);
  });
});

describe('the server lane chain is free-only', () => {
  const ALL_KEYS = {
    GROQ_API_KEY: 'g', CEREBRAS_API_KEY: 'c', NVIDIA_API_KEY: 'n', OPENROUTER_API_KEY: 'o1',
    OPENROUTER_API_KEYS: 'o2, o3\no1', GEMINI_API_KEY: 'gm', MISTRAL_API_KEY: 'm',
    CLOUDFLARE_AI_API_TOKEN: 't', CLOUDFLARE_ACCOUNT_ID: 'a',
    // Paid providers: present in the env, and must not get a lane.
    XAI_API_KEY: 'x', OPENAI_API_KEY: 'oa', ANTHROPIC_API_KEY: 'an',
  };

  it('adds a lane per free tier and none for paid providers', () => {
    const names = buildLaneChain(ALL_KEYS).map((l) => l.name);
    expect(names).toEqual([
      'groq', 'cerebras', 'nvidia', 'openrouter:free', 'openrouter:free#2', 'openrouter:free#3',
      'gemini', 'mistral', 'cloudflare', 'llm7', 'pollinations', 'ovh',
    ]);
    expect(names.join(' ')).not.toMatch(/xai|openai|anthropic/);
  });

  it('asks OpenRouter only for free models, even when the env names a paid one', () => {
    for (const env of [ALL_KEYS, { ...ALL_KEYS, OPENROUTER_FREE_MODEL: 'openai/gpt-5' }, { ...ALL_KEYS, OPENROUTER_FREE_MODEL: 'openrouter/auto' }]) {
      for (const lane of buildLaneChain(env).filter((l) => l.name.startsWith('openrouter'))) {
        expect(isFreeOpenRouterModel(lane.model), `${lane.name} -> ${lane.model}`).toBe(true);
      }
    }
    expect(freeOpenRouterModel({ OPENROUTER_FREE_MODEL: 'qwen/qwen3-coder:free' })).toBe('qwen/qwen3-coder:free');
    expect(freeOpenRouterModel({ OPENROUTER_FREE_MODEL: 'openai/gpt-5' })).toBe('openrouter/free');
  });

  it('deduplicates OpenRouter keys across OPENROUTER_API_KEY and OPENROUTER_API_KEYS', () => {
    expect(openRouterKeys({ OPENROUTER_API_KEY: 'a', OPENROUTER_API_KEYS: 'b,a  c' })).toEqual(['a', 'b', 'c']);
    expect(openRouterKeys({})).toEqual([]);
  });

  it('builds a vision chain from free vision lanes only, empty without keys', () => {
    expect(buildVisionChain({}).length).toBe(0);
    const vision = buildVisionChain(ALL_KEYS);
    expect(vision.map((l) => l.name)).toEqual(['openrouter:free', 'openrouter:free#2', 'openrouter:free#3', 'nvidia']);
    for (const lane of vision.filter((l) => l.name.startsWith('openrouter'))) expect(lane.model).toBe('openrouter/free');
  });
});

describe('freeChat', () => {
  const ok = (text) => new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200, headers: { 'content-type': 'application/json' } });

  it('is off when XACTIONS_LLM=off', async () => {
    expect(llmEnabled({ XACTIONS_LLM: 'off' })).toBe(false);
    expect(llmEnabled({})).toBe(true);
    await expect(freeChat([{ role: 'user', content: 'hi' }], { env: { XACTIONS_LLM: 'off' } })).rejects.toBeInstanceOf(LLMUnavailableError);
  });

  it('answers from the first lane that works, failing over past one that does not', async () => {
    const calls = [];
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      calls.push(String(url));
      if (String(url).includes('groq')) return new Response('quota', { status: 429 });
      return ok('  pong  ');
    }));
    const result = await freeChat([{ role: 'user', content: 'ping' }], { env: { GROQ_API_KEY: 'g', NVIDIA_API_KEY: 'n' } });
    expect(result).toMatchObject({ text: 'pong', lane: 'nvidia' });
    expect(calls[0]).toContain('groq');
  });

  it('turns reasoning off on lanes whose models would spend max_tokens thinking', async () => {
    const bodies = {};
    vi.stubGlobal('fetch', vi.fn(async (url, init) => {
      bodies[new URL(String(url)).hostname] = JSON.parse(init.body);
      return new Response('busy', { status: 503 });
    }));
    await freeChat([{ role: 'user', content: 'ping' }], { env: { GROQ_API_KEY: 'g', NVIDIA_API_KEY: 'n', OPENROUTER_API_KEY: 'o' } }).catch(() => {});
    expect(bodies['api.groq.com'].reasoning_effort).toBe('low');
    expect(bodies['integrate.api.nvidia.com'].chat_template_kwargs).toEqual({ enable_thinking: false });
    expect(bodies['openrouter.ai'].reasoning).toEqual({ enabled: false });
    // A Groq model other than gpt-oss may reject reasoning_effort, so it is not sent.
    expect(buildLaneChain({ GROQ_API_KEY: 'g', GROQ_MODEL: 'qwen/qwen3.8-27b' })[0].body).toBeUndefined();
  });

  it('reports every lane when all fail', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })));
    const error = await freeChat([{ role: 'user', content: 'ping' }], { env: {} }).catch((e) => e);
    expect(error).toBeInstanceOf(LLMUnavailableError);
    for (const lane of ['llm7', 'pollinations', 'ovh']) expect(error.message).toContain(`${lane}:`);
  });

  it('refuses a vision request with no vision lane, naming the keys that add one', async () => {
    const error = await freeChat([{ role: 'user', content: 'x' }], { vision: true, env: {} }).catch((e) => e);
    expect(error).toBeInstanceOf(LLMUnavailableError);
    expect(error.message).toMatch(/OPENROUTER_API_KEY or NVIDIA_API_KEY/);
  });
});

describe('providers a remote caller can choose', () => {
  it('defaults to free models', () => {
    expect(resolveCallerProvider({}).provider).toBe('free');
    expect(resolveProvider({}).provider).toBe('free');
  });

  it('never spends the server\'s own key on a provider the caller names', () => {
    const before = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'server-key';
    try {
      expect(() => resolveCallerProvider({ provider: 'openai' })).toThrow(/needs your own apiKey/);
      expect(resolveCallerProvider({ provider: 'openai', apiKey: 'caller-key' }).apiKey).toBe('caller-key');
    } finally {
      if (before === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = before;
    }
  });

  it('refuses custom and ollama, which would point the server at any URL or its own network', () => {
    expect(() => resolveCallerProvider({ provider: 'custom', apiKey: 'k', baseUrl: 'http://169.254.169.254/' })).toThrow(/provider must be one of/);
    expect(() => resolveCallerProvider({ provider: 'ollama' })).toThrow(/provider must be one of/);
  });
});
