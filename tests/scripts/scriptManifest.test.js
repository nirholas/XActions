// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * browser/index.json, the one manifest of browser console scripts.
 *
 * Every entry must point at a file that exists and parses, ids must be unique,
 * and every legacy path must be a byte-for-byte copy of a fresh build, because
 * people paste those paths from raw GitHub URLs.
 *
 * @author nich (@nichxbt)
 */

import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildScriptManifest,
  CATEGORY_IDS,
  isMirror,
  mirrorContent,
  parseHeader,
  readConfig,
} from '../../scripts/lib/script-manifest.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const committed = JSON.parse(readFileSync(join(ROOT, 'browser/index.json'), 'utf8'));
const fresh = buildScriptManifest(ROOT);

describe('browser/index.json', () => {
  it('builds with no problems', () => {
    expect(fresh.problems).toEqual([]);
  });

  it('is what a fresh build writes', () => {
    expect(committed).toEqual(fresh.manifest);
  });

  it('lists every script once, under a unique id', () => {
    const ids = committed.scripts.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(committed.count).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(150);
  });

  it('points every entry at a browser/ file that exists and passes node --check', async () => {
    for (const entry of committed.scripts) {
      expect(entry.path).toBe(`browser/${entry.id}.js`);
      expect(existsSync(join(ROOT, entry.path)), entry.path).toBe(true);
    }
    // Eight checks at a time: one process per file, but not 200 at once.
    const run = promisify(execFile);
    const queue = committed.scripts.map((entry) => entry.path);
    const failures = [];
    await Promise.all(Array.from({ length: 8 }, async () => {
      for (let path = queue.shift(); path; path = queue.shift()) {
        await run(process.execPath, ['--check', join(ROOT, path)]).catch((err) => failures.push(`${path}: ${err.stderr}`));
      }
    }));
    expect(failures).toEqual([]);
  }, 120000);

  it('gives every entry the fields the readers need', () => {
    for (const entry of committed.scripts) {
      expect(entry.title, entry.id).toMatch(/\S/);
      expect(entry.description, entry.id).toMatch(/\S/);
      expect(CATEGORY_IDS, entry.id).toContain(entry.category);
      expect(entry.page, entry.id).toMatch(/^x\.com\//);
      expect(typeof entry.writes, entry.id).toBe('boolean');
      expect(typeof entry.needsCore, entry.id).toBe('boolean');
      expect(typeof entry.supportsDryRun, entry.id).toBe('boolean');
      expect(Array.isArray(entry.config), entry.id).toBe(true);
      expect(Array.isArray(entry.aliases), entry.id).toBe(true);
      if (!entry.supportsDryRun) expect(entry.dryRunDefault, entry.id).toBeNull();
    }
  });

  it('claims each legacy path for exactly one script', () => {
    const aliases = committed.scripts.flatMap((s) => s.aliases);
    expect(new Set(aliases).size).toBe(aliases.length);
    const paths = new Set(committed.scripts.map((s) => s.path));
    for (const alias of aliases) expect(paths.has(alias), alias).toBe(false);
  });

  it('keeps every legacy path as a generated copy of its canonical file', () => {
    for (const entry of committed.scripts) {
      const canonical = readFileSync(join(ROOT, entry.path), 'utf8');
      for (const alias of entry.aliases) {
        const mirror = readFileSync(join(ROOT, alias), 'utf8');
        expect(isMirror(mirror), alias).toBe(true);
        expect(mirror === mirrorContent(entry.path, canonical), `${alias} drifted from ${entry.path}`).toBe(true);
      }
    }
  });
});

describe('parseHeader', () => {
  const source = [
    '// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.',
    '/**',
    ' * @name        demo.js',
    ' * @title       Demo Tool',
    ' * @description Does one thing.',
    ' * @category    cleanup',
    ' * @page        x.com/<you>/following or x.com/home',
    ' * @writes      true',
    ' * @aliases     scripts/demo.js, scripts/twitter/demo.js',
    ' */',
    '(() => {})();',
  ].join('\n');

  it('reads the tags of the first doc block', () => {
    expect(parseHeader(source)).toMatchObject({
      name: 'demo.js',
      title: 'Demo Tool',
      description: 'Does one thing.',
      category: 'cleanup',
      page: 'x.com/<you>/following or x.com/home',
      writes: 'true',
      aliases: 'scripts/demo.js, scripts/twitter/demo.js',
    });
  });

  it('ignores doc blocks further down the file', () => {
    expect(parseHeader('(() => {\n/**\n * @name inner.js\n */\n})();')).toEqual({});
  });
});

describe('readConfig', () => {
  it('reads names, types, defaults and trailing comments from the first CONFIG', () => {
    const config = readConfig(`(() => {
      const CONFIG = {
        dryRun: true,            // Preview only
        maxUnfollows: 50,
        delay: 2 * 1000,
        cap: Infinity,
        whitelist: ['a', 'b'],
        nested: { on: false },
        label: \`hi\`,
        pattern: /x/i,
      };
      const CONFIG2 = { ignored: 1 };
    })();`);
    expect(config).toEqual([
      { name: 'dryRun', type: 'boolean', default: true, description: 'Preview only' },
      { name: 'maxUnfollows', type: 'number', default: 50 },
      { name: 'delay', type: 'number', default: 2000 },
      { name: 'cap', type: 'number', default: null, source: 'Infinity' },
      { name: 'whitelist', type: 'array', default: ['a', 'b'] },
      { name: 'nested', type: 'object', default: { on: false } },
      { name: 'label', type: 'string', default: 'hi' },
      { name: 'pattern', type: 'regexp', default: null, source: '/x/i' },
    ]);
  });

  it('returns an empty list when there is no CONFIG object', () => {
    expect(readConfig('window.exportToCSV = (rows) => rows;')).toEqual([]);
  });
});

describe('mirrors', () => {
  it('prefixes one generated line naming the source', () => {
    const out = mirrorContent('browser/demo.js', '// line one\n');
    expect(out.split('\n')[0]).toMatch(/GENERATED.*browser\/demo\.js/);
    expect(out.endsWith('// line one\n')).toBe(true);
    expect(isMirror(out)).toBe(true);
    expect(isMirror('// line one\n')).toBe(false);
  });
});
