// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Offline guard for model ids. `npm run check:models` checks every id against
 * OpenRouter's live list; this catches the most common way one goes stale
 * without the network: a hardcoded `:free` id, which OpenRouter retires
 * without notice. Use OPENROUTER_FREE_MODEL ('openrouter/free') instead.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OPENROUTER_FREE_MODEL, OPENROUTER_DEFAULT_MODEL, AGENT_MODELS } from '../../src/ai/models.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith('.js')) yield full;
  }
}

describe('model ids', () => {
  it('exports vendor/model ids', () => {
    for (const id of [OPENROUTER_FREE_MODEL, OPENROUTER_DEFAULT_MODEL, ...Object.values(AGENT_MODELS)]) {
      expect(id).toMatch(/^[a-z0-9-]+\/[\w.-]+$/);
    }
  });

  it('hardcodes no individual :free model id under api/ or src/', () => {
    const hits = [];
    for (const dir of ['api', 'src']) {
      for (const file of walk(path.join(ROOT, dir))) {
        readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
          if (/['"`][a-z0-9-]+\/[\w.-]+:free['"`]/.test(line)) hits.push(`${path.relative(ROOT, file)}:${i + 1}`);
        });
      }
    }
    expect(hits, `use OPENROUTER_FREE_MODEL from src/ai/models.js instead:\n${hits.join('\n')}`).toEqual([]);
  });
});
