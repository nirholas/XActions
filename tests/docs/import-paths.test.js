// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests: every `import ... from 'xactions...'` a reader can copy out of the docs,
 * tutorials, skills, README, examples, the plugin and types READMEs, or the n8n
 * integration resolves through package.json `exports` and provides the names it
 * imports.
 *
 * Thirty examples once failed for anyone who tried them: some named paths the
 * exports map does not allow (`xactions/src/...` before `./src/*` existed), some
 * named subpaths that never existed (`xactions/ai`, `xactions/engage`,
 * `xactions/spaces/agent`). Nothing in the repo imported those paths, so no test
 * noticed. Resolving the package by its own name exercises the exports map
 * exactly as an installed copy would.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(md|js|mjs)$/.test(name)) out.push(full);
  }
  return out;
}

const sources = [
  ...['docs', 'tutorials', 'skills', 'examples', 'types', 'integrations'].flatMap((d) => walk(path.join(root, d))),
  // READMEs that live beside the code they document, such as the plugin guides.
  ...walk(path.join(root, 'src')).filter((f) => f.endsWith('.md')),
  path.join(root, 'README.md'),
];

// `import { a, b as c } from 'xactions/x'`, `import d from ...`, `import * as n from ...`,
// `import d, { a } from ...`. Multi-line braces are allowed.
// `import type { ... }` (TypeScript) is a type-only import, not a default binding named `type`.
const STATIC = /import\s+(?:type\s+)?(?:(?!type\b)([\w$]+)\s*,?\s*)?(?:\*\s+as\s+[\w$]+|\{([^}]*)\})?\s*from\s*['"](xactions(?:\/[^'"]*)?)['"]/g;
const DYNAMIC = /(?:import|require)\(\s*['"](xactions(?:\/[^'"]*)?)['"]\s*\)/g;

/** @type {Map<string, {names: Map<string, Set<string>>, default: boolean, where: Set<string>}>} */
const bySpecifier = new Map();
function record(spec, file, names = [], wantsDefault = false) {
  const entry = bySpecifier.get(spec) ?? { names: new Map(), default: false, where: new Set() };
  const rel = path.relative(root, file);
  names.forEach((n) => entry.names.set(n, (entry.names.get(n) ?? new Set()).add(rel)));
  entry.default ||= wantsDefault;
  entry.where.add(path.relative(root, file));
  bySpecifier.set(spec, entry);
}

for (const file of sources) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(STATIC)) {
    const names = (m[2] ?? '')
      .split(',')
      .map((s) => s.trim().split(/\s+as\s+/)[0].replace(/^type\s+/, ''))
      .filter((s) => /^[\w$]+$/.test(s));
    record(m[3], file, names, Boolean(m[1]));
  }
  for (const m of text.matchAll(DYNAMIC)) record(m[1], file);
}

// Names declared only in types/index.d.ts (interfaces, type aliases) are real
// for a TypeScript reader even though the runtime module has no such binding.
const declaredTypes = new Set(
  [...readFileSync(path.join(root, 'types/index.d.ts'), 'utf8').matchAll(/export (?:declare )?(?:interface|type|class|enum) (\w+)/g)].map((m) => m[1]),
);

// Examples that describe an API XActions does not have. Each needs rewriting
// against the real one, not a new export. The list may only shrink: a fixed
// entry fails below until it is removed here.
const KNOWN_BROKEN = {
  'docs/ai-api.md': ['unfollowNonFollowers'],
  'docs/examples/dm-automation.md': ['exportDMs'],
  ...Object.fromEntries(
    [
      'bitcoin-lightning-network-tracker-x',
      'cross-chain-bridge-security-x',
      'crypto-arbitrage-signal-detection-x',
      'crypto-derivatives-exchange-listings-x',
      'crypto-kyc-aml-news-monitor-x',
      'monitor-crypto-mining-pool-x',
      'track-cbdc-news-x-api',
      'x-api-ai-agents-crypto-research',
    ].map((slug) => [`docs/articles/${slug}.md`, ['TwitterStream']]),
  ),
};

// Importing the CLI entry point parses process.argv, which here belongs to
// vitest; that it resolves is all this test needs to know, and the tarball
// smoke test in CI runs it for real.
const RESOLVE_ONLY = new Set(['xactions/cli']);

describe('documented import paths', () => {
  it('finds the examples it is meant to check', () => {
    expect(bySpecifier.size).toBeGreaterThan(5);
  });

  it('lists no known-broken example that has since been fixed', async () => {
    const stale = [];
    for (const [file, names] of Object.entries(KNOWN_BROKEN)) {
      const text = readFileSync(path.join(root, file), 'utf8');
      for (const name of names) if (!new RegExp(`\\b${name}\\b`).test(text)) stale.push(`${file}: ${name}`);
    }
    expect(stale, 'remove these from KNOWN_BROKEN').toEqual([]);
  });

  for (const [spec, { names, default: wantsDefault, where }] of [...bySpecifier].sort()) {
    it(`${spec} resolves and exports what the docs import`, async () => {
      const context = `imported in ${[...where].join(', ')}`;
      if (RESOLVE_ONLY.has(spec)) {
        expect(() => import.meta.resolve(spec), context).not.toThrow();
        return;
      }
      let mod;
      try {
        mod = await import(spec);
      } catch (error) {
        throw new Error(`${spec} does not load (${error.code ?? error.message}); ${context}`, { cause: error });
      }
      const missing = [];
      for (const [name, files] of names) {
        if (name in mod || declaredTypes.has(name)) continue;
        const unexplained = [...files].filter((f) => !KNOWN_BROKEN[f]?.includes(name));
        if (unexplained.length) missing.push(`${name} (${unexplained.join(', ')})`);
      }
      expect(missing, `${spec} lacks exports the docs import`).toEqual([]);
      if (wantsDefault) expect('default' in mod, `${spec} has no default export; ${context}`).toBe(true);
    });
  }
});
